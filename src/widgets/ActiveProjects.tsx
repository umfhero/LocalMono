import * as Lucide from "lucide-react";
import { Plus } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import type { Project } from "../api";

export function ActiveProjects() {
  const { projects } = useStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, minHeight: 0, overflow: "auto" }}>
        {projects.map((p, i) => (
          <ProjectRow key={p.id} project={p} divider={i < projects.length - 1} />
        ))}
        {projects.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: 11, padding: "8px 6px" }}>No projects yet.</div>
        )}
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("mono:create-project"))}
        style={{
          marginTop: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "6px 8px", borderRadius: 4,
          border: `1px dashed ${colors.border}`,
          color: colors.textFaint, fontSize: 11,
          transition: "100ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = colors.accent;
          e.currentTarget.style.borderColor = colors.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = colors.textFaint;
          e.currentTarget.style.borderColor = colors.border;
        }}
      >
        <Plus size={12} /> New project
      </button>
    </div>
  );
}

function ProjectRow({ project, divider }: { project: Project; divider: boolean }) {
  const Icon = (Lucide as any)[project.icon] ?? Lucide.Box;
  const start = new Date(project.start).getTime();
  const end = new Date(project.end).getTime();
  const now = Date.now();
  const timePct = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));

  return (
    <button
      className="lm-hoverable"
      onClick={() => window.dispatchEvent(new CustomEvent("mono:open-project", { detail: { projectId: project.id } }))}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 10,
        padding: "8px 6px",
        borderRadius: 4,
        textAlign: "left",
        borderBottom: divider ? `1px solid ${colors.border}` : "none",
        backgroundColor: "transparent",
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 5,
        backgroundColor: `${project.color}1a`,
        color: project.color,
        display: "grid", placeItems: "center",
        alignSelf: "center",
      }}>
        <Icon size={14} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 500, color: colors.textMain, flex: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {project.name}
          </span>
          <span style={{ fontSize: 10, color: colors.textFaint, fontFamily: "var(--font-data)", flexShrink: 0 }}>
            {daysLeft}d
          </span>
        </div>
        <Bars time={timePct} activity={project.activityPct} color={project.color} />
      </div>
    </button>
  );
}

function Bars({ time, activity, color }: { time: number; activity: number; color: string }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <SingleBar label="Time" pct={time} color={colors.textDim} />
      <SingleBar label="Activity" pct={activity} color={color} />
    </div>
  );
}

function SingleBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontSize: 9, color: colors.textFaint,
        textTransform: "uppercase", letterSpacing: 0.5,
        width: 46, flexShrink: 0,
      }}>{label}</span>
      <div style={{
        flex: 1, height: 3, borderRadius: 2,
        backgroundColor: colors.bgElev, overflow: "hidden",
        minWidth: 20,
      }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: color, transition: "width 200ms" }} />
      </div>
      <span style={{
        fontSize: 9, color: colors.textDim, fontFamily: "var(--font-data)",
        width: 26, textAlign: "right", flexShrink: 0,
      }}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}
