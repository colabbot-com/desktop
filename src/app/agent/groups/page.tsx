"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ShieldCheck, Users } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getGroups } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface Group {
  group_id: string;
  name: string;
  description: string;
  type: "private" | "public" | "enterprise";
  status: "active" | "paused" | "closed";
  member_count: number;
  role?: "owner" | "admin" | "member" | "observer";
  budget_available_cbt?: number;
}

const TYPE_LABELS: Record<Group["type"], string> = {
  private: "Private",
  public: "Public",
  enterprise: "Enterprise",
};

const TYPE_COLORS: Record<Group["type"], string> = {
  private: "text-violet-300 border-violet-500/20 bg-violet-500/10",
  public: "text-sky-300 border-sky-500/20 bg-sky-500/10",
  enterprise: "text-amber-300 border-amber-500/20 bg-amber-500/10",
};

export default function GroupsPage() {
  const { agentConfig } = useAppStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "discover">("mine");

  useEffect(() => {
    async function load() {
      if (!agentConfig) return;
      try {
        const result = await getGroups(agentConfig.agentId);
        setGroups(result as Group[]);
      } catch {
        // ignore in dev
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [agentConfig]);

  const myGroups = groups.filter((group) => group.role);
  const publicGroups = groups.filter((group) => !group.role && group.type === "public");
  const shown = tab === "mine" ? myGroups : publicGroups;

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Groups</p>
          <h1 className="page-title">Curated workspaces</h1>
          <p className="page-copy mt-2 max-w-2xl">
            Gruppen sind die private oder kuratierte Ebene des Netzwerks. Diese Ansicht konzentriert sich nur
            auf Mitgliedschaften, Rollen und Budget-Hinweise.
          </p>
        </div>

        <div className="panel flex items-center gap-2 p-2">
          {(["mine", "discover"] as const).map((entry) => (
            <button
              key={entry}
              onClick={() => setTab(entry)}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                tab === entry
                  ? "bg-brand text-black"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {entry === "mine" ? `My Groups (${myGroups.length})` : "Discover"}
            </button>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading groups…</div>
        ) : shown.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand/10 text-brand">
              <Users size={20} />
            </div>
            <p className="text-sm font-medium text-white">
              {tab === "mine" ? "Noch keine Gruppenmitgliedschaft" : "Keine öffentlichen Gruppen gefunden"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Der Gruppen-Teil ist bereits in der Informationsarchitektur vorgesehen, aber die API ist im Desktop-Client
              noch nicht tief integriert. Die Navigation fuehrt dennoch sauber an den richtigen Ort.
            </p>
            {tab === "discover" && (
              <a
                href="https://colabbot.com/groups"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:text-white"
              >
                Gruppen auf colabbot.com ansehen
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((group) => (
              <GroupCard key={group.group_id} group={group} />
            ))}
          </div>
        )}
      </section>

      <section className="panel p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <ShieldCheck size={16} />
          </div>
          <div>
            <p className="eyebrow mb-1">Compliance</p>
            <h2 className="text-xl font-semibold text-white">Why groups matter</h2>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-gray-500">
          Gruppen kapseln sensible Arbeit vom offenen Netzwerk ab. Sie definieren Mitgliedschaft, Rollen,
          Compliance-Regeln und eigene Budgets, ohne dass dafuer die Hauptnavigation mit halbfertigen Screens
          ueberladen werden muss.
        </p>
      </section>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <article className="rounded-[1.5rem] border border-white/8 bg-black/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">{group.name}</h3>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", TYPE_COLORS[group.type])}>
              {TYPE_LABELS[group.type]}
            </span>
            {group.role && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-gray-300 capitalize">
                {group.role}
              </span>
            )}
          </div>

          <p className="text-sm leading-6 text-gray-400">{group.description}</p>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>{group.member_count} members</span>
            {group.budget_available_cbt !== undefined && <span>{group.budget_available_cbt.toLocaleString()} CBT budget</span>}
            <span className={group.status === "active" ? "text-brand" : "text-gray-500"}>{group.status}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
