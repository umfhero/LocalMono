import { useEffect, useState } from "react";
import { X, Repeat, Clock } from "lucide-react";
import { colors } from "../../theme/tokens";
import { useStore } from "../../store";
import type { CalendarEvent } from "../../api";

const COLORS = ["#ff4d5e", "#4fc1ff", "#4ec9b0", "#d7ba7d", "#c586c0", "#569cd6", "#e06060", "#9cdcfe"];

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const nowDate = () => new Date().toISOString().slice(0, 10);
const nowTimePlus = (h: number) => {
  const d = new Date();
  d.setHours(d.getHours() + h);
  d.setMinutes(0, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface Props {
  open: boolean;
  onClose: () => void;
  editEvent?: CalendarEvent | null; // if set, we're editing
  defaultProjectId?: string;
}

export function EventSidePanel({ open, onClose, editEvent, defaultProjectId }: Props) {
  const { createEvent, updateEvent, projects } = useStore();
  const isEditing = !!editEvent;

  const [title, setTitle] = useState("");
  const [repeating, setRepeating] = useState(false);
  const [startDate, setStartDate] = useState(nowDate());
  const [startTime, setStartTime] = useState(nowTimePlus(0));
  const [endDate, setEndDate] = useState(nowDate());
  const [endTime, setEndTime] = useState(nowTimePlus(1));
  const [color, setColor] = useState(COLORS[0]);
  const [projectId, setProjectId] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Populate fields when editing
  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setTitle(editEvent.title);
      setRepeating(editEvent.type === "repeating");
      setStartDate(toDateInput(editEvent.start));
      setStartTime(toTimeInput(editEvent.start));
      setEndDate(toDateInput(editEvent.end));
      setEndTime(toTimeInput(editEvent.end));
      setColor(editEvent.color || COLORS[0]);
      setProjectId(editEvent.projectId || "");
      setLocation(editEvent.location || "");
    } else {
      setTitle("");
      setRepeating(false);
      setStartDate(nowDate());
      setStartTime(nowTimePlus(0));
      setEndDate(nowDate());
      setEndTime(nowTimePlus(1));
      setColor(COLORS[0]);
      setProjectId(defaultProjectId ?? "");
      setLocation("");
    }
    setErr(null);
    setBusy(false);
  }, [open, editEvent, defaultProjectId]);

  const buildISO = (date: string, time: string) => {
    return new Date(`${date}T${time}:00`).toISOString();
  };

  const submit = async () => {
    if (!title.trim()) { setErr("Title is required"); return; }
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        title: title.trim(),
        start: buildISO(startDate, startTime),
        end: buildISO(endDate, endTime),
        type: (repeating ? "repeating" : "single") as CalendarEvent["type"],
        color,
        projectId: projectId || undefined,
        location: location.trim() || undefined,
      };
      if (isEditing && editEvent) {
        await updateEvent({ ...payload, id: editEvent.id });
      } else {
        await createEvent(payload);
      }
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 89,
          backgroundColor: "rgba(0,0,0,0.25)",
        }}
      />
      {/* Sidebar */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 340, zIndex: 90,
        backgroundColor: colors.bgCard,
        borderLeft: `1px solid ${colors.borderStrong}`,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 30px rgba(0,0,0,0.35)",
      }}>
        {/* Header */}
        <div style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.textMain }}>
            {isEditing ? "Edit event" : "New event"}
          </h2>
          <button onClick={onClose} style={{ color: colors.textDim, padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body — no scroll needed, everything fits */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          {err && <div style={{ color: colors.statusMissed, fontSize: 11 }}>{err}</div>}

          {/* Title */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            style={{ ...inputSt, fontSize: 14, fontWeight: 500, padding: "10px 12px" }}
          />

          {/* Repeating toggle */}
          <div style={{ display: "flex", gap: 6 }}>
            <ToggleBtn active={!repeating} onClick={() => setRepeating(false)} icon={<Clock size={11} />} label="One-off" />
            <ToggleBtn active={repeating} onClick={() => setRepeating(true)} icon={<Repeat size={11} />} label="Repeating" />
          </div>

          {/* Date & Time — split into date and time for easier picking */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Label text="Start date">
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} style={inputSt} />
            </Label>
            <Label text="Start time">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputSt} />
            </Label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Label text="End date">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputSt} />
            </Label>
            <Label text="End time">
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputSt} />
            </Label>
          </div>

          {/* Location */}
          <Label text="Location">
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="optional" style={inputSt} />
          </Label>

          {/* Project + Color on same row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
            <Label text="Project">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputSt}>
                <option value="">— none —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Label>
            <Label text="Color">
              <div style={{ display: "flex", gap: 3 }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 18, height: 18, borderRadius: "50%",
                      backgroundColor: c,
                      border: `2px solid ${color === c ? colors.textMain : "transparent"}`,
                      outline: `1px solid ${colors.border}`,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </Label>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 16px",
          borderTop: `1px solid ${colors.border}`,
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button onClick={onClose} style={btnSec}>Cancel</button>
          <button onClick={submit} disabled={busy} style={btnPri(busy)}>
            {isEditing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Tiny subcomponents ---------- */

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 10, color: colors.textDim, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {text}
      </span>
      {children}
    </div>
  );
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "7px 0",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        fontSize: 11, fontWeight: 500,
        borderRadius: 5,
        border: `1px solid ${active ? colors.accent : colors.border}`,
        backgroundColor: active ? colors.accentSoft : colors.bgPanel,
        color: active ? colors.textMain : colors.textDim,
        transition: "all 100ms",
      }}
    >
      {icon} {label}
    </button>
  );
}

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 12,
  color: colors.textMain,
  backgroundColor: colors.bgPanel,
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  outline: "none",
  fontFamily: "inherit",
};

const btnSec: React.CSSProperties = {
  padding: "7px 14px", fontSize: 12, fontWeight: 500, borderRadius: 5,
  color: colors.textDim, backgroundColor: "transparent",
  border: `1px solid ${colors.border}`,
};

function btnPri(disabled: boolean): React.CSSProperties {
  return {
    padding: "7px 14px", fontSize: 12, fontWeight: 500, borderRadius: 5,
    color: colors.bgMain, backgroundColor: disabled ? colors.border : colors.accent,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
