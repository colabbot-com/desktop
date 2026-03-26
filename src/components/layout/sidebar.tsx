"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ListTodo, TrendingUp,
  Send, ClipboardList, CheckSquare, Globe, Users,
  Wallet, Settings, Wifi, WifiOff, PauseCircle,
} from "lucide-react";
import { cn, formatCBT } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import ModeToggle from "./mode-toggle";

const agentNav = [
  { href: "/agent/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/agent/tasks",     icon: ListTodo,         label: "Tasks" },
  { href: "/agent/earnings",  icon: TrendingUp,       label: "Earnings" },
  { href: "/agent/groups",    icon: Users,            label: "Groups" },
];

const networkNav = [
  { href: "/network/post",     icon: Send,          label: "Post Task" },
  { href: "/network/tasks",    icon: ClipboardList, label: "My Tasks" },
  { href: "/network/results",  icon: CheckSquare,   label: "Results" },
  { href: "/network/explorer", icon: Globe,         label: "Explorer" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { mode, agentStatus, wallet } = useAppStore();

  const StatusIcon = agentStatus === "online" ? Wifi
    : agentStatus === "paused" ? PauseCircle
    : WifiOff;

  const statusLabel = agentStatus === "online" ? "Online"
    : agentStatus === "paused" ? "Paused"
    : "Offline";

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/5 bg-gray-950 h-screen">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" fill="white" />
            <circle cx="3" cy="5" r="2" fill="white" opacity="0.6" />
            <circle cx="17" cy="5" r="2" fill="white" opacity="0.6" />
            <circle cx="3" cy="15" r="2" fill="white" opacity="0.6" />
            <circle cx="17" cy="15" r="2" fill="white" opacity="0.6" />
            <line x1="10" y1="10" x2="3" y2="5" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="10" y1="10" x2="17" y2="5" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="10" y1="10" x2="3" y2="15" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="10" y1="10" x2="17" y2="15" stroke="white" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
        <span className="font-semibold text-sm text-gray-100">ColabBot</span>
      </div>

      {/* Mode Toggle */}
      <div className="px-3 pt-3 pb-1">
        <ModeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {/* Agent section */}
        <div>
          <p className="px-2 mb-1 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Agent</p>
          {agentNav.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                pathname === href
                  ? "bg-white/8 text-gray-100"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>

        {/* Network section */}
        <div>
          <p className="px-2 mb-1 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Network</p>
          {networkNav.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                pathname === href
                  ? "bg-white/8 text-gray-100"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom: Wallet + Settings + Status */}
      <div className="border-t border-white/5 px-2 py-2 space-y-0.5">
        <Link
          href="/wallet"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
            pathname === "/wallet"
              ? "bg-white/8 text-gray-100"
              : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
          )}
        >
          <Wallet size={15} />
          Wallet
        </Link>
        <Link
          href="/agent/settings"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
            pathname === "/agent/settings"
              ? "bg-white/8 text-gray-100"
              : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
          )}
        >
          <Settings size={15} />
          Settings
        </Link>
      </div>

      {/* Status Bar */}
      <div className="border-t border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            size={13}
            className={cn(
              agentStatus === "online" ? "text-brand" :
              agentStatus === "paused" ? "text-orange-400" :
              "text-gray-500"
            )}
          />
          <span className="text-xs text-gray-400">{statusLabel}</span>
        </div>
        <span className="text-xs font-mono text-brand">{formatCBT(wallet.balance)}</span>
      </div>
    </aside>
  );
}
