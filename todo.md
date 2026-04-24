# Mono — build plan

Legend: `[x]` done · `[~]` in progress · `[ ]` pending

---

## Phase 1 — UI restart (DONE)
- [x] Dark VSCode shell, sidebar, routing
- [x] Draggable/resizable widget grid with layout persistence
- [x] Widgets: Briefing, TaskTrendGraph, LinearCalendar, TodayTasks, ActiveProjects, RecentFiles
- [x] Quick Capture overlay (Ctrl+Shift+Space)
- [x] Settings placeholder page

### Phase 1 polish (in progress)
- [~] Global accent → red
- [~] Sidebar: hover-expand with labels
- [~] Default dashboard layout fits every widget on a 1200×800 window without scroll
- [~] Trend graph: origin node at (0,0); predictive grey-dashed segments for pending (future) tasks; period tabs (Today/1W/1M/ALL) actually filter data
- [ ] ResponsiveGridLayout so widgets reflow to a tighter grid on smaller windows
- [ ] Compact briefing variant so all sections share one row

---

## Phase 2 — Rust/Tauri backend (in progress)
- [~] Cargo deps: `tauri-plugin-fs`, `tauri-plugin-dialog`, `chrono`, `uuid`, `dirs`
- [~] Storage layer (read/write JSON to user-chosen data dir)
- [~] Settings persistence (`~/.config/mono/config.json` → `data_dir`)
- [~] Commands: `get_config`, `set_data_dir`, `list_projects`, `create_project`, `list_files`, `read_file`, `write_file`, `list_events`, `create_event`, `quick_capture_save`, `list_inbox`
- [~] TypeScript `api.ts` wrapper (with mock fallback while `data_dir` unset)
- [~] Settings page: real folder picker, init/merge logic
- [~] Quick Capture persists to inbox
- [ ] Drive-folder pull/merge: if target folder already has Mono data, hydrate; last-write-wins on conflicts
- [ ] Separate Tauri window for global Quick Capture (so it works when app is minimised)

---

## Phase 3 — Files & Projects pages
- [ ] Project create dialog (name, description, icon picker, color picker, start/end date)
- [ ] Project workspace view (files list, progress bars, links)
- [ ] Files page: list, search, create, delete
- [ ] Folders / project nesting
- [ ] Link files to projects

## Phase 4 — Unified note editor
- [ ] Page-based document
- [ ] Paste-anything (text, images, code)
- [ ] Draggable / resizable inline images
- [ ] Code cells (show as compact chip inline, open side panel on click)
- [ ] Code cell side panel: editor + run + output
- [ ] Tables
- [ ] Image storage in hidden project asset folder

## Phase 5 — Events & timetable
- [ ] Event types: single, repeating, long-term
- [ ] Timetable layer (togglable)
- [ ] Month / week / linear views
- [ ] NLP add via local Ollama ("add weekly social Friday 5pm")

## Phase 6 — Sticky note windows
- [ ] Multiple Tauri windows, one per pinned file/project
- [ ] File preview (title, progress bars, side-note inbox) — not a live editor
- [ ] Hover-to-reveal invisible mode
- [ ] Customisable appearance per sticky
- [ ] Side-note inbox syncs back to the file

## Phase 7 — Automation & AI
- [ ] Global shortcut config (mouse side button + keyboard)
- [ ] Ollama integration (model config in settings)
- [ ] Multiple briefing generators (day, week, projects, university)
- [ ] Auto-file quick captures into last-opened project
- [ ] Auto-surface TODO lines in notes as tasks
