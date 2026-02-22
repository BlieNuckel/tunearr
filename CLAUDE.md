# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Run both Vite client (port 3002) and Express server (port 3001) concurrently
- `npm run start:client` — Vite dev server only
- `npm run start:server` — Express server only (via tsx)
- `npm run build` — Vite production build to `/build`
- `npm run lint` — ESLint (flat config, TypeScript + React)
- `npm run typecheck:server` — TypeScript type checking for server code (`cd server && tsc --noEmit`)
- `npm test` — Run frontend tests (Vitest + jsdom + testing-library, config: `vitest.config.ts`)
- `npm run test:server` — Run server tests (Vitest + node, config: `server/vitest.config.ts`)
- `npx vitest run src/components/__tests__/Modal.test.tsx` — Run a single frontend test file
- `npx vitest run --config server/vitest.config.ts server/config.test.ts` — Run a single server test file

## Architecture

Full-stack TypeScript app: React 19 frontend + Express 5 backend. Vite proxies `/api/*` to the Express server in development. In production, Express serves the built frontend as static files from `/build`.

**Frontend (`/src`):** React with React Router DOM, Tailwind CSS for styling. Path alias `@/*` maps to `./src/*`. Pages live under `src/pages/` (Discover at `/`, Search at `/search`, Status, Settings), each with co-located sub-components. Shared components in `src/components/`. Frontend uses plain `fetch()` to relative `/api/...` paths — no shared HTTP client.

**State management:** Single `LidarrContext` holds global settings, connection status, and Lidarr options (profiles, root paths). All other state is page-local via custom hooks in `src/hooks/` — each hook owns its own loading/error/data lifecycle.

**Backend (`/server`):** Express with three layers:

- **Service layer** — each external API has a `<name>Api/` directory (e.g., `lidarrApi/`, `lastfmApi/`, `musicbrainzApi/`, `plexApi/`, `deezerApi/`) containing `types.ts`, usually `config.ts`, and function files. Service configs read from `getConfig()` lazily at request time (no restart needed after settings change).
- **Route layer** (`/server/routes/`) — maps Express routes to service functions. Routes mount at `/api/settings`, `/api/lidarr`, `/api/musicbrainz`, `/api/lastfm`, `/api/plex`. The Lidarr router is an aggregator that mounts sub-routers (add, artists, history, import, queue, wanted, qualityProfile, rootPath, metadataProfile) plus a shared `helpers.ts` for upsert logic.
- **Middleware** (`/server/middleware/`) — `errorHandler.ts` (global Express error handler) and `rateLimiter.ts` (MusicBrainz 1 req/sec).

**Config system** (`server/config.ts`): Persisted as JSON at `APP_CONFIG_DIR/config.json`. `getConfig()` reads from disk and merges with defaults on every call. `setConfig()` validates and writes. `getConfigValue<K>(key)` provides typed single-field access.

**Key patterns:**

- Type-safe generic API helpers per service (e.g., `lidarrGet<T>(path, query)`)
- All external API calls routed through the backend
- Functional components with custom hooks — no class components
- Tailwind utility classes only — no custom CSS files
- `Promise.all()` for concurrent independent requests

## Environment Variables

- `APP_DATA_DIR` — Host path for persistent data
- `APP_CONFIG_DIR` — Host path for runtime config JSON (default: `./config`)
- `PORT` — Server port (default: 3001)

## Testing

**Every feature MUST have full test coverage — both frontend and backend — before it is considered complete.** No feature is done until its tests are written and passing.

- **Frontend tests** (`npm test`): Use Vitest + jsdom + React Testing Library. Test files go in `__tests__/` directories co-located with the code they test. Cover component rendering, user interactions, loading/error states, and hook behavior.
- **Backend tests** (`npm run test:server`): Use Vitest in node mode. Test files go alongside the code they test (e.g., `server/config.test.ts`). Cover service functions, route handlers, middleware, and edge cases. Mock external API calls — never make real network requests in tests.
- **When modifying existing features**, update or add tests to cover the changes. Never leave existing tests broken.
- **Run both test suites** (`npm test` and `npm run test:server`) before considering any work complete. All tests must pass.

## Code Style

- JSDoc comments for type annotations are encouraged
- No other comments unless logic has non-obvious outliers
- TypeScript strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- ESLint flat config with separate rules for client (`src/`), server (`server/`), and CJS files
- Separate tsconfig for server (`server/tsconfig.json`) using Node module resolution vs root tsconfig using bundler resolution for frontend
- **Types at top of file**: All `type` and `interface` declarations must appear before any function/const declarations at the module level
- **No nested function definitions**: Extract functions to module level with explicit parameters instead of closures. Exceptions: React event handlers and hook functions that genuinely need closure over state/props, and inline callbacks to array methods (`.map()`, `.filter()`, etc.)
- **Function length ~50 lines**: Break down functions exceeding ~50 lines of logic. Use judgement — JSX length in React components doesn't count the same as logic, but 100+ line components should still be split into sub-components

## Deployment

Multi-stage Dockerfile: builds frontend with Vite, then runs server with `npx tsx server/index.ts` in a `node:22-alpine` image. `APP_CONFIG_DIR=/config` is intended to be bind-mounted for persistence.
