import { Sparkles, ChevronRight } from "lucide-react";
import { colors } from "../theme/tokens";
import { mockBriefings } from "../mock/data";
import type { BriefingEntity } from "../types";

const entityColor: Record<BriefingEntity["kind"], string> = {
  project: colors.accent,
  event: "#c586c0",
  task: colors.statusLate,
  topic: colors.statusDone,
};

export function Briefing() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "2px 2px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textDim }}>
        <Sparkles size={13} />
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>Briefings</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: colors.textFaint }}>ollama · local</span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {mockBriefings.map((b) => (
          <article key={b.id} style={{ display: "flex", gap: 10 }}>
            <span style={{
              width: 2, alignSelf: "stretch",
              backgroundColor: colors.accent,
              borderRadius: 1, opacity: 0.6,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <header style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 10, color: colors.textDim,
                textTransform: "uppercase", letterSpacing: 0.6,
                marginBottom: 3,
              }}>
                {b.label}
                <ChevronRight size={10} style={{ color: colors.textFaint }} />
              </header>
              <p style={{
                fontSize: 13, lineHeight: 1.55, color: colors.textMain,
                fontWeight: 400,
              }}>
                {b.body.map((part, i) =>
                  typeof part === "string"
                    ? <span key={i}>{part}</span>
                    : <span key={i} style={{ color: entityColor[part.kind], fontWeight: 500 }}>{part.text}</span>
                )}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
