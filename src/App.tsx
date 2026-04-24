import { useEffect, useState } from "react";
import { Sidebar, type Page } from "./components/Sidebar";
import { QuickCapture } from "./components/QuickCapture";
import { Dashboard } from "./pages/Dashboard";
import { FilesPage } from "./pages/Files";
import { ProjectsPage } from "./pages/Projects";
import { EventsPage } from "./pages/Events";
import { SettingsPage } from "./pages/Settings";
import { colors } from "./theme/tokens";

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [captureOpen, setCaptureOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        setCaptureOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", backgroundColor: colors.bgMain, color: colors.textMain }}>
      <Sidebar
        active={page}
        onChange={setPage}
        onQuickCapture={() => setCaptureOpen(true)}
      />
      <main style={{ flex: 1, minWidth: 0, height: "100vh", overflow: "hidden" }}>
        {page === "dashboard" && <Dashboard />}
        {page === "files" && <FilesPage />}
        {page === "projects" && <ProjectsPage />}
        {page === "events" && <EventsPage />}
        {page === "settings" && <SettingsPage />}
      </main>

      <QuickCapture
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onSave={(text) => { console.log("captured:", text); /* Phase 2: persist via Tauri */ }}
      />
    </div>
  );
}

export default App;
