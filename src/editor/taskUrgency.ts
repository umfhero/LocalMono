import { colors } from "../theme/tokens";
import type { Task } from "../api";

export type Urgency = "overdue" | "urgent" | "approaching" | "soon" | "later" | "horizon" | "done";

export function urgencyOf(task: Task, now = new Date()): Urgency {
  if (task.status === "done" || task.status === "early") return "done";
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const due = new Date(task.due); due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - start.getTime()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 1) return "urgent";
  if (days <= 3) return "approaching";
  if (days <= 7) return "soon";
  if (days <= 14) return "later";
  return "horizon";
}

/** Short label for the badge — null when no badge should render. */
export function urgencyLabel(u: Urgency, task: Task, now = new Date()): string | null {
  if (u === "done") return null;
  if (u === "horizon") return null;
  if (u === "later") return null; // keep the UI quiet for far-future tasks
  if (u === "overdue") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const due = new Date(task.due); due.setHours(0, 0, 0, 0);
    const lateBy = Math.round((start.getTime() - due.getTime()) / 86400000);
    return lateBy === 1 ? "1 DAY LATE" : `${lateBy} DAYS LATE`;
  }
  if (u === "urgent") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const due = new Date(task.due); due.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - start.getTime()) / 86400000);
    return days === 0 ? "TODAY" : "TOMORROW";
  }
  if (u === "approaching") return "SOON";
  if (u === "soon") return "THIS WEEK";
  return null;
}

export function urgencyColor(u: Urgency): string {
  if (u === "overdue") return colors.statusMissed;
  if (u === "urgent") return colors.accent;
  if (u === "approaching") return colors.statusLate;
  if (u === "soon") return colors.statusEarly;
  return colors.textDim;
}
