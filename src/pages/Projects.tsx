import * as Lucide from "lucide-react";
import { Plus, Trash2 } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import type { Project } from "../api";

export function ProjectsPage() {
  const { projects, deleteProject, backed } = useStore();

  const fire = () => window.dispatchEvent(new CustomEvent("mono:create-project"));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{
        padding: "14px 24px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Projects</h1>
          <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
            {projects.length} project{projects.length === 1 ? "" : "s"} · time-bound containers with their own files & links
            {!backed && <span style={{ color: colors.statusLate }}> · showing demo data</span>}
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <button
          onClick={fire}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 5,
            fontSize: 12, fontWeight: 500,
            color: colors.bgMain, backgroundColor: colors.accent,
          }}
        >
          <Plus size={13} /> New project
        </button>
      </header>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{
          display: "grid", gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}>
          {projects.map((p) => <ProjectCard key={p.id} project={p} onDelete={() => deleteProject(p.id)} />)}
          {projects.length === 0 && (
            <div style={{ color: colors.textFaint, fontSize: 13, padding: 16 }}>
              No projects yet. Hit <strong>+ New project</strong> to start one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const Icon = (Lucide as any)[project.icon] ?? Lucide.Box;
  const start = new Date(project.start).getTime();
  const end = new Date(project.end).getTime();
  const now = Date.now();
  const timePct = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));

  return (
    <div style={{
      position: "relative",
      backgroundColor: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: 8, padding: 14,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 6,
          backgroundColor: `${project.color}1a`,
          color: project.color,
          display: "grid", placeItems: "center",
        }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: colors.textFaint }}>
            {totalDays}d total · {daysLeft}d left
          </div>
        </div>
        <button
          onClick={onDelete}
          title="Delete"
          style={{
            color: colors.textFaint, padding: 4, borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.statusMissed)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {project.description && (
        <p style={{ fontSize: 12, color: colors.textDim, lineHeight: 1.5 }}>
          {project.description}
        </p>
      )}

      <div style={{ display: "grid", gap: 5 }}>
        <Bar label="Time" pct={timePct} color={colors.textDim} />
        <Bar label="Activity" pct={project.activityPct} color={project.color} />
      </div>

      <div style={{ fontSize: 10, color: colors.textFaint, fontFamily: "var(--font-data)", display: "flex", justifyContent: "space-between" }}>
        <span>{new Date(project.start).toLocaleDateString()}</span>
        <span>→</span>
        <span>{new Date(project.end).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 9, color: colors.textFaint, textTransform: "uppercase", letterSpacing: 0.5, width: 50, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.bgElev, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: color, transition: "width 200ms" }} />
      </div>
      <span style={{ fontSize: 10, color: colors.textDim, fontFamily: "var(--font-data)", width: 32, textAlign: "right" }}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}
