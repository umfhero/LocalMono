import { FileText, Plus } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";

const fmt = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
};

export function RecentFiles() {
  const { files, projects } = useStore();
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
  const sorted = [...files].sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "auto" }}>
        {sorted.map((f) => {
          const proj = f.projectId ? projectMap[f.projectId] : undefined;
          return (
            <button
              key={f.id}
              onClick={() => window.dispatchEvent(new CustomEvent("mono:open-file", { detail: { fileId: f.id } }))}
              className="lm-hoverable"
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: 10,
                padding: "8px 6px",
                borderRadius: 4,
                textAlign: "left",
              }}
            >
              <FileText size={14} style={{ color: proj?.color ?? colors.textDim }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: colors.textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </div>
                {f.preview && (
                  <div style={{ fontSize: 11, color: colors.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.preview}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, color: colors.textFaint, fontFamily: "var(--font-data)" }}>{fmt(f.modifiedAt)}</span>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: 11, padding: "8px 6px" }}>No files yet.</div>
        )}
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("mono:create-file"))}
        style={{
          marginTop: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "6px 8px", borderRadius: 4,
          border: `1px dashed ${colors.border}`,
          color: colors.textFaint, fontSize: 11,
          transition: "100ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent; e.currentTarget.style.borderColor = colors.accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = colors.textFaint; e.currentTarget.style.borderColor = colors.border; }}
      >
        <Plus size={12} /> New file
      </button>
    </div>
  );
}
