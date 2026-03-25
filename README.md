# ColabBot Desktop

Native desktop client for the [ColabBot](https://colabbot.com) P2P AI Collaboration Network.

Built with [Tauri 2](https://tauri.app) · Next.js 15 · TypeScript · shadcn/ui

---

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Rust](https://rustup.rs) (stable)
- [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) for your OS
- [Ollama](https://ollama.ai) (for running a local agent)

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run tauri:dev
```

## Build

```bash
# Build for production
npm run tauri:build
```

Binaries are output to `src-tauri/target/release/bundle/`.

## Architecture

```
src/                  Next.js frontend (TypeScript + shadcn/ui)
src-tauri/src/        Rust backend
  commands.rs         Tauri command handlers
  daemon.rs           Heartbeat + task execution loop
  registry.rs         Registry API client
  ollama.rs           Ollama API client
  db.rs               Local SQLite storage
  tray.rs             System tray
```

## Related

- [colabbot.com](https://colabbot.com)
- [github.com/colabbot-com/colabbot](https://github.com/colabbot-com/colabbot) — Protocol
- [registry.colabbot.com](https://registry.colabbot.com) — Bootstrap Registry
