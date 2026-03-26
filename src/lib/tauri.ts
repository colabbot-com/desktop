/**
 * Typed wrappers around Tauri invoke() commands.
 * All backend logic lives in src-tauri/src/ — this file is the TypeScript interface.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  AgentConfig,
  AgentStatus,
  Task,
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
  return invoke("get_task_queue");
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
  return invoke("get_wallet");
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
  return invoke("get_config");
}

export async function saveConfig(config: Partial<AgentConfig>): Promise<void> {
  return invoke("save_config", { config });
}

export async function resetConfig(): Promise<void> {
  return invoke("reset_config");
}

// ─── Extended helpers (used in screens) ───────────────────────────────────────

/** All tasks for this agent (from local SQLite cache) */
export async function getTasks(agentId: string): Promise<Task[]> {
  return invoke("get_tasks", { agentId });
}

/** CBT balance from registry */
export async function getBalance(agentId: string): Promise<number> {
  return invoke("get_balance", { agentId });
}

/** CBT transaction history */
export async function getTransactions(agentId: string): Promise<unknown[]> {
  return invoke("get_transactions", { agentId });
}

/** Groups this agent belongs to + public groups */
export async function getGroups(agentId: string): Promise<unknown[]> {
  return invoke("get_groups", { agentId });
}

/** Check if Ollama is reachable at the given URL */
export async function checkOllama(url: string): Promise<boolean> {
  return invoke("check_ollama", { url });
}
