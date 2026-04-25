import { useState } from "react";
import * as Lucide from "lucide-react";
import { Modal, fieldLabelStyle, inputStyle, btnPrimary, btnSecondary } from "../Modal";
import { colors } from "../../theme/tokens";
import { useStore } from "../../store";

const ICONS = ["Box", "Cpu", "GraduationCap", "Code", "Briefcase", "Heart", "Star", "Book", "Rocket", "Flame", "Music", "Palette"];
const COLORS = ["#ff4d5e", "#4fc1ff", "#4ec9b0", "#d7ba7d", "#c586c0", "#569cd6", "#dd6b20", "#8b5cf6"];

const todayIso = () => new Date().toISOString().slice(0, 10);
const inDaysIso = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

interface Props { open: boolean; onClose: () => void; }

export function CreateProjectDialog({ open, onClose }: Props) {
  const { createProject } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Box");
  const [color, setColor] = useState(COLORS[0]);
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(inDaysIso(30));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setName(""); setDescription(""); setIcon("Box"); setColor(COLORS[0]);
    setStart(todayIso()); setEnd(inDaysIso(30)); setErr(null); setBusy(false);
  };

  const submit = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setBusy(true); setErr(null);
    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        icon, color,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      });
      reset();
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="New project"
      width={520}
      footer={<>
        <button style={btnSecondary()} onClick={() => { reset(); onClose(); }}>Cancel</button>
        <button style={btnPrimary(busy)} onClick={submit} disabled={busy}>Create</button>
      </>}
    >
      <div style={{ display: "grid", gap: 14 }}>
        {err && <div style={{ color: colors.statusMissed, fontSize: 12 }}>{err}</div>}

        <Field label="Name">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="KCL Hackathon" />
        </Field>

        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="(optional)" />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Start">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="End">
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Icon">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ICONS.map((name) => {
              const Icon = (Lucide as any)[name] ?? Lucide.Box;
              const active = icon === name;
              return (
                <button
                  key={name}
                  onClick={() => setIcon(name)}
                  style={{
                    width: 30, height: 30, borderRadius: 5,
                    display: "grid", placeItems: "center",
                    border: `1px solid ${active ? color : colors.border}`,
                    backgroundColor: active ? `${color}1a` : colors.bgPanel,
                    color: active ? color : colors.textDim,
                  }}
                  title={name}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Color">
          <div style={{ display: "flex", gap: 6 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 26, height: 26, borderRadius: "50%",
                  backgroundColor: c,
                  border: `2px solid ${color === c ? colors.textMain : "transparent"}`,
                  outline: `1px solid ${colors.border}`,
                }}
                title={c}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </div>
  );
}
