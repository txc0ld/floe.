# floe

floe is a greenfield unified workspace for agentic software development. This foundation slice ships a single integrated surface with:

- persisted workspace shell layout
- seeded explorer and editor context
- integrated terminal and agent chat
- visible specialist-agent orchestration
- activity feed and task board
- prompt library
- voice-to-prompt entry where browser support exists
- local-only provider preferences

## Commands

```bash
pnpm install
pnpm test
pnpm build
pnpm dev
```

## Notes

- Provider settings are intentionally local-only and do not accept production secrets.
- Voice input uses the browser Speech Recognition API when available and degrades cleanly when unsupported.
