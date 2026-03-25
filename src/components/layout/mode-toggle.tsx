"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { AppMode } from "@/types/colabbot";

export default function ModeToggle() {
  const { mode, setMode } = useAppStore();

  return (
    <div className="flex rounded-lg bg-white/5 p-0.5 text-xs">
      {(["agent", "task"] as AppMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={cn(
            "flex-1 py-1.5 rounded-md font-medium transition-all capitalize",
            mode === m
              ? "bg-white/10 text-gray-100 shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          {m === "agent" ? "⚡ Agent" : "📋 Task"}
        </button>
      ))}
    </div>
  );
}
