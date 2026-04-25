import { useMemo, useState, useRef, useCallback } from "react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import type { CalendarEvent, Project } from "../api";

type Range = "1w" | "2w" | "1m" | "1y" | "all";
const ranges: Array<{ key: Range; label: string; days: number; minDayW: number }> = [
  { key: "1w", label: "1W",  days: 7,   minDayW: 30 },
  { key: "2w", label: "2W",  days: 14,  minDayW: 26 },
  { key: "1m", label: "1M",  days: 30,  minDayW: 22 },
  { key: "1y", label: "1Y",  days: 365, minDayW: 14 },
  { key: "all", label: "ALL", days: 0,  minDayW: 14 },
];

const ROW_H = 18;
const ROW_GAP = 3;

type Layer = "events" | "timetable" | "projects";

interface PlacedItem {
  id: string;
  label: string;
  startDay: number;
  endDay: number;
  color: string;
  layer: Layer;
  event?: CalendarEvent;
  project?: Project;
  location?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

interface Props {
  onEventClick?: (event: CalendarEvent) => void;
}

export function LinearCalendar({ onEventClick }: Props) {
  const [range, setRange] = useState<Range>("2w");
  const [layers, setLayers] = useState<Set<Layer>>(new Set(["events", "timetable", "projects"]));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { events, projects } = useStore();

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const rangeCfg = ranges.find((x) => x.key === range)!;

  const allItems = useMemo(() => [...events, ...projects], [events, projects]);

  const dayCount = useMemo(() => {
    if (rangeCfg.days > 0) return rangeCfg.days;
    if (allItems.length === 0) return 7;
    const earliest = Math.min(...allItems.map((e) => new Date(e.start).getTime()));
    const latest = Math.max(...allItems.map((e) => new Date(e.end).getTime()));
    const fromToday = Math.ceil((latest - today.getTime()) / 86400000);
    const back = Math.ceil((today.getTime() - earliest) / 86400000);
    return Math.max(7, fromToday + back + 1);
  }, [rangeCfg, today, allItems]);

  const days = useMemo(
    () => Array.from({ length: dayCount }).map((_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i); return d;
    }),
    [dayCount, today]
  );

  const placed = useMemo(() => {
    const startOfWindow = today.getTime();
    const endOfWindow = days[days.length - 1].getTime() + 86400000;

    const items: PlacedItem[] = [];

    // Events
    if (layers.has("events") || layers.has("timetable")) {
      events.forEach((e) => {
        const isTimeTable = e.type === "timetable";
        if (isTimeTable && !layers.has("timetable")) return;
        if (!isTimeTable && !layers.has("events")) return;

        const s = new Date(e.start).getTime();
        const en = new Date(e.end).getTime();
        if (en < startOfWindow || s > endOfWindow) return;
        const startDay = Math.max(0, Math.floor((s - startOfWindow) / 86400000));
        const endDay = Math.min(dayCount - 1, Math.floor((en - startOfWindow) / 86400000));
        items.push({
          id: e.id,
          label: e.title,
          startDay,
          endDay,
          color: e.color || colors.accent,
          layer: isTimeTable ? "timetable" : "events",
          event: e,
          location: e.location,
          type: e.type,
          startDate: new Date(e.start),
          endDate: new Date(e.end),
        });
      });
    }

    // Projects as spans
    if (layers.has("projects")) {
      projects.forEach((p) => {
        const s = new Date(p.start).getTime();
        const en = new Date(p.end).getTime();
        if (en < startOfWindow || s > endOfWindow) return;
        const startDay = Math.max(0, Math.floor((s - startOfWindow) / 86400000));
        const endDay = Math.min(dayCount - 1, Math.floor((en - startOfWindow) / 86400000));
        items.push({
          id: `proj-${p.id}`,
          label: p.name,
          startDay,
          endDay,
          color: p.color,
          layer: "projects",
          project: p,
          startDate: new Date(p.start),
          endDate: new Date(p.end),
        });
      });
    }

    items.sort((a, b) => a.startDay - b.startDay || (b.endDay - b.startDay) - (a.endDay - a.startDay));

    const rows: Array<PlacedItem[]> = [];
    items.forEach((item) => {
      let rowIdx = rows.findIndex((row) => row.every((it) => it.endDay < item.startDay || it.startDay > item.endDay));
      if (rowIdx === -1) { rows.push([]); rowIdx = rows.length - 1; }
      rows[rowIdx].push(item);
    });
    return rows;
  }, [days, dayCount, today, events, projects, layers]);

  const toggleLayer = useCallback((l: Layer) => {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }, []);

  const todayIdx = 0;
  const labelEvery = dayCount <= 14 ? 1 : dayCount <= 31 ? 2 : dayCount <= 90 ? 7 : 30;
  const innerMinWidth = dayCount * rangeCfg.minDayW;

  const hoveredItem = useMemo(() => {
    if (!hoveredId) return null;
    for (const row of placed) {
      for (const item of row) {
        if (item.id === hoveredId) return item;
      }
    }
    return null;
  }, [hoveredId, placed]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%", position: "relative" }}>
      {/* Top bar: layer toggles + range toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: 8 }}>
        <div style={{ display: "inline-flex", gap: 3 }}>
          {(["events", "timetable", "projects"] as Layer[]).map((l) => {
            const on = layers.has(l);
            const layerColor = l === "events" ? colors.accent : l === "timetable" ? colors.statusEarly : colors.statusDone;
            return (
              <button
                key={l}
                onClick={() => toggleLayer(l)}
                style={{
                  fontSize: 9, fontWeight: 500,
                  padding: "2px 8px", borderRadius: 3,
                  textTransform: "capitalize",
                  color: on ? colors.textMain : colors.textFaint,
                  backgroundColor: on ? `${layerColor}22` : "transparent",
                  border: `1px solid ${on ? layerColor : colors.border}`,
                  transition: "all 120ms",
                }}
              >
                <span style={{
                  display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                  backgroundColor: on ? layerColor : colors.textFaint,
                  marginRight: 4, verticalAlign: "middle",
                }} />
                {l}
              </button>
            );
          })}
        </div>
        <div style={{
          display: "inline-flex",
          background: colors.bgPanel,
          borderRadius: 5,
          padding: 2,
          border: `1px solid ${colors.border}`,
        }}>
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                fontSize: 10, fontWeight: 500,
                padding: "2px 7px", borderRadius: 3,
                color: range === r.key ? colors.textMain : colors.textDim,
                backgroundColor: range === r.key ? colors.bgElev : "transparent",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto", overflowY: "hidden", flex: 1, minHeight: 0 }}>
        <div style={{ minWidth: innerMinWidth, display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Date header */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${dayCount}, minmax(${rangeCfg.minDayW}px, 1fr))` }}>
            {days.map((d, i) => {
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isFirstOfMonth = d.getDate() === 1;
              const showLabel = i % labelEvery === 0 || isFirstOfMonth || i === todayIdx;
              return (
                <div key={i} style={{
                  padding: "1px 0 3px",
                  textAlign: "center",
                  borderLeft: i === 0 ? "none" : `1px solid ${colors.border}`,
                  minWidth: 0,
                }}>
                  <div style={{
                    fontSize: 8, color: colors.textFaint, textTransform: "uppercase", letterSpacing: 0.5,
                    height: 10,
                  }}>
                    {isWeekend && labelEvery === 1 ? d.toLocaleDateString("en", { weekday: "narrow" }) :
                      isFirstOfMonth ? d.toLocaleDateString("en", { month: "short" }) : ""}
                  </div>
                  {showLabel && (
                    <div style={{
                      fontSize: 11, fontWeight: i === todayIdx ? 600 : 400,
                      color: i === todayIdx ? colors.bgMain : (isWeekend ? colors.textFaint : colors.textDim),
                      fontFamily: "var(--font-data)",
                      display: "inline-block",
                      width: 18, height: 18, lineHeight: "18px",
                      borderRadius: 3,
                      backgroundColor: i === todayIdx ? colors.accent : "transparent",
                    }}>
                      {d.getDate()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Item rows */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: ROW_GAP }}>
            <div style={{
              position: "absolute", top: 0, bottom: 0,
              left: `calc(100% / ${dayCount} * ${todayIdx} + 100% / ${dayCount} / 2)`,
              width: 1,
              borderLeft: `1px dashed ${colors.accent}`, opacity: 0.45,
              pointerEvents: "none",
            }} />

            {placed.length === 0 ? (
              <div style={{ color: colors.textFaint, fontSize: 11, padding: "12px 8px" }}>No items in this range</div>
            ) : (
              placed.map((row, rIdx) => (
                <div key={rIdx} style={{ position: "relative", height: ROW_H }}>
                  {row.map((item) => {
                    const span = item.endDay - item.startDay + 1;
                    const left = `calc(100% / ${dayCount} * ${item.startDay} + 1px)`;
                    const width = `calc(100% / ${dayCount} * ${span} - 2px)`;
                    const isPoint = span === 1 && item.layer === "events" && item.type !== "long-term";
                    const isProject = item.layer === "projects";
                    const c = item.color;
                    const isHovered = hoveredId === item.id;

                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => {
                          if (item.event && onEventClick) onEventClick(item.event);
                        }}
                        style={{
                          position: "absolute", left, width,
                          top: 0, height: ROW_H,
                          borderRadius: isPoint ? ROW_H / 2 : 3,
                          backgroundColor: isPoint ? c : isProject ? `${c}18` : `${c}33`,
                          border: isPoint ? "none" : `1px solid ${c}`,
                          borderStyle: isProject ? "dashed" : "solid",
                          color: isPoint ? colors.bgMain : c,
                          fontSize: 10, fontWeight: 500,
                          padding: isPoint ? 0 : "0 6px",
                          display: "flex", alignItems: "center",
                          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                          cursor: item.event ? "pointer" : "default",
                          transform: isHovered ? "translateY(-1px)" : "none",
                          transition: "transform 80ms",
                          zIndex: isHovered ? 10 : 1,
                        }}
                      >
                        {isPoint ? "" : item.label}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Hover tooltip overlay */}
      {hoveredItem && (
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            bottom: "100%", left: "50%", transform: "translateX(-50%)",
            marginBottom: 6,
            padding: "8px 12px",
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 50,
            minWidth: 180, maxWidth: 280,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: hoveredItem.color, marginBottom: 4 }}>
            {hoveredItem.label}
          </div>
          {hoveredItem.type && (
            <div style={{ fontSize: 10, color: colors.textDim, marginBottom: 2, textTransform: "capitalize" }}>
              {hoveredItem.layer === "projects" ? "Project" : hoveredItem.type.replace("-", " ")}
            </div>
          )}
          {hoveredItem.startDate && (
            <div style={{ fontSize: 10, color: colors.textDim, fontFamily: "var(--font-data)" }}>
              {hoveredItem.startDate.toLocaleString("en", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {hoveredItem.endDate && hoveredItem.startDate.toDateString() !== hoveredItem.endDate.toDateString() && (
                <span> → {hoveredItem.endDate.toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              )}
              {hoveredItem.endDate && hoveredItem.startDate.toDateString() === hoveredItem.endDate.toDateString() && hoveredItem.startDate.getTime() !== hoveredItem.endDate.getTime() && (
                <span> → {hoveredItem.endDate.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
          )}
          {hoveredItem.location && (
            <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>
              📍 {hoveredItem.location}
            </div>
          )}
          {hoveredItem.event && (
            <div style={{ fontSize: 9, color: colors.textFaint, marginTop: 4 }}>
              click to edit
            </div>
          )}
        </div>
      )}
    </div>
  );
}
