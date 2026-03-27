"use client";

import { useEffect, useState } from "react";
import { Clock3, Filter, Inbox } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getTasks } from "@/lib/tauri";
import { cn, formatCBT, statusColor } from "@/lib/utils";
import type { Task } from "@/types/colabbot";

export default function TasksPage() {
  const { agentConfig } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    async function load() {
      if (!agentConfig) return;

      try {
        const result = await getTasks(agentConfig.agentId);
        setTasks(result);
      } catch {
        // ignore in dev
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [agentConfig]);

  const filtered = tasks.filter((task) => {
    if (filter === "active") return ["assigned", "in_progress"].includes(task.status);
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Task Queue</p>
          <h1 className="page-title">Incoming work</h1>
          <p className="page-copy mt-2 max-w-2xl">
            Alle der Registry bekannten Aufgaben an einem Ort. Der Fokus liegt auf Lesbarkeit:
            klare Filter, klare Reward-Anzeige und kein UI-Lärm.
          </p>
        </div>

        <div className="panel flex items-center gap-2 p-2">
          <div className="flex items-center gap-2 px-3 text-xs uppercase tracking-[0.18em] text-gray-500">
            <Filter size={13} />
            Filter
          </div>
          {(["all", "active", "completed"] as const).map((entry) => (
            <button
              key={entry}
              onClick={() => setFilter(entry)}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium capitalize transition",
                filter === entry
                  ? "bg-brand text-black"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {entry}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Total" value={`${tasks.length}`} />
        <SummaryTile label="Active" value={`${tasks.filter((task) => ["assigned", "in_progress"].includes(task.status)).length}`} />
        <SummaryTile label="Completed" value={`${tasks.filter((task) => task.status === "completed").length}`} />
      </section>

      <section className="panel p-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading task queue…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand/10 text-brand">
              <Inbox size={20} />
            </div>
            <p className="text-sm font-medium text-white">
              {filter === "active" ? "Keine aktiven Tasks" : "Noch keine Tasks vorhanden"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Sobald der Registry-Client neue Arbeit zuteilt oder lokale Historie vorhanden ist, erscheinen die
              Eintraege hier in chronologischer Form.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => (
              <TaskCard key={task.taskId} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded((value) => !value)}
      className="w-full rounded-[1.5rem] border border-white/8 bg-black/10 p-5 text-left transition hover:border-white/12 hover:bg-white/[0.035]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand">
              {task.capability}
            </span>
            <span className={cn("rounded-full border border-current px-2.5 py-1 text-[11px] font-medium", statusColor(task.status))}>
              {task.status.replace("_", " ")}
            </span>
            <span className="text-xs font-mono text-gray-500">#{task.taskId.slice(-6)}</span>
          </div>

          <p className={cn("text-sm leading-6 text-gray-200", !expanded && "line-clamp-2")}>{task.prompt}</p>

          {expanded && task.result && (
            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="eyebrow mb-2">Result</p>
              <p className="text-sm leading-6 text-gray-300">{task.result}</p>
            </div>
          )}
        </div>

        <div className="min-w-[9rem] text-right">
          <p className="text-lg font-semibold text-brand">{formatCBT(task.rewardCbt)}</p>
          <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
            <Clock3 size={12} />
            {new Date(task.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </button>
  );
}
