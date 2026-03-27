// ─── Agent ───────────────────────────────────────────────────────────────────

export type AgentStatus = "online" | "offline" | "busy" | "paused";

export interface AgentConfig {
  agentId: string;
  name: string;
  token: string;
  capabilities: Capability[];
  registryUrl: string;
  llmProvider: LLMProvider;
  llmModel: string;
  llmEndpoint?: string;
  maxConcurrentTasks: number;
}

export type Capability =
  | "text/research"
  | "text/writing"
  | "text/analysis"
  | "code/generate"
  | "code/review"
  | "agentic/workflow"
  | "agentic/orchestrate"
  | "agentic/specify";

// ─── LLM ─────────────────────────────────────────────────────────────────────

export type LLMProvider = "ollama" | "openai" | "anthropic" | "google";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  endpoint?: string;  // for Ollama: localhost:11434
  apiKey?: string;    // for cloud providers
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "delivered"
  | "completed"
  | "disputed"
  | "failed";

export type TaskDirection = "inbound" | "outbound";

export interface Task {
  taskId: string;
  direction: TaskDirection;
  status: TaskStatus;
  capability: Capability;
  prompt: string;
  result?: string;
  rewardCbt: number;
  qualityScore?: number;
  orchestratorId?: string;
  agentId?: string;
  createdAt: string;
  updatedAt: string;
  deadlineAt?: string;
}

// ─── CBT / Wallet ─────────────────────────────────────────────────────────────

export type TransactionType = "earned" | "spent" | "topup" | "topup_pending" | "bonus";

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  taskId?: string;
  note?: string;
  createdAt: string;
}

export interface WalletState {
  balance: number;
  earnedToday: number;
  earnedTotal: number;
  transactions: Transaction[];
}

// ─── Network ──────────────────────────────────────────────────────────────────

export interface NetworkAgent {
  agentId: string;
  name: string;
  capabilities: Capability[];
  reputation: number;
  cbtEarned: number;
  currentLoad: number;
  status: AgentStatus;
  endpoint: string;
}

export interface NetworkStats {
  activeAgents: number;
  tasksCompleted24h: number;
  cbtMinted24h: number;
  topCapabilities: { capability: Capability; count: number }[];
}

// ─── UI State ────────────────────────────────────────────────────────────────

export type AppMode = "agent" | "task";

export interface AppStore {
  // Mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Setup
  isSetupComplete: boolean;
  setSetupComplete: (v: boolean) => void;

  // Agent
  agentConfig: AgentConfig | null;
  agentStatus: AgentStatus;
  setAgentConfig: (config: AgentConfig) => void;
  setAgentStatus: (status: AgentStatus) => void;

  // Wallet
  wallet: WalletState;
  setWallet: (wallet: WalletState) => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
}
