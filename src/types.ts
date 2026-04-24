export type TaskStatus = "done" | "late" | "missed" | "early" | "pending";

export interface Task {
  id: string;
  title: string;
  due: string; // ISO
  status: TaskStatus;
  projectId?: string;
}

export type EventType = "single" | "repeating" | "long-term" | "timetable";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  type: EventType;
  color?: string;
  projectId?: string;
  location?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon: string; // lucide icon name
  color: string;
  start: string; // ISO
  end: string;   // ISO
  activityPct: number; // 0..1, manual or derived
  fileCount: number;
}

export interface FileSummary {
  id: string;
  name: string; // includes .file extension
  projectId?: string;
  modifiedAt: string;
  preview?: string;
}

export interface BriefingEntity {
  text: string;
  kind: "project" | "event" | "task" | "topic";
}

export interface BriefingSection {
  id: string;
  label: string; // e.g. "Your day", "University", "Projects"
  body: Array<string | BriefingEntity>;
}
