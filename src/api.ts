import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";

export const runningInTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// ---------- Window ----------

export async function minimizeWindow(): Promise<void> {
  if (!runningInTauri) return;
  await getCurrentWindow().minimize();
}

// ---------- Types (mirror src-tauri/src/lib.rs) ----------

export interface AppConfig {
  dataDir?: string;
  ollamaModel?: string;
  captureShortcut?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  start: string;
  end: string;
  activityPct: number;
  fileCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "single" | "repeating" | "long-term" | "timetable";
  color?: string;
  projectId?: string;
  location?: string;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  completedAt?: string;
  projectId?: string;
  status: "pending" | "done" | "late" | "missed" | "early";
}

export interface FileSummary {
  id: string;
  name: string;
  projectId?: string;
  modifiedAt: string;
  preview?: string;
}

export interface InboxEntry {
  id: string;
  text: string;
  createdAt: string;
}

// ---------- Helpers ----------

function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!runningInTauri) {
    return Promise.reject(new Error(`Tauri command ${cmd} called outside Tauri`));
  }
  return invoke<T>(cmd, args);
}

// ---------- Config ----------

export async function getConfig(): Promise<AppConfig> {
  return call<AppConfig>("get_config");
}

export async function pickDataDir(): Promise<string | null> {
  if (!runningInTauri) return null;
  const picked = await open({ directory: true, multiple: false });
  if (!picked || typeof picked !== "string") return null;
  return picked;
}

export async function setDataDir(path: string): Promise<AppConfig> {
  return call<AppConfig>("set_data_dir", { path });
}

export async function setOllamaModel(model: string): Promise<AppConfig> {
  return call<AppConfig>("set_ollama_model", { model });
}

export async function setCaptureShortcut(shortcut: string): Promise<AppConfig> {
  return call<AppConfig>("set_capture_shortcut", { shortcut });
}

// ---------- Projects ----------

export async function listProjects(): Promise<Project[]> {
  return call<Project[]>("list_projects");
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  start: string;
  end: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return call<Project>("create_project", input as unknown as Record<string, unknown>);
}

export async function deleteProject(id: string): Promise<void> {
  return call<void>("delete_project", { id });
}

// ---------- Events ----------

export async function listEvents(): Promise<CalendarEvent[]> {
  return call<CalendarEvent[]>("list_events");
}

export async function createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  return call<CalendarEvent>("create_event", { event: { id: "", ...event } });
}

export async function deleteEvent(id: string): Promise<void> {
  return call<void>("delete_event", { id });
}

export async function updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
  return call<CalendarEvent>("update_event", { event });
}

// ---------- Tasks ----------

export async function listTasks(): Promise<Task[]> {
  return call<Task[]>("list_tasks");
}

export async function createTask(input: { title: string; due: string; projectId?: string }): Promise<Task> {
  // Filter out undefined fields — Tauri doesn't handle undefined well in some versions.
  const args: Record<string, unknown> = { title: input.title, due: input.due };
  if (input.projectId) args.projectId = input.projectId;
  return call<Task>("create_task", args);
}

export async function toggleTask(id: string): Promise<Task> {
  return call<Task>("toggle_task", { id });
}

export async function deleteTask(id: string): Promise<void> {
  return call<void>("delete_task", { id });
}

// ---------- Files ----------

export async function listFiles(): Promise<FileSummary[]> {
  return call<FileSummary[]>("list_files");
}

export async function createFile(input: { name: string; projectId?: string }): Promise<FileSummary> {
  return call<FileSummary>("create_file", input);
}

export async function deleteFile(id: string): Promise<void> {
  return call<void>("delete_file", { id });
}

// Block-document persistence (Phase 4 editor).
// The doc shape is owned by the frontend (see src/editor/blocks.ts).
export async function readFileDoc(id: string): Promise<unknown> {
  return call<unknown>("read_file_doc", { id });
}

export async function saveFileDoc(input: { id: string; doc: unknown; preview?: string }): Promise<void> {
  const args: Record<string, unknown> = { id: input.id, doc: input.doc };
  if (input.preview !== undefined) args.preview = input.preview;
  return call<void>("save_file_doc", args);
}

// Pasted images get sent to Rust as base64 + extension; Rust writes them under
// `assets/<projectId or "global">/<uuid>.<ext>` and returns the relative path the doc stores.
export async function saveAsset(input: { projectId?: string; extension: string; base64: string }): Promise<string> {
  const args: Record<string, unknown> = { extension: input.extension, base64: input.base64 };
  if (input.projectId) args.projectId = input.projectId;
  return call<string>("save_asset", args);
}

export async function readAsset(relPath: string): Promise<string> {
  return call<string>("read_asset", { relPath });
}

// ---------- Ollama ----------

export async function ollamaHealth(): Promise<boolean> {
  if (!runningInTauri) return false;
  return call<boolean>("ollama_health");
}

export async function ollamaGenerate(input: { model: string; prompt: string; system?: string }): Promise<string> {
  const args: Record<string, unknown> = { model: input.model, prompt: input.prompt };
  if (input.system) args.system = input.system;
  return call<string>("ollama_generate", args);
}

// ---------- Inbox / Quick Capture ----------

export async function listInbox(): Promise<InboxEntry[]> {
  return call<InboxEntry[]>("list_inbox");
}

export async function quickCaptureSave(text: string): Promise<InboxEntry> {
  return call<InboxEntry>("quick_capture_save", { text });
}
