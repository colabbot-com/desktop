use anyhow::Result;
use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::OnceLock;
use crate::commands::{TaskFE, TransactionFE};

static DB_PATH: OnceLock<PathBuf> = OnceLock::new();

pub fn init(path: PathBuf) -> Result<()> {
    DB_PATH.set(path.clone()).ok();
    let conn = Connection::open(&path)?;
    conn.execute_batch("
        PRAGMA journal_mode=WAL;

        CREATE TABLE IF NOT EXISTS config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            task_id       TEXT PRIMARY KEY,
            direction     TEXT NOT NULL,
            status        TEXT NOT NULL,
            capability    TEXT NOT NULL DEFAULT '',
            prompt        TEXT NOT NULL DEFAULT '',
            result        TEXT,
            reward_cbt    REAL NOT NULL DEFAULT 0,
            quality_score REAL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            type       TEXT NOT NULL,
            amount     REAL NOT NULL,
            task_id    TEXT,
            note       TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS logs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            level      TEXT NOT NULL,
            message    TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ")?;
    Ok(())
}

fn conn() -> Result<Connection> {
    let path = DB_PATH.get().ok_or_else(|| anyhow::anyhow!("DB not initialised"))?;
    Ok(Connection::open(path)?)
}

// ── Config ─────────────────────────────────────────────────────────────────────

pub fn save_config(key: &str, value: &str) -> Result<()> {
    conn()?.execute(
        "INSERT INTO config (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_config(key: &str) -> Result<Option<String>> {
    let conn = conn()?;
    let mut stmt = conn.prepare("SELECT value FROM config WHERE key = ?1")?;
    let mut rows = stmt.query(params![key])?;
    Ok(rows.next()?.map(|r| r.get::<_, String>(0)).transpose()?)
}

pub fn reset_config() -> Result<()> {
    conn()?.execute_batch("DELETE FROM config; DELETE FROM tasks; DELETE FROM transactions;")?;
    Ok(())
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

pub fn get_tasks() -> Result<Vec<TaskFE>> {
    let conn = conn()?;
    let mut stmt = conn.prepare(
        "SELECT task_id, direction, status, capability, prompt, result,
                reward_cbt, quality_score, created_at, updated_at
         FROM tasks ORDER BY updated_at DESC LIMIT 200"
    )?;
    let tasks = stmt.query_map([], |row| {
        Ok(TaskFE {
            task_id:       row.get(0)?,
            direction:     row.get(1)?,
            status:        row.get(2)?,
            capability:    row.get(3)?,
            prompt:        row.get(4)?,
            result:        row.get(5)?,
            reward_cbt:    row.get(6)?,
            quality_score: row.get(7)?,
            created_at:    row.get(8)?,
            updated_at:    row.get(9)?,
        })
    })?.collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(tasks)
}

pub fn upsert_task(task: &TaskFE) -> Result<()> {
    conn()?.execute(
        "INSERT INTO tasks (task_id, direction, status, capability, prompt, result,
                            reward_cbt, quality_score, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
         ON CONFLICT(task_id) DO UPDATE SET
           status = excluded.status,
           result = excluded.result,
           quality_score = excluded.quality_score,
           updated_at = excluded.updated_at",
        params![
            task.task_id, task.direction, task.status, task.capability,
            task.prompt, task.result, task.reward_cbt, task.quality_score
        ],
    )?;
    Ok(())
}

// ── Transactions ───────────────────────────────────────────────────────────────

pub fn get_transactions() -> Result<Vec<TransactionFE>> {
    let conn = conn()?;
    let mut stmt = conn.prepare(
        "SELECT id, type, amount, task_id, note, created_at
         FROM transactions ORDER BY created_at DESC LIMIT 500"
    )?;
    let txs = stmt.query_map([], |row| {
        Ok(TransactionFE {
            id:         row.get(0)?,
            type_:      row.get(1)?,
            amount:     row.get(2)?,
            task_id:    row.get(3)?,
            note:       row.get(4)?,
            created_at: row.get(5)?,
        })
    })?.collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(txs)
}

pub fn add_transaction(type_: &str, amount: f64, task_id: Option<&str>, note: Option<&str>) -> Result<()> {
    conn()?.execute(
        "INSERT INTO transactions (type, amount, task_id, note) VALUES (?1, ?2, ?3, ?4)",
        params![type_, amount, task_id, note],
    )?;
    Ok(())
}
