import { useEffect, useMemo, useState } from "react";
import {
  type ActivityRecord,
  type AgentRecord,
  type AgentRole,
  type FileRecord,
  type ForgeSnapshot,
  type PromptRecord,
  type ProviderConfig,
  STORAGE_KEY,
  buildAgentResponse,
  createActivity,
  cycleTaskStage,
  defaultSnapshot,
  hydratePersistedState,
  serializePersistedState
} from "./forge";

const loadInitialSnapshot = (): ForgeSnapshot => {
  const snapshot = defaultSnapshot();
  if (typeof window === "undefined") {
    return snapshot;
  }

  const persisted = hydratePersistedState(window.localStorage.getItem(STORAGE_KEY));
  return {
    ...snapshot,
    ...persisted
  };
};

const updateAgentSet = (
  agents: AgentRecord[],
  routeTo: AgentRole,
  file: FileRecord,
  progressLabel: string
) =>
  agents.map((agent) => {
    if (agent.role === routeTo) {
      return {
        ...agent,
        status: "Running" as const,
        focus: progressLabel,
        location: file.name,
        progressLabel: `Working in ${file.boundary}`
      };
    }

    if (agent.status === "Running") {
      return {
        ...agent,
        status: "Idle" as const,
        progressLabel: "No active review"
      };
    }

    return agent;
  });

export const useForgeWorkspace = () => {
  const [snapshot, setSnapshot] = useState<ForgeSnapshot>(() => loadInitialSnapshot());

  useEffect(() => {
    const { layout, activeFileId, chatInput, provider, selectedPromptId, tasks } = snapshot;
    window.localStorage.setItem(
      STORAGE_KEY,
      serializePersistedState({
        layout,
        activeFileId,
        chatInput,
        provider,
        selectedPromptId,
        tasks
      })
    );
  }, [
    snapshot.activeFileId,
    snapshot.chatInput,
    snapshot.layout,
    snapshot.provider,
    snapshot.selectedPromptId,
    snapshot.tasks
  ]);

  const activeFile =
    snapshot.files.find((file) => file.id === snapshot.activeFileId) ?? snapshot.files[0];

  const taskColumns = useMemo(
    () => ({
      Backlog: snapshot.tasks.filter((task) => task.stage === "Backlog"),
      "In Progress": snapshot.tasks.filter((task) => task.stage === "In Progress"),
      Review: snapshot.tasks.filter((task) => task.stage === "Review"),
      Done: snapshot.tasks.filter((task) => task.stage === "Done")
    }),
    [snapshot.tasks]
  );

  const selectFile = (fileId: string) => {
    setSnapshot((current) => {
      const file = current.files.find((record) => record.id === fileId);
      return {
        ...current,
        activeFileId: fileId,
        activities: file
          ? [
              createActivity("Context switched", `Agents are now anchored to ${file.path}.`, "info"),
              ...current.activities
            ].slice(0, 8)
          : current.activities
      };
    });
  };

  const resizeLayout = (target: "leftPane" | "rightPane" | "bottomPane", delta: number) => {
    setSnapshot((current) => {
      const nextValue =
        target === "leftPane"
          ? Math.min(420, Math.max(240, current.layout.leftPane + delta))
          : target === "rightPane"
            ? Math.min(440, Math.max(300, current.layout.rightPane + delta))
            : Math.min(420, Math.max(220, current.layout.bottomPane + delta));

      return {
        ...current,
        layout: {
          ...current.layout,
          [target]: nextValue
        }
      };
    });
  };

  const updateChatInput = (value: string) => {
    setSnapshot((current) => ({
      ...current,
      chatInput: value
    }));
  };

  const applyPrompt = (prompt: PromptRecord) => {
    setSnapshot((current) => {
      const file = current.files.find((record) => record.id === current.activeFileId) ?? current.files[0];
      return {
        ...current,
        selectedPromptId: prompt.id,
        chatInput: prompt.body,
        agents: current.agents.map((agent) =>
          agent.role === prompt.routeTo
            ? {
                ...agent,
                status: "Queued",
                focus: prompt.title,
                location: file.name,
                progressLabel: `Prompt queued from library with ${file.boundary} in context`
              }
            : agent
        ),
        activities: [
          createActivity(
            "Prompt staged",
            `${prompt.title} routed to ${prompt.routeTo} with ${file.name} in context.`,
            "success"
          ),
          ...current.activities
        ].slice(0, 8)
      };
    });
  };

  const updateProvider = (provider: ProviderConfig) => {
    setSnapshot((current) => ({
      ...current,
      provider,
      activities: [
        createActivity(
          "Provider preferences updated",
          `${provider.provider} / ${provider.model} saved for local workspace use.`,
          "info"
        ),
        ...current.activities
      ].slice(0, 8)
    }));
  };

  const advanceTask = (taskId: string) => {
    setSnapshot((current) => {
      const task = current.tasks.find((record) => record.id === taskId);
      return {
        ...current,
        tasks: current.tasks.map((record) =>
          record.id === taskId ? { ...record, stage: cycleTaskStage(record.stage) } : record
        ),
        activities: task
          ? [
              createActivity(
                "Task moved",
                `${task.title} advanced from ${task.stage} to ${cycleTaskStage(task.stage)}.`,
                "success"
              ),
              ...current.activities
            ].slice(0, 8)
          : current.activities
      };
    });
  };

  const commitAgentResponse = (routeTo: AgentRole, input: string, file: FileRecord) => {
    const userMessage = {
      id: `user-${Date.now()}`,
      speaker: "User" as const,
      tone: "request" as const,
      text: input,
      contextPath: file.path
    };

    const responseText = buildAgentResponse(file, routeTo, input);
    const agentMessage = {
      id: `agent-${Date.now()}`,
      speaker: routeTo,
      tone: "response" as const,
      text: responseText,
      contextPath: file.path
    };

    setSnapshot((current) => ({
      ...current,
      chatInput: "",
      selectedPromptId: null,
      messages: [...current.messages, userMessage, agentMessage],
      agents: current.agents.map((agent) =>
        agent.role === routeTo
          ? {
              ...agent,
              status: "Complete",
              focus: input,
              location: file.name,
              progressLabel: `Updated ${file.boundary}`
            }
          : agent.role === "Reviewer" && routeTo !== "Reviewer"
            ? {
                ...agent,
                status: "Queued",
                focus: `Review ${file.name}`,
                location: file.name,
                progressLabel: `Ready to validate ${file.boundary}`
              }
            : agent.role === "Operator"
              ? {
                  ...agent,
                  status: "Needs Input",
                  focus: "Provider settings boundary",
                  location: "settings/providers",
                  progressLabel: "Awaiting secure backend handoff"
                }
              : agent
      ),
      terminalLines: [
        ...current.terminalLines,
        `$ route --agent ${routeTo.toLowerCase()} --file ${file.path}`,
        `${routeTo}: context resolved for ${file.boundary}`,
        `reviewer: queued follow-up validation for ${file.boundary}`
      ].slice(-8)
      ,
      activities: [
        createActivity(`${routeTo} responded`, `Completed work against ${file.path}.`, "success"),
        createActivity("Reviewer queued", `Follow-up validation staged for ${file.boundary}.`, "info"),
        ...current.activities
      ].slice(0, 8)
    }));
  };

  const sendMessage = () => {
    const trimmed = snapshot.chatInput.trim();
    if (!trimmed) {
      return;
    }

    const queuedAgent =
      snapshot.prompts.find((prompt) => prompt.id === snapshot.selectedPromptId)?.routeTo ??
      "Builder";
    const file = activeFile;

    setSnapshot((current) => ({
      ...current,
      agents: updateAgentSet(current.agents, queuedAgent, file, trimmed),
      activities: [
        createActivity("Agent routed", `${queuedAgent} picked up work for ${file.path}.`, "info"),
        ...current.activities
      ].slice(0, 8)
    }));

    window.setTimeout(() => {
      commitAgentResponse(queuedAgent, trimmed, file);
    }, 260);
  };

  return {
    snapshot,
    activeFile,
    taskColumns,
    selectFile,
    resizeLayout,
    updateChatInput,
    applyPrompt,
    updateProvider,
    advanceTask,
    sendMessage
  };
};
