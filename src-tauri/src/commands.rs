use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db;
use crate::ollama;
use crate::registry::{RegistryClient, RegisterPayload};

// ── Shared app state ──────────────────────────────────────────────────────────

pub struct AppState {
    pub registry: std::sync::Mutex<Option<RegistryClient>>,
    pub daemon_running: std::sync::Mutex<bool>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            registry: std::sync::Mutex::new(None),
            daemon_running: std::sync::Mutex::new(false),
        }
    }
}

// ── Types returned to frontend ────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentConfigFE {
    pub agent_id: String,
    pub name: String,
    pub token: String,
    pub capabilities: Vec<String>,
    pub registry_url: String,
    pub llm_provider: String,
    pub llm_model: String,
    pub max_concurrent_tasks: u32,
}

#[derive(Debug, Serialize)]
pub struct WalletFE {
    pub balance: f64,
    pub earned_today: f64,
    pub earned_total: f64,
    pub transactions: Vec<TransactionFE>,
}

#[derive(Debug, Serialize)]
pub struct TransactionFE {
    pub id: i64,
    #[serde(rename = "type")]
    pub type_: String,
    pub amount: f64,
    pub task_id: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct TaskFE {
    pub task_id: String,
    pub direction: String,
    pub status: String,
    pub capability: String,
    pub prompt: String,
    pub result: Option<String>,
    pub reward_cbt: f64,
    pub quality_score: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct OllamaModelFE {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
}

#[derive(Debug, Serialize)]
pub struct NetworkAgentFE {
    pub agent_id: String,
    pub name: String,
    pub capabilities: Vec<String>,
    pub reputation: f64,
    pub cbt_earned: f64,
    pub current_load: f64,
}

#[derive(Debug, Serialize)]
pub struct NetworkStatsFE {
    pub active_agents: u64,
    pub tasks_completed_24h: u64,
    pub cbt_minted_24h: f64,
}

// ── Agent commands ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn register_agent(
    name: String,
    capabilities: Vec<String>,
    registry_url: String,
) -> Result<serde_json::Value, String> {
    let agent_id = format!("desktop-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("unknown"));
    let client = RegistryClient::new(&registry_url);
    let payload = RegisterPayload {
        agent_id: agent_id.clone(),
        name: name.clone(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        endpoint: "colabbot-desktop://local".to_string(),
        capabilities: capabilities.clone(),
        model: "local".to_string(),
        max_concurrent_tasks: 3,
    };
    let res = client.register(&payload).await.map_err(|e| e.to_string())?;
    db::save_config("agent_id", &res.agent_id).map_err(|e| e.to_string())?;
    db::save_config("token", &res.token).map_err(|e| e.to_string())?;
    db::save_config("name", &name).map_err(|e| e.to_string())?;
    db::save_config("registry_url", &registry_url).map_err(|e| e.to_string())?;
    db::save_config("capabilities", &capabilities.join(",")).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "agentId": res.agent_id,
        "token": res.token,
        "cbtBalance": res.cbt_balance
    }))
}

#[tauri::command]
pub async fn import_agent(
    agent_id: String,
    token: String,
    registry_url: String,
) -> Result<AgentConfigFE, String> {
    db::save_config("agent_id", &agent_id).map_err(|e| e.to_string())?;
    db::save_config("token", &token).map_err(|e| e.to_string())?;
    db::save_config("registry_url", &registry_url).map_err(|e| e.to_string())?;
    get_config().await
        .map(|c| c.ok_or_else(|| "Config not found after import".to_string()))?
}

#[tauri::command]
pub async fn get_config() -> Result<Option<AgentConfigFE>, String> {
    let agent_id = db::get_config("agent_id").map_err(|e| e.to_string())?;
    if agent_id.is_none() { return Ok(None); }
    Ok(Some(AgentConfigFE {
        agent_id: agent_id.unwrap_or_default(),
        name: db::get_config("name").unwrap_or_default().unwrap_or_else(|| "My Agent".to_string()),
        token: db::get_config("token").unwrap_or_default().unwrap_or_default(),
        capabilities: db::get_config("capabilities").unwrap_or_default()
            .unwrap_or_default()
            .split(',')
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty())
            .collect(),
        registry_url: db::get_config("registry_url").unwrap_or_default()
            .unwrap_or_else(|| "https://registry.colabbot.com".to_string()),
        llm_provider: db::get_config("llm_provider").unwrap_or_default()
            .unwrap_or_else(|| "ollama".to_string()),
        llm_model: db::get_config("llm_model").unwrap_or_default()
            .unwrap_or_else(|| "llama3".to_string()),
        max_concurrent_tasks: 3,
    }))
}

#[tauri::command]
pub async fn save_config(config: serde_json::Value) -> Result<(), String> {
    if let Some(name) = config.get("name").and_then(|v| v.as_str()) {
        db::save_config("name", name).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn reset_config() -> Result<(), String> {
    db::reset_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_agent_status() -> Result<String, String> {
    let running = false; // TODO: check daemon state
    Ok(if running { "online" } else { "offline" }.to_string())
}

// ── Daemon commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn start_daemon() -> Result<(), String> {
    // TODO: spawn daemon thread via crate::daemon::start()
    log::info!("Daemon start requested");
    Ok(())
}

#[tauri::command]
pub async fn stop_daemon() -> Result<(), String> {
    log::info!("Daemon stop requested");
    Ok(())
}

#[tauri::command]
pub async fn pause_daemon() -> Result<(), String> {
    log::info!("Daemon pause requested");
    Ok(())
}

// ── Task commands ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_task_queue() -> Result<Vec<TaskFE>, String> {
    db::get_tasks().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn post_task(
    prompt: String,
    capability: String,
    reward_cbt: f64,
    deadline_seconds: Option<u64>,
) -> Result<serde_json::Value, String> {
    let cfg = get_config().await?.ok_or("Not configured")?;
    let client = RegistryClient::new(&cfg.registry_url)
        .with_auth(&cfg.agent_id, &cfg.token);
    let payload = crate::registry::PostTaskPayload {
        orchestrator_id: cfg.agent_id.clone(),
        type_: capability,
        input: serde_json::json!({ "prompt": prompt, "format": "markdown" }),
        reward_cbt,
        deadline_seconds: deadline_seconds.unwrap_or(300),
    };
    let res = client.post_task(&payload).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "taskId": res.task_id }))
}

#[tauri::command]
pub async fn verify_task(task_id: String, quality_score: f32) -> Result<(), String> {
    let cfg = get_config().await?.ok_or("Not configured")?;
    let client = RegistryClient::new(&cfg.registry_url)
        .with_auth(&cfg.agent_id, &cfg.token);
    client.verify_task(&task_id, quality_score).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn dispute_task(task_id: String, reason: String) -> Result<(), String> {
    log::info!("Dispute filed for task {}: {}", task_id, reason);
    // TODO: implement dispute endpoint call
    Ok(())
}

// ── Wallet commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_wallet() -> Result<WalletFE, String> {
    let txs = db::get_transactions().map_err(|e| e.to_string())?;
    let balance = txs.iter().map(|t| t.amount).sum::<f64>().max(0.0);
    let today = chrono::Utc::now().date_naive().to_string();
    let earned_today = txs.iter()
        .filter(|t| t.type_ == "earned" && t.created_at.starts_with(&today))
        .map(|t| t.amount)
        .sum::<f64>();
    let earned_total = txs.iter()
        .filter(|t| t.type_ == "earned" || t.type_ == "bonus")
        .map(|t| t.amount)
        .sum::<f64>();
    Ok(WalletFE { balance, earned_today, earned_total, transactions: txs })
}

#[tauri::command]
pub async fn open_stripe_checkout(package_id: String) -> Result<(), String> {
    let url = format!("https://colabbot.com/#buy-cbt?pkg={}", package_id);
    tauri_plugin_shell::open::open(&url, None::<&str>).map_err(|e| e.to_string())?;
    Ok(())
}

// ── LLM commands ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_ollama_models() -> Result<Vec<OllamaModelFE>, String> {
    ollama::list_models().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_llm(prompt: String) -> Result<serde_json::Value, String> {
    let model = db::get_config("llm_model").unwrap_or_default()
        .unwrap_or_else(|| "llama3".to_string());
    let start = std::time::Instant::now();
    let result = ollama::complete(&model, &prompt).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "result": result,
        "latencyMs": start.elapsed().as_millis()
    }))
}

#[tauri::command]
pub async fn save_llm_config(
    provider: String,
    model: String,
    endpoint: Option<String>,
    api_key: Option<String>,
) -> Result<(), String> {
    db::save_config("llm_provider", &provider).map_err(|e| e.to_string())?;
    db::save_config("llm_model", &model).map_err(|e| e.to_string())?;
    if let Some(ep) = endpoint {
        db::save_config("llm_endpoint", &ep).map_err(|e| e.to_string())?;
    }
    if let Some(key) = api_key {
        db::save_config("llm_api_key", &key).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Network commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_network_agents(
    capability: Option<String>,
) -> Result<Vec<NetworkAgentFE>, String> {
    let cfg = get_config().await?.ok_or("Not configured")?;
    let client = RegistryClient::new(&cfg.registry_url);
    let agents = client.get_agents(capability.as_deref()).await.map_err(|e| e.to_string())?;
    Ok(agents.into_iter().map(|a| NetworkAgentFE {
        agent_id: a.agent_id,
        name: a.name,
        capabilities: a.capabilities,
        reputation: a.reputation.unwrap_or(0.0),
        cbt_earned: a.cbt_earned.unwrap_or(0.0),
        current_load: a.current_load.unwrap_or(0.0),
    }).collect())
}

#[tauri::command]
pub async fn get_network_stats() -> Result<NetworkStatsFE, String> {
    let cfg = get_config().await?.ok_or("Not configured")?;
    let client = RegistryClient::new(&cfg.registry_url);
    let stats = client.get_stats().await.map_err(|e| e.to_string())?;
    Ok(NetworkStatsFE {
        active_agents: stats.get("active_agents").and_then(|v| v.as_u64()).unwrap_or(0),
        tasks_completed_24h: stats.get("tasks_24h").and_then(|v| v.as_u64()).unwrap_or(0),
        cbt_minted_24h: stats.get("cbt_minted_24h").and_then(|v| v.as_f64()).unwrap_or(0.0),
    })
}
