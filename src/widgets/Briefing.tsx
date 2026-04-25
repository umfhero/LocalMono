import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, ChevronRight, RefreshCw, AlertTriangle } from "lucide-react";
import { colors } from "../theme/tokens";
import { mockBriefings } from "../mock/data";
import { useStore } from "../store";
import * as api from "../api";
import { BRIEFING_SYSTEM, buildBriefingContext } from "../llm/prompts";
import type { BriefingEntity } from "../types";

const entityColor: Record<BriefingEntity["kind"], string> = {
  project: colors.accent,
  event: "#c586c0",
  task: colors.statusLate,
  topic: colors.statusDone,
};

type Status = "idle" | "loading" | "ok" | "error" | "fallback";

export function Briefing() {
  const { projects, tasks, events, config } = useStore();
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const model = config.ollamaModel?.trim();
  const context = useMemo(() => buildBriefingContext(projects, tasks, events), [projects, tasks, events]);

  const generate = useCallback(async () => {
    if (!api.runningInTauri || !model) {
      setStatus("fallback");
      return;
    }
    setStatus("loading");
    setErr(null);
    try {
      const healthy = await api.ollamaHealth();
      if (!healthy) {
        setStatus("fallback");
        setErr("Ollama daemon not reachable on localhost:11434");
        return;
      }
      const out = await api.ollamaGenerate({
        model,
        system: BRIEFING_SYSTEM,
        prompt: context,
      });
      setText(out.trim());
      setStatus("ok");
    } catch (e) {
      setErr(String(e));
      setStatus("fallback");
    }
  }, [model, context]);

  // Auto-generate once on mount when conditions are right.
  useEffect(() => { generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [model]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "2px 2px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textDim }}>
        <Sparkles size={13} />
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>Briefing</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: status === "ok" ? colors.statusDone : colors.textFaint }}>
          {status === "loading" ? "generating…" : status === "ok" ? `ollama · ${model}` : "ollama · local"}
        </span>
        <button
          onClick={generate}
          title="Regenerate briefing"
          disabled={status === "loading"}
          style={{
            display: "inline-flex", alignItems: "center", padding: 3, borderRadius: 3,
            color: colors.textFaint, opacity: status === "loading" ? 0.4 : 1,
          }}
          onMouseEnter={(e) => { if (status !== "loading") e.currentTarget.style.color = colors.textMain; }}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}
        >
          <RefreshCw size={11} style={{ animation: status === "loading" ? "lm-spin 1s linear infinite" : undefined }} />
        </button>
      </div>

      {status === "ok" ? (
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{
            width: 2, alignSelf: "stretch",
            backgroundColor: colors.accent,
            borderRadius: 1, opacity: 0.6,
          }} />
          <p style={{
            flex: 1,
            fontSize: 13, lineHeight: 1.55, color: colors.textMain,
            fontWeight: 400, whiteSpace: "pre-wrap",
          }}>
            {text}
          </p>
        </div>
      ) : status === "loading" ? (
        <div style={{ fontSize: 12, color: colors.textFaint, padding: "4px 0" }}>
          Asking {model}…
        </div>
      ) : (
        <FallbackBriefings reason={!model ? "no-model" : err ? "ollama-down" : "browser"} />
      )}
    </div>
  );
}

function FallbackBriefings({ reason }: { reason: "no-model" | "ollama-down" | "browser" }) {
  const hint =
    reason === "no-model" ? "No Ollama model configured — set one in Settings to get a real briefing."
    : reason === "ollama-down" ? "Ollama daemon unreachable on localhost:11434 — falling back to demo briefings."
    : "Running in browser — no Ollama. Demo briefings shown.";

  return (
    <>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 6,
        padding: "5px 8px", borderRadius: 4,
        background: "rgba(215,186,125,0.08)",
        border: `1px solid ${colors.statusLate}33`,
        fontSize: 11, color: colors.statusLate, lineHeight: 1.4,
      }}>
        <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{hint}</span>
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
    </>
  );
}

