import type { Task, CalendarEvent, Project, FileSummary, BriefingSection } from "../types";

const today = new Date();
const iso = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const at = (d: Date, h: number, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };

export const mockProjects: Project[] = [
  {
    id: "p1",
    name: "KCL Hackathon",
    description: "2-month hackathon project",
    icon: "Cpu",
    color: "#4fc1ff",
    start: iso(addDays(today, -28)),
    end: iso(addDays(today, 28)),
    activityPct: 0.42,
    fileCount: 12,
  },
  {
    id: "p2",
    name: "Thesis & Data",
    description: "MSc thesis research",
    icon: "GraduationCap",
    color: "#4ec9b0",
    start: iso(addDays(today, -60)),
    end: iso(addDays(today, 90)),
    activityPct: 0.28,
    fileCount: 21,
  },
  {
    id: "p3",
    name: "Mono",
    description: "This app",
    icon: "Box",
    color: "#d7ba7d",
    start: iso(addDays(today, -7)),
    end: iso(addDays(today, 60)),
    activityPct: 0.08,
    fileCount: 4,
  },
];

export const mockTasks: Task[] = [
  { id: "t1", title: "Finalise dashboard widget grid", due: iso(at(today, 14)), status: "pending", projectId: "p3" },
  { id: "t2", title: "Email supervisor draft chapter 2", due: iso(at(today, 17)), status: "pending", projectId: "p2" },
  { id: "t3", title: "Push Tauri scaffolding", due: iso(at(today, 11)), status: "done", projectId: "p3" },
  { id: "t4", title: "Read Goodfellow ch.6", due: iso(at(today, 21)), status: "pending", projectId: "p2" },
  { id: "t5", title: "Mum coming home — dinner out", due: iso(at(today, 9)), status: "missed" },
];

export const mockEvents: CalendarEvent[] = [
  { id: "e1", title: "Mum home, going out to eat", start: iso(at(today, 9)), end: iso(at(today, 12)), type: "single", color: "#f44747" },
  { id: "e2", title: "Hackathon block", start: iso(at(today, 14)), end: iso(at(today, 18)), type: "long-term", color: "#4fc1ff", projectId: "p1" },
  { id: "e3", title: "Thesis writing", start: iso(at(addDays(today, 1), 10)), end: iso(at(addDays(today, 1), 13)), type: "repeating", color: "#4ec9b0", projectId: "p2" },
  { id: "e4", title: "Gym", start: iso(at(addDays(today, 1), 18)), end: iso(at(addDays(today, 1), 19)), type: "repeating", color: "#d7ba7d" },
  { id: "e5", title: "B12 Injection", start: iso(at(addDays(today, 10), 9)), end: iso(at(addDays(today, 10), 10)), type: "single", color: "#d7ba7d" },
  { id: "e6", title: "GitHub Copilot Dev Days", start: iso(at(addDays(today, 17), 9)), end: iso(at(addDays(today, 17), 17)), type: "single", color: "#569cd6" },
  { id: "e7", title: "KCL Hackathon", start: iso(addDays(today, -28)), end: iso(addDays(today, 28)), type: "long-term", color: "#4fc1ff", projectId: "p1" },
  { id: "e8", title: "Reading week", start: iso(addDays(today, 5)), end: iso(addDays(today, 12)), type: "long-term", color: "#4ec9b0", projectId: "p2" },
];

export const mockFiles: FileSummary[] = [
  { id: "f1", name: "hackathon-notes.file", projectId: "p1", modifiedAt: iso(at(today, 13)), preview: "Backend sketch — tauri commands for events" },
  { id: "f2", name: "thesis-chapter-2.file", projectId: "p2", modifiedAt: iso(at(today, 10)), preview: "RQ2 framing draft" },
  { id: "f3", name: "scratch.file", modifiedAt: iso(at(addDays(today, -1), 22)), preview: "random ideas" },
  { id: "f4", name: "ollama-setup.file", projectId: "p3", modifiedAt: iso(at(addDays(today, -2), 15)), preview: "Local model briefing prompt" },
  { id: "f5", name: "uni-revision.file", projectId: "p2", modifiedAt: iso(at(addDays(today, -3), 9)), preview: "Topics: GANs, VAEs, RL" },
];

export const mockBriefings: BriefingSection[] = [
  {
    id: "b-day",
    label: "Your day",
    body: [
      "Morning Majid — you have ",
      { text: "3 events today", kind: "event" },
      ". Lunch with mum is the priority. Afternoon belongs to ",
      { text: "KCL Hackathon", kind: "project" },
      " — you're 50% through the time but only 42% through the build, push hard.",
    ],
  },
  {
    id: "b-uni",
    label: "University",
    body: [
      "Revise ",
      { text: "GANs and VAEs", kind: "topic" },
      " for the Generative Models exam in two weeks. ",
      { text: "Goodfellow ch.6", kind: "task" },
      " is on today's list — do it after the hackathon block.",
    ],
  },
  {
    id: "b-week",
    label: "Week ahead",
    body: [
      "Thursday is heavy: ",
      { text: "Thesis writing", kind: "event" },
      " then ",
      { text: "Gym", kind: "event" },
      ". ",
      { text: "B12 Injection", kind: "event" },
      " is in 10 days — book the appointment now.",
    ],
  },
];

// Trend graph — raw timestamped task outcomes.
// Score rules: done/early +1, late -0.5, missed -1, pending no change.
export interface TrendEvent {
  status: Task["status"];
  date: string; // ISO
}

export const mockTrendRaw: TrendEvent[] = (() => {
  const now = new Date();
  const mk = (daysFromNow: number, h: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  // 20 historical (spread over last 30 days) + 5 pending (future)
  const statuses: Array<Task["status"]> = [
    "done","done","late","missed","done","early","done","late","done","missed",
    "done","late","done","done","done","done","missed","done","early","done",
    "pending","pending","pending","pending","pending",
  ];
  return statuses.map((status, i) => {
    const isPending = status === "pending";
    const n = statuses.length;
    const pendingCount = 5;
    const historicalCount = n - pendingCount;
    // historical items: spread from -30d to -1d
    // pending items:    spread from +1d to +7d
    const daysFromNow = isPending
      ? (i - historicalCount + 1) * 1.5
      : -30 + (i / (historicalCount - 1)) * 29;
    return { status, date: mk(Math.round(daysFromNow), 14) };
  });
})();

export type TrendRange = "today" | "1w" | "1m" | "all";

export interface TrendPoint {
  x: number;
  y: number;
  status: Task["status"] | "origin";
  date: string;
}

export function computeTrend(events: TrendEvent[], range: TrendRange): TrendPoint[] {
  const now = Date.now();
  const cutoff = (() => {
    switch (range) {
      case "today": return now - 24 * 3600 * 1000;
      case "1w":    return now - 7 * 24 * 3600 * 1000;
      case "1m":    return now - 30 * 24 * 3600 * 1000;
      case "all":   return -Infinity;
    }
  })();
  const filtered = events.filter((e) => new Date(e.date).getTime() >= cutoff);
  const origin: TrendPoint = {
    x: 0, y: 0, status: "origin",
    date: filtered[0]?.date ?? new Date().toISOString(),
  };
  const pts: TrendPoint[] = [origin];
  let y = 0;
  filtered.forEach((e, i) => {
    if (e.status === "done" || e.status === "early") y += 1;
    else if (e.status === "late") y -= 0.5;
    else if (e.status === "missed") y -= 1;
    // pending: predictive — assume completion (+1) so the line continues upward
    else if (e.status === "pending") y += 1;
    pts.push({ x: i + 1, y, status: e.status, date: e.date });
  });
  return pts;
}
