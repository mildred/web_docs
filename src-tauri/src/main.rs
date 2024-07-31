// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Runtime};
use tauri_plugin_fs::FsExt;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn allow_file<R: Runtime>(
    app: AppHandle<R>,
    path: &str) -> () {
    app.fs_scope().allow_file(path);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_web_server::init())
        .invoke_handler(tauri::generate_handler![
            allow_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
