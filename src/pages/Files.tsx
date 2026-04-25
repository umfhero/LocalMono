import { useState } from "react";
import { Plus, Trash2, FileText, Search } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import type { FileSummary } from "../api";

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
};

export function FilesPage() {
  const { files, projects, deleteFile, backed } = useStore();
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("");

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const filtered = files
    .filter((f) => !query.trim() || f.name.toLowerCase().includes(query.toLowerCase()))
    .filter((f) => !projectFilter || f.projectId === projectFilter)
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  const fire = () => window.dispatchEvent(new CustomEvent("mono:create-file"));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{
        padding: "14px 24px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Files</h1>
          <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
            {files.length} file{files.length === 1 ? "" : "s"} · paste-anything documents
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
          <Plus size={13} /> New file
        </button>
      </header>

      <div style={{
        padding: "10px 24px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", gap: 10, alignItems: "center",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 5,
          backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`,
          flex: 1, maxWidth: 360,
        }}>
          <Search size={12} style={{ color: colors.textFaint }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            style={{ flex: 1, fontSize: 12, color: colors.textMain }}
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{
            padding: "6px 10px", fontSize: 12,
            backgroundColor: colors.bgPanel, color: colors.textDim,
            border: `1px solid ${colors.border}`, borderRadius: 5,
          }}
        >
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ color: colors.textFaint, fontSize: 13, padding: 24 }}>
            {files.length === 0 ? "No files yet. Hit + New file to create one." : "No files match this filter."}
          </div>
        ) : (
          <div>
            {filtered.map((f) => <FileRow key={f.id} file={f} projectMap={projectMap} onDelete={() => deleteFile(f.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function FileRow({
  file, projectMap, onDelete,
}: {
  file: FileSummary;
  projectMap: Record<string, { name: string; color: string }>;
  onDelete: () => void;
}) {
  const proj = file.projectId ? projectMap[file.projectId] : undefined;
  return (
    <div
      className="lm-hoverable"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto auto",
        alignItems: "center",
        gap: 12,
        padding: "10px 24px",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <FileText size={14} style={{ color: proj?.color ?? colors.textDim }} />
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("mono:open-file", { detail: { fileId: file.id } }))}
        style={{ textAlign: "left", color: colors.textMain, fontSize: 13, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
        {file.preview && (
          <span style={{ fontSize: 11, color: colors.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.preview}
          </span>
        )}
      </button>
      {proj && (
        <span style={{
          fontSize: 10, color: proj.color,
          background: `${proj.color}1a`, padding: "2px 6px", borderRadius: 3,
        }}>
          {proj.name}
        </span>
      )}
      <span style={{ fontSize: 10, color: colors.textFaint, fontFamily: "var(--font-data)" }}>
        {fmt(file.modifiedAt)}
      </span>
      <button
        onClick={onDelete}
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
