use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

// ---------- Types ----------

#[derive(Serialize, Deserialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    pub data_dir: Option<String>,
    #[serde(default)]
    pub ollama_model: Option<String>,
    #[serde(default)]
    pub capture_shortcut: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub icon: String,
    pub color: String,
    pub start: String,
    pub end: String,
    #[serde(default)]
    pub activity_pct: f32,
    #[serde(default)]
    pub file_count: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub due: String,
    #[serde(default)]
    pub completed_at: Option<String>,
    #[serde(default)]
    pub project_id: Option<String>,
    /// "pending" | "done" | "late" | "missed"
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileSummary {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub project_id: Option<String>,
    pub modified_at: String,
    #[serde(default)]
    pub preview: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct InboxEntry {
    pub id: String,
    pub text: String,
    pub created_at: String,
}

// ---------- State ----------

pub struct AppState {
    pub config_path: PathBuf,
    pub config: Mutex<AppConfig>,
}

fn config_file_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("mono")
        .join("config.json")
}

fn load_config(path: &Path) -> AppConfig {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_config(path: &Path, cfg: &AppConfig) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let s = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(path, s).map_err(|e| e.to_string())
}

fn data_dir(state: &State<AppState>) -> Result<PathBuf, String> {
    state
        .config
        .lock()
        .unwrap()
        .data_dir
        .clone()
        .ok_or_else(|| "data_dir not set".to_string())
        .map(PathBuf::from)
}

fn ensure_scaffolding(dir: &Path) -> Result<(), String> {
    fs::create_dir_all(dir.join("files")).map_err(|e| e.to_string())?;
    fs::create_dir_all(dir.join("assets")).map_err(|e| e.to_string())?;
    for (name, default) in [
        ("projects.json", "[]"),
        ("events.json", "[]"),
        ("tasks.json", "[]"),
        ("inbox.json", "[]"),
        ("files/index.json", "[]"),
    ] {
        let p = dir.join(name);
        if !p.exists() {
            if let Some(parent) = p.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::write(&p, default).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn read_json<T: for<'de> Deserialize<'de> + Default>(path: &Path) -> T {
    match fs::read_to_string(path) {
        Ok(s) => match serde_json::from_str(&s) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[mono] JSON parse error in {}: {e}", path.display());
                T::default()
            }
        },
        Err(_) => T::default(),
    }
}

fn write_json<T: Serialize>(path: &Path, val: &T) -> Result<(), String> {
    let s = serde_json::to_string_pretty(val).map_err(|e| e.to_string())?;
    fs::write(path, s).map_err(|e| e.to_string())
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

// ---------- Commands: config ----------

#[tauri::command]
fn get_config(state: State<AppState>) -> AppConfig {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn set_data_dir(path: String, state: State<AppState>) -> Result<AppConfig, String> {
    let p = PathBuf::from(&path);
    ensure_scaffolding(&p)?;
    let mut cfg = state.config.lock().unwrap();
    cfg.data_dir = Some(path);
    save_config(&state.config_path, &cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
fn set_ollama_model(model: String, state: State<AppState>) -> Result<AppConfig, String> {
    let mut cfg = state.config.lock().unwrap();
    cfg.ollama_model = Some(model);
    save_config(&state.config_path, &cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
fn set_capture_shortcut(
    shortcut: String,
    app: AppHandle,
    state: State<AppState>,
) -> Result<AppConfig, String> {
    let prev = state.config.lock().unwrap().capture_shortcut.clone();
    {
        let mut cfg = state.config.lock().unwrap();
        cfg.capture_shortcut = Some(shortcut.clone());
        save_config(&state.config_path, &cfg)?;
    }
    // Hot-swap the global hotkey
    if let Some(p) = prev {
        if let Ok(s) = Shortcut::from_str(&p) {
            let _ = app.global_shortcut().unregister(s);
        }
    }
    if let Ok(s) = Shortcut::from_str(&shortcut) {
        app.global_shortcut().register(s).map_err(|e| e.to_string())?;
    }
    Ok(state.config.lock().unwrap().clone())
}

// ---------- Commands: projects ----------

#[tauri::command]
fn list_projects(state: State<AppState>) -> Result<Vec<Project>, String> {
    let dir = data_dir(&state)?;
    Ok(read_json::<Vec<Project>>(&dir.join("projects.json")))
}

#[tauri::command]
fn create_project(
    name: String,
    description: Option<String>,
    icon: String,
    color: String,
    start: String,
    end: String,
    state: State<AppState>,
) -> Result<Project, String> {
    let dir = data_dir(&state)?;
    let path = dir.join("projects.json");
    let mut list: Vec<Project> = read_json(&path);
    let p = Project {
        id: new_id(),
        name,
        description,
        icon,
        color,
        start,
        end,
        activity_pct: 0.0,
        file_count: 0,
    };
    list.push(p.clone());
    write_json(&path, &list)?;
    Ok(p)
}

#[tauri::command]
fn delete_project(id: String, state: State<AppState>) -> Result<(), String> {
    let dir = data_dir(&state)?;
    let path = dir.join("projects.json");
    let mut list: Vec<Project> = read_json(&path);
    list.retain(|p| p.id != id);
    write_json(&path, &list)
}

// ---------- Commands: events ----------

#[tauri::command]
fn list_events(state: State<AppState>) -> Result<Vec<CalendarEvent>, String> {
    let dir = data_dir(&state)?;
    Ok(read_json::<Vec<CalendarEvent>>(&dir.join("events.json")))
}

#[tauri::command]
fn create_event(event: CalendarEvent, state: State<AppState>) -> Result<CalendarEvent, String> {
    let dir = data_dir(&state)?;
    let path = dir.join("events.json");
    let mut list: Vec<CalendarEvent> = read_json(&path);
    let mut ev = event;
    if ev.id.is_empty() {
        ev.id = new_id();
    }
    list.push(ev.clone());
    write_json(&path, &list)?;
    Ok(ev)
}

#[tauri::command]
fn delete_event(id: String, state: State<AppState>) -> Result<(), String> {
    let dir = data_dir(&state)?;
    let path = dir.join("events.json");
    let mut list: Vec<CalendarEvent> = read_json(&path);
    list.retain(|e| e.id != id);
    write_json(&path, &list)
}

#[tauri::command]
fn update_event(event: CalendarEvent, state: State<AppState>) -> Result<CalendarEvent, String> {
    let dir = data_dir(&state)?;
    let path = dir.join("events.json");
    let mut list: Vec<CalendarEvent> = read_json(&path);
    let mut found = false;
    for e in list.iter_mut() {
        if e.id == event.id {
            *e = event.clone();
            found = true;
            break;
        }
    }
    if !found {
        return Err("event not found".to_string());
    }
    write_json(&path, &list)?;
    Ok(event)
}

// ---------- Commands: tasks ----------

#[tauri::command]
fn list_tasks(state: State<AppState>) -> Result<Vec<Task>, String> {
    let dir = data_dir(&state)?;
    Ok(read_json::<Vec<Task>>(&dir.join("tasks.json")))
}

#[tauri::command]
fn create_task(
    title: String,
    due: String,
    project_id: Option<String>,
    state: State<AppState>,
) -> Result<Task, String> {
    let dir = data_dir(&state)?;
    let path = dir.join("tasks.json");
    let mut list: Vec<Task> = read_json(&path);
    let t = Task {
        id: new_id(),
        title,
        due,
        completed_at: None,
        project_id,
        status: "pending".to_string(),
    };
    list.push(t.clone());
    write_json(&path, &list)?;
    Ok(t)
}

#[tauri::command]
fn toggle_task(id: String, state: State<AppState>) -> Result<Task, String> {
    let dir = data_dir(&state)?;
    let path = dir.join("tasks.json");
    let mut list: Vec<Task> = read_json(&path);
    let mut updated: Option<Task> = None;
    for t in list.iter_mut() {
        if t.id == id {
            if t.completed_at.is_some() {
                t.completed_at = None;
                t.status = "pending".to_string();
            } else {
                let now = now_iso();
                let on_time = match (
                    chrono::DateTime::parse_from_rfc3339(&now),
                    chrono::DateTime::parse_from_rfc3339(&t.due),
                ) {
                    (Ok(n), Ok(d)) => n <= d,
                    _ => true,
                };
                t.completed_at = Some(now);
                t.status = if on_time { "done".to_string() } else { "late".to_string() };
            }
            updated = Some(t.clone());
            break;
        }
    }
    write_json(&path, &list)?;
    updated.ok_or_else(|| "task not found".to_string())
}

#[tauri::command]
fn delete_task(id: String, state: State<AppState>) -> Result<(), String> {
    let dir = data_dir(&state)?;
    let path = dir.join("tasks.json");
    let mut list: Vec<Task> = read_json(&path);
    list.retain(|t| t.id != id);
    write_json(&path, &list)
}

// ---------- Commands: files ----------

#[tauri::command]
fn list_files(state: State<AppState>) -> Result<Vec<FileSummary>, String> {
    let dir = data_dir(&state)?;
    Ok(read_json::<Vec<FileSummary>>(
        &dir.join("files").join("index.json"),
    ))
}

#[tauri::command]
fn create_file(
    name: String,
    project_id: Option<String>,
    state: State<AppState>,
) -> Result<FileSummary, String> {
    let dir = data_dir(&state)?;
    let files_dir = dir.join("files");
    fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;
    let id = new_id();
    let summary = FileSummary {
        id: id.clone(),
        name,
        project_id,
        modified_at: now_iso(),
        preview: None,
    };
    // Empty doc — Phase 4 fills with real blocks
    let empty_doc = serde_json::json!({ "id": id, "blocks": [] });
    fs::write(
        files_dir.join(format!("{id}.json")),
        serde_json::to_string_pretty(&empty_doc).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    let index_path = files_dir.join("index.json");
    let mut list: Vec<FileSummary> = read_json(&index_path);
    list.push(summary.clone());
    write_json(&index_path, &list)?;
    Ok(summary)
}

#[tauri::command]
fn delete_file(id: String, state: State<AppState>) -> Result<(), String> {
    let dir = data_dir(&state)?;
    let files_dir = dir.join("files");
    let _ = fs::remove_file(files_dir.join(format!("{id}.json")));
    let index_path = files_dir.join("index.json");
    let mut list: Vec<FileSummary> = read_json(&index_path);
    list.retain(|f| f.id != id);
    write_json(&index_path, &list)
}

// ---------- Commands: quick capture inbox ----------

#[tauri::command]
fn list_inbox(state: State<AppState>) -> Result<Vec<InboxEntry>, String> {
    let dir = data_dir(&state)?;
    Ok(read_json::<Vec<InboxEntry>>(&dir.join("inbox.json")))
}

#[tauri::command]
fn quick_capture_save(text: String, state: State<AppState>) -> Result<InboxEntry, String> {
    let dir = data_dir(&state)?;
    let path = dir.join("inbox.json");
    let mut list: Vec<InboxEntry> = read_json(&path);
    let entry = InboxEntry {
        id: new_id(),
        text,
        created_at: now_iso(),
    };
    list.push(entry.clone());
    write_json(&path, &list)?;
    Ok(entry)
}

// ---------- Entry ----------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config_path = config_file_path();
    let config = load_config(&config_path);
    if let Some(d) = &config.data_dir {
        let _ = ensure_scaffolding(&PathBuf::from(d));
    }
    let initial_shortcut = config.capture_shortcut.clone();
    let state = AppState {
        config_path,
        config: Mutex::new(config),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        let _ = app.emit("global-quick-capture", ());
                    }
                })
                .build(),
        )
        .manage(state)
        .setup(move |app| {
            // Register the configured (or default) global shortcut on startup
            let shortcut_str = initial_shortcut
                .clone()
                .unwrap_or_else(|| "Ctrl+Shift+Space".to_string());
            if let Ok(s) = Shortcut::from_str(&shortcut_str) {
                let _ = app.global_shortcut().register(s);
            } else {
                eprintln!("[mono] invalid capture shortcut: {shortcut_str}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_data_dir,
            set_ollama_model,
            set_capture_shortcut,
            list_projects,
            create_project,
            delete_project,
            list_events,
            create_event,
            update_event,
            delete_event,
            list_tasks,
            create_task,
            toggle_task,
            delete_task,
            list_files,
            create_file,
            delete_file,
            list_inbox,
            quick_capture_save,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
