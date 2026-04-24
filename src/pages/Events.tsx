import { colors } from "../theme/tokens";
import { LinearCalendar } from "../widgets/LinearCalendar";

export function EventsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Events</h1>
        <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
          Single, repeating, long-term, plus a togglable timetable layer.
        </div>
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        <LinearCalendar />
        <div style={{ marginTop: 24, color: colors.textFaint, fontSize: 12 }}>
          Phase 5: full month/week views, type templates, and "add weekly social Friday 5pm" via local Ollama NLP.
        </div>
      </div>
    </div>
  );
}
