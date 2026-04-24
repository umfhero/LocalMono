import { useState } from "react";
import { Folder, Cpu } from "lucide-react";
import { colors } from "../theme/tokens";

export function SettingsPage() {
  const [folder, setFolder] = useState("(not set — defaults to ~/Mono)");
  const [model, setModel] = useState("llama3.2:3b");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Settings</h1>
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px", display: "grid", gap: 16, maxWidth: 720 }}>
        <Section title="Storage" icon={<Folder size={14} />}>
          <Row label="Data folder" hint="If empty, Mono initialises it. If it already has Mono data (e.g. via Google Drive on another device), Mono pulls everything in. Last-write-wins.">
            <div style={{ display: "flex", gap: 8 }}>
              <code style={{
                flex: 1, padding: "8px 10px",
                background: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: 4,
                color: colors.textDim, fontSize: 12, fontFamily: "var(--font-data)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{folder}</code>
              <button
                onClick={() => setFolder("/Users/majid/Google Drive/Mono")}
                style={{
                  padding: "8px 14px", fontSize: 12, fontWeight: 500,
                  color: colors.bgMain, backgroundColor: colors.accent, borderRadius: 4,
                }}
              >Choose…</button>
            </div>
          </Row>
        </Section>

        <Section title="Local AI" icon={<Cpu size={14} />}>
          <Row label="Model" hint="Briefings + NLP event add run on this local Ollama model. Free and unlimited.">
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 4,
                background: colors.bgPanel, color: colors.textMain, fontSize: 12, fontFamily: "var(--font-data)",
              }}
            />
          </Row>
        </Section>

        <div style={{ color: colors.textFaint, fontSize: 12 }}>
          Phase 2 wires these into the Rust backend.
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: colors.bgCard }}>
      <header style={{
        padding: "10px 14px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 8,
        color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6,
      }}>
        {icon}{title}
      </header>
      <div style={{ padding: 14, display: "grid", gap: 14 }}>{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: colors.textMain, fontWeight: 500 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: colors.textFaint, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}
