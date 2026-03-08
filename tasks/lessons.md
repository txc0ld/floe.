# Lessons

- Inspect the full source tree before assuming a greenfield repo is isolated. This run exposed an unexpected parallel scaffold under `src/`, and whole-repo validation was necessary to catch those integration issues.
- Stabilize browser-storage tests with an explicit shared `localStorage` mock in Vitest setup instead of relying on environment defaults.
- When a repo contains both UI tests and a partial scaffold, treat the exercised test path as authoritative before adding new top-level surfaces. That avoids duplicate app implementations and keeps changes on the live product path.
