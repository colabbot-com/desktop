"use client";

import { useEffect } from "react";
import { Wifi, TrendingUp, CheckCircle, Star, AlertCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getWallet, getTaskQueue, getAgentStatus, startDaemon } from "@/lib/tauri";
import { formatCBT, formatRelativeTime, statusColor } from "@/lib/utils";
import Sidebar from "@/components/layout/sidebar";

export default function AgentDashboard() {
  const { agentConfig, agentStatus, wallet, tasks, setWallet, setTasks, setAgentStatus } = useAppStore();

  useEffect(() => {
    async function load() {
      try {
        const [w, t, s] = await Promise.all([getWallet(), getTaskQueue(), getAgentStatus()]);
        setWallet(w);
        setTasks(t);
        setAgentStatus(s);
        if (s === "offline") await startDaemon();
      } catch {
        // dev mode — use mock data
      }
    }
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [setWallet, setTasks, setAgentStatus]);

  const activeTasks = tasks.filter(t => t.direction === "inbound" && ["assigned", "in_progress"].includes(t.status));
  const completedToday = tasks.filter(t => t.direction === "inbound" && t.status === "completed").length;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-100">{agentConfig?.name ?? "My Agent"}</h1>
            <p className="text-sm text-gray-500 font-mono">{agentConfig?.agentId ?? "—"}</p>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${statusColor(agentStatus)}`}>
            <Wifi size={14} />
            <span className="capitalize">{agentStatus}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Active Tasks", value: activeTasks.length, icon: AlertCircle, color: "text-yellow-400" },
            { label: "Done Today",   value: completedToday,      icon: CheckCircle, color: "text-brand" },
            { label: "Earned Today", value: formatCBT(wallet.earnedToday), icon: TrendingUp, color: "text-brand" },
            { label: "Reputation",   value: "82",                icon: Star,        color: "text-yellow-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white/4 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={color} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <p className="text-xl font-semibold text-gray-100">{value}</p>
            </div>
          ))}
        </div>

        {/* Active Tasks */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Active Tasks</h2>
          {activeTasks.length === 0 ? (
            <div className="bg-white/4 rounded-xl border border-white/5 p-6 text-center text-gray-500 text-sm">
              No active tasks — your agent is ready and polling for work.
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks.map(task => (
                <div key={task.taskId} className="bg-white/4 rounded-xl border border-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-brand/20 text-brand px-2 py-0.5 rounded-full">
                          {task.capability}
                        </span>
                        <span className={`text-xs font-medium ${statusColor(task.status)}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 truncate">{task.prompt}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(task.updatedAt)}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-mono text-brand">+{task.rewardCbt} CBT</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CBT Balance */}
        <div className="bg-white/4 rounded-xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">CBT Balance</span>
            <span className="text-xs text-gray-500">Total earned: {formatCBT(wallet.earnedTotal)}</span>
          </div>
          <p className="text-3xl font-semibold font-mono text-brand">{formatCBT(wallet.balance)}</p>
        </div>
      </main>
    </div>
  );
}
