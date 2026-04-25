import * as Lucide from "lucide-react";
import { Plus, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import type { Project } from "../api";

export function ProjectsPage() {
  const { projects, files, tasks, deleteProject, backed } = useStore();
  // Per-project counts so each card shows real numbers.
  const fileCounts = new Map<string, number>();
  const taskCounts = new Map<string, { done: number; total: number }>();
  for (const f of files) {
    if (f.projectId) fileCounts.set(f.projectId, (fileCounts.get(f.projectId) ?? 0) + 1);
  }
  for (const t of tasks) {
    if (!t.projectId) continue;
    const c = taskCounts.get(t.projectId) ?? { done: 0, total: 0 };
    c.total += 1;
    if (t.status === "done" || t.status === "early") c.done += 1;
    taskCounts.set(t.projectId, c);
  }

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

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        <div style={{
          display: "grid", gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
        }}>
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              fileCount={fileCounts.get(p.id) ?? 0}
              taskCount={taskCounts.get(p.id) ?? { done: 0, total: 0 }}
              onDelete={() => deleteProject(p.id)}
              onOpen={() => window.dispatchEvent(new CustomEvent("mono:open-project", { detail: { projectId: p.id } }))}
            />
          ))}
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

function ProjectCard({ project, fileCount, taskCount, onDelete, onOpen }: {
  project: Project;
  fileCount: number;
  taskCount: { done: number; total: number };
  onDelete: () => void;
  onOpen: () => void;
}) {
  const Icon = (Lucide as any)[project.icon] ?? Lucide.Box;
  const start = new Date(project.start).getTime();
  const end = new Date(project.end).getTime();
  const now = Date.now();
  const timePct = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));
  // Real progress: completed tasks / total tasks. Falls back to the legacy activityPct when there are no tasks yet.
  const taskPct = taskCount.total > 0 ? taskCount.done / taskCount.total : project.activityPct;

  return (
    <div
      onClick={onOpen}
      style={{
        position: "relative",
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: 10, padding: 18,
        display: "flex", flexDirection: "column", gap: 14,
        cursor: "pointer",
        transition: "border-color 100ms, background-color 100ms, transform 120ms",
        minHeight: 200,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.borderStrong; e.currentTarget.style.backgroundColor = colors.bgCardHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.backgroundColor = colors.bgCard; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          backgroundColor: `${project.color}1a`,
          color: project.color,
          display: "grid", placeItems: "center",
          flexShrink: 0,
        }}>
          <Icon size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>
            {totalDays} day{totalDays === 1 ? "" : "s"} total, {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
          style={{
            color: colors.textFaint, padding: 6, borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.statusMissed)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {project.description && (
        <p style={{ fontSize: 13, color: colors.textDim, lineHeight: 1.5, margin: 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {project.description}
        </p>
      )}

      {/* Stat row: file count + task count */}
      <div style={{ display: "flex", gap: 14, fontSize: 12, color: colors.textDim }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <FileText size={12} style={{ color: project.color }} />
          {fileCount} file{fileCount === 1 ? "" : "s"}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <CheckCircle2 size={12} style={{ color: project.color }} />
          {taskCount.done} / {taskCount.total} task{taskCount.total === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ display: "grid", gap: 6, marginTop: "auto" }}>
        <Bar label="Time" pct={timePct} color={colors.textDim} />
        <Bar label="Tasks" pct={taskPct} color={project.color} />
      </div>

      <div style={{ fontSize: 10, color: colors.textFaint, fontFamily: "var(--font-data)", display: "flex", justifyContent: "space-between" }}>
        <span>{new Date(project.start).toLocaleDateString("en-GB")}</span>
        <span>→</span>
        <span>{new Date(project.end).toLocaleDateString("en-GB")}</span>
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
