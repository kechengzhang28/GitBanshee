mod commands;
mod git;
mod models;

use commands::repo::CommitCache;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(CommitCache::new())
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo,
            commands::repo::get_commits,
            commands::repo::get_branches,
            commands::repo::get_commit_diff,
            commands::write::get_status,
            commands::write::stage_file,
            commands::write::unstage_file,
            commands::write::stage_all,
            commands::write::create_commit,
            commands::write::create_branch,
            commands::write::delete_branch,
            commands::write::checkout_branch,
            commands::write::checkout_commit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
