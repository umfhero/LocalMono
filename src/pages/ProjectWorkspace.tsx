import { useMemo } from "react";
import * as Lucide from "lucide-react";
import { ArrowLeft, Plus, Trash2, FileText, MapPin, Repeat, Clock, CheckCircle2, Circle } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import { urgencyOf, urgencyLabel, urgencyColor } from "../editor/taskUrgency";
import type { CalendarEvent, FileSummary, Task } from "../api";

interface Props {
  projectId: string;
  onBack: () => void;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ProjectWorkspace({ projectId, onBack }: Props) {
  const { projects, files, events, tasks, deleteProject, deleteFile, deleteEvent, deleteTask, toggleTask } = useStore();

  const project = projects.find((p) => p.id === projectId);

  const projectFiles = useMemo(
    () => files.filter((f) => f.projectId === projectId)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()),
    [files, projectId],
  );
  const projectEvents = useMemo(
    () => events.filter((e) => e.projectId === projectId)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [events, projectId],
  );
  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId)
      .sort((a, b) => {
        const aDone = a.status === "done" || a.status === "early";
        const bDone = b.status === "done" || b.status === "early";
        if (aDone !== bDone) return aDone ? 1 : -1;
        return new Date(a.due).getTime() - new Date(b.due).getTime();
      }),
    [tasks, projectId],
  );

  if (!project) {
    return (
      <div style={{ padding: 24, color: colors.textDim, fontSize: 13 }}>
        Project not found. <button onClick={onBack} style={{ color: colors.accent }}>Back to projects</button>
      </div>
    );
  }

  const Icon = (Lucide as any)[project.icon] ?? Lucide.Box;
  const start = new Date(project.start).getTime();
  const end = new Date(project.end).getTime();
  const now = Date.now();
  const timePct = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));

  const fireCreateFile = () =>
    window.dispatchEvent(new CustomEvent("mono:create-file", { detail: { projectId } }));
  const fireCreateEvent = () =>
    window.dispatchEvent(new CustomEvent("mono:create-event", { detail: { projectId } }));
  const fireCreateTask = () =>
    window.dispatchEvent(new CustomEvent("mono:create-task", { detail: { projectId } }));
  const fireEditEvent = (event: CalendarEvent) =>
    window.dispatchEvent(new CustomEvent("mono:edit-event", { detail: event }));

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${project.name}"? Linked files, events, and tasks will keep their data but lose the project link.`)) return;
    await deleteProject(project.id);
    onBack();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <header style={{
        padding: "14px 24px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={onBack}
          title="Back to projects"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 9px", borderRadius: 5,
            fontSize: 11, color: colors.textDim,
            border: `1px solid ${colors.border}`, backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = colors.textMain; e.currentTarget.style.backgroundColor = colors.bgCardHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = colors.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <ArrowLeft size={12} /> Projects
        </button>
        <div style={{
          width: 32, height: 32, borderRadius: 6,
          backgroundColor: `${project.color}1a`, color: project.color,
          display: "grid", placeItems: "center",
        }}>
          <Icon size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: colors.textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </h1>
          <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
            {fmtDate(project.start)} → {fmtDate(project.end)} · {totalDays}d total · {daysLeft}d left
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <button
          onClick={handleDeleteProject}
          title="Delete project"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 9px", borderRadius: 5, fontSize: 11,
            color: colors.textFaint, border: `1px solid ${colors.border}`, backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = colors.statusMissed; e.currentTarget.style.borderColor = colors.statusMissed; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = colors.textFaint; e.currentTarget.style.borderColor = colors.border; }}
        >
          <Trash2 size={12} /> Delete
        </button>
      </header>

      {/* Project meta strip */}
      <div style={{
        padding: "12px 24px", borderBottom: `1px solid ${colors.border}`,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
        backgroundColor: colors.bgPanel,
      }}>
        {project.description ? (
          <p style={{ fontSize: 12, color: colors.textDim, lineHeight: 1.5, margin: 0 }}>
            {project.description}
          </p>
        ) : (
          <span style={{ fontSize: 12, color: colors.textFaint, fontStyle: "italic" }}>No description.</span>
        )}
        <div style={{ display: "grid", gap: 6, alignContent: "center" }}>
          <Bar label="Time" pct={timePct} color={colors.textDim} />
          <Bar label="Activity" pct={project.activityPct} color={project.color} />
        </div>
      </div>

      {/* Body — three columns */}
      <div style={{
        flex: 1, overflow: "auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 0,
      }}>
        {/* Files */}
        <Section
          title="Files"
          count={projectFiles.length}
          onAdd={fireCreateFile}
          empty="No files linked yet."
        >
          {projectFiles.map((f) => (
            <FileRow key={f.id} file={f} accent={project.color} onDelete={() => deleteFile(f.id)} />
          ))}
        </Section>

        {/* Events */}
        <Section
          title="Events"
          count={projectEvents.length}
          onAdd={fireCreateEvent}
          empty="No events linked yet."
        >
          {projectEvents.map((e) => (
            <EventRow key={e.id} event={e} accent={project.color} onEdit={() => fireEditEvent(e)} onDelete={() => deleteEvent(e.id)} />
          ))}
        </Section>

        {/* Tasks */}
        <Section
          title="Tasks"
          count={projectTasks.length}
          onAdd={fireCreateTask}
          empty="No tasks linked yet."
          last
        >
          {projectTasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={() => deleteTask(t.id)} />
          ))}
        </Section>
      </div>
    </div>
  );
}

/* ---------- Sections & rows ---------- */

function Section({
  title, count, onAdd, empty, children, last,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  empty: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div style={{
      borderRight: last ? "none" : `1px solid ${colors.border}`,
      display: "flex", flexDirection: "column", minHeight: 0,
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 8,
        backgroundColor: colors.bgPanel,
        position: "sticky", top: 0, zIndex: 1,
      }}>
        <span style={{ fontSize: 11, color: colors.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {title}
        </span>
        <span style={{ fontSize: 10, color: colors.textFaint, fontFamily: "var(--font-data)" }}>{count}</span>
        <span style={{ flex: 1 }} />
        <button
          onClick={onAdd}
          title={`New ${title.toLowerCase().replace(/s$/, "")}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 4,
            fontSize: 10, fontWeight: 500,
            color: colors.textDim,
            border: `1px solid ${colors.border}`, backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = colors.textMain; e.currentTarget.style.borderColor = colors.borderStrong; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = colors.textDim; e.currentTarget.style.borderColor = colors.border; }}
        >
          <Plus size={10} /> Add
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {hasChildren ? children : (
          <div style={{ padding: "16px 14px", fontSize: 12, color: colors.textFaint }}>{empty}</div>
        )}
      </div>
    </div>
  );
}

function FileRow({ file, accent, onDelete }: { file: FileSummary; accent: string; onDelete: () => void }) {
  return (
    <div className="lm-hoverable" style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto auto",
      alignItems: "center", gap: 8,
      padding: "8px 14px",
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <FileText size={13} style={{ color: accent }} />
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("mono:open-file", { detail: { fileId: file.id } }))}
        style={{ textAlign: "left", color: colors.textMain, fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {file.name}
      </button>
      <span style={{ fontSize: 10, color: colors.textFaint, fontFamily: "var(--font-data)" }}>
        {fmtDate(file.modifiedAt)}
      </span>
      <button onClick={onDelete} title="Delete" style={{ color: colors.textFaint, padding: 3 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = colors.statusMissed)}
        onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function EventRow({ event, accent, onEdit, onDelete }: { event: CalendarEvent; accent: string; onEdit: () => void; onDelete: () => void }) {
  const swatch = event.color ?? accent;
  const Icon = event.type === "repeating" ? Repeat : Clock;
  return (
    <div className="lm-hoverable" onClick={onEdit} style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      alignItems: "center", gap: 8,
      padding: "8px 14px",
      borderBottom: `1px solid ${colors.border}`,
      cursor: "pointer",
    }}>
      <div style={{ width: 3, height: 24, borderRadius: 2, backgroundColor: swatch }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon size={11} style={{ color: swatch, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: colors.textMain, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.title}
          </span>
        </div>
        <div style={{ marginTop: 1, fontSize: 10, color: colors.textDim, fontFamily: "var(--font-data)", display: "flex", gap: 10 }}>
          <span>{fmtDateTime(event.start)}</span>
          {event.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <MapPin size={9} /> {event.location}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete" style={{ color: colors.textFaint, padding: 3 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = colors.statusMissed)}
        onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const done = task.status === "done" || task.status === "early";
  const u = urgencyOf(task);
  const label = done ? null : urgencyLabel(u, task);
  const c = urgencyColor(u);
  const dueColor = done ? colors.statusDone : u === "overdue" ? colors.statusMissed : colors.textDim;
  return (
    <div className="lm-hoverable" style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto auto auto",
      alignItems: "center", gap: 8,
      padding: "8px 14px",
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <button onClick={onToggle} title={done ? "Mark pending" : "Mark done"} style={{
        color: done ? colors.statusDone : colors.textFaint, padding: 0,
      }}>
        {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
      </button>
      <span style={{
        fontSize: 12,
        color: done ? colors.textFaint : colors.textMain,
        textDecoration: done ? "line-through" : "none",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {task.title}
      </span>
      {label ? (
        <span style={{
          fontSize: 9, fontWeight: 600,
          color: c, background: `${c}1f`,
          border: `1px solid ${c}55`,
          padding: "1px 5px", borderRadius: 3,
          letterSpacing: 0.4,
        }}>
          {label}
        </span>
      ) : <span />}
      <span style={{ fontSize: 10, color: dueColor, fontFamily: "var(--font-data)" }}>
        {new Date(task.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
      </span>
      <button onClick={onDelete} title="Delete" style={{ color: colors.textFaint, padding: 3 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = colors.statusMissed)}
        onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}>
        <Trash2 size={11} />
      </button>
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
