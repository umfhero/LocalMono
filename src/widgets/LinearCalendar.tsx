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

type ViewMode = "linear" | "week" | "month";

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
  const [viewMode, setViewMode] = useState<ViewMode>("linear");
  const [layers, setLayers] = useState<Set<Layer>>(new Set(["events", "timetable", "projects"]));

  const toggleLayer = useCallback((l: Layer) => {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%", position: "relative" }}>
      {/* Top bar: layer toggles | view-mode tabs */}
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
          {(["linear", "week", "month"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                fontSize: 10, fontWeight: 500,
                padding: "2px 9px", borderRadius: 3,
                textTransform: "capitalize",
                color: viewMode === m ? colors.textMain : colors.textDim,
                backgroundColor: viewMode === m ? colors.bgElev : "transparent",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "linear" && <LinearView layers={layers} onEventClick={onEventClick} />}
      {viewMode === "week" && <WeekView layers={layers} onEventClick={onEventClick} />}
      {viewMode === "month" && <MonthView layers={layers} onEventClick={onEventClick} />}
    </div>
  );
}

/* ============================================================
 * LINEAR VIEW (the original horizontal timeline)
 * ============================================================ */

function LinearView({ layers, onEventClick }: { layers: Set<Layer>; onEventClick?: (e: CalendarEvent) => void }) {
  const [range, setRange] = useState<Range>("2w");
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
    <>
      <div style={{
        display: "inline-flex",
        background: colors.bgPanel,
        borderRadius: 5,
        padding: 2,
        border: `1px solid ${colors.border}`,
        alignSelf: "flex-end",
        flexShrink: 0,
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

      <div style={{ overflowX: "auto", overflowY: "hidden", flex: 1, minHeight: 0 }}>
        <div style={{ minWidth: innerMinWidth, display: "flex", flexDirection: "column", gap: 4 }}>
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
    </>
  );
}

/* ============================================================
 * WEEK VIEW (Mon-Sun columns, 6am-10pm rows, hour-positioned)
 * ============================================================ */

const WEEK_HOUR_START = 6;
const WEEK_HOUR_END = 22;
const WEEK_HOURS = WEEK_HOUR_END - WEEK_HOUR_START;
const HOUR_PX = 28;

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = (out.getDay() + 6) % 7; // Mon = 0
  out.setDate(out.getDate() - dow);
  return out;
}

function WeekView({ layers, onEventClick }: { layers: Set<Layer>; onEventClick?: (e: CalendarEvent) => void }) {
  const { events } = useStore();
  const [offsetWeeks, setOffsetWeeks] = useState(0);
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const weekStart = useMemo(() => {
    const d = startOfWeek(today);
    d.setDate(d.getDate() + offsetWeeks * 7);
    return d;
  }, [today, offsetWeeks]);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
  }), [weekStart]);

  const dayEvents = useMemo(() => {
    return days.map((day) => {
      const dayStart = day.getTime();
      const dayEnd = dayStart + 86400000;
      return events
        .filter((e) => {
          const isTimeTable = e.type === "timetable";
          if (isTimeTable && !layers.has("timetable")) return false;
          if (!isTimeTable && !layers.has("events")) return false;
          const s = new Date(e.start).getTime();
          return s >= dayStart && s < dayEnd;
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });
  }, [days, events, layers]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Week navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: colors.textDim, flexShrink: 0 }}>
        <button onClick={() => setOffsetWeeks((n) => n - 1)} style={navBtn}>‹</button>
        <button onClick={() => setOffsetWeeks(0)} style={navBtn}>Today</button>
        <button onClick={() => setOffsetWeeks((n) => n + 1)} style={navBtn}>›</button>
        <span style={{ marginLeft: 6, fontFamily: "var(--font-data)" }}>
          {weekStart.toLocaleDateString("en", { day: "numeric", month: "short" })} – {days[6].toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: `1px solid ${colors.border}`, borderRadius: 5 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `48px repeat(7, minmax(0, 1fr))`,
          minHeight: WEEK_HOURS * HOUR_PX + 24,
        }}>
          {/* Header row */}
          <div style={{
            height: 24, position: "sticky", top: 0, zIndex: 2,
            background: colors.bgPanel, borderBottom: `1px solid ${colors.border}`,
          }} />
          {days.map((d, i) => {
            const isToday = d.getTime() === today.getTime();
            return (
              <div key={i} style={{
                height: 24, position: "sticky", top: 0, zIndex: 2,
                background: colors.bgPanel,
                borderBottom: `1px solid ${colors.border}`,
                borderLeft: `1px solid ${colors.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                fontSize: 10,
              }}>
                <span style={{ color: colors.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {d.toLocaleDateString("en", { weekday: "short" })}
                </span>
                <span style={{
                  fontFamily: "var(--font-data)", fontWeight: isToday ? 600 : 400,
                  color: isToday ? colors.bgMain : colors.textMain,
                  background: isToday ? colors.accent : "transparent",
                  padding: "0 5px", borderRadius: 3,
                }}>
                  {d.getDate()}
                </span>
              </div>
            );
          })}

          {/* Hour gutter */}
          <div style={{ position: "relative" }}>
            {Array.from({ length: WEEK_HOURS }).map((_, i) => (
              <div key={i} style={{
                height: HOUR_PX, padding: "1px 4px",
                fontSize: 9, color: colors.textFaint, textAlign: "right",
                fontFamily: "var(--font-data)",
                borderTop: i === 0 ? "none" : `1px solid ${colors.border}`,
              }}>
                {String((WEEK_HOUR_START + i) % 24).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((_, di) => (
            <div key={di} style={{
              position: "relative",
              borderLeft: `1px solid ${colors.border}`,
              height: WEEK_HOURS * HOUR_PX,
            }}>
              {Array.from({ length: WEEK_HOURS }).map((_, hi) => (
                <div key={hi} style={{
                  height: HOUR_PX,
                  borderTop: hi === 0 ? "none" : `1px solid ${colors.border}`,
                }} />
              ))}
              {dayEvents[di].map((e) => {
                const start = new Date(e.start);
                const end = new Date(e.end);
                const startH = start.getHours() + start.getMinutes() / 60;
                const endH = end.getHours() + end.getMinutes() / 60;
                if (endH <= WEEK_HOUR_START || startH >= WEEK_HOUR_END) return null;
                const top = Math.max(0, (startH - WEEK_HOUR_START) * HOUR_PX);
                const bot = Math.min(WEEK_HOURS * HOUR_PX, (endH - WEEK_HOUR_START) * HOUR_PX);
                const c = e.color || colors.accent;
                return (
                  <button
                    key={e.id}
                    onClick={() => onEventClick?.(e)}
                    title={`${e.title} · ${start.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`}
                    style={{
                      position: "absolute", left: 2, right: 2,
                      top, height: Math.max(14, bot - top),
                      borderRadius: 3,
                      backgroundColor: `${c}33`, borderLeft: `2px solid ${c}`,
                      color: colors.textMain, fontSize: 10, fontWeight: 500,
                      padding: "2px 5px", textAlign: "left",
                      overflow: "hidden", display: "flex", flexDirection: "column", gap: 1,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                    <span style={{ fontSize: 9, color: colors.textDim, fontFamily: "var(--font-data)" }}>
                      {start.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * MONTH VIEW (calendar grid with event chips)
 * ============================================================ */

function MonthView({ layers, onEventClick }: { layers: Set<Layer>; onEventClick?: (e: CalendarEvent) => void }) {
  const { events } = useStore();
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [offsetMonths, setOffsetMonths] = useState(0);

  const view = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + offsetMonths, 1);
    return d;
  }, [today, offsetMonths]);

  const cells = useMemo(() => {
    const firstDow = (view.getDay() + 6) % 7; // Mon-start
    const start = new Date(view); start.setDate(1 - firstDow);
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [view]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const isTimeTable = e.type === "timetable";
      if (isTimeTable && !layers.has("timetable")) continue;
      if (!isTimeTable && !layers.has("events")) continue;
      const key = new Date(e.start).toDateString();
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [events, layers]);

  const monthLabel = view.toLocaleDateString("en", { month: "long", year: "numeric" });
  const todayKey = today.toDateString();

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: colors.textDim, flexShrink: 0 }}>
        <button onClick={() => setOffsetMonths((n) => n - 1)} style={navBtn}>‹</button>
        <button onClick={() => setOffsetMonths(0)} style={navBtn}>Today</button>
        <button onClick={() => setOffsetMonths((n) => n + 1)} style={navBtn}>›</button>
        <span style={{ marginLeft: 6, fontFamily: "var(--font-data)" }}>{monthLabel}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", border: `1px solid ${colors.border}`, borderRadius: 5, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${colors.border}`, background: colors.bgPanel }}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <div key={d} style={{ padding: "4px 0", textAlign: "center", fontSize: 10, color: colors.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)" }}>
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === view.getMonth();
            const isToday = d.toDateString() === todayKey;
            const dayEvents = eventsByDay.get(d.toDateString()) ?? [];
            return (
              <div key={i} style={{
                borderLeft: i % 7 === 0 ? "none" : `1px solid ${colors.border}`,
                borderTop: i < 7 ? "none" : `1px solid ${colors.border}`,
                background: inMonth ? colors.bgMain : colors.bgPanel,
                padding: "3px 4px",
                display: "flex", flexDirection: "column", gap: 2,
                minHeight: 0, overflow: "hidden",
              }}>
                <div style={{
                  fontSize: 10, fontFamily: "var(--font-data)",
                  color: isToday ? colors.bgMain : (inMonth ? colors.textDim : colors.textFaint),
                  background: isToday ? colors.accent : "transparent",
                  alignSelf: "flex-start",
                  padding: "0 5px", borderRadius: 3,
                  fontWeight: isToday ? 600 : 400,
                }}>
                  {d.getDate()}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, overflow: "hidden", flex: 1 }}>
                  {dayEvents.slice(0, 3).map((e) => {
                    const c = e.color || colors.accent;
                    return (
                      <button
                        key={e.id}
                        onClick={() => onEventClick?.(e)}
                        title={`${e.title} · ${new Date(e.start).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          fontSize: 9, padding: "1px 4px", borderRadius: 2,
                          background: `${c}22`, color: colors.textMain,
                          textAlign: "left", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                        }}
                      >
                        <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: c, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
                      </button>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: 9, color: colors.textFaint, padding: "0 4px" }}>+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  padding: "2px 8px", fontSize: 11, borderRadius: 3,
  color: colors.textDim,
  border: `1px solid ${colors.border}`, background: colors.bgPanel,
};
