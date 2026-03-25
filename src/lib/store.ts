import { create } from "zustand";
import type { AppStore, AppMode, AgentConfig, AgentStatus, WalletState, Task } from "@/types/colabbot";

export const useAppStore = create<AppStore>((set) => ({
  // Mode
  mode: "agent" as AppMode,
  setMode: (mode) => set({ mode }),

  // Setup
  isSetupComplete: false,
  setSetupComplete: (v) => set({ isSetupComplete: v }),

  // Agent
  agentConfig: null,
  agentStatus: "offline" as AgentStatus,
  setAgentConfig: (agentConfig: AgentConfig) => set({ agentConfig }),
  setAgentStatus: (agentStatus: AgentStatus) => set({ agentStatus }),

  // Wallet
  wallet: {
    balance: 0,
    earnedToday: 0,
    earnedTotal: 0,
    transactions: [],
  },
  setWallet: (wallet: WalletState) => set({ wallet }),

  // Tasks
  tasks: [] as Task[],
  setTasks: (tasks: Task[]) => set({ tasks }),
}));
