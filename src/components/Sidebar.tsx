import { useState } from "react";
import { LayoutDashboard, FolderKanban, FileText, Calendar, Settings } from "lucide-react";
import { colors } from "../theme/tokens";

export type Page = "dashboard" | "projects" | "files" | "events" | "settings";

interface Props {
  active: Page;
  onChange: (p: Page) => void;
}

const items: Array<{ key: Page; icon: React.ReactNode; label: string }> = [
  { key: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { key: "projects", icon: <FolderKanban size={18} />, label: "Projects" },
  { key: "files", icon: <FileText size={18} />, label: "Files" },
  { key: "events", icon: <Calendar size={18} />, label: "Events" },
];

const COLLAPSED_W = 48;
const EXPANDED_W = 168;

export function Sidebar({ active, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        backgroundColor: colors.bgPanel,
        borderRight: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "12px 6px",
        gap: 2,
        flexShrink: 0,
        transition: "width 160ms cubic-bezier(0.2, 0, 0, 1)",
        overflow: "hidden",
      }}
    >
      {items.map((it) => (
        <NavItem
          key={it.key}
          expanded={expanded}
          active={active === it.key}
          icon={it.icon}
          label={it.label}
          onClick={() => onChange(it.key)}
        />
      ))}

      <div style={{ flex: 1 }} />

      <NavItem
        expanded={expanded}
        active={active === "settings"}
        icon={<Settings size={18} />}
        label="Settings"
        onClick={() => onChange("settings")}
      />
    </aside>
  );
}

function NavItem({
  expanded, active, icon, label, onClick,
}: {
  expanded: boolean;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={expanded ? undefined : label}
      style={{
        position: "relative",
        height: 34,
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 6,
        color: active ? colors.textMain : colors.textDim,
        backgroundColor: active ? colors.bgElev : "transparent",
        transition: "color 100ms, background-color 100ms",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = colors.textMain;
          e.currentTarget.style.backgroundColor = colors.bgCardHover;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = colors.textDim;
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {active && (
        <span style={{
          position: "absolute", left: -2, top: 6, bottom: 6, width: 2,
          backgroundColor: colors.accent, borderRadius: 1,
        }} />
      )}
      <span style={{ display: "grid", placeItems: "center", width: 18, flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
        opacity: expanded ? 1 : 0, transition: "opacity 120ms",
      }}>
        {label}
      </span>
    </button>
  );
}
