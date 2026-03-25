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
  name: string;
  capabilities: string[];
  registryUrl: string;
}): Promise<{ agentId: string; token: string; cbtBalance: number }> {
  return invoke("register_agent", params);
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
