// All Ollama prompts live here so they can be tuned in one place.
//
// Each generator returns { system, prompt } — pass straight to api.ollamaGenerate.
// The system message sets the role/format constraints, the prompt carries the data.

import type { Project, Task, CalendarEvent } from "../api";

/* ============================================================
 * BRIEFING — used by widgets/Briefing.tsx
 * ============================================================
 * Tweak BRIEFING_SYSTEM to change tone, length, formatting rules.
 * Tweak buildBriefingContext to change WHAT data the model sees. */

export const BRIEFING_SYSTEM =
  "You are a concise daily briefing assistant for a single user, writing in British English. " +
  "The context lists TASKS (work items with deadlines) and EVENTS (timed appointments) separately. " +
  "You MUST cover both tasks and events in your briefing, with explicit emphasis on tasks because they are the " +
  "primary indicator of what the user actually has to do. Always mention specific task and event names verbatim, in quotes. " +
  "" +
  "Structure (in this exact order, three short paragraphs, 1 to 3 sentences each, no headings or labels): " +
  "Paragraph 1, RECENT PROGRESS: things the user has completed in the last 7 days. " +
  "Paragraph 2, WHAT'S NEXT: things coming up. Order them by urgency. Mention every URGENT task (due today or " +
  "tomorrow). Mention every event happening today. Then mention APPROACHING tasks (due in 2 to 3 days). " +
  "Then mention the most relevant SOON tasks (due in 4 to 7 days) and upcoming events this week. " +
  "Paragraph 3, MISSED OR OVERDUE: anything the user has fallen behind on. " +
  "" +
  "Urgency rule: if the context labels a task as URGENT, your tone for that task must be direct and pressing " +
  "(for example, 'is due today' or 'needs to be in by tomorrow'). For APPROACHING items, indicate the deadline is " +
  "close (for example, 'due in three days, so probably worth starting today'). For SOON items, mention them more " +
  "casually ('due later this week'). For tasks with deadlines beyond a week, mention them only if there are no more " +
  "urgent items to talk about. " +
  "" +
  "If a section is empty, write one short sentence acknowledging that and move on. Never invent items not in the context. " +
  "Forbidden characters and styles: hyphens, en dashes, em dashes, markdown, bullet points, asterisks, headings, " +
  "code fences, bold, italics, preamble like 'Here is your briefing'. Use commas, semicolons, full stops, and the " +
  "word 'and' to join ideas instead.";

export function buildBriefingContext(
  projects: Project[],
  tasks: Task[],
  events: CalendarEvent[],
  now = new Date(),
): string {
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const weekAhead = new Date(now); weekAhead.setDate(weekAhead.getDate() + 7);
  const twoWeeksAhead = new Date(now); twoWeeksAhead.setDate(twoWeeksAhead.getDate() + 14);
  const weekBack = new Date(now); weekBack.setDate(weekBack.getDate() - 7);

  const isDone = (t: Task) => t.status === "done" || t.status === "early";
  const daysUntil = (iso: string): number => {
    const due = new Date(iso); due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - startOfToday.getTime()) / 86400000);
  };

  // ---- Tasks bucketed by urgency tier ----
  // Order matters: a task only appears in one bucket; check the most urgent first.
  const openTasks = tasks.filter((t) => !isDone(t));

  const overdue = openTasks
    .filter((t) => daysUntil(t.due) < 0)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const urgent = openTasks
    .filter((t) => { const d = daysUntil(t.due); return d >= 0 && d <= 1; })
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const approaching = openTasks
    .filter((t) => { const d = daysUntil(t.due); return d >= 2 && d <= 3; })
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const soon = openTasks
    .filter((t) => { const d = daysUntil(t.due); return d >= 4 && d <= 7; })
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const later = openTasks
    .filter((t) => { const d = daysUntil(t.due); return d >= 8 && d <= 14; })
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const horizon = openTasks
    .filter((t) => daysUntil(t.due) > 14)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    .slice(0, 4);

  const completedRecent = tasks
    .filter((t) => t.completedAt && new Date(t.completedAt) >= weekBack)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  // ---- Events ----
  const eventsToday = events
    .filter((e) => { const s = new Date(e.start); return s >= startOfToday && s <= endOfToday; })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const eventsThisWeek = events
    .filter((e) => { const s = new Date(e.start).getTime(); return s > endOfToday.getTime() && s <= weekAhead.getTime(); })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6);
  const eventsLater = events
    .filter((e) => { const s = new Date(e.start).getTime(); return s > weekAhead.getTime() && s <= twoWeeksAhead.getTime(); })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 4);
  // Recently-finished events that may have been missed
  const threeDaysBack = new Date(now); threeDaysBack.setDate(threeDaysBack.getDate() - 3);
  const recentEvents = events
    .filter((e) => { const end = new Date(e.end); return end < startOfToday && end >= threeDaysBack; })
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  const activeProjects = projects.filter((p) => new Date(p.end).getTime() >= startOfToday.getTime());
  const projectStats = activeProjects.map((p) => {
    const projTasks = tasks.filter((t) => t.projectId === p.id);
    const done = projTasks.filter(isDone).length;
    return { p, total: projTasks.length, done };
  });

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" });
  const projOf = (t: Task) => t.projectId ? projects.find((p) => p.id === t.projectId)?.name : null;
  const taskLine = (t: Task, withDays = true) => {
    const d = daysUntil(t.due);
    const proj = projOf(t);
    const dayPart = withDays
      ? d < 0 ? ` (was due ${fmtDay(t.due)}, ${-d} day${-d === 1 ? "" : "s"} overdue)`
        : d === 0 ? ` (due TODAY ${new Date(t.due).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})`
        : d === 1 ? ` (due TOMORROW)`
        : ` (due ${fmtDay(t.due)}, in ${d} days)`
      : "";
    return `  - "${t.title}"${dayPart}${proj ? ` [project: "${proj}"]` : ""}`;
  };

  const lines: string[] = [];
  lines.push(`Today is ${now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`);
  lines.push(`Open tasks total: ${openTasks.length}. Today's events: ${eventsToday.length}.`);

  lines.push("");
  lines.push("# RECENT PROGRESS (use for paragraph 1)");
  lines.push(`Tasks completed in the last 7 days (${completedRecent.length}):`);
  if (completedRecent.length === 0) lines.push("  (none — say so briefly)");
  for (const t of completedRecent.slice(0, 8)) {
    const proj = projOf(t);
    lines.push(`  - "${t.title}" finished ${fmtDay(t.completedAt!)}${proj ? ` [project: "${proj}"]` : ""}`);
  }

  lines.push("");
  lines.push("# WHAT'S NEXT (use for paragraph 2 — order matters)");

  lines.push(`URGENT tasks (due today or tomorrow, ${urgent.length}) — MUST mention every one:`);
  if (urgent.length === 0) lines.push("  (none)");
  for (const t of urgent) lines.push(taskLine(t));

  lines.push(`Events happening today (${eventsToday.length}) — MUST mention every one:`);
  if (eventsToday.length === 0) lines.push("  (none)");
  for (const e of eventsToday) {
    lines.push(`  - "${e.title}" at ${new Date(e.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}${e.location ? ` at ${e.location}` : ""}`);
  }

  lines.push(`APPROACHING tasks (due in 2 to 3 days, ${approaching.length}) — MUST mention every one:`);
  if (approaching.length === 0) lines.push("  (none)");
  for (const t of approaching) lines.push(taskLine(t));

  lines.push(`SOON tasks (due in 4 to 7 days, ${soon.length}) — mention the most relevant:`);
  if (soon.length === 0) lines.push("  (none)");
  for (const t of soon) lines.push(taskLine(t));

  lines.push(`Events upcoming this week (${eventsThisWeek.length}):`);
  if (eventsThisWeek.length === 0) lines.push("  (none)");
  for (const e of eventsThisWeek) {
    lines.push(`  - "${e.title}" on ${fmtDateTime(e.start)}${e.location ? ` at ${e.location}` : ""}`);
  }

  lines.push(`LATER tasks (due in 8 to 14 days, ${later.length}) — only mention if more urgent items are absent:`);
  if (later.length === 0) lines.push("  (none)");
  for (const t of later.slice(0, 4)) lines.push(taskLine(t));

  if (horizon.length > 0) {
    lines.push(`HORIZON tasks (due beyond 14 days, ${horizon.length}) — mention only if everything else is empty:`);
    for (const t of horizon) lines.push(taskLine(t));
  }

  if (eventsLater.length > 0) {
    lines.push(`Events 8 to 14 days away (${eventsLater.length}):`);
    for (const e of eventsLater) lines.push(`  - "${e.title}" on ${fmtDateTime(e.start)}`);
  }

  lines.push("");
  lines.push("# MISSED OR OVERDUE (use for paragraph 3)");
  lines.push(`Overdue tasks (${overdue.length}) — MUST mention every one with how late:`);
  if (overdue.length === 0) lines.push("  (none — say so briefly)");
  for (const t of overdue) lines.push(taskLine(t));

  if (recentEvents.length > 0) {
    lines.push(`Events that finished in the last 3 days (${recentEvents.length}):`);
    for (const e of recentEvents.slice(0, 4)) lines.push(`  - "${e.title}" ended ${fmtDay(e.end)}`);
  }

  lines.push("");
  lines.push("# PROJECT PROGRESS (background context, mention only if naturally relevant)");
  if (projectStats.length === 0) lines.push("  (no active projects)");
  for (const s of projectStats) {
    const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
    lines.push(`  - "${s.p.name}" ${s.done}/${s.total} tasks done (${pct}%), ends ${fmtDay(s.p.end)}`);
  }

  return lines.join("\n");
}

/* ============================================================
 * EVENT NLP — used by pages/Events.tsx (NLP add bar)
 * ============================================================
 * Asks Ollama to parse a natural-language sentence into a strict JSON
 * shape we can pass to createEvent. Tweak EVENT_NLP_SYSTEM to change
 * what fields are extracted, the date format, or how ambiguous inputs
 * are handled. */

export const EVENT_NLP_SYSTEM =
  "You convert natural-language phrases into a single JSON object describing a calendar event. " +
  "Output ONLY raw JSON, no markdown fences, no commentary. " +
  "Schema: " +
  '{"title": string, "startISO": string (ISO-8601 with timezone offset), ' +
  '"endISO": string (ISO-8601 with timezone offset), ' +
  '"type": "single" | "repeating", ' +
  '"location": string | null}. ' +
  "If duration is unspecified, default to 60 minutes. " +
  "If a weekday is mentioned without 'next', pick the soonest future occurrence. " +
  'Words like "every", "weekly", "daily" → type: "repeating". Otherwise "single". ' +
  "Strip leading verbs like 'add', 'schedule', 'create' from the title.";

export function buildEventNlpPrompt(text: string, now = new Date()): string {
  // Hand the model an explicit "now" so it can resolve relative phrases ("Friday 5pm")
  // without depending on the model's internal clock.
  return [
    `Current local datetime: ${now.toString()}`,
    `Current ISO: ${now.toISOString()}`,
    "",
    `Phrase: ${text.trim()}`,
  ].join("\n");
}

export interface ParsedEvent {
  title: string;
  startISO: string;
  endISO: string;
  type: "single" | "repeating";
  location: string | null;
}

/** Parse the model's raw output into a ParsedEvent. Throws on invalid output. */
export function parseEventJson(raw: string): ParsedEvent {
  // Strip code fences if the model added them despite instructions.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Find the first { ... } block — models occasionally prepend commentary.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error(`No JSON object in model output: ${raw.slice(0, 120)}`);
  const slice = cleaned.slice(start, end + 1);

  const obj = JSON.parse(slice) as Partial<ParsedEvent>;
  if (!obj.title || !obj.startISO || !obj.endISO) {
    throw new Error("Model output missing required fields (title/startISO/endISO)");
  }
  // Validate dates parse.
  if (Number.isNaN(Date.parse(obj.startISO))) throw new Error(`Invalid startISO: ${obj.startISO}`);
  if (Number.isNaN(Date.parse(obj.endISO))) throw new Error(`Invalid endISO: ${obj.endISO}`);

  return {
    title: obj.title,
    startISO: obj.startISO,
    endISO: obj.endISO,
    type: obj.type === "repeating" ? "repeating" : "single",
    location: obj.location ?? null,
  };
}
