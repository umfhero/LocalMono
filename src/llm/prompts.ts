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
  "You are a concise daily-briefing assistant for a single user. " +
  "Write 2 short paragraphs (3-4 sentences total) summarising what is on their plate today. " +
  "Mention specific project, task, and event names from the context verbatim. " +
  "Do not use markdown, bullet points, headings, or preamble — only flowing prose.";

export function buildBriefingContext(
  projects: Project[],
  tasks: Task[],
  events: CalendarEvent[],
  now = new Date(),
): string {
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const weekAhead = new Date(now); weekAhead.setDate(weekAhead.getDate() + 7);

  const dueToday = tasks.filter((t) => {
    if (t.status === "done" || t.status === "early") return false;
    const due = new Date(t.due);
    return due >= startOfToday && due <= endOfToday;
  });
  const overdue = tasks.filter((t) => {
    if (t.status === "done" || t.status === "early") return false;
    return new Date(t.due) < startOfToday;
  });
  const upcomingEvents = events
    .filter((e) => {
      const start = new Date(e.start);
      return start >= startOfToday && start <= weekAhead;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6);

  const activeProjects = projects.filter((p) => new Date(p.end).getTime() >= startOfToday.getTime());

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });

  const lines: string[] = [];
  lines.push(`Today is ${now.toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`);

  lines.push("");
  lines.push(`Active projects (${activeProjects.length}):`);
  if (activeProjects.length === 0) lines.push("  (none)");
  for (const p of activeProjects) {
    lines.push(`  - "${p.name}" (${Math.round(p.activityPct * 100)}% activity, ends ${fmtDay(p.end)})`);
  }

  lines.push("");
  lines.push(`Tasks due today (${dueToday.length}):`);
  if (dueToday.length === 0) lines.push("  (none)");
  for (const t of dueToday) {
    const proj = t.projectId ? projects.find((p) => p.id === t.projectId)?.name : null;
    lines.push(`  - "${t.title}"${proj ? ` (project: ${proj})` : ""}`);
  }

  if (overdue.length > 0) {
    lines.push("");
    lines.push(`Overdue tasks (${overdue.length}):`);
    for (const t of overdue.slice(0, 5)) {
      lines.push(`  - "${t.title}" (was due ${fmtDay(t.due)})`);
    }
  }

  lines.push("");
  lines.push(`Upcoming events (next 7 days, ${upcomingEvents.length}):`);
  if (upcomingEvents.length === 0) lines.push("  (none)");
  for (const e of upcomingEvents) {
    lines.push(`  - "${e.title}" on ${fmtDate(e.start)}${e.location ? ` at ${e.location}` : ""}`);
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
