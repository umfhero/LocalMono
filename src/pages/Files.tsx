import { colors } from "../theme/tokens";
import { RecentFiles } from "../widgets/RecentFiles";

export function FilesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Files</h1>
        <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
          All your .file notes — paste-anything documents, organised or loose.
        </div>
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        <RecentFiles />
        <div style={{ marginTop: 24, color: colors.textFaint, fontSize: 12 }}>
          Phase 4 will land the unified note editor here (paste-anything, draggable images, code-cell side panel).
        </div>
      </div>
    </div>
  );
}
