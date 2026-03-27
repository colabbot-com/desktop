"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Sparkles, Star, TrendingUp, Wifi } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getAgentStatus, getTaskQueue, getWallet, startDaemon } from "@/lib/tauri";
import { formatCBT, formatRelativeTime, statusColor } from "@/lib/utils";

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
        // dev mode fallback
      }
    }

    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [setAgentStatus, setTasks, setWallet]);

  const activeTasks = tasks.filter((task) => task.direction === "inbound" && ["assigned", "in_progress"].includes(task.status));
  const completedToday = tasks.filter((task) => task.direction === "inbound" && task.status === "completed").length;
  const upcomingTasks = activeTasks.slice(0, 4);

  return (
    <div className="space-y-8">
      <section className="panel-strong overflow-hidden p-8">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.9fr]">
          <div>
            <p className="eyebrow mb-3">Agent Overview</p>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h1 className="page-title">{agentConfig?.name ?? "My Agent"}</h1>
              <div className={`pill ${statusColor(agentStatus)}`}>
                <Wifi size={12} />
                {agentStatus}
              </div>
            </div>
            <p className="page-copy max-w-2xl">
              Dein Desktop-Client ist die operative Ansicht fuer einen einzelnen Worker-Agenten:
              aktuelle Last, Einnahmen, Warteschlange und lokale Modellkonfiguration an einem Ort.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="pill">Agent ID: {agentConfig?.agentId?.slice(0, 12) ?? "not registered"}</div>
              <div className="pill">Model: {agentConfig?.llmModel ?? "llama3"}</div>
              <div className="pill">{agentConfig?.capabilities.length ?? 0} capabilities</div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
            <p className="eyebrow mb-3">Wallet Snapshot</p>
            <p className="text-4xl font-semibold tracking-tight text-brand">{formatCBT(wallet.balance)}</p>
            <p className="mt-2 text-sm text-gray-500">Total earned: {formatCBT(wallet.earnedTotal)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniMetric label="Today" value={formatCBT(wallet.earnedToday)} />
              <MiniMetric label="Completed" value={`${completedToday}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricTile
          label="Active Tasks"
          value={`${activeTasks.length}`}
          detail="Open work currently assigned to this agent"
          icon={<AlertCircle size={16} className="text-amber-300" />}
        />
        <MetricTile
          label="Done Today"
          value={`${completedToday}`}
          detail="Verified task completions since local midnight"
          icon={<CheckCircle2 size={16} className="text-brand" />}
        />
        <MetricTile
          label="Earned Today"
          value={formatCBT(wallet.earnedToday)}
          detail="Net CBT credited in the current day"
          icon={<TrendingUp size={16} className="text-sky-300" />}
        />
        <MetricTile
          label="Reputation"
          value="82"
          detail="Placeholder until reputation endpoint is wired"
          icon={<Star size={16} className="text-yellow-300" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="panel p-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-2">Work Queue</p>
              <h2 className="text-xl font-semibold text-white">Current assignments</h2>
            </div>
            <p className="text-xs text-gray-500">Updated every 10 seconds</p>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Sparkles size={18} />
              </div>
              <p className="text-sm font-medium text-white">Keine aktiven Tasks</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Der Agent ist bereit. Sobald der Registry-Client Aufgaben zuweist, erscheinen sie hier mit Status,
                Zeitstempel und Reward.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <article key={task.taskId} className="rounded-[1.5rem] border border-white/8 bg-black/10 p-4">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand">
                        {task.capability}
                      </span>
                      <span className={`text-xs font-medium ${statusColor(task.status)}`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-brand">{formatCBT(task.rewardCbt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-gray-200">{task.prompt}</p>
                  <p className="mt-3 text-xs text-gray-500">{formatRelativeTime(task.updatedAt)}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel p-6">
            <p className="eyebrow mb-2">Node Status</p>
            <h2 className="text-xl font-semibold text-white">Local runtime</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <StatusRow label="Registry" value={agentConfig?.registryUrl ?? "https://registry.colabbot.com"} />
              <StatusRow label="Model" value={agentConfig?.llmModel ?? "llama3"} />
              <StatusRow label="Capabilities" value={`${agentConfig?.capabilities.length ?? 0} enabled`} />
              <StatusRow label="Daemon" value={agentStatus === "offline" ? "Starting automatically" : "Healthy"} />
            </dl>
          </div>

          <div className="panel p-6">
            <p className="eyebrow mb-2">Focus</p>
            <h2 className="text-xl font-semibold text-white">Immediate next step</h2>
            <p className="mt-4 text-sm leading-6 text-gray-500">
              Die Agent-Ansicht ist jetzt bewusst auf den Worker-Flow fokussiert. Die frueheren Task-Marketplace-Links
              sind aus der Navigation entfernt, bis diese Pfade wirklich existieren und benutzbar sind.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-tile">
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-gray-500">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium text-white">{value}</dd>
    </div>
  );
}
