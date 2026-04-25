# Mono — build plan

Legend: `[x]` done · `[~]` in progress · `[ ]` pending

---

## Outstanding from notes.md (next round)
- [x] Sidebar: bigger icons (26px), wider expand width (200px) and proximity-based expand (cursor within 80px of left edge triggers it; only collapses once cursor moves past the expanded width)
- [x] Project page: bigger cards (min 360px wide, min 200px tall), file count + done/total task count chips, Tasks progress bar replaces synthetic Activity, time bar still shown; description clamped to 2 lines
- [x] Briefing: UK English, no hyphens/em-dashes; sections for completed / upcoming / missed; auto-regen on store change
- [x] Code cells: pre-installed languages Python / JavaScript / Java + Shell + custom; toolbar at top; Run + output; syntax colouring per language
- [x] Code panel split-screen toggle
- [x] File page wider content area, less margin
- [x] Image: click to lightbox, corner-drag resize
- [ ] **Click task in project workspace → open task note**: tasks currently have no associated note file. Plan: add `note_file_id` to Task; on first click create or open the note file linked to the task via the editor. Touches Rust `Task` struct, `toggle_task` / `create_task` commands, `ProjectWorkspace.tsx` task row, `FileEditor.tsx` route. Defer until after image-edit canvas
- [ ] **Image editing canvas (drawing, text, cropping, free positioning on the page)**: a real drawable image editor is a substantial subsystem. Plan: side-panel canvas backed by a `fabric.js`-style layer system or a custom small wrapper around `<canvas>`; commit edited PNG back to the asset; layered annotations stored in the block alongside `assetPath`. Cropping = re-encode and replace asset. Free positioning = absolute layout layer for the doc. Treat as Phase 4.5

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
- [x] Project workspace view: click a project (Projects page card or ActiveProjects widget row) → three-column workspace with linked files / events / tasks; per-section "+ Add" pre-fills the projectId in the create dialog; "← Projects" back button; cross-app `mono:open-project` event opens any project from anywhere
- [ ] Folders / project nesting — next iteration

## Phase 4 — Unified note editor (MVP DONE + polish round)

**Polish round (notes.md feedback):**
- [x] Editor content area widened: max-width 1100 (was 720), 36px gutter; in split-screen mode the column flexes
- [x] Code cells overhaul: top toolbar with Python / JavaScript / Java / Shell preset language tabs + a custom-language input. Run button executes via `run_code` (Rust spawns system runtime). Output panel shows stdout/stderr/exit/duration. Browser-mode JS falls back to a `new Function` sandbox so it still works without Tauri
- [x] Syntax highlighting (`src/editor/highlight.ts`): tiny regex-based tokeniser (no deps) for Python, JS/TS, Java, Shell — keywords, strings, comments, numbers, function names, type names. Rendered as a `<pre>` overlay behind a transparent `<textarea>` so caret + selection still work. CSS classes `.lm-syn-*` in index.css; tweak colours there
- [x] Code panel split-screen toggle: a `Columns2` icon in the toolbar swaps between docked-right (480px) and split-screen (50/50)
- [x] Image: click any image to open a fullscreen lightbox (Esc closes); bottom-right corner drag handle resizes between 20–100% of column width; current width shown as a `%` chip in the bottom-left

- [x] Page-based block document (`src/editor/blocks.ts`): paragraph / heading (h1-h3) / image / code variants. Stored as JSON at `<data_dir>/files/<id>.json` via Rust `read_file_doc` + `save_file_doc` (saves preview + bumps modifiedAt). Frontend coerces malformed docs.
- [x] FileEditor page (`src/pages/FileEditor.tsx`) opens via `mono:open-file` event from Files page, ProjectWorkspace file rows, and dashboard RecentFiles widget. Auto-save 600ms debounce with idle/saving/saved/error indicator.
- [x] Slash menu: type `/` at the start of a block → menu with Paragraph / H1 / H2 / H3 / Code / Image options. Enter creates new paragraph; Backspace on empty block deletes it.
- [x] Paste-anything: pasted text with newlines → split into paragraphs after the focused block; pasted image → uploaded via `save_asset` to `<data_dir>/assets/<projectId or "global">/<uuid>.<ext>` and inserted as image block. Single-line text pastes fall through to default contentEditable behaviour.
- [x] Code cells: render as a one-line chip (language + line count) inline in the doc; clicking opens the side panel.
- [x] Code cell side panel: textarea editor + editable language tag + close button. Run / output is stubbed (notice banner) — execution requires sandbox/runtime, deferred.
- [x] Image storage in hidden asset folder: `<data_dir>/assets/<projectId or "global">/`. `read_asset` round-trips to a base64 data URL in the renderer (path traversal blocked at the Rust boundary; tiny in-tree base64 codec, no extra deps).
- [ ] Draggable / resizable inline images — deferred (current images render at natural width, max 100%)
- [ ] Tables — deferred (scope explosion; revisit after richer text formatting)
- [ ] Code execution (run + output) — deferred (needs language runtimes / sandbox)
- [ ] Rename file from header — currently the title in the editor is read-only; rename UI + `rename_file` Rust command pending

## Phase 5 — Events & timetable
- [x] Event types: single, repeating, long-term, timetable (type selector in create dialog)
- [x] Events page with embedded LinearCalendar, upcoming/all/past filter, list with type icons + color swatches + delete
- [x] Timetable layer toggle: LinearCalendar's `events / timetable / projects` layer chips already filter the timeline; the timetable chip independently controls visibility of `type === "timetable"` events across all three views.
- [x] Month / week views: LinearCalendar gained a `linear / week / month` view-mode tab strip. Week view is a Mon–Sun grid with hour-positioned event blocks (06:00–22:00, 28px/hour); month view is a 7×6 calendar grid with up to 3 event chips per cell + "+N more". Both honour the layer toggles and forward `onEventClick` to the existing edit panel.
- [x] Click event → edit modal: events on every view (linear bar, week block, month chip, list row) dispatch `mono:edit-event` → opens the existing EventSidePanel in edit mode.
- [x] NLP add via local Ollama: Events page has a sparkle-prefixed input (`Try: "add weekly social Friday 5pm at the Anchor"`); on Enter it calls Ollama with `EVENT_NLP_SYSTEM` (in `src/llm/prompts.ts`), parses the JSON response with `parseEventJson` (strips fences, finds `{...}`, validates dates), and creates the event.

## Phase 6 — Sticky note windows
- [ ] Multiple Tauri windows, one per pinned file/project
- [ ] File preview (title, progress bars, side-note inbox) — not a live editor
- [ ] Hover-to-reveal invisible mode
- [ ] Customisable appearance per sticky
- [ ] Side-note inbox syncs back to the file

## Phase 7 — Automation & AI
- [x] Global shortcut config (keyboard via `tauri-plugin-global-shortcut`); editable in Settings; persists to config; hot-swap registration
- [ ] Mouse side-button binding (browsers/Tauri don't expose extra mouse buttons through `KeyboardEvent` — needs raw input handling)
- [x] Ollama integration: Rust `ollama_health` + `ollama_generate` commands (reqwest, non-streaming, 60s timeout) hitting `localhost:11434`; frontend wrappers in `api.ts`; uses `config.ollamaModel`
- [x] Briefing widget v2: British English; structured into completed (last 7 days), upcoming today, upcoming this week, upcoming events, missed/overdue, and per-project task progress (done/total + %); auto-regenerates on store changes (debounced 800ms) so toggling a task or creating an event refreshes the brief live; system message bans hyphens, em/en dashes, markdown
- [ ] Multiple briefing generators (day, week, projects, university) — currently single rolling briefing; per-section pages are next
- [x] Code execution (Phase 4 split-out): Rust `run_code` command spawns system runtimes for python (python3 / python), javascript (node), java (javac + java), and shell (bash -lc / cmd /C); writes source to a temp file in `<temp>/mono-runs/<id>/`; output captured as `{ stdout, stderr, exitCode, durationMs }`; Run button in the code side panel; browser mode falls back to in-page JS sandbox (`new Function`) for JavaScript only
- [ ] Auto-file quick captures into last-opened project
- [ ] Auto-surface TODO lines in notes as tasks
