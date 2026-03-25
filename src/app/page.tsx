"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { getConfig } from "@/lib/tauri";

/**
 * Root page — checks if setup is complete and redirects accordingly.
 * On first launch: → /setup
 * On subsequent launches: → /agent/dashboard
 */
export default function RootPage() {
  const router = useRouter();
  const { setAgentConfig, setSetupComplete } = useAppStore();

  useEffect(() => {
    async function init() {
      try {
        const config = await getConfig();
        if (config) {
          setAgentConfig(config);
          setSetupComplete(true);
          router.replace("/agent/dashboard");
        } else {
          router.replace("/setup");
        }
      } catch {
        // Tauri not available (e.g. browser dev mode) — go to setup
        router.replace("/setup");
      }
    }
    init();
  }, [router, setAgentConfig, setSetupComplete]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
        <p className="text-gray-500 text-sm font-mono">loading…</p>
      </div>
    </div>
  );
}
