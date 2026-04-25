import { useEffect, useState } from "react";
import { Modal, fieldLabelStyle, inputStyle, btnPrimary, btnSecondary } from "../Modal";
import { colors } from "../../theme/tokens";
import { useStore } from "../../store";

interface Props { open: boolean; onClose: () => void; defaultProjectId?: string }

export function CreateFileDialog({ open, onClose, defaultProjectId }: Props) {
  const { createFile, projects } = useStore();
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (open) setProjectId(defaultProjectId ?? ""); }, [open, defaultProjectId]);

  const reset = () => { setName(""); setProjectId(defaultProjectId ?? ""); setErr(null); setBusy(false); };

  const submit = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setBusy(true); setErr(null);
    try {
      const finalName = name.trim().endsWith(".file") ? name.trim() : `${name.trim()}.file`;
      await createFile({ name: finalName, projectId: projectId || undefined });
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
      title="New file"
      width={420}
      footer={<>
        <button style={btnSecondary()} onClick={() => { reset(); onClose(); }}>Cancel</button>
        <button style={btnPrimary(busy)} onClick={submit} disabled={busy}>Create</button>
      </>}
    >
      <div style={{ display: "grid", gap: 14 }}>
        {err && <div style={{ color: colors.statusMissed, fontSize: 12 }}>{err}</div>}
        <Field label="Name">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="thesis-chapter-3" />
        </Field>
        <Field label="Project">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
            <option value="">— none —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div style={{ fontSize: 11, color: colors.textFaint, lineHeight: 1.5 }}>
          The unified note editor lands in Phase 4 — for now the file is created with an empty body.
        </div>
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
