import { useState, useEffect } from "react";
import GridLayoutBase, { type Layout as LayoutArr, type LayoutItem } from "react-grid-layout";

const GridLayout = GridLayoutBase as unknown as React.ComponentType<any>;
type Layout = LayoutItem;
type LayoutList = Layout[];
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { LayoutGrid, Check } from "lucide-react";
import { colors } from "../theme/tokens";
import { WidgetShell } from "../components/WidgetShell";
import { Briefing } from "../widgets/Briefing";
import { TaskTrendGraph } from "../widgets/TaskTrendGraph";
import { LinearCalendar } from "../widgets/LinearCalendar";
import { TodayTasks } from "../widgets/TodayTasks";
import { ActiveProjects } from "../widgets/ActiveProjects";
import { RecentFiles } from "../widgets/RecentFiles";

const STORAGE_KEY = "mono.dashboard.layout.v2";
const COLS = 12;
const ROW_H = 48;
const GAP = 12;

// Designed to fit a 1200x800 window without vertical scroll (~11 rows).
const defaultLayout: LayoutList = [
  { i: "briefing",  x: 0, y: 0, w: 8, h: 4, minW: 5, minH: 3 },
  { i: "today",     x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: "calendar",  x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2 },
  { i: "trend",     x: 0, y: 7, w: 5, h: 4, minW: 4, minH: 3 },
  { i: "projects",  x: 5, y: 7, w: 4, h: 4, minW: 3, minH: 3 },
  { i: "files",     x: 9, y: 7, w: 3, h: 4, minW: 3, minH: 3 },
];

const widgets: Record<string, { title?: string; bare?: boolean; render: () => React.ReactNode }> = {
  briefing: { bare: true, render: () => <Briefing /> },
  calendar: { title: "Next 14 days", render: () => <LinearCalendar /> },
  today: { title: "Today", render: () => <TodayTasks /> },
  trend: { title: "Task trend", render: () => <TaskTrendGraph /> },
  projects: { title: "Active projects", render: () => <ActiveProjects /> },
  files: { title: "Recent files", render: () => <RecentFiles /> },
};

export function Dashboard() {
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<LayoutList>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as LayoutList;
    } catch {}
    return defaultLayout;
  });
  const [width, setWidth] = useState(1100);

  useEffect(() => {
    const onResize = () => {
      const el = document.getElementById("dashboard-grid-host");
      if (el) setWidth(el.clientWidth);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persist = (l: LayoutArr) => {
    const arr = [...l] as LayoutList;
    setLayout(arr);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "18px 24px 14px",
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: colors.textMain }}>{greeting}, Majid</h1>
          <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
            {new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setEditMode((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 6,
            fontSize: 12, fontWeight: 500,
            color: editMode ? colors.bgMain : colors.textDim,
            backgroundColor: editMode ? colors.accent : "transparent",
            border: `1px solid ${editMode ? colors.accent : colors.border}`,
          }}
        >
          {editMode ? <Check size={13} /> : <LayoutGrid size={13} />}
          {editMode ? "Done" : "Edit layout"}
        </button>
      </header>

      <div id="dashboard-grid-host" className={editMode ? "lm-edit-mode" : ""} style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={ROW_H}
          width={width}
          margin={[GAP, GAP]}
          containerPadding={[0, 0]}
          isDraggable={editMode}
          isResizable={editMode}
          draggableHandle=".lm-drag-handle"
          onLayoutChange={persist}
          compactType="vertical"
        >
          {layout.map((l) => {
            const w = widgets[l.i];
            if (!w) return <div key={l.i} />;
            return (
              <div key={l.i}>
                <WidgetShell title={w.title} bare={w.bare} editMode={editMode}>
                  {w.render()}
                </WidgetShell>
              </div>
            );
          })}
        </GridLayout>
      </div>
    </div>
  );
}
