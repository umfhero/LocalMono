import { colors } from "../theme/tokens";
import { ActiveProjects } from "../widgets/ActiveProjects";

export function ProjectsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Projects</h1>
        <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
          Time-bound containers with their own files, links, and progress.
        </div>
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        <ActiveProjects />
        <div style={{ marginTop: 24, color: colors.textFaint, fontSize: 12 }}>
          Phase 3: project create dialog (icon, color, time span, description), workspace view, file nesting.
        </div>
      </div>
    </div>
  );
}
