# Development Workflow

## Commands

| Command | Behavior |
|---------|----------|
| `npm run dev` | Vite dev server only (frontend HMR, no Tauri window) |
| `npm run tauri dev` | Full app: Tauri window + Vite dev server + Rust compilation |

## Hot Reload

| Layer | Mechanism | Speed |
|-------|-----------|-------|
| Frontend (React/TS/Tailwind) | Vite HMR — component state preserved | Instant |
| Backend (Rust) | Watched recompile + process restart | 3–8 seconds |

## Debugging

**Frontend:** Right-click WebView → Inspect opens Chrome DevTools (WebView2 on Windows, WebKit Inspector on macOS/Linux). Available only in `tauri dev`.

**Rust:** Log output prints to the launching terminal. Filter with `RUST_LOG=debug` or `RUST_LOG=error`.

**IPC:** Tauri DevTools can inspect `invoke` calls, payloads, event emissions, and round-trip timing.

## Platform Notes

Development targets only the host OS. Cross-compilation is not supported by Tauri's toolchain.

| Host OS | Develops for | Notes |
|---------|-------------|-------|
| Windows | Windows | WebView2 pre-installed on Windows 10+ |
| macOS | macOS | Both Intel and ARM; ARM default on Apple Silicon |
| Linux | Linux | Requires `libwebkit2gtk-4.1-dev` |

Cross-platform builds are handled by CI (see [build-and-distribution.md](build-and-distribution.md)).
