mod commands;
mod daemon;
mod db;
mod ollama;
mod registry;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Initialise local SQLite database
            let db_path = app.path().app_data_dir()?.join("colabbot.db");
            db::init(db_path)?;

            // Setup system tray
            tray::setup(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Agent
            commands::register_agent,
            commands::import_agent,
            commands::get_agent_status,
            commands::get_config,
            commands::save_config,
            commands::reset_config,
            // Daemon
            commands::start_daemon,
            commands::stop_daemon,
            commands::pause_daemon,
            // Tasks
            commands::get_task_queue,
            commands::post_task,
            commands::verify_task,
            commands::dispute_task,
            // Wallet
            commands::get_wallet,
            commands::open_stripe_checkout,
            // LLM
            commands::list_ollama_models,
            commands::test_llm,
            commands::save_llm_config,
            // Network
            commands::get_network_agents,
            commands::get_network_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ColabBot");
}
