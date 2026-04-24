import { useMemo } from "react";
import { colors } from "../theme/tokens";
import { mockEvents } from "../mock/data";

const DAYS = 14;

export function LinearCalendar() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const days = useMemo(
    () => Array.from({ length: DAYS }).map((_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i); return d;
    }),
    [today]
  );

  // Lay out events into stack rows
  const placed = useMemo(() => {
    const startOfWindow = today.getTime();
    const endOfWindow = days[days.length - 1].getTime() + 86400000;

    const visible = mockEvents
      .map((e) => {
        const s = new Date(e.start).getTime();
        const en = new Date(e.end).getTime();
        if (en < startOfWindow || s > endOfWindow) return null;
        const startDay = Math.max(0, Math.floor((s - startOfWindow) / 86400000));
        const endDay = Math.min(DAYS - 1, Math.floor((en - startOfWindow) / 86400000));
        return { event: e, startDay, endDay };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.startDay - b.startDay || (b.endDay - b.startDay) - (a.endDay - a.startDay));

    const rows: Array<Array<typeof visible[number]>> = [];
    visible.forEach((item) => {
      let rowIdx = rows.findIndex((row) => row.every((it) => it.endDay < item.startDay || it.startDay > item.endDay));
      if (rowIdx === -1) { rows.push([]); rowIdx = rows.length - 1; }
      rows[rowIdx].push(item);
    });
    return rows;
  }, [days, today]);

  const colW = `calc((100% - 0px) / ${DAYS})`;
  const todayIdx = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      {/* Date header */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${DAYS}, 1fr)`, position: "relative" }}>
        {days.map((d, i) => {
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isFirstOfMonth = d.getDate() === 1;
          return (
            <div key={i} style={{
              padding: "2px 0 6px",
              textAlign: "center",
              borderLeft: i === 0 ? "none" : `1px solid ${colors.border}`,
            }}>
              <div style={{
                fontSize: 9, color: colors.textFaint, textTransform: "uppercase", letterSpacing: 0.5,
              }}>
                {isWeekend ? d.toLocaleDateString("en", { weekday: "narrow" }) :
                  isFirstOfMonth ? d.toLocaleDateString("en", { month: "short" }) : " "}
              </div>
              <div style={{
                fontSize: 13, fontWeight: i === todayIdx ? 600 : 400,
                color: i === todayIdx ? colors.bgMain : (isWeekend ? colors.textFaint : colors.textDim),
                fontFamily: "var(--font-data)",
                display: "inline-block",
                width: 22, height: 22, lineHeight: "22px",
                borderRadius: 4,
                backgroundColor: i === todayIdx ? colors.accent : "transparent",
              }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event rows */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {/* today vertical line */}
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `calc(${colW} * ${todayIdx} + ${colW} / 2)`,
          width: 1, backgroundColor: colors.accentSoft,
          borderLeft: `1px dashed ${colors.accent}`, opacity: 0.5,
          pointerEvents: "none",
        }} />

        {placed.length === 0 && (
          <div style={{ color: colors.textFaint, fontSize: 12, padding: "20px 12px" }}>No events in window</div>
        )}

        {placed.map((row, rIdx) => (
          <div key={rIdx} style={{ position: "relative", height: 22 }}>
            {row.map(({ event, startDay, endDay }) => {
              const span = endDay - startDay + 1;
              const left = `calc(${colW} * ${startDay} + 2px)`;
              const width = `calc(${colW} * ${span} - 4px)`;
              const isPoint = span === 1 && event.type !== "long-term";
              const c = event.color || colors.accent;
              return (
                <div
                  key={event.id}
                  title={`${event.title} · ${new Date(event.start).toLocaleString()}`}
                  style={{
                    position: "absolute", left, width,
                    top: 0, height: 18,
                    borderRadius: isPoint ? 9 : 4,
                    backgroundColor: isPoint ? c : `${c}33`,
                    border: isPoint ? "none" : `1px solid ${c}`,
                    color: isPoint ? colors.bgMain : c,
                    fontSize: 11, fontWeight: 500,
                    padding: isPoint ? "0" : "0 8px",
                    display: "flex", alignItems: "center",
                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                    cursor: "pointer",
                    transition: "transform 100ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {isPoint ? "" : event.title}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
