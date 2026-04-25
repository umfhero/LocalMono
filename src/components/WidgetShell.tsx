import { GripVertical } from "lucide-react";
import { colors } from "../theme/tokens";

interface Props {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  bare?: boolean;        // no border / no background — used for Briefing
  editMode?: boolean;
  dense?: boolean;       // tighter padding
}

export function WidgetShell({ title, right, children, bare, editMode, dense }: Props) {
  const headerPad = dense ? "6px 10px" : "8px 12px";
  const bodyPad = dense ? 8 : 10;

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: bare ? "transparent" : colors.bgCard,
      border: bare ? "none" : `1px solid ${colors.border}`,
      borderRadius: 8,
      overflow: "hidden",
    }}>
      {(title || right || editMode) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: bare ? "2px 0 6px" : headerPad,
          borderBottom: bare ? "none" : `1px solid ${colors.border}`,
          flexShrink: 0,
          minHeight: bare ? 0 : 28,
        }}>
          {editMode && (
            <span className="lm-drag-handle" style={{ cursor: "grab", color: colors.textFaint, display: "grid", placeItems: "center" }}>
              <GripVertical size={12} />
            </span>
          )}
          {title && (
            <h3 style={{
              fontSize: 11,
              fontWeight: 500,
              color: colors.textDim,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              flex: 1,
            }}>
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, padding: bare ? 0 : bodyPad, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
