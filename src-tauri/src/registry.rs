use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct RegistryClient {
    pub base_url: String,
    pub agent_id: Option<String>,
    pub token: Option<String>,
    http: Client,
}

impl RegistryClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            agent_id: None,
            token: None,
            http: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Failed to build HTTP client"),
        }
    }

    pub fn with_auth(mut self, agent_id: &str, token: &str) -> Self {
        self.agent_id = Some(agent_id.to_string());
        self.token = Some(token.to_string());
        self
    }

    fn auth_header(&self) -> Option<String> {
        self.token.as_ref().map(|t| format!("Bearer {}", t))
    }

    // ── Agent Registration ──────────────────────────────────────────────────

    pub async fn register(&self, payload: &RegisterPayload) -> Result<RegisterResponse> {
        let mut req = self.http.post(format!("{}/v1/agents/register", self.base_url))
            .json(payload);
        if let Some(auth) = self.auth_header() {
            req = req.header("Authorization", auth);
        }
        let res = req.send().await?.error_for_status()?;
        Ok(res.json().await?)
    }

    // ── Heartbeat ───────────────────────────────────────────────────────────

    pub async fn heartbeat(&self, status: &str, load: f32, slots: u32) -> Result<()> {
        let agent_id = self.agent_id.as_deref().unwrap_or_default();
        let auth = self.auth_header().unwrap_or_default();
        self.http
            .post(format!("{}/v1/agents/{}/heartbeat", self.base_url, agent_id))
            .header("Authorization", auth)
            .json(&serde_json::json!({
                "status": status,
                "current_load": load,
                "available_slots": slots
            }))
            .send().await?.error_for_status()?;
        Ok(())
    }

    // ── Tasks ───────────────────────────────────────────────────────────────

    pub async fn get_pending_tasks(&self) -> Result<Vec<TaskResponse>> {
        let agent_id = self.agent_id.as_deref().unwrap_or_default();
        let auth = self.auth_header().unwrap_or_default();
        let res = self.http
            .get(format!("{}/v1/agents/{}/tasks/pending", self.base_url, agent_id))
            .header("Authorization", auth)
            .send().await?.error_for_status()?;
        Ok(res.json::<serde_json::Value>().await?
            .get("tasks").and_then(|t| serde_json::from_value(t.clone()).ok())
            .unwrap_or_default())
    }

    pub async fn accept_task(&self, task_id: &str) -> Result<()> {
        let auth = self.auth_header().unwrap_or_default();
        self.http
            .post(format!("{}/v1/tasks/{}/accept", self.base_url, task_id))
            .header("Authorization", auth)
            .send().await?.error_for_status()?;
        Ok(())
    }

    pub async fn submit_result(&self, task_id: &str, payload: &ResultPayload) -> Result<()> {
        let auth = self.auth_header().unwrap_or_default();
        self.http
            .post(format!("{}/v1/tasks/{}/result", self.base_url, task_id))
            .header("Authorization", auth)
            .json(payload)
            .send().await?.error_for_status()?;
        Ok(())
    }

    pub async fn post_task(&self, payload: &PostTaskPayload) -> Result<PostTaskResponse> {
        let auth = self.auth_header().unwrap_or_default();
        let res = self.http
            .post(format!("{}/v1/tasks", self.base_url))
            .header("Authorization", auth)
            .json(payload)
            .send().await?.error_for_status()?;
        Ok(res.json().await?)
    }

    pub async fn verify_task(&self, task_id: &str, quality_score: f32) -> Result<()> {
        let auth = self.auth_header().unwrap_or_default();
        let agent_id = self.agent_id.as_deref().unwrap_or_default();
        self.http
            .post(format!("{}/v1/tasks/{}/verify", self.base_url, task_id))
            .header("Authorization", auth)
            .json(&serde_json::json!({
                "orchestrator_id": agent_id,
                "verdict": "accepted",
                "quality_score": quality_score
            }))
            .send().await?.error_for_status()?;
        Ok(())
    }

    // ── Network ─────────────────────────────────────────────────────────────

    pub async fn get_agents(&self, capability: Option<&str>) -> Result<Vec<NetworkAgent>> {
        let mut url = format!("{}/v1/agents", self.base_url);
        if let Some(cap) = capability {
            url.push_str(&format!("?capability={}", cap));
        }
        let res = self.http.get(url).send().await?.error_for_status()?;
        Ok(res.json::<serde_json::Value>().await?
            .get("agents").and_then(|a| serde_json::from_value(a.clone()).ok())
            .unwrap_or_default())
    }

    pub async fn get_stats(&self) -> Result<serde_json::Value> {
        let res = self.http
            .get(format!("{}/v1/stats", self.base_url))
            .send().await?.error_for_status()?;
        Ok(res.json().await?)
    }

    // ── Wallet ──────────────────────────────────────────────────────────────

    pub async fn get_balance(&self) -> Result<f64> {
        let agent_id = self.agent_id.as_deref().unwrap_or_default();
        let auth = self.auth_header().unwrap_or_default();
        let res = self.http
            .get(format!("{}/v1/agents/{}", self.base_url, agent_id))
            .header("Authorization", auth)
            .send().await?.error_for_status()?;
        let v: serde_json::Value = res.json().await?;
        Ok(v.get("cbt_balance").and_then(|b| b.as_f64()).unwrap_or(0.0))
    }
}

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct RegisterPayload {
    pub agent_id: String,
    pub name: String,
    pub version: String,
    pub endpoint: String,
    pub capabilities: Vec<String>,
    pub model: String,
    pub max_concurrent_tasks: u32,
}

#[derive(Debug, Deserialize)]
pub struct RegisterResponse {
    pub agent_id: String,
    pub token: String,
    pub cbt_balance: f64,
}

#[derive(Debug, Deserialize)]
pub struct TaskResponse {
    pub task_id: String,
    pub type_: Option<String>,
    pub input: Option<serde_json::Value>,
    pub reward_cbt: Option<f64>,
    pub deadline_seconds: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct ResultPayload {
    pub agent_id: String,
    pub output: serde_json::Value,
    pub signature: String,
}

#[derive(Debug, Serialize)]
pub struct PostTaskPayload {
    pub orchestrator_id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub input: serde_json::Value,
    pub reward_cbt: f64,
    pub deadline_seconds: u64,
}

#[derive(Debug, Deserialize)]
pub struct PostTaskResponse {
    pub task_id: String,
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct NetworkAgent {
    pub agent_id: String,
    pub name: String,
    pub capabilities: Vec<String>,
    pub reputation: Option<f64>,
    pub cbt_earned: Option<f64>,
    pub current_load: Option<f64>,
    pub endpoint: String,
}
