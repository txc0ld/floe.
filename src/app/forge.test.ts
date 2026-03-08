import {
  buildAgentResponse,
  defaultFiles,
  hydratePersistedState
} from "./forge";

describe("forge domain helpers", () => {
  it("hydrates persisted state with safe fallbacks and clamps layout", () => {
    const hydrated = hydratePersistedState(
      JSON.stringify({
        layout: {
          leftPane: 999,
          rightPane: 120,
          bottomPane: 10
        },
        activeFileId: "store",
        chatInput: "route this",
        provider: {
          provider: "Local",
          model: "qwen-coder",
          connectionMode: "Manual"
        },
        selectedPromptId: "p2",
        tasks: [
          {
            id: "custom-task",
            title: "Ship provider settings",
            stage: "Review",
            owner: "Operator",
            priority: "P1"
          },
          {
            id: 5
          }
        ]
      })
    );

    expect(hydrated.layout).toEqual({
      leftPane: 420,
      rightPane: 300,
      bottomPane: 220
    });
    expect(hydrated.activeFileId).toBe("store");
    expect(hydrated.provider).toEqual({
      provider: "Local",
      model: "qwen-coder",
      connectionMode: "Manual"
    });
    expect(hydrated.tasks).toHaveLength(1);
    expect(hydrated.tasks[0]?.id).toBe("custom-task");
  });

  it("builds routed agent responses with active file context", () => {
    const file = defaultFiles[0];
    const response = buildAgentResponse(
      file,
      "Builder",
      "Implement the next safe shell improvement and verify the related modules."
    );

    expect(response).toContain(file.path);
    expect(response).toContain(file.relatedPaths[0]);
    expect(response).toContain("safest next move");
  });
});
