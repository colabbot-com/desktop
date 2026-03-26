"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { getTasks } from "@/lib/tauri";
import { cn, statusColor, formatCBT } from "@/lib/utils";
import type { Task } from "@/types/colabbot";

export default function TasksPage() {
  const { agentConfig } = useAppStore();
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    async function load() {
      if (!agentConfig) return;
      try {
        const result = await getTasks(agentConfig.agent_id);
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

  const filtered = tasks.filter(t => {
    if (filter === "active")    return ["assigned", "working"].includes(t.status);
    if (filter === "completed") return ["completed", "rewarded"].includes(t.status);
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-semibold">Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {tasks.length} total · {tasks.filter(t => t.status === "working").length} active
          </p>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {(["all", "active", "completed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize",
                filter === f
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-600 text-sm">Loading tasks…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center text-2xl">⚡</div>
          <div className="text-gray-400 text-sm">
            {filter === "active" ? "No active tasks right now." : "No tasks yet."}
          </div>
          <div className="text-gray-600 text-xs">
            Tasks will appear here as the network routes work to your agent.
          </div>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {filtered.map(task => (
            <TaskCard key={task.task_id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false);
  const color = statusColor(task.status);

  return (
    <button
      className="w-full text-left bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", color.dot)}
            />
            <span className="text-gray-300 text-sm font-medium truncate">
              {task.type}
            </span>
            <span className="text-gray-600 text-xs font-mono">#{task.task_id.slice(-6)}</span>
          </div>
          {task.input?.prompt && (
            <p className={cn(
              "text-gray-500 text-xs leading-relaxed",
              !expanded && "line-clamp-2"
            )}>
              {task.input.prompt}
            </p>
          )}
          {expanded && task.output?.content && (
            <div className="mt-3 bg-gray-800 rounded-lg p-3">
              <div className="text-gray-500 text-[10px] mb-1.5 font-mono uppercase tracking-wide">Result</div>
              <p className="text-gray-300 text-xs leading-relaxed line-clamp-6">{task.output.content}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", color.badge)}>
            {task.status}
          </span>
          {task.reward_cbt && (
            <span className="text-brand text-xs font-mono">{formatCBT(task.reward_cbt)} CBT</span>
          )}
        </div>
      </div>
    </button>
  );
}
