import { useEffect, useRef, useState } from "react";
import { colors } from "../theme/tokens";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}

export function QuickCapture({ open, onClose, onSave }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (text.trim()) onSave(text.trim());
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, text, onClose, onSave]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
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
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: 10,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex", justifyContent: "space-between",
          fontSize: 11, color: colors.textDim, letterSpacing: 0.5, textTransform: "uppercase",
        }}>
          <span>Quick Capture</span>
          <span style={{ color: colors.textFaint }}>esc to save & close</span>
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
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
