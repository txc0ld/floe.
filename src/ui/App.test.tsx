import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "../app/forge";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("persists the selected file across reloads", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    const target = screen
      .getAllByText("apps/forge/src/state/workspace-store.ts")[0]
      ?.closest("button");

    expect(target).not.toBeNull();
    await user.click(target!);
    unmount();

    render(<App />);

    expect(screen.getByRole("heading", { name: "workspace-store.ts" })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"activeFileId":"store"');
  });

  it("queues a prompt and sends contextual chat to the routed agent", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /architectural review/i }));
    await user.click(screen.getByRole("button", { name: /send to agent/i }));

    expect(await screen.findByText(/Boundary: Workspace Shell/)).toBeInTheDocument();
    expect(await screen.findByText(/Architect responded/i)).toBeInTheDocument();
  });
});
