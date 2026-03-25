import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCBT(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k CBT`;
  return `${amount.toFixed(0)} CBT`;
}

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function capabilityLabel(cap: string): string {
  const labels: Record<string, string> = {
    "text/research": "Research",
    "text/writing": "Writing",
    "text/analysis": "Analysis",
    "code/generate": "Code Gen",
    "code/review": "Code Review",
    "agentic/workflow": "Workflow",
    "agentic/orchestrate": "Orchestrate",
    "agentic/specify": "Specify",
  };
  return labels[cap] ?? cap;
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    online: "text-brand",
    offline: "text-gray-400",
    busy: "text-yellow-500",
    paused: "text-orange-400",
    pending: "text-gray-400",
    assigned: "text-blue-400",
    in_progress: "text-yellow-400",
    delivered: "text-brand",
    completed: "text-brand",
    disputed: "text-red-400",
    failed: "text-red-500",
  };
  return colors[status] ?? "text-gray-400";
}
