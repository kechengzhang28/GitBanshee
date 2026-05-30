mod commands;
mod git;
mod graph;
mod models;

use commands::repo::CommitCache;
use commands::repo::AvatarCache;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(CommitCache::new())
        .manage(AvatarCache::new(
            std::env::current_dir()
                .unwrap_or_default()
                .join(".cache")
                .join("avatars"),
        ))
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo,
            commands::repo::get_remote_info,
            commands::repo::get_author_avatar,
            commands::repo::get_commits,
            commands::repo::get_branches,
            commands::repo::get_tags,
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
            commands::write::fetch_remote,
            commands::write::pull,
            commands::write::push,
            commands::write::stash_list,
            commands::write::stash_save,
            commands::write::stash_pop,
            commands::write::stash_apply,
            commands::write::stash_drop,
            commands::write::cherry_pick,
            commands::write::rebase_start,
            commands::write::rebase_continue,
            commands::write::rebase_abort,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
