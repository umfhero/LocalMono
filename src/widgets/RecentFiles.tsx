import { FileText } from "lucide-react";
import { colors } from "../theme/tokens";
import { mockFiles, mockProjects } from "../mock/data";

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
  const projectMap = Object.fromEntries(mockProjects.map((p) => [p.id, p]));
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {mockFiles.map((f) => {
        const proj = f.projectId ? projectMap[f.projectId] : undefined;
        return (
          <button
            key={f.id}
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
    </div>
  );
}
