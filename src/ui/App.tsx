import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent
} from "react";
import { type ProviderConfig } from "../app/forge";
import { useForgeWorkspace } from "../app/useForgeWorkspace";

type ResizeTarget = "leftPane" | "rightPane" | "bottomPane";

const connectionModes: ProviderConfig["connectionMode"][] = [
  "Workspace Default",
  "Manual"
];

const providers: ProviderConfig["provider"][] = ["OpenAI", "Anthropic", "Local"];

const modelsByProvider: Record<ProviderConfig["provider"], string[]> = {
  OpenAI: ["gpt-5-codex", "gpt-5", "gpt-4.1"],
  Anthropic: ["claude-opus-4.1", "claude-sonnet-4"],
  Local: ["qwen-coder", "llama-3.3-instruct"]
};

const toneLabel: Record<string, string> = {
  info: "Info",
  success: "Success",
  warning: "Warning"
};

const useVoiceCapture = (onTranscript: (value: string) => void) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [state, setState] = useState<"ready" | "recording" | "unsupported" | "error">(
    "ready"
  );
  const handleTranscript = useEffectEvent(onTranscript);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setState("unsupported");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        handleTranscript(transcript);
      }
      setState("ready");
    };
    recognition.onerror = () => {
      setState("error");
    };
    recognition.onend = () => {
      setState((current) => (current === "recording" ? "ready" : current));
    };

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [handleTranscript]);

  const start = () => {
    if (!recognitionRef.current) {
      return;
    }
    setState("recording");
    recognitionRef.current.start();
  };

  return { state, start };
};

const ResizeHandle = ({
  axis,
  onResize,
  label
}: {
  axis: "x" | "y";
  onResize: (delta: number) => void;
  label: string;
}) => {
  const pointerStart = useRef<number | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    pointerStart.current = axis === "x" ? event.clientX : event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerStart.current === null) {
      return;
    }
    const point = axis === "x" ? event.clientX : event.clientY;
    const delta = point - pointerStart.current;
    if (delta === 0) {
      return;
    }
    pointerStart.current = point;
    onResize(delta);
  };

  const stopResize = (event: PointerEvent<HTMLButtonElement>) => {
    pointerStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <button
      aria-label={label}
      className={`resize-handle resize-handle-${axis}`}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopResize}
      onPointerCancel={stopResize}
    />
  );
};

export const App = () => {
  const {
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
  } = useForgeWorkspace();

  const voice = useVoiceCapture((transcript) =>
    updateChatInput(
      snapshot.chatInput ? `${snapshot.chatInput.trim()} ${transcript}`.trim() : transcript
    )
  );

  const activePrompt = snapshot.prompts.find((prompt) => prompt.id === snapshot.selectedPromptId);
  const availableModels = modelsByProvider[snapshot.provider.provider];

  return (
    <div className="app-frame">
      <header className="topbar">
        <div>
          <p className="eyebrow">FORGE</p>
          <h1>Unified agentic workspace</h1>
        </div>
        <div className="topbar-status">
          <div className="status-pill">
            <span className="status-dot status-live" />
            Active file: {activeFile.name}
          </div>
          <div className="status-pill muted">Local-first demo state</div>
          <div className="status-pill muted">
            Provider: {snapshot.provider.provider} / {snapshot.provider.model}
          </div>
        </div>
      </header>

      <section className="summary-row">
        <article className="summary-card">
          <span>Context boundary</span>
          <strong>{activeFile.boundary}</strong>
          <p>{activeFile.summary}</p>
        </article>
        <article className="summary-card">
          <span>Agent queue</span>
          <strong>
            {snapshot.agents.filter((agent) => agent.status !== "Idle").length} active lanes
          </strong>
          <p>Roles expose ownership, focus, and execution state instead of hidden background work.</p>
        </article>
        <article className="summary-card">
          <span>Safety boundary</span>
          <strong>Provider settings stay local</strong>
          <p>No production secrets are captured in-browser in this foundation slice.</p>
        </article>
      </section>

      <div
        className="workspace-grid"
        style={
          {
            "--left-pane": `${snapshot.layout.leftPane}px`,
            "--right-pane": `${snapshot.layout.rightPane}px`,
            "--bottom-pane": `${snapshot.layout.bottomPane}px`
          } as CSSProperties
        }
      >
        <aside className="panel panel-left">
          <section className="panel-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Explorer</p>
                <h2>Project files</h2>
              </div>
              <span className="meta-chip">{snapshot.files.length} seeded files</span>
            </div>
            <div className="file-list">
              {snapshot.files.map((file) => (
                <button
                  key={file.id}
                  className={`file-item ${file.id === activeFile.id ? "active" : ""}`}
                  type="button"
                  onClick={() => selectFile(file.id)}
                >
                  <span>{file.name}</span>
                  <small>{file.path}</small>
                </button>
              ))}
            </div>
            <div className="context-block">
              <p className="eyebrow">Active context</p>
              <strong>{activeFile.path}</strong>
              <p>{activeFile.summary}</p>
              <ul>
                {activeFile.relatedPaths.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Task board</p>
                <h2>Execution flow</h2>
              </div>
            </div>
            <div className="task-columns">
              {Object.entries(taskColumns).map(([column, tasks]) => (
                <div className="task-column" key={column}>
                  <div className="task-column-header">
                    <strong>{column}</strong>
                    <span>{tasks.length}</span>
                  </div>
                  <div className="task-stack">
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        className="task-card"
                        type="button"
                        onClick={() => advanceTask(task.id)}
                      >
                        <div className="task-card-top">
                          <span>{task.priority}</span>
                          <span>{task.owner}</span>
                        </div>
                        <strong>{task.title}</strong>
                        <small>Click to advance</small>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Prompt library</p>
                <h2>Reusable instructions</h2>
              </div>
            </div>
            <div className="prompt-list">
              {snapshot.prompts.map((prompt) => (
                <button
                  key={prompt.id}
                  className={`prompt-item ${snapshot.selectedPromptId === prompt.id ? "active" : ""}`}
                  type="button"
                  onClick={() => applyPrompt(prompt)}
                >
                  <strong>{prompt.title}</strong>
                  <span>{prompt.routeTo}</span>
                  <p>{prompt.body}</p>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <ResizeHandle
          axis="x"
          label="Resize explorer column"
          onResize={(delta) => resizeLayout("leftPane", delta)}
        />

        <main className="center-grid">
          <section className="panel-card editor-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Editor</p>
                <h2>{activeFile.name}</h2>
              </div>
              <div className="inline-meta">
                <span className="meta-chip">{activeFile.language}</span>
                <span className="meta-chip">{activeFile.boundary}</span>
              </div>
            </div>
            <div className="editor-tabs">
              {snapshot.files.map((file) => (
                <button
                  key={file.id}
                  className={`editor-tab ${file.id === activeFile.id ? "active" : ""}`}
                  type="button"
                  onClick={() => selectFile(file.id)}
                >
                  {file.name}
                </button>
              ))}
            </div>
            <pre className="code-view">
              <code>{activeFile.content}</code>
            </pre>
          </section>

          <ResizeHandle
            axis="y"
            label="Resize lower workspace row"
            onResize={(delta) => resizeLayout("bottomPane", -delta)}
          />

          <section className="lower-grid">
            <section className="panel-card terminal-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Terminal</p>
                  <h2>Execution trace</h2>
                </div>
                <span className="meta-chip">Linked to agent actions</span>
              </div>
              <div className="terminal-view" role="log" aria-label="Terminal output">
                {snapshot.terminalLines.map((line, index) => (
                  <div key={`${line}-${index}`} className="terminal-line">
                    {line}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel-card chat-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Agent chat</p>
                  <h2>Context-aware routing</h2>
                </div>
                <span className="meta-chip">
                  {activePrompt ? `Queued for ${activePrompt.routeTo}` : "Default route: Builder"}
                </span>
              </div>
              <div className="chat-context">
                <strong>What the agent sees</strong>
                <span>{activeFile.path}</span>
                <span>{activeFile.boundary}</span>
                <span>{activeFile.relatedPaths.join(" • ")}</span>
              </div>
              <div className="chat-thread">
                {snapshot.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`chat-message ${
                      message.speaker === "User" ? "chat-message-user" : "chat-message-agent"
                    }`}
                  >
                    <header>
                      <strong>{message.speaker}</strong>
                      {message.contextPath ? <span>{message.contextPath}</span> : null}
                    </header>
                    <p>{message.text}</p>
                  </article>
                ))}
              </div>
              <div className="composer">
                <label className="sr-only" htmlFor="chat-input">
                  Agent chat input
                </label>
                <textarea
                  id="chat-input"
                  value={snapshot.chatInput}
                  onChange={(event) => updateChatInput(event.target.value)}
                  placeholder="Describe the next task. The active file and task state stay attached."
                />
                <div className="composer-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={voice.start}
                    disabled={voice.state === "unsupported" || voice.state === "recording"}
                  >
                    {voice.state === "unsupported"
                      ? "Voice unavailable"
                      : voice.state === "recording"
                        ? "Listening..."
                        : "Voice input"}
                  </button>
                  <button className="primary-button" type="button" onClick={sendMessage}>
                    Send to agent
                  </button>
                </div>
              </div>
            </section>
          </section>
        </main>

        <ResizeHandle
          axis="x"
          label="Resize right column"
          onResize={(delta) => resizeLayout("rightPane", -delta)}
        />

        <aside className="panel panel-right">
          <section className="panel-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Orchestration</p>
                <h2>Specialist agents</h2>
              </div>
            </div>
            <div className="agent-list">
              {snapshot.agents.map((agent) => (
                <article className="agent-card" key={agent.role}>
                  <div className="agent-card-top">
                    <strong>{agent.role}</strong>
                    <span className={`agent-status status-${agent.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {agent.status}
                    </span>
                  </div>
                  <p>{agent.focus}</p>
                  <small>{agent.location}</small>
                  <footer>{agent.progressLabel}</footer>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Activity feed</p>
                <h2>Recent changes</h2>
              </div>
            </div>
            <div className="activity-list">
              {snapshot.activities.map((activity) => (
                <article className="activity-item" key={activity.id}>
                  <div className="activity-item-top">
                    <span className={`tone tone-${activity.tone}`}>{toneLabel[activity.tone]}</span>
                    <time>{activity.timestamp}</time>
                  </div>
                  <strong>{activity.title}</strong>
                  <p>{activity.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Providers and workspace preferences</h2>
              </div>
            </div>
            <form className="settings-form">
              <label>
                Provider
                <select
                  value={snapshot.provider.provider}
                  onChange={(event) =>
                    updateProvider({
                      ...snapshot.provider,
                      provider: event.target.value as ProviderConfig["provider"],
                      model: modelsByProvider[event.target.value as ProviderConfig["provider"]][0]
                    })
                  }
                >
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Model
                <select
                  value={snapshot.provider.model}
                  onChange={(event) =>
                    updateProvider({
                      ...snapshot.provider,
                      model: event.target.value
                    })
                  }
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Connection mode
                <select
                  value={snapshot.provider.connectionMode}
                  onChange={(event) =>
                    updateProvider({
                      ...snapshot.provider,
                      connectionMode: event.target.value as ProviderConfig["connectionMode"]
                    })
                  }
                >
                  {connectionModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <p className="settings-note">
                Prototype boundary: settings persist in local browser storage only. Secret handling is
                intentionally out of scope until a secure backend boundary exists.
              </p>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
};
