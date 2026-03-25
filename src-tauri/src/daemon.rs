/**
 * ColabBot Daemon
 *
 * Background loop that:
 * 1. Sends heartbeats to the registry every 30 seconds
 * 2. Polls for pending tasks every 10 seconds
 * 3. Executes tasks using the configured LLM (Ollama or cloud)
 * 4. Submits results back to the registry
 * 5. Updates local SQLite DB with task status + CBT transactions
 */

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

use crate::db;
use crate::ollama;
use crate::registry::{RegistryClient, ResultPayload};
use crate::commands::TaskFE;

pub struct DaemonHandle {
    pub stop_tx: tokio::sync::watch::Sender<bool>,
}

pub async fn start(
    registry_url: String,
    agent_id: String,
    token: String,
    model: String,
) -> DaemonHandle {
    let (stop_tx, mut stop_rx) = tokio::sync::watch::channel(false);

    tokio::spawn(async move {
        let client = Arc::new(
            RegistryClient::new(&registry_url).with_auth(&agent_id, &token)
        );
        let active_tasks: Arc<Mutex<std::collections::HashSet<String>>> =
            Arc::new(Mutex::new(std::collections::HashSet::new()));

        let mut heartbeat_tick = interval(Duration::from_secs(30));
        let mut task_poll_tick = interval(Duration::from_secs(10));

        log::info!("Daemon started for agent {}", agent_id);

        loop {
            tokio::select! {
                _ = stop_rx.changed() => {
                    if *stop_rx.borrow() {
                        log::info!("Daemon stopping");
                        // Send offline heartbeat
                        let _ = client.heartbeat("offline", 0.0, 0).await;
                        break;
                    }
                }

                _ = heartbeat_tick.tick() => {
                    let active = active_tasks.lock().await.len() as u32;
                    let load = (active as f32) / 3.0; // max 3 concurrent
                    let slots = 3u32.saturating_sub(active);
                    if let Err(e) = client.heartbeat("idle", load, slots).await {
                        log::warn!("Heartbeat failed: {}", e);
                    }
                }

                _ = task_poll_tick.tick() => {
                    let active = active_tasks.lock().await.len();
                    if active >= 3 { continue; } // at capacity

                    match client.get_pending_tasks().await {
                        Ok(tasks) => {
                            for task in tasks.into_iter().take(3 - active) {
                                let task_id = task.task_id.clone();
                                let mut active_set = active_tasks.lock().await;
                                if active_set.contains(&task_id) { continue; }
                                active_set.insert(task_id.clone());
                                drop(active_set);

                                // Accept task
                                if let Err(e) = client.accept_task(&task_id).await {
                                    log::warn!("Failed to accept task {}: {}", task_id, e);
                                    active_tasks.lock().await.remove(&task_id);
                                    continue;
                                }

                                // Save to local DB
                                let prompt = task.input
                                    .as_ref()
                                    .and_then(|i| i.get("prompt"))
                                    .and_then(|p| p.as_str())
                                    .unwrap_or_default()
                                    .to_string();
                                let reward = task.reward_cbt.unwrap_or(0.0);

                                let _ = db::upsert_task(&TaskFE {
                                    task_id: task_id.clone(),
                                    direction: "inbound".to_string(),
                                    status: "in_progress".to_string(),
                                    capability: "text/research".to_string(), // TODO: from task type
                                    prompt: prompt.clone(),
                                    result: None,
                                    reward_cbt: reward,
                                    quality_score: None,
                                    created_at: chrono::Utc::now().to_rfc3339(),
                                    updated_at: chrono::Utc::now().to_rfc3339(),
                                });

                                // Execute in background
                                let client_clone = Arc::clone(&client);
                                let active_clone = Arc::clone(&active_tasks);
                                let model_clone = model.clone();
                                let agent_id_clone = agent_id.clone();

                                tokio::spawn(async move {
                                    let result = execute_task(&model_clone, &prompt).await;
                                    match result {
                                        Ok(output) => {
                                            let payload = ResultPayload {
                                                agent_id: agent_id_clone.clone(),
                                                output: serde_json::json!({
                                                    "content": output,
                                                    "format": "markdown"
                                                }),
                                                signature: "placeholder-signature".to_string(),
                                            };
                                            match client_clone.submit_result(&task_id, &payload).await {
                                                Ok(_) => {
                                                    let _ = db::upsert_task(&TaskFE {
                                                        task_id: task_id.clone(),
                                                        direction: "inbound".to_string(),
                                                        status: "delivered".to_string(),
                                                        capability: String::new(),
                                                        prompt: String::new(),
                                                        result: Some(output),
                                                        reward_cbt: reward,
                                                        quality_score: None,
                                                        created_at: chrono::Utc::now().to_rfc3339(),
                                                        updated_at: chrono::Utc::now().to_rfc3339(),
                                                    });
                                                    log::info!("Task {} delivered", task_id);
                                                }
                                                Err(e) => log::error!("Submit failed for {}: {}", task_id, e),
                                            }
                                        }
                                        Err(e) => log::error!("Task {} execution failed: {}", task_id, e),
                                    }
                                    active_clone.lock().await.remove(&task_id);
                                });
                            }
                        }
                        Err(e) => log::warn!("Task poll failed: {}", e),
                    }
                }
            }
        }
    });

    DaemonHandle { stop_tx }
}

async fn execute_task(model: &str, prompt: &str) -> Result<String> {
    // Prepend system context
    let full_prompt = format!(
        "You are a ColabBot agent. Complete the following task professionally and concisely.\n\n{}",
        prompt
    );
    ollama::complete(model, &full_prompt).await
}
