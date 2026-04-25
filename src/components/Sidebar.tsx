import { useEffect, useState } from "react";
import { LayoutDashboard, FolderKanban, FileText, Calendar, Settings } from "lucide-react";
import { colors } from "../theme/tokens";

export type Page = "dashboard" | "projects" | "files" | "events" | "settings";

interface Props {
  active: Page;
  onChange: (p: Page) => void;
}

const ICON_SIZE = 26;
const items: Array<{ key: Page; icon: React.ReactNode; label: string }> = [
  { key: "dashboard", icon: <LayoutDashboard size={ICON_SIZE} />, label: "Dashboard" },
  { key: "projects", icon: <FolderKanban size={ICON_SIZE} />, label: "Projects" },
  { key: "files", icon: <FileText size={ICON_SIZE} />, label: "Files" },
  { key: "events", icon: <Calendar size={ICON_SIZE} />, label: "Events" },
];

const COLLAPSED_W = 64;
const EXPANDED_W = 200;
const PROXIMITY_PX = 80; // expand when the cursor gets within this far of the left edge

export function Sidebar({ active, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Proximity expand: the sidebar expands when the cursor approaches the right edge
  // (the sidebar is docked right). It only collapses once the cursor moves back
  // past where the expanded panel ends.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const triggerFromRight = COLLAPSED_W + PROXIMITY_PX;
      if (expanded) {
        if (e.clientX < w - EXPANDED_W) setExpanded(false);
      } else {
        if (e.clientX > w - triggerFromRight) setExpanded(true);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [expanded]);

  return (
    <aside
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? EXPANDED_W : COLLAPSED_W,
        backgroundColor: colors.bgPanel,
        borderLeft: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "14px 8px",
        gap: 4,
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
        icon={<Settings size={ICON_SIZE} />}
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
        height: 46,
        padding: "0 12px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        borderRadius: 8,
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
          position: "absolute", right: -2, top: 8, bottom: 8, width: 3,
          backgroundColor: colors.accent, borderRadius: 2,
        }} />
      )}
      <span style={{ display: "grid", placeItems: "center", width: ICON_SIZE, flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontSize: 14, fontWeight: 500, whiteSpace: "nowrap",
        opacity: expanded ? 1 : 0, transition: "opacity 120ms",
      }}>
        {label}
      </span>
    </button>
  );
}
