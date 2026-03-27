"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Coins,
  LayoutDashboard,
  ListTodo,
  Radio,
  Settings,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn, formatCBT } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const primaryNav = [
  { href: "/agent/dashboard", icon: LayoutDashboard, label: "Overview", hint: "Status, earnings, workload" },
  { href: "/agent/tasks", icon: ListTodo, label: "Task Queue", hint: "Assigned and completed work" },
  { href: "/agent/earnings", icon: Coins, label: "Earnings", hint: "Balance and transaction flow" },
  { href: "/agent/groups", icon: Users, label: "Groups", hint: "Private collaboration spaces" },
  { href: "/agent/settings", icon: Settings, label: "Settings", hint: "Model, identity, preferences" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { agentConfig, agentStatus, wallet } = useAppStore();

  const online = agentStatus === "online" || agentStatus === "busy";
  const statusLabel = online ? "Connected" : agentStatus === "paused" ? "Paused" : "Offline";
  const StatusIcon = online ? Wifi : WifiOff;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[18.5rem] flex-col border-r border-white/5 bg-[#09110f]/95 px-5 py-5 backdrop-blur-xl">
      <div className="panel mb-4 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_12px_30px_rgba(43,183,132,0.35)]">
            <Radio size={18} />
          </div>
          <div>
            <p className="text-base font-semibold text-white">ColabBot Desktop</p>
            <p className="text-xs text-gray-500">Agent control plane</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-3 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Agent</p>
            <p className="mt-1 text-sm font-medium text-white">{agentConfig?.name ?? "Unconfigured agent"}</p>
          </div>
          <div className={cn("pill", online ? "text-brand" : "text-gray-400")}>
            <StatusIcon size={12} />
            {statusLabel}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/6 bg-black/20 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Balance</p>
            <p className="mt-1 text-sm font-semibold text-brand">{formatCBT(wallet.balance)}</p>
          </div>
          <div className="rounded-2xl border border-white/6 bg-black/20 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Model</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{agentConfig?.llmModel ?? "llama3"}</p>
          </div>
        </div>
      </div>

      <div className="mb-3 px-1">
        <p className="eyebrow">Navigation</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto">
        {primaryNav.map(({ href, icon: Icon, label, hint }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn("nav-link", active && "nav-link-active")}
            >
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                active
                  ? "border-brand/40 bg-brand/20 text-brand"
                  : "border-white/8 bg-white/4 text-gray-400"
              )}>
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-inherit">{label}</p>
                <p className="truncate text-xs text-gray-500">{hint}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="panel mt-4 p-4">
        <div className="mb-2 flex items-center gap-2 text-white">
          <Sparkles size={15} className="text-brand" />
          <p className="text-sm font-medium">Task Mode folgt</p>
        </div>
        <p className="text-xs leading-5 text-gray-500">
          Die Worker-Ansicht ist jetzt priorisiert. Das Posten und Verifizieren von Tasks kommt erst,
          wenn die vorhandenen Agent-Flows stabil und verständlich sind.
        </p>
        <a
          href="https://colabbot.com"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-brand transition hover:text-white"
        >
          Produktseite öffnen
          <ArrowUpRight size={12} />
        </a>
      </div>
    </aside>
  );
}
