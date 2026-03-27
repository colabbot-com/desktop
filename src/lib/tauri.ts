/**
 * Typed wrappers around Tauri invoke() commands.
 * All backend logic lives in src-tauri/src/ — this file is the TypeScript interface.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  AgentConfig,
  AgentStatus,
  Task,
  Transaction,
  OllamaModel,
  NetworkAgent,
  NetworkStats,
  WalletState,
} from "@/types/colabbot";

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function registerAgent(params: {
  agent_id:             string;
  name:                 string;
  version:              string;
  capabilities:         string[];
  model:                string;
  max_concurrent_tasks: number;
}): Promise<{ agent_id: string; token: string; cbt_balance: number }> {
  return invoke("register_agent", { params });
}

export async function importAgent(params: {
  agentId: string;
  token: string;
  registryUrl: string;
}): Promise<AgentConfig> {
  return invoke("import_agent", params);
}

export async function getAgentStatus(): Promise<AgentStatus> {
  return invoke("get_agent_status");
}

// ─── Daemon ───────────────────────────────────────────────────────────────────

export async function startDaemon(): Promise<void> {
  return invoke("start_daemon");
}

export async function stopDaemon(): Promise<void> {
  return invoke("stop_daemon");
}

export async function pauseDaemon(): Promise<void> {
  return invoke("pause_daemon");
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getTaskQueue(): Promise<Task[]> {
  const tasks = await invoke<Array<{
    task_id: string;
    direction: "inbound" | "outbound";
    status: string;
    capability: string;
    prompt: string;
    result?: string | null;
    reward_cbt?: number;
    quality_score?: number | null;
    created_at: string;
    updated_at: string;
  }>>("get_task_queue");

  return tasks.map((task) => ({
    taskId: task.task_id,
    direction: task.direction,
    status: task.status as Task["status"],
    capability: task.capability as Task["capability"],
    prompt: task.prompt,
    result: task.result ?? undefined,
    rewardCbt: task.reward_cbt ?? 0,
    qualityScore: task.quality_score ?? undefined,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }));
}

export async function postTask(params: {
  prompt: string;
  capability: string;
  rewardCbt: number;
  deadlineSeconds?: number;
}): Promise<{ taskId: string }> {
  return invoke("post_task", params);
}

export async function verifyTask(params: {
  taskId: string;
  qualityScore: number;
}): Promise<void> {
  return invoke("verify_task", params);
}

export async function disputeTask(params: {
  taskId: string;
  reason: string;
}): Promise<void> {
  return invoke("dispute_task", params);
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function getWallet(): Promise<WalletState> {
  const wallet = await invoke<{
    balance?: number;
    earned_today?: number;
    earned_total?: number;
    transactions?: Array<{
      id: number;
      type?: string;
      type_?: string;
      amount?: number;
      task_id?: string | null;
      note?: string | null;
      created_at?: string;
    }>;
  }>("get_wallet");

  return {
    balance: wallet.balance ?? 0,
    earnedToday: wallet.earned_today ?? 0,
    earnedTotal: wallet.earned_total ?? 0,
    transactions: (wallet.transactions ?? []).map((tx) => ({
      id: tx.id,
      type: (tx.type ?? tx.type_ ?? "earned") as WalletState["transactions"][number]["type"],
      amount: tx.amount ?? 0,
      taskId: tx.task_id ?? undefined,
      note: tx.note ?? undefined,
      createdAt: tx.created_at ?? new Date(0).toISOString(),
    })),
  };
}

export async function openStripeCheckout(packageId: string): Promise<void> {
  return invoke("open_stripe_checkout", { packageId });
}

// ─── LLM / Ollama ─────────────────────────────────────────────────────────────

export async function listOllamaModels(): Promise<OllamaModel[]> {
  return invoke("list_ollama_models");
}

export async function testLLM(params: {
  prompt: string;
}): Promise<{ result: string; latencyMs: number }> {
  return invoke("test_llm", params);
}

export async function saveLLMConfig(params: {
  provider: string;
  model: string;
  endpoint?: string;
  apiKey?: string;
}): Promise<void> {
  return invoke("save_llm_config", params);
}

// ─── Network ──────────────────────────────────────────────────────────────────

export async function getNetworkAgents(params?: {
  capability?: string;
  minReputation?: number;
}): Promise<NetworkAgent[]> {
  return invoke("get_network_agents", params ?? {});
}

export async function getNetworkStats(): Promise<NetworkStats> {
  return invoke("get_network_stats");
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<AgentConfig | null> {
  const config = await invoke<{
    agent_id: string;
    name: string;
    token: string;
    capabilities: string[];
    registry_url: string;
    llm_provider: AgentConfig["llmProvider"];
    llm_model: string;
    max_concurrent_tasks: number;
  } | null>("get_config");

  if (!config) return null;

  return {
    agentId: config.agent_id,
    name: config.name,
    token: config.token,
    capabilities: config.capabilities as AgentConfig["capabilities"],
    registryUrl: config.registry_url,
    llmProvider: config.llm_provider,
    llmModel: config.llm_model,
    maxConcurrentTasks: config.max_concurrent_tasks,
  };
}

export async function saveConfig(config: Partial<AgentConfig>): Promise<void> {
  return invoke("save_config", {
    config: {
      name: config.name,
      agent_id: config.agentId,
      token: config.token,
      capabilities: config.capabilities,
      registry_url: config.registryUrl,
      llm_provider: config.llmProvider,
      llm_model: config.llmModel,
      llm_endpoint: config.llmEndpoint,
      max_concurrent_tasks: config.maxConcurrentTasks,
    },
  });
}

export async function resetConfig(): Promise<void> {
  return invoke("reset_config");
}

// ─── Extended helpers (used in screens) ───────────────────────────────────────

/** All tasks for this agent (from local SQLite cache) */
export async function getTasks(agentId: string): Promise<Task[]> {
  const tasks = await invoke<Array<{
    task_id: string;
    direction: "inbound" | "outbound";
    status: string;
    capability: string;
    prompt: string;
    result?: string | null;
    reward_cbt?: number;
    quality_score?: number | null;
    created_at: string;
    updated_at: string;
  }>>("get_tasks", { agentId });

  return tasks.map((task) => ({
    taskId: task.task_id,
    direction: task.direction,
    status: task.status as Task["status"],
    capability: task.capability as Task["capability"],
    prompt: task.prompt,
    result: task.result ?? undefined,
    rewardCbt: task.reward_cbt ?? 0,
    qualityScore: task.quality_score ?? undefined,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }));
}

/** CBT balance from registry */
export async function getBalance(agentId: string): Promise<number> {
  return invoke("get_balance", { agentId });
}

/** CBT transaction history */
export async function getTransactions(agentId: string): Promise<Transaction[]> {
  const transactions = await invoke<Array<{
    id: number;
    type?: string;
    type_?: string;
    amount?: number;
    task_id?: string | null;
    note?: string | null;
    created_at?: string;
  }>>("get_transactions", { agentId });

  return transactions.map((tx) => ({
    id: tx.id,
    type: (tx.type ?? tx.type_ ?? "earned") as Transaction["type"],
    amount: tx.amount ?? 0,
    taskId: tx.task_id ?? undefined,
    note: tx.note ?? undefined,
    createdAt: tx.created_at ?? new Date(0).toISOString(),
  }));
}

/** Groups this agent belongs to + public groups */
export async function getGroups(agentId: string): Promise<unknown[]> {
  return invoke("get_groups", { agentId });
}

/** Check if Ollama is reachable at the given URL */
export async function checkOllama(url: string): Promise<boolean> {
  return invoke("check_ollama", { url });
}
