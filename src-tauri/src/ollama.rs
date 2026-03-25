use anyhow::Result;
use reqwest::Client;
use serde::Deserialize;
use crate::commands::OllamaModelFE;

const OLLAMA_BASE: &str = "http://localhost:11434";

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModelRaw>,
}

#[derive(Deserialize)]
struct OllamaModelRaw {
    name: String,
    size: u64,
    modified_at: String,
}

#[derive(Deserialize)]
struct OllamaGenerateResponse {
    response: String,
}

pub async fn list_models() -> Result<Vec<OllamaModelFE>> {
    let client = Client::new();
    let res = client
        .get(format!("{}/api/tags", OLLAMA_BASE))
        .send().await?
        .error_for_status()?;
    let tags: OllamaTagsResponse = res.json().await?;
    Ok(tags.models.into_iter().map(|m| OllamaModelFE {
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
    }).collect())
}

pub async fn complete(model: &str, prompt: &str) -> Result<String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()?;

    let res = client
        .post(format!("{}/api/generate", OLLAMA_BASE))
        .json(&serde_json::json!({
            "model": model,
            "prompt": prompt,
            "stream": false
        }))
        .send().await?
        .error_for_status()?;

    let gen: OllamaGenerateResponse = res.json().await?;
    Ok(gen.response)
}

pub async fn is_available() -> bool {
    Client::new()
        .get(format!("{}/api/tags", OLLAMA_BASE))
        .send().await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
