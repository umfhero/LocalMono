import { useEffect, useRef, useState } from "react";
import { Folder, Cpu, AlertTriangle, Check, Keyboard } from "lucide-react";
import { colors } from "../theme/tokens";
import * as api from "../api";
import { useStore } from "../store";

const DEFAULT_SHORTCUT = "Ctrl+Shift+Space";

export function SettingsPage() {
  const { reload, pickAndSetDataDir } = useStore();
  const [config, setConfig] = useState<api.AppConfig>({});
  const [model, setModel] = useState("");
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!api.runningInTauri) return;
    api.getConfig().then((c) => {
      setConfig(c);
      setModel(c.ollamaModel ?? "llama3.2:3b");
      setShortcut(c.captureShortcut ?? DEFAULT_SHORTCUT);
    }).catch((e) => setErr(String(e)));
  }, []);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2000);
  };

  const pickFolder = async () => {
    setBusy(true); setErr(null);
    try {
      const picked = await pickAndSetDataDir();
      if (!picked) return;
      const cfg = await api.getConfig();
      setConfig(cfg);
      flash("Data folder set. Mono initialised its scaffolding inside.");
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };

  const saveModel = async () => {
    setBusy(true); setErr(null);
    try {
      const cfg = await api.setOllamaModel(model);
      setConfig(cfg);
      flash("Model saved.");
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };

  const saveShortcut = async () => {
    setBusy(true); setErr(null);
    try {
      const cfg = await api.setCaptureShortcut(shortcut);
      setConfig(cfg);
      await reload();
      flash("Shortcut saved & re-registered system-wide.");
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Settings</h1>
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px", display: "grid", gap: 16, maxWidth: 720 }}>

        {!api.runningInTauri && (
          <Banner kind="warn">
            Running in a browser — storage commands are disabled. Launch via <code style={{ fontFamily: "var(--font-data)" }}>npm run tauri dev</code> to persist data.
          </Banner>
        )}
        {err && <Banner kind="error">{err}</Banner>}
        {status && <Banner kind="ok">{status}</Banner>}

        <Section title="Storage" icon={<Folder size={14} />}>
          <Row
            label="Data folder"
            hint="If empty, Mono initialises it (creates projects.json, events.json, inbox.json, files/). If it already has Mono data, Mono reads it in. Point this at a Drive folder to sync across devices — last-write-wins."
          >
            <div style={{ display: "flex", gap: 8 }}>
              <code style={{
                flex: 1, padding: "8px 10px",
                background: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: 4,
                color: config.dataDir ? colors.textMain : colors.textFaint,
                fontSize: 12, fontFamily: "var(--font-data)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {config.dataDir ?? "(not set — no data is being persisted)"}
              </code>
              <button onClick={pickFolder} disabled={busy || !api.runningInTauri} style={btnPrimary(busy || !api.runningInTauri)}>
                Choose…
              </button>
            </div>
          </Row>
        </Section>

        <Section title="Shortcuts" icon={<Keyboard size={14} />}>
          <Row
            label="Quick capture"
            hint={
              <>
                Currently fires only when the Mono window is focused. Phase 7 wires this as a <em>system-wide</em> hotkey via <code style={{ fontFamily: "var(--font-data)" }}>tauri-plugin-global-shortcut</code> so it works while the app is minimised.
                <br />Format: combine modifiers and a key, e.g. <code style={{ fontFamily: "var(--font-data)" }}>Ctrl+Shift+Space</code>, <code style={{ fontFamily: "var(--font-data)" }}>Alt+N</code>, <code style={{ fontFamily: "var(--font-data)" }}>F8</code>.
              </>
            }
          >
            <ShortcutCapture value={shortcut} onChange={setShortcut} disabled={!api.runningInTauri} onSave={saveShortcut} busy={busy} />
          </Row>
        </Section>

        <Section title="Local AI" icon={<Cpu size={14} />}>
          <Row label="Ollama model" hint="Used for briefings and NLP event add. Run `ollama pull <model>` first.">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!api.runningInTauri}
                style={{
                  flex: 1,
                  padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 4,
                  background: colors.bgPanel, color: colors.textMain, fontSize: 12,
                  fontFamily: "var(--font-data)",
                }}
              />
              <button onClick={saveModel} disabled={busy || !api.runningInTauri} style={btnPrimary(busy || !api.runningInTauri)}>
                Save
              </button>
            </div>
          </Row>
        </Section>
      </div>
    </div>
  );
}

function ShortcutCapture({
  value, onChange, onSave, busy, disabled,
}: {
  value: string;
  onChange: (s: string) => void;
  onSave: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.metaKey) parts.push("Cmd");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    const key = e.key;
    const modifierKeys = new Set(["Control", "Meta", "Alt", "Shift"]);
    if (modifierKeys.has(key)) return; // wait for a non-modifier

    let display = key;
    if (key === " " || e.code === "Space") display = "Space";
    else if (key.length === 1) display = key.toUpperCase();
    else display = key.charAt(0).toUpperCase() + key.slice(1);

    parts.push(display);
    onChange(parts.join("+"));
    setRecording(false);
    ref.current?.blur();
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        ref={ref}
        value={recording ? "press a combination…" : value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setRecording(true)}
        onBlur={() => setRecording(false)}
        disabled={disabled}
        readOnly={recording}
        style={{
          flex: 1,
          padding: "8px 10px",
          border: `1px solid ${recording ? colors.accent : colors.border}`,
          borderRadius: 4,
          background: colors.bgPanel,
          color: recording ? colors.textDim : colors.textMain,
          fontSize: 12,
          fontFamily: "var(--font-data)",
          fontStyle: recording ? "italic" : "normal",
          transition: "border-color 100ms",
        }}
      />
      <button onClick={onSave} disabled={busy || disabled} style={btnPrimary(busy || disabled)}>Save</button>
    </div>
  );
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px", fontSize: 12, fontWeight: 500, borderRadius: 4,
    color: colors.bgMain, backgroundColor: disabled ? colors.border : colors.accent,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function Banner({ kind, children }: { kind: "warn" | "error" | "ok"; children: React.ReactNode }) {
  const styles: Record<typeof kind, { bg: string; fg: string; border: string; icon: React.ReactNode }> = {
    warn:  { bg: "rgba(215,186,125,0.08)", fg: colors.statusLate,   border: colors.statusLate,   icon: <AlertTriangle size={14} /> },
    error: { bg: "rgba(224,96,96,0.08)",   fg: colors.statusMissed, border: colors.statusMissed, icon: <AlertTriangle size={14} /> },
    ok:    { bg: "rgba(78,201,176,0.08)",  fg: colors.statusDone,   border: colors.statusDone,   icon: <Check size={14} /> },
  };
  const s = styles[kind];
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "8px 12px", borderRadius: 4,
      background: s.bg, color: s.fg, border: `1px solid ${s.border}33`,
      fontSize: 12, lineHeight: 1.5,
    }}>
      <span style={{ marginTop: 1, flexShrink: 0 }}>{s.icon}</span>
      <span style={{ flex: 1 }}>{children}</span>
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

function Row({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: colors.textMain, fontWeight: 500 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: colors.textFaint, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}
