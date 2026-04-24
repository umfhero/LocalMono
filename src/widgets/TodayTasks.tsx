import { useState } from "react";
import { Check, Circle, Clock } from "lucide-react";
import { colors } from "../theme/tokens";
import { mockTasks, mockProjects } from "../mock/data";

export function TodayTasks() {
  const [tasks, setTasks] = useState(mockTasks);
  const projectMap = Object.fromEntries(mockProjects.map((p) => [p.id, p]));

  const toggle = (id: string) => {
    setTasks((ts) => ts.map((t) => t.id === id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t));
  };

  const sorted = [...tasks].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {sorted.map((t) => {
        const done = t.status === "done";
        const missed = t.status === "missed";
        const time = new Date(t.due);
        const proj = t.projectId ? projectMap[t.projectId] : undefined;
        return (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className="lm-hoverable"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 6px", borderRadius: 4, textAlign: "left",
            }}
          >
            <span style={{
              width: 16, height: 16, display: "grid", placeItems: "center",
              borderRadius: 4,
              border: `1.5px solid ${done ? colors.statusDone : missed ? colors.statusMissed : colors.borderStrong}`,
              backgroundColor: done ? colors.statusDone : "transparent",
              color: colors.bgMain, flexShrink: 0,
            }}>
              {done ? <Check size={11} strokeWidth={3} /> : missed ? <span style={{ width: 6, height: 6, background: colors.statusMissed, borderRadius: 3 }} /> : <Circle size={0} />}
            </span>
            <span style={{
              flex: 1, fontSize: 13,
              color: done ? colors.textFaint : colors.textMain,
              textDecoration: done ? "line-through" : "none",
            }}>
              {t.title}
            </span>
            {proj && (
              <span style={{
                fontSize: 11, color: proj.color,
                background: `${proj.color}1a`,
                padding: "1px 6px", borderRadius: 3,
              }}>
                {proj.name}
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: missed ? colors.statusMissed : colors.textDim, fontSize: 11, fontFamily: "var(--font-data)" }}>
              <Clock size={11} />
              {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
