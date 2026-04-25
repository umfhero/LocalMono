import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Sidebar, type Page } from "./components/Sidebar";
import { QuickCapture } from "./components/QuickCapture";
import { Dashboard } from "./pages/Dashboard";
import { FilesPage } from "./pages/Files";
import { ProjectsPage } from "./pages/Projects";
import { ProjectWorkspace } from "./pages/ProjectWorkspace";
import { FileEditor } from "./pages/FileEditor";
import { EventsPage } from "./pages/Events";
import { SettingsPage } from "./pages/Settings";
import { CreateProjectDialog } from "./components/dialogs/CreateProjectDialog";
import { EventSidePanel } from "./components/dialogs/CreateEventDialog";
import { CreateTaskDialog } from "./components/dialogs/CreateTaskDialog";
import { CreateFileDialog } from "./components/dialogs/CreateFileDialog";
import { colors } from "./theme/tokens";
import * as api from "./api";
import type { CalendarEvent } from "./api";

const DEFAULT_SHORTCUT = "Ctrl+Shift+Space";

function shortcutMatches(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split("+").map((s) => s.trim());
  const needsCtrl = parts.includes("Ctrl");
  const needsShift = parts.includes("Shift");
  const needsAlt = parts.includes("Alt");
  const needsMeta = parts.includes("Cmd") || parts.includes("Meta");
  const keyPart = parts.find((p) => !["Ctrl", "Shift", "Alt", "Cmd", "Meta"].includes(p)) ?? "";
  if (e.ctrlKey !== needsCtrl) return false;
  if (e.shiftKey !== needsShift) return false;
  if (e.altKey !== needsAlt) return false;
  if (e.metaKey !== needsMeta) return false;
  const key = e.key === " " || e.code === "Space" ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  return key === keyPart;
}

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [createProject, setCreateProject] = useState(false);
  const [eventPanelOpen, setEventPanelOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [createTask, setCreateTask] = useState(false);
  const [createFile, setCreateFile] = useState(false);
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT);

  // When set, the Projects page renders ProjectWorkspace for this id instead of the list.
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  // When set, the Files page renders the FileEditor instead of the list.
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  // Per-dialog default projectId, set when a workspace fires a create-X event.
  const [dialogDefaultProjectId, setDialogDefaultProjectId] = useState<string | undefined>(undefined);

  const navigateTo = (p: Page) => {
    if (p !== "projects") setOpenProjectId(null);
    if (p !== "files") setOpenFileId(null);
    setPage(p);
  };

  // Track whether the current session was opened via the global shortcut.
  const shortcutInvokedRef = useRef(false);

  useEffect(() => {
    if (api.runningInTauri) {
      api.getConfig().then((c) => {
        if (c.captureShortcut) setShortcut(c.captureShortcut);
      }).catch(() => {});
    }
  }, []);

  // In-app shortcut (works while window focused)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shortcutMatches(e, shortcut)) {
        e.preventDefault();
        setCaptureOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  // System-wide shortcut event from Rust (works when minimised)
  useEffect(() => {
    if (!api.runningInTauri) return;
    let unlisten: (() => void) | undefined;
    listen("global-quick-capture", () => {
      shortcutInvokedRef.current = true;
      setCaptureOpen(true);
    }).then((u) => { unlisten = u; });
    return () => { unlisten?.(); };
  }, []);

  // Global ESC handler — when nothing is open and the window was opened via
  // shortcut, pressing ESC minimizes immediately.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (captureOpen || createProject || eventPanelOpen || createTask || createFile) return;
      if (shortcutInvokedRef.current) {
        e.preventDefault();
        shortcutInvokedRef.current = false;
        api.minimizeWindow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureOpen, createProject, eventPanelOpen, createTask, createFile]);

  // When QuickCapture closes and the window was opened via shortcut → minimize instantly.
  const handleCaptureClose = () => {
    setCaptureOpen(false);
    if (shortcutInvokedRef.current) {
      shortcutInvokedRef.current = false;
      api.minimizeWindow();
    }
  };

  // Open event panel for creating a new event
  const openNewEvent = () => {
    setEditingEvent(null);
    setEventPanelOpen(true);
  };

  // Open event panel for editing an existing event
  const openEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventPanelOpen(true);
  };

  const closeEventPanel = () => {
    setEventPanelOpen(false);
    setEditingEvent(null);
  };

  // Cross-app create-X events from widgets / pages.
  // CustomEvent detail may carry { projectId } to pre-fill the dialog.
  useEffect(() => {
    const pickProjectId = (e: Event): string | undefined => {
      const d = (e as CustomEvent).detail;
      return d && typeof d === "object" && typeof d.projectId === "string" ? d.projectId : undefined;
    };
    const onCreateProject = () => { setDialogDefaultProjectId(undefined); setCreateProject(true); };
    const onCreateEvent = (e: Event) => { setDialogDefaultProjectId(pickProjectId(e)); openNewEvent(); };
    const onCreateTask = (e: Event) => { setDialogDefaultProjectId(pickProjectId(e)); setCreateTask(true); };
    const onCreateFile = (e: Event) => { setDialogDefaultProjectId(pickProjectId(e)); setCreateFile(true); };
    const onEditEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) openEditEvent(detail);
    };
    const onOpenProject = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.projectId === "string") {
        setOpenProjectId(detail.projectId);
        setPage("projects");
      }
    };
    const onOpenFile = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.fileId === "string") {
        setOpenFileId(detail.fileId);
        setPage("files");
      }
    };
    window.addEventListener("mono:create-project", onCreateProject);
    window.addEventListener("mono:create-event", onCreateEvent);
    window.addEventListener("mono:edit-event", onEditEvent);
    window.addEventListener("mono:create-task", onCreateTask);
    window.addEventListener("mono:create-file", onCreateFile);
    window.addEventListener("mono:open-project", onOpenProject);
    window.addEventListener("mono:open-file", onOpenFile);
    return () => {
      window.removeEventListener("mono:create-project", onCreateProject);
      window.removeEventListener("mono:create-event", onCreateEvent);
      window.removeEventListener("mono:edit-event", onEditEvent);
      window.removeEventListener("mono:create-task", onCreateTask);
      window.removeEventListener("mono:create-file", onCreateFile);
      window.removeEventListener("mono:open-project", onOpenProject);
      window.removeEventListener("mono:open-file", onOpenFile);
    };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", backgroundColor: colors.bgMain, color: colors.textMain }}>
      <Sidebar active={page} onChange={navigateTo} />
      <main style={{ flex: 1, minWidth: 0, height: "100vh", overflow: "hidden" }}>
        {page === "dashboard" && <Dashboard />}
        {page === "files" && (
          openFileId
            ? <FileEditor fileId={openFileId} onBack={() => setOpenFileId(null)} />
            : <FilesPage />
        )}
        {page === "projects" && (
          openProjectId
            ? <ProjectWorkspace projectId={openProjectId} onBack={() => setOpenProjectId(null)} />
            : <ProjectsPage />
        )}
        {page === "events" && <EventsPage />}
        {page === "settings" && <SettingsPage />}
      </main>

      <QuickCapture open={captureOpen} onClose={handleCaptureClose} />
      <CreateProjectDialog open={createProject} onClose={() => setCreateProject(false)} />
      <EventSidePanel open={eventPanelOpen} onClose={closeEventPanel} editEvent={editingEvent} defaultProjectId={dialogDefaultProjectId} />
      <CreateTaskDialog open={createTask} onClose={() => setCreateTask(false)} defaultProjectId={dialogDefaultProjectId} />
      <CreateFileDialog open={createFile} onClose={() => setCreateFile(false)} defaultProjectId={dialogDefaultProjectId} />
    </div>
  );
}

export default App;
