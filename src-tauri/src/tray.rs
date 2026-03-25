use tauri::{
    App,
    tray::{TrayIconBuilder, TrayIconEvent, MouseButtonState, MouseButton},
    menu::{Menu, MenuItem, PredefinedMenuItem},
    Manager,
};

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "open", "Open ColabBot", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let pause_item = MenuItem::with_id(app, "pause", "Pause (go offline)", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_item, &sep, &pause_item, &sep2, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
