# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Run both Vite client (port 3002) and Express server (port 3001) concurrently
- `npm run start:client` — Vite dev server only
- `npm run start:server` — Express server only (via tsx)
- `npm run build` — Vite production build to `/build`
- `npm run lint` — ESLint (flat config, TypeScript + React)
- `npm run typecheck:server` — TypeScript type checking for server code

## Architecture

Full-stack TypeScript app: React 19 frontend + Express 5 backend. Vite proxies `/api/*` to the Express server in development.

**Frontend (`/src`):** React with React Router DOM, Tailwind CSS for styling, Context API for global state (Lidarr settings). Pages: Search, Discover, Status, Settings. Custom hooks handle async operations and state. Path alias `@/*` maps to `./src/*`.

**Backend (`/server`):** Express with modular API integrations — each external service (Lidarr, Last.fm, MusicBrainz, Plex, Deezer) has its own directory with `types.ts`, `config.ts`, and function files. Routes are organized under `/routes`. Configuration is persisted to JSON files in `APP_CONFIG_DIR` (default: `./config`). SQLite3 for data storage.

**Key patterns:**
- Type-safe generic API helpers per service (e.g., `lidarrGet<T>(path, query)`)
- MusicBrainz rate limiting middleware (1 req/sec)
- All external API calls routed through the backend
- Functional components with custom hooks — no class components
- Tailwind utility classes only — no custom CSS files
- `Promise.all()` for concurrent independent requests

## Environment Variables

- `APP_DATA_DIR` — Host path for persistent data
- `APP_CONFIG_DIR` — Host path for runtime config JSON
- `PORT` — Server port (default: 3001)

## Code Style

- JSDoc comments for type annotations are encouraged
- No other comments unless logic has non-obvious outliers
- TypeScript strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- ESLint flat config with separate rules for client (`src/`), server (`server/`), and CJS files
