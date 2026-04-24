# LocalMono Architecture & State

**Tech Stack**: Tauri v2, React, TypeScript, Vite, `lucide-react`, `framer-motion`, `@tanstack/react-table`.

## Core Philosophy & Design (Terminal-Flat)
- **High-density, IDE-inspired UI**. No drop shadows, minimal padding, 1px borders (`#333333`).
- **Colors**: Background `#161616`, Cards `#1c1c1c`, Text `#e0e0e0`, Accent `#007acc`, Urgent `#f44747`.
- **Typography**: `Inter` for UI, `JetBrains Mono` for data/tables.
- **Interactions**: Linear 80ms transitions (no bounce). Active states indicated by a 2px vertical accent bar.

## App Structure
1. **Dashboard**: Central hub for upcoming events (countdowns, overdue alerts) and active project progress bars.
2. **God Files (.god)**: Single file type for all notes. Structured JSON array of blocks (text, table, image). Page-based layout. Supports time spans (feeds dashboard) and spreadsheet-like table editing.
3. **Quick Note**: System-wide global shortcut opening a minimal input overlay. Saves to an inbox.
4. **Events**: Template-based quick-add (single event or project span). Includes a toggleable timetable calendar layer.
5. **Sticky Note Mode**: Any God File can be pinned as an always-on-top, `#161616` background overlay window via Tauri.

## Data Model (Local-First)
All data lives in flat files within a user-selected directory (intended for passive Google Drive sync).
```text
/data
  /notes/          -> .god files (JSON blocks) and quick-notes inbox
  /events/         -> events.json
  /timetable/      -> timetable.json
  settings.json
```
Reads/writes handled entirely via Rust `#[tauri::command]` backend functions.

## Current State
- Scaffolded Tauri v2 + React shell.
- `src/index.css` contains all design system variables and global styles.
- `src-tauri/tauri.conf.json` configured (1200x800 default, 900x600 min).
- `src/App.tsx` contains the foundational layout: Sidebar navigation with Lucide icons and the 4 main placeholder views (Dashboard, Notes, Events, Quick Note).
