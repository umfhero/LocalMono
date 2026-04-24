import { GripVertical } from "lucide-react";
import { colors } from "../theme/tokens";

interface Props {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  bare?: boolean;        // no border / no background — used for Briefing
  editMode?: boolean;
}

export function WidgetShell({ title, right, children, bare, editMode }: Props) {
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
          display: "flex", alignItems: "center", gap: 8,
          padding: bare ? "4px 0 8px" : "10px 14px",
          borderBottom: bare ? "none" : `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          {editMode && (
            <span className="lm-drag-handle" style={{ cursor: "grab", color: colors.textFaint, display: "grid", placeItems: "center" }}>
              <GripVertical size={14} />
            </span>
          )}
          {title && (
            <h3 style={{
              fontSize: 12,
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
      <div style={{ flex: 1, minHeight: 0, padding: bare ? 0 : 14, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
