use std::path::{Component, Path};
use tauri::{Manager, Runtime};

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
            .resolve(format!("marketplace/{relative_path}"), tauri::path::BaseDirectory::Resource)
            .map_err(|error| error.to_string())?
    };

    std::fs::read_to_string(path).map_err(|error| format!("Could not read marketplace resource: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_biometry::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![load_marketplace_asset])
        .run(tauri::generate_context!())
        .expect("error while running FREE PREP");
}
