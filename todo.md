# Mono — build plan

Legend: `[x]` done · `[~]` in progress · `[ ]` pending

---

## Phase 1 — UI restart (DONE)
- [x] Dark VSCode shell, sidebar, routing
- [x] Draggable/resizable widget grid with layout persistence
- [x] Widgets: Briefing, TaskTrendGraph, LinearCalendar, TodayTasks, ActiveProjects, RecentFiles
- [x] Quick Capture overlay (Ctrl+Shift+Space)
- [x] Settings placeholder page

### Phase 1 polish (DONE)
- [x] Global accent → red
- [x] Sidebar: hover-expand with labels
- [x] Default dashboard layout fits every widget on a 1200×800 window
- [x] Trend graph: origin node at (0,0); predictive grey-dashed segments for pending; period tabs filter data

### Round-2 polish (DONE)
- [x] Trend graph: pending nodes follow +1 predictive slope; SVG `<title>` tooltips on every node; "Score" axis label removed (was overlapping y-tick numbers)
- [x] Active projects: removed per-project card border, flatter inline rows, padding fix, "+ New project" button at bottom (Phase 3 hooks the dialog)
- [x] Linear calendar: natural-height rows (no empty filler below events); richer hover tooltips; view-range toggle (1W / 2W / 1M / 1Y / ALL)
- [x] Dashboard: new layout — Today + Calendar share the left, Briefing/RecentFiles/ActiveProjects stack on the right, TaskTrend full-width at the bottom; ResizeObserver-based grid width so fullscreen never overflows; reset-layout button in edit mode; tighter `WidgetShell` chrome (`dense`)
- [x] QuickCapture: keystroke handler stable across re-renders, always closes on Esc/Ctrl+Enter even when save fails, error state surfaces in the header
- [x] Sidebar: removed quick-capture button — pure shortcut (Ctrl+Shift+Space)

### Round-3 polish (DONE)
- [x] New compact default layout (v4): Today w=3 h=5 + Calendar w=4 h=5 on the left, Briefing/RecentFiles/ActiveProjects each w=5 h=4 on the right (right column gets the bulk of width per second screenshot), TaskTrend w=12 h=5 below the fold
- [x] Linear calendar: long ranges (1M / 1Y / ALL) now scroll horizontally instead of crushing day cells — `minWidth = dayCount × minDayW`, container has `overflow-x: auto`
- [x] Today widget: "+ Add task or event" button at the bottom (Phase 5 will hook the dialog)
- [x] QuickCapture flash timing fix: `didFail` local captures the failure path correctly instead of reading stale `flash` state — error now visible for ~900ms before close
- [x] Settings: new "Shortcuts" section with key-recording field for Quick capture; persists to backend
- [x] Backend: `captureShortcut` field in `AppConfig`, `set_capture_shortcut` command
- [x] App.tsx: in-app shortcut handler reads `captureShortcut` from config — changing it in Settings takes effect on next launch (still in-app only until Phase 7's global hotkey)

### Round-4 polish (DONE)
- [x] Calendar bug: store per-list mock fallback replaced — once `dataDir` is set, real backend data is always used (even if a list is empty). Calendar now shows real events, not mocks.
- [x] Rust `read_json` now logs deserialization errors to stderr instead of silently returning empty
- [x] ESC-to-minimize from shortcut: when app is opened via global shortcut and QuickCapture closes (ESC/Ctrl+Enter/empty), the window instantly minimizes. Also: bare ESC with no modal open minimizes if opened via shortcut.
- [x] QuickCapture close is now instant: save is fire-and-forget (no 160ms delay), ESC → close → minimize happens in <1 frame
- [x] Tauri capabilities: added `core:window:allow-minimize`, `allow-set-focus`, `allow-show`, `allow-unminimize` for programmatic window control

### Known gaps
- [x] Global system-wide shortcut (works when app is minimised) — done in Phase 2c
- [x] Editable event modal (click event → edit times/day) — Phase 5
- [ ] Timetable import: Separate flow to import timetables instead of creating them manually.
- [ ] ResponsiveGridLayout breakpoints for tiny windows — future polish
- [ ] Widget add/remove UI in edit mode — future polish
- [ ] Reload shortcut without restart (currently App.tsx loads config once)

---

## Phase 2 — Rust/Tauri backend

### Phase 2a (DONE)
- [x] Cargo deps: `tauri-plugin-fs`, `tauri-plugin-dialog`, `chrono`, `uuid`, `dirs`
- [x] Rust state: config loaded from `~/.config/mono/config.json`
- [x] Storage layer: `ensure_scaffolding` initialises `projects.json`, `events.json`, `inbox.json`, `files/index.json` in the chosen data dir
- [x] Commands: `get_config`, `set_data_dir`, `set_ollama_model`, `list_projects`, `create_project`, `delete_project`, `list_events`, `create_event`, `list_files`, `list_inbox`, `quick_capture_save`
- [x] Capabilities: dialog + fs permissions allowed

### Phase 2b (DONE)
- [x] Frontend `api.ts` — typed wrappers + `runningInTauri` guard so browser-mode still loads
- [x] Settings page: real folder picker (`@tauri-apps/plugin-dialog`), live config, model save, status banners
- [x] Quick Capture: persists via `quick_capture_save`, flash confirmation, supports both Esc and Ctrl+Enter

### Phase 2c (DONE)
- [x] Frontend `StoreProvider` (React context) holds projects/events/tasks/files/inbox/config; reloads via Rust commands; falls back to mock data when `data_dir` is unset OR when a list is empty (so the dashboard isn't empty on first run)
- [x] Widgets read from store: `ActiveProjects`, `RecentFiles`, `LinearCalendar`, `TodayTasks`, `TaskTrendGraph`
- [x] Global window event bus: widgets dispatch `mono:create-{project|event|task|file}`; App.tsx mounts the relevant dialog
- [x] Drive-folder hydrate is implicit: `set_data_dir` runs `ensure_scaffolding` (creates only missing files), so pointing at a folder that already has Mono data hydrates from it on next launch
- [x] System-wide Quick Capture: `tauri-plugin-global-shortcut` registers the configured shortcut on launch; on press the main window unminimises + focuses + the frontend listens for the `global-quick-capture` Tauri event and opens the QuickCapture overlay; changing the shortcut in Settings hot-swaps the registration

---

## Phase 3 — Files & Projects pages (LARGELY DONE)
- [x] Project create dialog (name, description, icon picker, color picker, start/end date)
- [x] Files page: list, search, project filter, create, delete
- [x] Link files to projects (project select in create dialog)
- [x] Reusable `Modal` + `CreateProjectDialog` / `CreateEventDialog` / `CreateTaskDialog` / `CreateFileDialog` primitives
- [ ] Project workspace view (click a project → see its files + linked events) — next iteration
- [ ] Folders / project nesting — next iteration

## Phase 4 — Unified note editor
- [ ] Page-based document
- [ ] Paste-anything (text, images, code)
- [ ] Draggable / resizable inline images
- [ ] Code cells (compact chip inline → side panel on click)
- [ ] Code cell side panel: editor + run + output
- [ ] Tables
- [ ] Image storage in hidden project asset folder

## Phase 5 — Events & timetable
- [x] Event types: single, repeating, long-term, timetable (type selector in create dialog)
- [x] Events page with embedded LinearCalendar, upcoming/all/past filter, list with type icons + color swatches + delete
- [ ] Timetable layer (togglable on dashboard calendar)
- [ ] Month / week views
- [ ] Click event → edit modal
- [ ] NLP add via local Ollama ("add weekly social Friday 5pm") — depends on Phase 7 Ollama wiring

## Phase 6 — Sticky note windows
- [ ] Multiple Tauri windows, one per pinned file/project
- [ ] File preview (title, progress bars, side-note inbox) — not a live editor
- [ ] Hover-to-reveal invisible mode
- [ ] Customisable appearance per sticky
- [ ] Side-note inbox syncs back to the file

## Phase 7 — Automation & AI
- [x] Global shortcut config (keyboard via `tauri-plugin-global-shortcut`); editable in Settings; persists to config; hot-swap registration
- [ ] Mouse side-button binding (browsers/Tauri don't expose extra mouse buttons through `KeyboardEvent` — needs raw input handling)
- [ ] Ollama integration (HTTP to `localhost:11434/api/generate`, model from settings)
- [ ] Multiple briefing generators (day, week, projects, university) — currently mock text in Briefing widget
- [ ] Auto-file quick captures into last-opened project
- [ ] Auto-surface TODO lines in notes as tasks
