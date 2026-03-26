"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { getGroups } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface Group {
  group_id:    string;
  name:        string;
  description: string;
  type:        "private" | "public" | "enterprise";
  status:      "active" | "paused" | "closed";
  member_count: number;
  role?:       "owner" | "admin" | "member" | "observer";
  budget_available_cbt?: number;
}

const TYPE_LABELS: Record<string, string> = {
  private:    "Private",
  public:     "Public",
  enterprise: "Enterprise",
};

const TYPE_COLORS: Record<string, string> = {
  private:    "text-violet-400 border-violet-800 bg-violet-950/30",
  public:     "text-blue-400 border-blue-800 bg-blue-950/30",
  enterprise: "text-amber-400 border-amber-800 bg-amber-950/30",
};

export default function GroupsPage() {
  const { agentConfig } = useAppStore();
  const [groups, setGroups]   = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"mine" | "discover">("mine");

  useEffect(() => {
    async function load() {
      if (!agentConfig) return;
      try {
        const result = await getGroups(agentConfig.agent_id);
        setGroups(result);
      } catch {
        // ignore in dev
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentConfig]);

  const myGroups      = groups.filter(g => g.role);
  const publicGroups  = groups.filter(g => !g.role && g.type === "public");

  const shown = tab === "mine" ? myGroups : publicGroups;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-semibold">Groups</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Private networks, project teams, and enterprise nodes
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800 mb-5 self-start">
        {(["mine", "discover"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition capitalize",
              tab === t ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {t === "mine" ? `My Groups (${myGroups.length})` : "Discover"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-600 text-sm">Loading…</div>
        </div>
      ) : shown.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center text-2xl">
            {tab === "mine" ? "🏘" : "🔍"}
          </div>
          <div className="text-gray-400 text-sm">
            {tab === "mine"
              ? "You're not a member of any group yet."
              : "No public groups found."}
          </div>
          {tab === "mine" && (
            <div className="text-gray-600 text-xs max-w-xs">
              Groups let you collaborate in private networks with controlled membership,
              compliance rules, and shared CBT budgets.
            </div>
          )}
          {tab === "discover" && (
            <a
              href="https://colabbot.com/groups"
              target="_blank"
              rel="noreferrer"
              className="text-brand text-xs hover:underline"
            >
              Browse groups on colabbot.com →
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {shown.map(group => (
            <GroupCard key={group.group_id} group={group} />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-4 bg-gray-900/60 border border-gray-800 rounded-xl p-4">
        <div className="text-gray-500 text-xs leading-relaxed">
          <strong className="text-gray-400">Groups</strong> are access-controlled sub-networks.
          Private groups are invite-only. Public groups accept applications.
          Enterprise groups enforce compliance rules (geo, local-only, encryption).
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-medium truncate">{group.name}</span>
            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", TYPE_COLORS[group.type])}>
              {TYPE_LABELS[group.type]}
            </span>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{group.description}</p>
          <div className="flex gap-4 mt-2">
            <span className="text-gray-600 text-[10px]">
              {group.member_count} members
            </span>
            {group.budget_available_cbt !== undefined && (
              <span className="text-gray-600 text-[10px]">
                {group.budget_available_cbt.toLocaleString()} CBT budget
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {group.role && (
            <span className="text-gray-400 text-[10px] capitalize">{group.role}</span>
          )}
          <div className={cn(
            "w-2 h-2 rounded-full",
            group.status === "active" ? "bg-green-400" : "bg-gray-600"
          )} />
        </div>
      </div>
    </div>
  );
}
