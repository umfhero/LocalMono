import { useEffect } from "react";
import { X } from "lucide-react";
import { colors } from "../theme/tokens";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number | string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, width = 480, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 90,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "grid", placeItems: "center",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: "92vw", maxHeight: "86vh",
          display: "flex", flexDirection: "column",
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: 10,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderBottom: `1px solid ${colors.border}`,
        }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: colors.textMain }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ color: colors.textDim, padding: 2, borderRadius: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.textMain)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.textDim)}
          >
            <X size={14} />
          </button>
        </header>
        <div style={{ padding: 16, overflow: "auto", flex: 1 }}>
          {children}
        </div>
        {footer && (
          <footer style={{
            padding: "10px 14px", borderTop: `1px solid ${colors.border}`,
            display: "flex", justifyContent: "flex-end", gap: 8,
          }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11, color: colors.textDim, fontWeight: 500,
  textTransform: "uppercase", letterSpacing: 0.5,
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  color: colors.textMain,
  backgroundColor: colors.bgPanel,
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  outline: "none",
  fontFamily: "inherit",
};

export function btnPrimary(disabled = false): React.CSSProperties {
  return {
    padding: "7px 14px", fontSize: 12, fontWeight: 500, borderRadius: 5,
    color: colors.bgMain, backgroundColor: disabled ? colors.border : colors.accent,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function btnSecondary(): React.CSSProperties {
  return {
    padding: "7px 14px", fontSize: 12, fontWeight: 500, borderRadius: 5,
    color: colors.textDim, backgroundColor: "transparent",
    border: `1px solid ${colors.border}`,
  };
}
