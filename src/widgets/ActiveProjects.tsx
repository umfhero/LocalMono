import * as Lucide from "lucide-react";
import { colors } from "../theme/tokens";
import { mockProjects } from "../mock/data";
import type { Project } from "../types";

export function ActiveProjects() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {mockProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const Icon = (Lucide as any)[project.icon] ?? Lucide.Box;
  const start = new Date(project.start).getTime();
  const end = new Date(project.end).getTime();
  const now = Date.now();
  const timePct = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));

  return (
    <button
      className="lm-hoverable"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 10,
        padding: 10, borderRadius: 6,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgPanel,
        textAlign: "left",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 6,
        backgroundColor: `${project.color}1a`,
        color: project.color,
        display: "grid", placeItems: "center",
        alignSelf: "center",
      }}>
        <Icon size={16} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.textMain, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </span>
          <span style={{ fontSize: 10, color: colors.textFaint, fontFamily: "var(--font-data)" }}>
            {daysLeft}d left
          </span>
        </div>
        <ProgressBar label="Time" pct={timePct} color={colors.textDim} />
        <ProgressBar label="Activity" pct={project.activityPct} color={project.color} />
      </div>
    </button>
  );
}

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 32px", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: colors.textFaint, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      <div style={{ height: 4, borderRadius: 2, backgroundColor: colors.bgElev, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: color, transition: "width 200ms" }} />
      </div>
      <span style={{ fontSize: 10, color: colors.textDim, fontFamily: "var(--font-data)", textAlign: "right" }}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}
