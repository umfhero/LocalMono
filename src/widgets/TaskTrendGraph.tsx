import { useState, useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { colors } from "../theme/tokens";
import { mockTrendRaw, computeTrend, type TrendRange, type TrendPoint, type TrendEvent } from "../mock/data";
import { useStore } from "../store";
import type { Task } from "../api";

function trendEventsFromTasks(tasks: Task[]): TrendEvent[] {
  if (tasks.length === 0) return mockTrendRaw;
  return tasks
    .map((t) => ({
      status: t.status,
      date: t.completedAt ?? t.due,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const ranges: Array<{ key: TrendRange; label: string }> = [
  { key: "today", label: "Today" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "all", label: "ALL" },
];

const statusColor: Record<TrendPoint["status"], string> = {
  done: colors.statusDone,
  late: colors.statusLate,
  missed: colors.statusMissed,
  early: colors.statusEarly,
  pending: colors.statusPending,
  origin: colors.textFaint,
};

const isPending = (s: TrendPoint["status"]) => s === "pending";
const isComplete = (s: TrendPoint["status"]) => s === "done" || s === "early" || s === "late" || s === "missed";

export function TaskTrendGraph() {
  const [range, setRange] = useState<TrendRange>("1m");
  const { tasks } = useStore();
  const events = useMemo(() => trendEventsFromTasks(tasks), [tasks]);
  const points = useMemo(() => computeTrend(events, range), [events, range]);

  const stats = useMemo(() => {
    const counts = { done: 0, late: 0, missed: 0, early: 0, pending: 0 };
    points.forEach((p) => {
      if (p.status !== "origin" && p.status in counts) {
        counts[p.status as keyof typeof counts]++;
      }
    });
    const completed = counts.done + counts.early + counts.late + counts.missed;
    const successful = counts.done + counts.early;
    const completion = completed === 0 ? 0 : Math.round((successful / completed) * 100);
    return { ...counts, completion };
  }, [points]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{
            fontSize: 26, fontWeight: 600, color: colors.statusLate,
            fontFamily: "var(--font-data)", lineHeight: 1,
          }}>
            {stats.completion}%
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: colors.textDim, flexWrap: "wrap" }}>
            <Stat n={stats.done} label="done" color={colors.statusDone} />
            <Stat n={stats.missed} label="missed" color={colors.statusMissed} />
            <Stat n={stats.early} label="early" color={colors.statusEarly} />
            <Stat n={stats.late} label="late" color={colors.statusLate} />
            {stats.pending > 0 && <Stat n={stats.pending} label="pending" color={colors.statusPending} />}
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{
          display: "inline-flex",
          background: colors.bgPanel,
          borderRadius: 6,
          padding: 2,
          border: `1px solid ${colors.border}`,
          height: "fit-content",
        }}>
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                fontSize: 11, fontWeight: 500,
                padding: "4px 10px", borderRadius: 4,
                color: range === r.key ? colors.textMain : colors.textDim,
                backgroundColor: range === r.key ? colors.bgElev : "transparent",
                transition: "100ms",
              }}
            >
              {r.label}
            </button>
          ))}
          <button title="Open full graph" style={{ marginLeft: 4, padding: "4px 6px", borderRadius: 4, color: colors.textDim }}>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {points.length <= 1
          ? <Empty label={range === "today" ? "No tasks due today yet" : "No data in this range"} />
          : <TrendSvg points={points} />
        }
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 11, color: colors.textDim, flexWrap: "wrap" }}>
        <Legend swatch={colors.statusDone} label="Completed" />
        <Legend swatch={colors.statusLate} label="Late" />
        <Legend swatch={colors.statusMissed} label="Missed" />
        <Legend swatch={colors.statusPending} label="Pending" dashed />
        <Legend swatch={colors.statusIdeal} label="Ideal" dashed />
        <span style={{ flex: 1 }} />
        <span style={{
          background: "rgba(215, 186, 125, 0.12)",
          color: colors.statusLate,
          padding: "3px 10px", borderRadius: 999,
          fontSize: 11, fontWeight: 500,
        }}>
          Keep going
        </span>
      </div>
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}>
      <span style={{ color, fontWeight: 600, fontFamily: "var(--font-data)" }}>{n}</span>
      <span>{label}</span>
    </span>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: 14, height: 2,
        backgroundColor: dashed ? "transparent" : swatch,
        borderTop: dashed ? `2px dashed ${swatch}` : "none",
        borderRadius: 1,
      }} />
      {label}
    </span>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{
      height: "100%", display: "grid", placeItems: "center",
      color: colors.textFaint, fontSize: 12,
    }}>{label}</div>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" });

const tooltipFor = (p: TrendPoint) => {
  if (p.status === "origin") return "Start";
  return `${fmtDate(p.date)} · ${p.status} · score ${p.y}`;
};

function TrendSvg({ points }: { points: TrendPoint[] }) {
  const W = 600;
  const H = 200;
  const padL = 24, padR = 8, padT = 8, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xMax = Math.max(...points.map((p) => p.x), 1);
  const yMax = Math.max(...points.map((p) => p.y), xMax, 2);
  const yMin = Math.min(...points.map((p) => p.y), 0);
  const yRange = yMax - yMin || 1;

  const x = (v: number) => padL + (v / xMax) * innerW;
  const y = (v: number) => padT + (1 - (v - yMin) / yRange) * innerH;

  // Ideal line endpoint (slope +1)
  const idealY = Math.min(xMax, yMax);
  const idealEndX = x(idealY);
  const idealEndY = y(idealY);

  // Y axis ticks — evenly spaced
  const yTicks = (() => {
    const steps = 3;
    const arr: number[] = [];
    for (let i = 0; i <= steps; i++) {
      arr.push(Math.round(yMin + (yRange * i) / steps));
    }
    return Array.from(new Set(arr));
  })();

  // X ticks — show ~8 labels max
  const xTickStep = Math.max(1, Math.ceil(xMax / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style={{ display: "block" }}>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={colors.border} strokeWidth={1} />
          <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill={colors.textFaint} fontFamily="var(--font-data)">{v}</text>
        </g>
      ))}

      {Array.from({ length: xMax + 1 }).map((_, i) => (
        i % xTickStep === 0 ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={9} fill={colors.textFaint} fontFamily="var(--font-data)">
            {i}
          </text>
        ) : null
      ))}

      {/* Ideal dashed line from origin */}
      <line x1={x(0)} y1={y(0)} x2={idealEndX} y2={idealEndY} stroke={colors.statusIdeal} strokeWidth={1.5} strokeDasharray="4 4" />

      {/* Segments */}
      {points.map((p, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const dashed = isPending(p.status) || isPending(prev.status);
        const stroke = dashed ? colors.statusPending : statusColor[p.status];
        return (
          <line
            key={`seg-${i}`}
            x1={x(prev.x)} y1={y(prev.y)}
            x2={x(p.x)} y2={y(p.y)}
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={dashed ? "4 4" : undefined}
          />
        );
      })}

      {/* Dots — wrapped in <g> so hover hit-area is bigger and tooltips work */}
      {points.map((p, i) => (
        <g key={`dot-${i}`} style={{ cursor: "pointer" }}>
          <title>{tooltipFor(p)}</title>
          <circle cx={x(p.x)} cy={y(p.y)} r={9} fill="transparent" />
          <circle
            cx={x(p.x)} cy={y(p.y)}
            r={p.status === "origin" ? 3.5 : isComplete(p.status) ? 4.5 : 3.5}
            fill={statusColor[p.status]}
            stroke={colors.bgCard}
            strokeWidth={p.status === "origin" ? 1.5 : 2}
            opacity={p.status === "origin" ? 0.7 : isPending(p.status) ? 0.7 : 1}
          />
        </g>
      ))}
    </svg>
  );
}
