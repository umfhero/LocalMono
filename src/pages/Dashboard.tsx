import { useState, useEffect, useRef } from "react";
import GridLayoutBase, { type Layout as LayoutArr, type LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { LayoutGrid, Check, RotateCcw } from "lucide-react";
import { colors } from "../theme/tokens";
import { WidgetShell } from "../components/WidgetShell";
import { Briefing } from "../widgets/Briefing";
import { TaskTrendGraph } from "../widgets/TaskTrendGraph";
import { LinearCalendar } from "../widgets/LinearCalendar";
import { TodayTasks } from "../widgets/TodayTasks";
import { ActiveProjects } from "../widgets/ActiveProjects";
import { RecentFiles } from "../widgets/RecentFiles";
import type { CalendarEvent } from "../api";

const GridLayout = GridLayoutBase as unknown as React.ComponentType<any>;
type Layout = LayoutItem;
type LayoutList = Layout[];

const STORAGE_KEY = "mono.dashboard.layout.v4";
const COLS = 12;
const ROW_H = 40;
const GAP = 8;
const PAD = 12;

// Top portion (visible without scroll): Today (compact) + Calendar (compact) on the left,
// Briefing → RecentFiles → ActiveProjects stacked taking the right ~40% with more vertical room.
// TaskTrend drifts below the fold at full width.
const defaultLayout: LayoutList = [
  { i: "today",     x: 0, y: 0, w: 3, h: 5, minW: 3, minH: 3 },
  { i: "calendar",  x: 3, y: 0, w: 4, h: 5, minW: 3, minH: 2 },
  { i: "briefing",  x: 7, y: 0, w: 5, h: 4, minW: 4, minH: 2 },
  { i: "files",     x: 7, y: 4, w: 5, h: 4, minW: 4, minH: 2 },
  { i: "projects",  x: 7, y: 8, w: 5, h: 4, minW: 4, minH: 2 },
  { i: "trend",     x: 0, y: 12, w: 12, h: 5, minW: 6, minH: 3 },
];

const fireEditEvent = (event: CalendarEvent) => window.dispatchEvent(new CustomEvent("mono:edit-event", { detail: event }));

const widgets: Record<string, { title?: string; bare?: boolean; render: () => React.ReactNode }> = {
  briefing: { bare: true, render: () => <Briefing /> },
  calendar: { title: "Calendar", render: () => <LinearCalendar onEventClick={fireEditEvent} /> },
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
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1100);

  useEffect(() => {
    if (!hostRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.floor(entry.contentRect.width));
      }
    });
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, []);

  const persist = (l: LayoutArr) => {
    const arr = [...l] as LayoutList;
    setLayout(arr);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
  };

  const resetLayout = () => {
    setLayout(defaultLayout);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
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
        padding: "12px 18px",
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: colors.textMain }}>{greeting}, Majid</h1>
          <div style={{ fontSize: 11, color: colors.textDim, marginTop: 1 }}>
            {new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <span style={{ flex: 1 }} />
        {editMode && (
          <button
            onClick={resetLayout}
            title="Reset to default layout"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 5,
              fontSize: 11, fontWeight: 500,
              color: colors.textDim,
              border: `1px solid ${colors.border}`,
            }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
        <button
          onClick={() => setEditMode((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 10px", borderRadius: 5,
            fontSize: 11, fontWeight: 500,
            color: editMode ? colors.bgMain : colors.textDim,
            backgroundColor: editMode ? colors.accent : "transparent",
            border: `1px solid ${editMode ? colors.accent : colors.border}`,
          }}
        >
          {editMode ? <Check size={12} /> : <LayoutGrid size={12} />}
          {editMode ? "Done" : "Edit layout"}
        </button>
      </header>

      <div
        ref={hostRef}
        className={editMode ? "lm-edit-mode" : ""}
        style={{ flex: 1, overflow: "auto" }}
      >
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={ROW_H}
          width={width}
          margin={[GAP, GAP]}
          containerPadding={[PAD, PAD]}
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
                <WidgetShell title={w.title} bare={w.bare} editMode={editMode} dense>
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
