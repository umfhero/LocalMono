# App Overview — Working Title: TBD

## What This Is

This is a personal desktop productivity app built specifically for my own workflow, not a general-purpose tool, and that constraint is intentional because ThoughtsPlus suffered from trying to be too many things at once. The core of it is three things that actually talk to each other: a dashboard that gives me a real-time view of what's happening, a note system built around a single flexible file type rather than a mess of extensions, and an event/calendar system that's fast enough to actually use in the moment. The sticky note overlay is the fourth piece that ties it together, because the whole point is that information should stay visible without me having to go find it.

## Why Not ThoughtsPlus

The dashboard in ThoughtsPlus was genuinely good and the event list with overdue highlighting worked well at a glance, so those patterns are worth carrying forward. What didn't work was the workspace, which ended up as a graveyard of different note extensions (whiteboard style, Jupyter style) that never felt coherent, and the event creation flow which required too many steps and too many clicks to actually use regularly. The result was that I kept reaching for sticky notes anyway, which is the signal that the app wasn't solving the right problems.

## Stack

**Tauri + React + Vite** for the desktop shell, with a Rust backend handling file I/O, the system tray, global shortcut listeners, and the always-on-top overlay window. The frontend is where all the actual UI logic lives and it's standard React so nothing unfamiliar there. Tauri over Electron because startup speed matters for the quick-note shortcut use case, and memory footprint matters for something that starts on boot and runs all day.

The data layer is local-first, flat files on disk, with sync handled passively through Google Drive rather than a custom sync engine or cloud API. The approach is simple: on first launch, the user points the app at a folder inside their local Google Drive directory (e.g. `~/Google Drive/AppName/`), and the Drive desktop client handles replication between devices from that point on. This means the desktop and laptop stay in sync for free, with no OAuth flow, no API calls, and no extra infrastructure. Event data and note metadata can live in JSON, the note content itself in a structured format TBD (probably a custom JSON schema rather than raw markdown, since the "god file" needs to store mixed content types with layout).

## Core Features

### Dashboard

The bit that worked in ThoughtsPlus, kept and improved. Shows upcoming events with countdowns, overdue highlighting, and tick-off in place without navigating away. Also shows progress bars for any notes that have a time span attached, so active projects surface here automatically. The connection between notes and the dashboard is what makes this feel like one app rather than separate tools bolted together.

### God File (Notes)

Single file type that handles everything, so the decision of "what kind of note is this" never has to be made upfront. A file called `hackathon.god` (or whatever the extension ends up being) can contain text blocks, tables with a UI edit mode so you're not hand-writing pipes, images, and progress/time spans all in the same document, placed like a Word doc rather than a whiteboard. The layout is page-based rather than infinite canvas because infinite canvas is hard to skim.

Key behaviours:
- **Table UI mode** — clicking a table drops into a spreadsheet-style edit view rather than raw markdown, but the underlying storage is still structured
- **Time spans** — a file can have a start and end date attached, which feeds a progress bar both in the file and on the dashboard
- **Sticky note mode** — any file can be "stickied" to the desktop as an always-on-top overlay, stays editable, and shows key info like dates and progress at a glance without opening the full app

### Quick Note

Global shortcut (system-wide, works when the app is minimised or in the tray) opens a minimal input overlay, jot the idea, press Esc to save and close. The saved note lands in a quick notes inbox on the dashboard or sidebar, from where it can be promoted into a full god file or left as a short entry. This is the feature that has to feel instant or it won't get used.

### Event Management

Template-based quick-add rather than a form with a dozen fields. Two core templates to start:

- **Single event** — title, date, time, optional location, done
- **Project/span event** — title, start date, end date, links to a god file if one exists

Timetable import as a toggleable calendar layer, so recurring weekly schedule can be turned on or off when booking around it. The calendar view itself is secondary to the dashboard, since the dashboard is where events actually get acted on day-to-day.

## Data Model (rough)

```
/data
  /notes
    hackathon.god         ← god file (structured JSON with content blocks)
    quick-notes.god       ← inbox for quick captures
  /events
    events.json           ← flat list of events with metadata
  /timetable
    timetable.json        ← recurring weekly schedule, toggled on/off
  settings.json
```

Each god file stores content as an array of blocks (text, table, image, progress), with file-level metadata (title, created, modified, time span if set, sticky state).

## What's Out of Scope (for now)

- Collaboration or sharing
- Plugin system or extensions
- Mobile companion
- Anything that requires a paid API

## Open Questions

- Whether the app auto-detects the local Google Drive folder path on first launch or just prompts the user to select a folder (manual select is simpler for v1)
- What does the god file extension actually get called
- Whether quick notes live in their own file or as a special block type in a shared inbox file
- Exact behaviour of the sticky note overlay (does it float above all windows including fullscreen, or just above the desktop)
- Whether timetable import is manual JSON entry or parsed from a file (iCal probably makes sense)
- Whether the table UI mode is a custom-built component or built on top of something like TanStack Table
