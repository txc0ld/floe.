export type FileRecord = {
  id: string;
  name: string;
  path: string;
  language: string;
  boundary: string;
  relatedPaths: string[];
  summary: string;
  content: string;
};

export type AgentRole = "Architect" | "Builder" | "Reviewer" | "Operator";

export type AgentRecord = {
  role: AgentRole;
  status: "Idle" | "Queued" | "Running" | "Needs Input" | "Complete";
  focus: string;
  location: string;
  progressLabel: string;
};

export type ActivityTone = "info" | "success" | "warning";

export type ActivityRecord = {
  id: string;
  timestamp: string;
  tone: ActivityTone;
  title: string;
  detail: string;
};

export type TaskStage = "Backlog" | "In Progress" | "Review" | "Done";

export type TaskRecord = {
  id: string;
  title: string;
  stage: TaskStage;
  owner: AgentRole;
  priority: "P0" | "P1" | "P2";
};

export type PromptRecord = {
  id: string;
  title: string;
  body: string;
  routeTo: AgentRole;
};

export type ChatMessage = {
  id: string;
  speaker: "User" | AgentRole;
  tone: "request" | "response";
  text: string;
  contextPath?: string;
};

export type ProviderConfig = {
  provider: "OpenAI" | "Anthropic" | "Local";
  model: string;
  connectionMode: "Manual" | "Workspace Default";
};

export type LayoutState = {
  leftPane: number;
  rightPane: number;
  bottomPane: number;
};

export type PersistedWorkspaceState = {
  layout: LayoutState;
  activeFileId: string;
  chatInput: string;
  provider: ProviderConfig;
  selectedPromptId: string | null;
  tasks: TaskRecord[];
};

export type ForgeSnapshot = PersistedWorkspaceState & {
  files: FileRecord[];
  agents: AgentRecord[];
  activities: ActivityRecord[];
  prompts: PromptRecord[];
  terminalLines: string[];
  messages: ChatMessage[];
};

const STORAGE_VERSION = 1;
export const STORAGE_KEY = `floe.workspace.v${STORAGE_VERSION}`;

export const defaultFiles: FileRecord[] = [
  {
    id: "shell",
    name: "workspace-shell.tsx",
    path: "apps/forge/src/workspace/workspace-shell.tsx",
    language: "tsx",
    boundary: "Workspace Shell",
    relatedPaths: [
      "apps/forge/src/state/workspace-store.ts",
      "apps/forge/src/panels/orchestration-panel.tsx"
    ],
    summary:
      "Primary composition root for explorer, editor, terminal, and agent surfaces.",
    content: `export function WorkspaceShell() {
  return (
    <AppFrame>
      <Explorer />
      <Editor />
      <Terminal />
      <AgentPanels />
    </AppFrame>
  );
}`
  },
  {
    id: "store",
    name: "workspace-store.ts",
    path: "apps/forge/src/state/workspace-store.ts",
    language: "ts",
    boundary: "Workspace State",
    relatedPaths: [
      "apps/forge/src/workspace/workspace-shell.tsx",
      "apps/forge/src/chat/context-resolver.ts"
    ],
    summary:
      "Persists layout, selection state, task flow, provider preferences, and agent routing.",
    content: `export const workspaceStore = createStore({
  activeFileId: "shell",
  layout: { leftPane: 296, rightPane: 360, bottomPane: 288 }
});`
  },
  {
    id: "resolver",
    name: "context-resolver.ts",
    path: "apps/forge/src/chat/context-resolver.ts",
    language: "ts",
    boundary: "Agent Context",
    relatedPaths: [
      "apps/forge/src/state/workspace-store.ts",
      "apps/forge/src/chat/agent-chat.tsx"
    ],
    summary:
      "Builds file-aware agent context from active selection, module boundaries, and nearby tasks.",
    content: `export function resolveContext(activeFile: FileRecord) {
  return {
    boundary: activeFile.boundary,
    relatedPaths: activeFile.relatedPaths
  };
}`
  }
];

export const defaultAgents: AgentRecord[] = [
  {
    role: "Architect",
    status: "Running",
    focus: "Mapping shell composition",
    location: "workspace-shell.tsx",
    progressLabel: "Validating layout contracts"
  },
  {
    role: "Builder",
    status: "Queued",
    focus: "Preparing contextual chat response",
    location: "workspace-store.ts",
    progressLabel: "Waiting for routed task"
  },
  {
    role: "Reviewer",
    status: "Idle",
    focus: "Watching task transitions",
    location: "activity-feed",
    progressLabel: "No active review"
  },
  {
    role: "Operator",
    status: "Needs Input",
    focus: "Provider settings boundary",
    location: "settings/providers",
    progressLabel: "No live credentials captured"
  }
];

export const defaultActivities: ActivityRecord[] = [
  {
    id: "a1",
    timestamp: "09:12",
    tone: "info",
    title: "Workspace hydrated",
    detail: "Recovered pane layout and active file context from local storage."
  },
  {
    id: "a2",
    timestamp: "09:15",
    tone: "success",
    title: "Architect agent traced module boundaries",
    detail: "Explorer, editor, terminal, and orchestration surfaces are aligned on the same file context."
  },
  {
    id: "a3",
    timestamp: "09:18",
    tone: "warning",
    title: "Operator flagged provider boundary",
    detail: "Prototype keeps provider settings local-only and does not accept production secrets."
  }
];

export const defaultTasks: TaskRecord[] = [
  {
    id: "t1",
    title: "Persist workspace layout",
    stage: "Review",
    owner: "Reviewer",
    priority: "P0"
  },
  {
    id: "t2",
    title: "Route prompts into chat",
    stage: "In Progress",
    owner: "Builder",
    priority: "P0"
  },
  {
    id: "t3",
    title: "Expose active file context",
    stage: "Done",
    owner: "Architect",
    priority: "P1"
  },
  {
    id: "t4",
    title: "Document provider safety boundary",
    stage: "Backlog",
    owner: "Operator",
    priority: "P1"
  }
];

export const defaultPrompts: PromptRecord[] = [
  {
    id: "p1",
    title: "Ship active file fix",
    body: "Inspect the active file, identify the highest-risk issue, and propose the smallest production-safe fix.",
    routeTo: "Builder"
  },
  {
    id: "p2",
    title: "Architectural review",
    body: "Review module boundaries around the active file and suggest one simplification that preserves behavior.",
    routeTo: "Architect"
  },
  {
    id: "p3",
    title: "Pre-merge review",
    body: "Review the current change for regressions, missing tests, and deployment risk. Prioritize concrete findings.",
    routeTo: "Reviewer"
  }
];

export const defaultTerminalLines = [
  "$ pnpm test",
  "PASS src/ui/App.test.tsx",
  "$ pnpm build",
  "vite v7.1.3 building for production...",
  "dist/index.html 0.50 kB"
];

export const defaultMessages: ChatMessage[] = [
  {
    id: "m1",
    speaker: "User",
    tone: "request",
    contextPath: defaultFiles[0].path,
    text: "Show me what the active file exposes to the agents before we queue more work."
  },
  {
    id: "m2",
    speaker: "Architect",
    tone: "response",
    contextPath: defaultFiles[0].path,
    text:
      "Current context includes the active path, workspace boundary, related modules, task ownership, and the latest activity entries. That keeps routing decisions legible before execution."
  }
];

export const defaultProvider: ProviderConfig = {
  provider: "OpenAI",
  model: "gpt-5-codex",
  connectionMode: "Workspace Default"
};

export const defaultLayout: LayoutState = {
  leftPane: 300,
  rightPane: 360,
  bottomPane: 280
};

export const defaultSnapshot = (): ForgeSnapshot => ({
  layout: defaultLayout,
  activeFileId: defaultFiles[0].id,
  chatInput: "",
  provider: defaultProvider,
  selectedPromptId: null,
  tasks: defaultTasks,
  files: defaultFiles,
  agents: defaultAgents,
  activities: defaultActivities,
  prompts: defaultPrompts,
  terminalLines: defaultTerminalLines,
  messages: defaultMessages
});

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
};

export const hydratePersistedState = (
  raw: string | null
): PersistedWorkspaceState => {
  const snapshot = defaultSnapshot();
  if (!raw) {
    return {
      layout: snapshot.layout,
      activeFileId: snapshot.activeFileId,
      chatInput: snapshot.chatInput,
      provider: snapshot.provider,
      selectedPromptId: snapshot.selectedPromptId,
      tasks: snapshot.tasks
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceState>;
    const provider = parsed.provider ?? snapshot.provider;
    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.filter(isTaskRecord)
      : snapshot.tasks;

    return {
      layout: {
        leftPane: clamp(parsed.layout?.leftPane, 240, 420, snapshot.layout.leftPane),
        rightPane: clamp(parsed.layout?.rightPane, 300, 440, snapshot.layout.rightPane),
        bottomPane: clamp(
          parsed.layout?.bottomPane,
          220,
          420,
          snapshot.layout.bottomPane
        )
      },
      activeFileId:
        typeof parsed.activeFileId === "string" ? parsed.activeFileId : snapshot.activeFileId,
      chatInput: typeof parsed.chatInput === "string" ? parsed.chatInput : snapshot.chatInput,
      provider: {
        provider: isProvider(provider.provider) ? provider.provider : snapshot.provider.provider,
        model: typeof provider.model === "string" ? provider.model : snapshot.provider.model,
        connectionMode:
          provider.connectionMode === "Manual" ||
          provider.connectionMode === "Workspace Default"
            ? provider.connectionMode
            : snapshot.provider.connectionMode
      },
      selectedPromptId:
        typeof parsed.selectedPromptId === "string" ? parsed.selectedPromptId : null,
      tasks
    };
  } catch {
    return {
      layout: snapshot.layout,
      activeFileId: snapshot.activeFileId,
      chatInput: snapshot.chatInput,
      provider: snapshot.provider,
      selectedPromptId: snapshot.selectedPromptId,
      tasks: snapshot.tasks
    };
  }
};

export const serializePersistedState = (state: PersistedWorkspaceState): string =>
  JSON.stringify(state);

const isProvider = (
  value: unknown
): value is ProviderConfig["provider"] =>
  value === "OpenAI" || value === "Anthropic" || value === "Local";

const isTaskRecord = (value: unknown): value is TaskRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TaskRecord>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    isTaskStage(candidate.stage) &&
    isAgentRole(candidate.owner) &&
    (candidate.priority === "P0" || candidate.priority === "P1" || candidate.priority === "P2")
  );
};

const isTaskStage = (value: unknown): value is TaskStage =>
  value === "Backlog" ||
  value === "In Progress" ||
  value === "Review" ||
  value === "Done";

const isAgentRole = (value: unknown): value is AgentRole =>
  value === "Architect" ||
  value === "Builder" ||
  value === "Reviewer" ||
  value === "Operator";

export const cycleTaskStage = (stage: TaskStage): TaskStage => {
  switch (stage) {
    case "Backlog":
      return "In Progress";
    case "In Progress":
      return "Review";
    case "Review":
      return "Done";
    case "Done":
      return "Backlog";
  }
};

export const createActivity = (
  title: string,
  detail: string,
  tone: ActivityTone = "info"
): ActivityRecord => ({
  id: `${title}-${detail}-${Date.now()}`,
  timestamp: new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date()),
  tone,
  title,
  detail
});

export const buildAgentResponse = (
  file: FileRecord,
  routeTo: AgentRole,
  input: string
): string => {
  const intent =
    input.length > 120 ? `${input.slice(0, 117).trimEnd()}...` : input;

  switch (routeTo) {
    case "Architect":
      return `Boundary: ${file.boundary}. The active file is ${file.path}. I would keep the shell thin, route persistence through workspace state, and treat ${file.relatedPaths[0]} as the next simplification target.`;
    case "Builder":
      return `Working against ${file.path}. The safest next move is to change one interaction at a time, preserve layout persistence, and verify the related modules ${file.relatedPaths.join(", ")} after applying: "${intent}".`;
    case "Reviewer":
      return `Review focus for ${file.path}: validate the active context contract, stale layout state handling, and task-stage transitions. Highest visible risk from "${intent}" is regressions between chat routing and persisted selection.`;
    case "Operator":
      return `Operational note for ${file.path}: keep provider settings local-only until a secure backend boundary exists. "${intent}" should not expand secret handling in the browser.`;
  }
};
