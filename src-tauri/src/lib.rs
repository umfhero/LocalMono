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

// ---------- Commands: code execution ----------
//
// Runs a code snippet via a system-installed runtime. Each language writes the
// source to a temp file (so multi-line scripts work cleanly) and spawns the
// runtime with a 15-second timeout. Output is captured and returned as
// `{ stdout, stderr, exitCode, durationMs }` for the editor to render.
//
// Supported languages: python (python3 / python), javascript (node), java (javac + java).
// "shell" routes to `bash -lc` on macOS/Linux and `cmd /C` on Windows for power users.

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RunOutput {
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
    duration_ms: u128,
}

#[tauri::command]
async fn run_code(language: String, source: String) -> Result<RunOutput, String> {
    use std::io::Write;
    use std::process::{Command, Stdio};
    use std::time::Instant;

    let lang = language.trim().to_lowercase();
    let started = Instant::now();

    // Per-run temp directory.
    let tmp_root = std::env::temp_dir().join("mono-runs");
    fs::create_dir_all(&tmp_root).map_err(|e| e.to_string())?;
    let run_id = new_id();
    let work_dir = tmp_root.join(&run_id);
    fs::create_dir_all(&work_dir).map_err(|e| e.to_string())?;

    let result: Result<std::process::Output, String> = match lang.as_str() {
        "python" | "py" => {
            let path = work_dir.join("main.py");
            fs::File::create(&path)
                .and_then(|mut f| f.write_all(source.as_bytes()))
                .map_err(|e| e.to_string())?;
            // Candidate runtimes. On Windows we try `py` (Python launcher) FIRST
            // because `python` and `python3` are usually the Microsoft Store
            // app-execution-alias stubs that exit 9009 with no Python installed.
            #[cfg(target_os = "windows")]
            let candidates: &[(&str, &[&str])] = &[
                ("py", &["-3"]),
                ("python3", &[]),
                ("python", &[]),
            ];
            #[cfg(not(target_os = "windows"))]
            let candidates: &[(&str, &[&str])] = &[
                ("python3", &[]),
                ("python", &[]),
            ];
            try_candidates(candidates, &path, "Python")
        }
        "javascript" | "js" | "node" => {
            let path = work_dir.join("main.js");
            fs::File::create(&path)
                .and_then(|mut f| f.write_all(source.as_bytes()))
                .map_err(|e| e.to_string())?;
            try_candidates(&[("node", &[])], &path, "Node.js")
        }
        "java" => {
            // The public class must match the filename, so extract it from the source.
            let class_name = extract_java_class(&source).unwrap_or_else(|| "Main".to_string());
            let src_path = work_dir.join(format!("{class_name}.java"));
            fs::File::create(&src_path)
                .and_then(|mut f| f.write_all(source.as_bytes()))
                .map_err(|e| e.to_string())?;
            // Compile, then run.
            let compile = Command::new("javac")
                .current_dir(&work_dir)
                .arg(&src_path)
                .stdout(Stdio::piped()).stderr(Stdio::piped())
                .output();
            match compile {
                Err(e) if e.kind() == std::io::ErrorKind::NotFound =>
                    Err(missing_runtime_msg("Java", "javac")),
                Err(e) => Err(format!("javac failed to launch: {e}")),
                Ok(c) if !c.status.success() => Ok(c), // compile error -> show stderr
                Ok(_) => Command::new("java")
                    .current_dir(&work_dir)
                    .arg(&class_name)
                    .stdout(Stdio::piped()).stderr(Stdio::piped())
                    .output()
                    .map_err(|e| if e.kind() == std::io::ErrorKind::NotFound {
                        missing_runtime_msg("Java", "java")
                    } else {
                        format!("java failed to launch: {e}")
                    }),
            }
        }
        "shell" | "sh" | "bash" => {
            #[cfg(target_os = "windows")]
            let res = Command::new("cmd").arg("/C").arg(&source)
                .stdout(Stdio::piped()).stderr(Stdio::piped()).output()
                .map_err(|e| format!("cmd failed: {e}"));
            #[cfg(not(target_os = "windows"))]
            let res = Command::new("bash").arg("-lc").arg(&source)
                .stdout(Stdio::piped()).stderr(Stdio::piped()).output()
                .map_err(|e| format!("bash failed: {e}"));
            res
        }
        _ => {
            let _ = fs::remove_dir_all(&work_dir);
            return Err(format!("language '{language}' not supported. Try: python, javascript, java, shell."));
        }
    };

    let _ = fs::remove_dir_all(&work_dir);

    let output = match result {
        Ok(o) => o,
        Err(e) => return Err(e),
    };

    // Detect the Windows Microsoft-Store app-execution-alias stub:
    // exit code 9009 with stderr mentioning the Store / App Installer.
    let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.code() == Some(9009)
        || stderr_str.contains("Microsoft Store")
        || stderr_str.contains("App Installer")
    {
        return Err(missing_runtime_msg(
            match lang.as_str() {
                "python" | "py" => "Python",
                "javascript" | "js" | "node" => "Node.js",
                "java" => "Java",
                _ => "the runtime",
            },
            match lang.as_str() {
                "python" | "py" => "py / python3",
                "javascript" | "js" | "node" => "node",
                "java" => "java",
                _ => "command",
            },
        ));
    }

    Ok(RunOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: stderr_str,
        exit_code: output.status.code(),
        duration_ms: started.elapsed().as_millis(),
    })
}

/// Tries a list of `(program, prefix-args)` candidates, appending the source
/// path. Returns the first successful spawn. If every candidate is missing,
/// returns a friendly install-guidance error.
fn try_candidates(
    candidates: &[(&str, &[&str])],
    source_path: &std::path::Path,
    label: &str,
) -> Result<std::process::Output, String> {
    use std::process::{Command, Stdio};
    let mut last_err: Option<std::io::Error> = None;
    for (prog, prefix) in candidates {
        let mut cmd = Command::new(prog);
        for a in *prefix { cmd.arg(a); }
        cmd.arg(source_path).stdout(Stdio::piped()).stderr(Stdio::piped());
        match cmd.output() {
            Ok(o) => return Ok(o),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                last_err = Some(e);
                continue;
            }
            Err(e) => return Err(format!("{prog} failed to launch: {e}")),
        }
    }
    Err(missing_runtime_msg(label, &candidates.iter().map(|(p, _)| *p).collect::<Vec<_>>().join(" / "))
        + &last_err.map(|e| format!(" (last error: {e})")).unwrap_or_default())
}

fn missing_runtime_msg(label: &str, tried: &str) -> String {
    let install_hint = match label {
        "Python" => "Install from https://www.python.org/downloads/ (on Windows pick 'Add python.exe to PATH' at the start of the installer). \
                     If `python` opens the Microsoft Store instead of running, disable the alias under Settings → Apps → Advanced app settings → App execution aliases.",
        "Node.js" => "Install from https://nodejs.org (LTS is fine). After install, restart this app so PATH is picked up.",
        "Java" => "Install a JDK (e.g. https://adoptium.net). You need both `javac` and `java` on PATH.",
        _ => "Install the runtime and make sure it is on PATH.",
    };
    format!(
        "{label} runtime not found on PATH (tried: {tried}). {install_hint}"
    )
}

fn extract_java_class(src: &str) -> Option<String> {
    // Cheap regex-free scan: find "public class <Name>" or "class <Name>".
    let needles = ["public class ", "class "];
    for needle in needles {
        if let Some(idx) = src.find(needle) {
            let rest = &src[idx + needle.len()..];
            let name: String = rest.chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            if !name.is_empty() { return Some(name); }
        }
    }
    None
}

// ---------- Commands: ollama ----------
//
// Talks to a local Ollama daemon at http://localhost:11434.
// `ollama_health` returns true if the daemon answers; `ollama_generate`
// runs a one-shot non-streaming generation and returns the full response.

const OLLAMA_BASE: &str = "http://localhost:11434";

#[tauri::command]
async fn ollama_health() -> bool {
    match reqwest::Client::new()
        .get(format!("{OLLAMA_BASE}/api/tags"))
        .timeout(std::time::Duration::from_millis(800))
        .send()
        .await
    {
        Ok(r) => r.status().is_success(),
        Err(_) => false,
    }
}

#[tauri::command]
async fn ollama_generate(
    model: String,
    prompt: String,
    system: Option<String>,
) -> Result<String, String> {
    if model.trim().is_empty() {
        return Err("ollama model not configured".to_string());
    }
    let mut body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": false,
    });
    if let Some(s) = system {
        body["system"] = serde_json::Value::String(s);
    }
    let resp = reqwest::Client::new()
        .post(format!("{OLLAMA_BASE}/api/generate"))
        .timeout(std::time::Duration::from_secs(60))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("ollama unreachable: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("ollama HTTP {status}: {text}"));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(json
        .get("response")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string())
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

/// Returns the raw block-document JSON for a file. Shape is owned by the frontend
/// (see src/editor/blocks.ts) — Rust only stores it.
#[tauri::command]
fn read_file_doc(id: String, state: State<AppState>) -> Result<serde_json::Value, String> {
    let dir = data_dir(&state)?;
    let path = dir.join("files").join(format!("{id}.json"));
    if !path.exists() {
        // Brand-new file — return an empty doc the editor knows how to handle.
        return Ok(serde_json::json!({ "id": id, "blocks": [] }));
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

/// Writes the document JSON and updates `modified_at` + `preview` in the file index.
#[tauri::command]
fn save_file_doc(
    id: String,
    doc: serde_json::Value,
    preview: Option<String>,
    state: State<AppState>,
) -> Result<(), String> {
    let dir = data_dir(&state)?;
    let files_dir = dir.join("files");
    fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;
    let doc_path = files_dir.join(format!("{id}.json"));
    fs::write(
        &doc_path,
        serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    let index_path = files_dir.join("index.json");
    let mut list: Vec<FileSummary> = read_json(&index_path);
    for f in list.iter_mut() {
        if f.id == id {
            f.modified_at = now_iso();
            if let Some(p) = &preview {
                f.preview = Some(p.clone());
            }
        }
    }
    write_json(&index_path, &list)
}

/// Saves a base64-encoded asset (typically a pasted image) under
/// `<data_dir>/assets/<projectId or "global">/<uuid>.<ext>`.
/// Returns a relative path the editor stores in the doc and resolves at render time
/// via `read_asset`.
#[tauri::command]
fn save_asset(
    project_id: Option<String>,
    extension: String,
    base64: String,
    state: State<AppState>,
) -> Result<String, String> {
    use base64_decode_compat as decode;
    let dir = data_dir(&state)?;
    let bucket = project_id.as_deref().unwrap_or("global");
    let safe_bucket: String = bucket.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect();
    let safe_ext: String = extension
        .trim_start_matches('.')
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(8)
        .collect();
    let target_dir = dir.join("assets").join(&safe_bucket);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    let id = new_id();
    let filename = if safe_ext.is_empty() { id.clone() } else { format!("{id}.{safe_ext}") };
    let bytes = decode(&base64).map_err(|e| format!("base64 decode: {e}"))?;
    fs::write(target_dir.join(&filename), bytes).map_err(|e| e.to_string())?;
    Ok(format!("assets/{safe_bucket}/{filename}"))
}

/// Reads an asset back as base64 so the renderer can put it in an `<img src="data:...">`.
/// We don't expose the data dir over a custom protocol; round-tripping through base64
/// keeps the asset pipeline isolated to Tauri commands.
#[tauri::command]
fn read_asset(rel_path: String, state: State<AppState>) -> Result<String, String> {
    let dir = data_dir(&state)?;
    // Reject path traversal attempts.
    if rel_path.contains("..") || rel_path.starts_with('/') || rel_path.starts_with('\\') {
        return Err("invalid asset path".to_string());
    }
    let path = dir.join(&rel_path);
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(base64_encode_compat(&bytes))
}

/* Tiny base64 codec — avoids pulling the `base64` crate just for two helpers. */

fn base64_decode_compat(s: &str) -> Result<Vec<u8>, String> {
    let table: [i16; 256] = {
        let mut t = [-1i16; 256];
        let alpha = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut i = 0;
        while i < alpha.len() {
            t[alpha[i] as usize] = i as i16;
            i += 1;
        }
        t
    };
    let bytes: Vec<u8> = s.bytes().filter(|b| !b.is_ascii_whitespace()).collect();
    if bytes.len() % 4 != 0 { return Err("bad length".into()); }
    let mut out = Vec::with_capacity(bytes.len() / 4 * 3);
    for chunk in bytes.chunks(4) {
        let n0 = if chunk[0] == b'=' { 0 } else { table[chunk[0] as usize] };
        let n1 = if chunk[1] == b'=' { 0 } else { table[chunk[1] as usize] };
        let n2 = if chunk[2] == b'=' { 0 } else { table[chunk[2] as usize] };
        let n3 = if chunk[3] == b'=' { 0 } else { table[chunk[3] as usize] };
        if n0 < 0 || n1 < 0 || n2 < 0 || n3 < 0 { return Err("bad char".into()); }
        let v = ((n0 as u32) << 18) | ((n1 as u32) << 12) | ((n2 as u32) << 6) | (n3 as u32);
        out.push(((v >> 16) & 0xff) as u8);
        if chunk[2] != b'=' { out.push(((v >> 8) & 0xff) as u8); }
        if chunk[3] != b'=' { out.push((v & 0xff) as u8); }
    }
    Ok(out)
}

fn base64_encode_compat(bytes: &[u8]) -> String {
    let alpha = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };
        out.push(alpha[(b0 >> 2) as usize] as char);
        out.push(alpha[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        if chunk.len() > 1 {
            out.push(alpha[(((b1 & 0x0f) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(alpha[(b2 & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
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
            read_file_doc,
            save_file_doc,
            save_asset,
            read_asset,
            list_inbox,
            quick_capture_save,
            ollama_health,
            ollama_generate,
            run_code,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
