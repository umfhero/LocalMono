import { useMemo, useState } from "react";
import { Plus, Trash2, MapPin, Repeat, Clock } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import { LinearCalendar } from "../widgets/LinearCalendar";
import type { CalendarEvent } from "../api";

const TYPE_ICON: Record<string, React.ReactNode> = {
  single:    <Clock size={12} />,
  repeating: <Repeat size={12} />,
  "long-term": <Clock size={12} />,
  timetable: <Clock size={12} />,
};

export function EventsPage() {
  const { events, projects, deleteEvent, backed } = useStore();
  const [filter, setFilter] = useState<"upcoming" | "all" | "past">("upcoming");

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const visible = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => {
        if (filter === "all") return true;
        const end = new Date(e.end).getTime();
        const start = new Date(e.start).getTime();
        return filter === "upcoming" ? end >= now : start < now && end < now;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, filter]);

  const fireCreate = () => window.dispatchEvent(new CustomEvent("mono:create-event"));
  const fireEdit = (event: CalendarEvent) => window.dispatchEvent(new CustomEvent("mono:edit-event", { detail: event }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{
        padding: "14px 24px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Events</h1>
          <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
            {events.length} event{events.length === 1 ? "" : "s"}
            {!backed && <span style={{ color: colors.statusLate }}> · showing demo data</span>}
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <button
          onClick={fireCreate}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 5,
            fontSize: 12, fontWeight: 500,
            color: colors.bgMain, backgroundColor: colors.accent,
          }}
        >
          <Plus size={13} /> New event
        </button>
      </header>

      <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}`, height: 200, flexShrink: 0 }}>
        <LinearCalendar onEventClick={fireEdit} />
      </div>

      <div style={{ display: "flex", gap: 4, padding: "10px 24px", borderBottom: `1px solid ${colors.border}` }}>
        {(["upcoming", "all", "past"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              padding: "5px 12px", fontSize: 11, fontWeight: 500,
              borderRadius: 4,
              color: filter === k ? colors.textMain : colors.textDim,
              backgroundColor: filter === k ? colors.bgElev : "transparent",
              textTransform: "capitalize",
            }}
          >
            {k}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {visible.length === 0 ? (
          <div style={{ color: colors.textFaint, fontSize: 13, padding: 24 }}>No events in this view.</div>
        ) : (
          visible.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              projectMap={projectMap}
              onDelete={() => deleteEvent(e.id)}
              onEdit={() => fireEdit(e)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EventRow({
  event, projectMap, onDelete, onEdit,
}: {
  event: CalendarEvent;
  projectMap: Record<string, { name: string; color: string }>;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const proj = event.projectId ? projectMap[event.projectId] : undefined;
  const start = new Date(event.start);
  const end = new Date(event.end);
  const sameDay = start.toDateString() === end.toDateString();
  const swatch = event.color ?? proj?.color ?? colors.accent;
  const icon = TYPE_ICON[event.type] || <Clock size={12} />;

  return (
    <div
      className="lm-hoverable"
      onClick={onEdit}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        alignItems: "center",
        gap: 12,
        padding: "10px 24px",
        borderBottom: `1px solid ${colors.border}`,
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 4, height: 28, borderRadius: 2, backgroundColor: swatch, alignSelf: "center",
      }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: swatch }}>{icon}</span>
          <span style={{ fontSize: 13, color: colors.textMain, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.title}
          </span>
          {proj && (
            <span style={{ fontSize: 10, color: proj.color, background: `${proj.color}1a`, padding: "1px 5px", borderRadius: 3 }}>
              {proj.name}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 2, fontSize: 11, color: colors.textDim, fontFamily: "var(--font-data)" }}>
          <span>
            {start.toLocaleString("en", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {!sameDay && " → " + end.toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {sameDay && start.getTime() !== end.getTime() && " → " + end.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {event.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <MapPin size={10} /> {event.location}
            </span>
          )}
        </div>
      </div>
      <span style={{
        fontSize: 10, color: colors.textFaint,
        textTransform: "uppercase", letterSpacing: 0.5,
      }}>
        {event.type === "repeating" ? "repeating" : "single"}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete"
        style={{ color: colors.textFaint, padding: 4, borderRadius: 4 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = colors.statusMissed)}
        onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
