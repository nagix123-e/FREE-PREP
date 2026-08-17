use sha2::{Digest, Sha256};
use std::{
    path::{Component, Path},
    sync::Mutex,
};
use tauri::{Manager, Runtime, State, WebviewWindow};

#[derive(Default)]
struct KioskModeState {
    password_digest: Mutex<Option<[u8; 32]>>,
}

fn kiosk_password_digest(password: &str) -> [u8; 32] {
    Sha256::digest(password.as_bytes()).into()
}

fn kiosk_password_matches(candidate: &str, expected: &[u8; 32]) -> bool {
    if candidate.is_empty() || candidate.len() > 1024 {
        return false;
    }

    let actual = kiosk_password_digest(candidate);
    actual
        .iter()
        .zip(expected.iter())
        .fold(0u8, |difference, (actual, expected)| {
            difference | (actual ^ expected)
        })
        == 0
}

fn kiosk_mode_is_active(state: &KioskModeState) -> bool {
    state
        .password_digest
        .lock()
        .map(|digest| digest.is_some())
        .unwrap_or(false)
}

fn set_kiosk_fullscreen(window: &WebviewWindow, enabled: bool) -> Result<(), tauri::Error> {
    window.set_fullscreen(enabled)
}

fn refocus_kiosk_window<R: Runtime>(app: &tauri::AppHandle<R>, label: &str) {
    let Some(window) = app.get_webview_window(label) else {
        return;
    };

    let _ = window.show();
    let _ = window.set_always_on_top(true);
    let _ = window.set_focus();
}

#[tauri::command]
fn kiosk_mode_status(state: State<'_, KioskModeState>) -> Result<bool, String> {
    Ok(kiosk_mode_is_active(&state))
}

#[tauri::command]
fn start_kiosk_mode(
    window: WebviewWindow,
    state: State<'_, KioskModeState>,
    password: String,
) -> Result<(), String> {
    if password.len() < 6 || password.len() > 1024 {
        return Err("Kiosk password must be between 6 and 1024 characters.".to_string());
    }

    window
        .set_always_on_top(true)
        .map_err(|error| format!("Could not keep FREE PREP on screen: {error}"))?;
    window
        .set_visible_on_all_workspaces(true)
        .map_err(|error| format!("Could not keep FREE PREP visible across workspaces: {error}"))?;
    if let Err(error) = set_kiosk_fullscreen(&window, true) {
        let _ = window.set_always_on_top(false);
        let _ = window.set_visible_on_all_workspaces(false);
        return Err(format!("Could not enter fullscreen kiosk mode: {error}"));
    }

    let mut digest = state
        .password_digest
        .lock()
        .map_err(|_| "Could not update kiosk mode state.".to_string())?;
    *digest = Some(kiosk_password_digest(&password));
    Ok(())
}

#[tauri::command]
fn end_kiosk_mode(
    window: WebviewWindow,
    state: State<'_, KioskModeState>,
    password: String,
) -> Result<(), String> {
    let mut digest = state
        .password_digest
        .lock()
        .map_err(|_| "Could not read kiosk mode state.".to_string())?;
    let expected = digest
        .as_ref()
        .ok_or_else(|| "Kiosk mode is not active.".to_string())?;

    if !kiosk_password_matches(&password, expected) {
        return Err("Incorrect kiosk password.".to_string());
    }

    set_kiosk_fullscreen(&window, false)
        .map_err(|error| format!("Could not leave fullscreen kiosk mode: {error}"))?;
    window
        .set_always_on_top(false)
        .map_err(|error| format!("Could not restore the FREE PREP window: {error}"))?;
    window
        .set_visible_on_all_workspaces(false)
        .map_err(|error| format!("Could not restore FREE PREP workspace visibility: {error}"))?;
    *digest = None;
    Ok(())
}

#[tauri::command]
fn load_marketplace_asset<R: Runtime>(
    app: tauri::AppHandle<R>,
    relative_path: String,
) -> Result<String, String> {
    let relative = Path::new(&relative_path);
    if relative_path.is_empty()
        || relative.is_absolute()
        || !relative
            .components()
            .all(|component| matches!(component, Component::Normal(_)))
    {
        return Err("Invalid marketplace resource path.".to_string());
    }

    let path = if cfg!(debug_assertions) {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../public/marketplace")
            .join(relative)
    } else {
        app.path()
            .resolve(
                format!("marketplace/{relative_path}"),
                tauri::path::BaseDirectory::Resource,
            )
            .map_err(|error| error.to_string())?
    };

    std::fs::read_to_string(path)
        .map_err(|error| format!("Could not read marketplace resource: {error}"))
}

#[cfg(test)]
mod tests {
    use super::{kiosk_password_digest, kiosk_password_matches};

    #[test]
    fn kiosk_password_matches_only_the_session_password() {
        let digest = kiosk_password_digest("correct-horse-battery-staple");

        assert!(kiosk_password_matches(
            "correct-horse-battery-staple",
            &digest
        ));
        assert!(!kiosk_password_matches("incorrect-password", &digest));
        assert!(!kiosk_password_matches("", &digest));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(KioskModeState::default())
        .plugin(tauri_plugin_biometry::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            end_kiosk_mode,
            kiosk_mode_status,
            load_marketplace_asset,
            start_kiosk_mode
        ])
        .build(tauri::generate_context!())
        .expect("error while building FREE PREP");

    app.run(|app, event| {
        if !kiosk_mode_is_active(app.state::<KioskModeState>().inner()) {
            return;
        }

        match event {
            tauri::RunEvent::ExitRequested { api, .. } => api.prevent_exit(),
            tauri::RunEvent::WindowEvent {
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } => api.prevent_close(),
            tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::Focused(false),
                ..
            } => refocus_kiosk_window(app, &label),
            _ => {}
        }
    });
}
