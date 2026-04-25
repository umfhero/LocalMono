import { Check, Clock, Plus } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function TodayTasks() {
  const { tasks, projects, toggleTask } = useStore();
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const today = new Date();
  // Show: tasks due today + any pending overdue (so they don't disappear).
  const visible = tasks.filter((t) => {
    const due = new Date(t.due);
    if (sameDay(due, today)) return true;
    if (t.status === "pending" && due < today) return true;
    return false;
  });

  const sorted = [...visible].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  const onToggle = (id: string) => {
    if (id.startsWith("t")) {
      // mock task ids — toggling doesn't persist
      return;
    }
    toggleTask(id).catch((e) => console.error(e));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0, overflow: "auto" }}>
        {sorted.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: 11, padding: "8px 6px" }}>Nothing due today.</div>
        )}
        {sorted.map((t) => {
          const done = t.status === "done" || t.status === "early";
          const late = t.status === "late";
          const missed = t.status === "missed";
          const time = new Date(t.due);
          const proj = t.projectId ? projectMap[t.projectId] : undefined;
          return (
            <button
              key={t.id}
              onClick={() => onToggle(t.id)}
              className="lm-hoverable"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 6px", borderRadius: 4, textAlign: "left",
              }}
            >
              <span style={{
                width: 14, height: 14, display: "grid", placeItems: "center",
                borderRadius: 4,
                border: `1.5px solid ${done ? colors.statusDone : missed ? colors.statusMissed : late ? colors.statusLate : colors.borderStrong}`,
                backgroundColor: done ? colors.statusDone : "transparent",
                color: colors.bgMain, flexShrink: 0,
              }}>
                {done && <Check size={9} strokeWidth={3} />}
                {missed && <span style={{ width: 5, height: 5, background: colors.statusMissed, borderRadius: 3 }} />}
              </span>
              <span style={{
                flex: 1, fontSize: 12,
                color: done ? colors.textFaint : colors.textMain,
                textDecoration: done ? "line-through" : "none",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {t.title}
              </span>
              {proj && (
                <span style={{
                  fontSize: 10, color: proj.color,
                  background: `${proj.color}1a`,
                  padding: "1px 5px", borderRadius: 3,
                  flexShrink: 0,
                }}>
                  {proj.name}
                </span>
              )}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                color: missed ? colors.statusMissed : late ? colors.statusLate : colors.textDim,
                fontSize: 10, fontFamily: "var(--font-data)", flexShrink: 0,
              }}>
                <Clock size={10} />
                {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("mono:create-task"))}
        style={{
          marginTop: 6, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "5px 8px", borderRadius: 4,
          border: `1px dashed ${colors.border}`,
          color: colors.textFaint, fontSize: 11,
          transition: "100ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent; e.currentTarget.style.borderColor = colors.accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = colors.textFaint; e.currentTarget.style.borderColor = colors.border; }}
      >
        <Plus size={12} /> Add task
      </button>
    </div>
  );
}
