import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { colors } from "../theme/tokens";
import * as api from "../api";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QuickCapture({ open, onClose }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<"ok" | "err" | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef("");
  const closingRef = useRef(false);

  useEffect(() => { textRef.current = text; }, [text]);

  useEffect(() => {
    if (open) {
      setText("");
      setFlash(null);
      setSaving(false);
      closingRef.current = false;
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [open]);

  const saveAndClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const trimmed = textRef.current.trim();

    // Empty text — close instantly, no delay.
    if (!trimmed) { onClose(); return; }

    // Has text — fire-and-forget the save, close the modal immediately.
    // The save runs in background; user won't wait for disk I/O.
    setSaving(true);
    if (api.runningInTauri) {
      api.quickCaptureSave(trimmed).catch((e) => {
        console.error("[QuickCapture] save failed:", e);
      });
    } else {
      console.log("(not in tauri) would save:", trimmed);
    }
    // Close right away — the shortcut→ESC→minimize cycle must feel instant.
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      saveAndClose();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      saveAndClose();
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      onKeyDown={onKeyDown}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "grid", placeItems: "start center", paddingTop: "14vh",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 86vw)",
          backgroundColor: colors.bgCard,
          border: `1px solid ${flash === "err" ? colors.statusMissed : colors.borderStrong}`,
          borderRadius: 10,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
          transition: "border-color 150ms",
        }}
      >
        <div style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 11, color: colors.textDim, letterSpacing: 0.5, textTransform: "uppercase",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Quick Capture
            {!api.runningInTauri && (
              <span style={{ color: colors.statusLate, textTransform: "none", fontSize: 10 }}>
                · browser mode (not persisted)
              </span>
            )}
          </span>
          <span style={{ color: colors.textFaint, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {flash === "ok" && <><Check size={11} /> saved</>}
            {flash === "err" && <span style={{ color: colors.statusMissed }}>save failed — see console</span>}
            {flash === null && (saving ? "saving…" : "esc / ⌘+↵ to save & close")}
          </span>
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Drop a thought, a link, code, anything…"
          style={{
            width: "100%", minHeight: 180, resize: "vertical",
            padding: 16, fontSize: 14, lineHeight: 1.6,
            color: colors.textMain, backgroundColor: "transparent",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}
