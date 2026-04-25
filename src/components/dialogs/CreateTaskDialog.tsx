import { useState } from "react";
import { Modal, fieldLabelStyle, inputStyle, btnPrimary, btnSecondary } from "../Modal";
import { colors } from "../../theme/tokens";
import { useStore } from "../../store";

const isoLocalEod = () => {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

interface Props { open: boolean; onClose: () => void; }

export function CreateTaskDialog({ open, onClose }: Props) {
  const { createTask, projects } = useStore();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(isoLocalEod());
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => { setTitle(""); setDue(isoLocalEod()); setProjectId(""); setErr(null); setBusy(false); };

  const submit = async () => {
    if (!title.trim()) { setErr("Title is required"); return; }
    setBusy(true); setErr(null);
    try {
      await createTask({
        title: title.trim(),
        due: new Date(due).toISOString(),
        projectId: projectId || undefined,
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
      title="New task"
      width={460}
      footer={<>
        <button style={btnSecondary()} onClick={() => { reset(); onClose(); }}>Cancel</button>
        <button style={btnPrimary(busy)} onClick={submit} disabled={busy}>Create</button>
      </>}
    >
      <div style={{ display: "grid", gap: 14 }}>
        {err && <div style={{ color: colors.statusMissed, fontSize: 12 }}>{err}</div>}
        <Field label="Title">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Read Goodfellow ch.6" />
        </Field>
        <Field label="Due">
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Project">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
            <option value="">— none —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
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
