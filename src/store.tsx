import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "./api";
import { mockProjects, mockEvents, mockFiles, mockTasks } from "./mock/data";
import type { Task, Project, CalendarEvent, FileSummary } from "./api";

interface State {
  config: api.AppConfig;
  projects: Project[];
  events: CalendarEvent[];
  tasks: Task[];
  files: FileSummary[];
  inbox: api.InboxEntry[];
  loaded: boolean;
  // True when the dataset is from real backend (data_dir is set & at least one item exists in any list).
  // Otherwise we render mock data so the UI isn't empty.
  backed: boolean;
}

interface Actions {
  reload: () => Promise<void>;
  // Config
  pickAndSetDataDir: () => Promise<string | null>;
  // Projects
  createProject: (input: api.CreateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  // Events
  createEvent: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent>;
  updateEvent: (event: CalendarEvent) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  // Tasks
  createTask: (input: { title: string; due: string; projectId?: string }) => Promise<Task>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  // Files
  createFile: (input: { name: string; projectId?: string }) => Promise<FileSummary>;
  deleteFile: (id: string) => Promise<void>;
}

type Store = State & Actions;

const StoreContext = createContext<Store | null>(null);

const initial: State = {
  config: {},
  projects: mockProjects as unknown as Project[],
  events: mockEvents as unknown as CalendarEvent[],
  tasks: mockTasks as unknown as Task[],
  files: mockFiles as unknown as FileSummary[],
  inbox: [],
  loaded: false,
  backed: false,
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initial);

  const reload = useCallback(async () => {
    if (!api.runningInTauri) {
      setState((s) => ({ ...s, loaded: true }));
      return;
    }
    try {
      const config = await api.getConfig();
      if (!config.dataDir) {
        setState((s) => ({ ...s, config, loaded: true }));
        return;
      }
      const [projects, events, tasks, files, inbox] = await Promise.all([
        api.listProjects(),
        api.listEvents(),
        api.listTasks(),
        api.listFiles(),
        api.listInbox(),
      ]);
      // data_dir is set → this is real backend data. Never mix with mocks.
      setState({
        config,
        projects,
        events,
        tasks,
        files,
        inbox,
        loaded: true,
        backed: true,
      });
    } catch (e) {
      console.error("[store] reload failed:", e);
      setState((s) => ({ ...s, loaded: true }));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const pickAndSetDataDir = useCallback(async () => {
    const picked = await api.pickDataDir();
    if (picked) {
      await api.setDataDir(picked);
      await reload();
    }
    return picked;
  }, [reload]);

  const createProject = useCallback(async (input: api.CreateProjectInput) => {
    const p = await api.createProject(input);
    await reload();
    return p;
  }, [reload]);

  const deleteProject = useCallback(async (id: string) => {
    await api.deleteProject(id);
    await reload();
  }, [reload]);

  const createEvent = useCallback(async (event: Omit<CalendarEvent, "id">) => {
    const e = await api.createEvent(event);
    await reload();
    return e;
  }, [reload]);

  const deleteEvent = useCallback(async (id: string) => {
    await api.deleteEvent(id);
    await reload();
  }, [reload]);

  const updateEvent = useCallback(async (event: CalendarEvent) => {
    const e = await api.updateEvent(event);
    await reload();
    return e;
  }, [reload]);

  const createTask = useCallback(async (input: { title: string; due: string; projectId?: string }) => {
    const t = await api.createTask(input);
    await reload();
    return t;
  }, [reload]);

  const toggleTask = useCallback(async (id: string) => {
    await api.toggleTask(id);
    await reload();
  }, [reload]);

  const deleteTask = useCallback(async (id: string) => {
    await api.deleteTask(id);
    await reload();
  }, [reload]);

  const createFile = useCallback(async (input: { name: string; projectId?: string }) => {
    const f = await api.createFile(input);
    await reload();
    return f;
  }, [reload]);

  const deleteFile = useCallback(async (id: string) => {
    await api.deleteFile(id);
    await reload();
  }, [reload]);

  return (
    <StoreContext.Provider
      value={{
        ...state,
        reload,
        pickAndSetDataDir,
        createProject,
        deleteProject,
        createEvent,
        updateEvent,
        deleteEvent,
        createTask,
        toggleTask,
        deleteTask,
        createFile,
        deleteFile,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore() must be used within <StoreProvider>");
  return s;
}
