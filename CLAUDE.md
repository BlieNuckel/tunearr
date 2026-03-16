# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Run both Vite client (port 3002) and Express server (port 3001) concurrently
- `pnpm start:client` — Vite dev server only
- `pnpm start:server` — Express server only (via tsx)
- `pnpm build` — Vite production build to `/build`
- `pnpm lint` — ESLint (flat config, TypeScript + React)
- `pnpm typecheck` — TypeScript type checking for both frontend and server
- `pnpm typecheck:server` — TypeScript type checking for server code only (`cd server && tsc --noEmit`)
- `pnpm test` — Run frontend tests (Vitest + jsdom + testing-library, config: `vitest.config.ts`)
- `pnpm test:server` — Run server tests (Vitest + node, config: `server/vitest.config.ts`)
- `pnpm vitest run src/components/__tests__/Modal.test.tsx` — Run a single frontend test file
- `pnpm vitest run --config server/vitest.config.ts server/config.test.ts` — Run a single server test file
- `pnpm migration:generate server/db/migration/<Name>` — Generate a TypeORM migration
- `pnpm migration:run` — Run pending TypeORM migrations

## Architecture

Full-stack TypeScript app: React 19 frontend + Express 5 backend. Vite proxies `/api/*` to the Express server in development. In production, Express serves the built frontend as static files from `/build`.

**Frontend (`/src`):** React with React Router DOM, Tailwind CSS v4 for styling. Path alias `@/*` maps to `./src/*`. Pages live under `src/pages/` (Discover at `/`, Search at `/search`, Status, Settings), each with co-located sub-components. Shared components in `src/components/`. Frontend uses plain `fetch()` to relative `/api/...` paths — no shared HTTP client.

**Tailwind CSS v4:** Uses `@tailwindcss/postcss` — the legacy `tailwind.config.cjs` is ignored. All custom theme values, keyframes, and animations are defined in `src/index.css` using `@theme` blocks and plain CSS.

**State management:** `SettingsContext` holds global settings, connection status, and Lidarr options (profiles, root paths). `ThemeContext` manages light/dark/system theme. All other state is page-local via custom hooks in `src/hooks/` — each hook owns its own loading/error/data lifecycle.

**Backend (`/server`):** Express with four layers:

- **Service layer** (`/server/api/`) — each external API has a `<name>/` directory (e.g., `lidarr/`, `lastfm/`, `musicbrainz/`, `plex/`, `deezer/`, `apple/`, `slskd/`) containing `types.ts`, usually `config.ts`, and function files. Service configs read from `getConfig()` lazily at request time (no restart needed after settings change).
- **Route layer** (`/server/routes/`) — maps Express routes to service functions. Routes mount at `/api/settings`, `/api/lidarr`, `/api/musicbrainz`, `/api/lastfm`, `/api/plex`, `/api/promoted-album`, `/api/torznab`, `/api/sabnzbd`, `/api/auth`, `/api/users`, `/api/requests`, `/api/exploration`, `/api/logs`. The Lidarr router is an aggregator that mounts sub-routers (add, albums, artists, history, import, queue, search, wanted, qualityProfile, rootPath, metadataProfile, autoSetup).
- **Middleware** (`/server/middleware/`) — `errorHandler.ts` (global Express error handler), `rateLimiter.ts` (MusicBrainz 1 req/sec), `requireAuth.ts` (session cookie authentication), `requirePermission.ts` (bitfield permission checks), `ApiError.ts` (typed error class with HTTP status).
- **Auth layer** (`/server/auth/`) — session management (`sessions.ts`), password hashing (`password.ts`), user CRUD (`users.ts`). Sessions stored in SQLite alongside users.

**Database (`/server/db/`):** SQLite via better-sqlite3 + TypeORM. Entities: `User`, `Session`, `Request`. Migrations in `/server/db/migration/` run automatically on startup (`migrationsRun: true`). WAL mode enabled. Access the singleton DataSource via `getDataSource()` after `initializeDatabase()`.

**Auth & permissions:** Bitfield-based permission system in `shared/permissions.ts` (shared between frontend and backend). Permissions: `ADMIN`, `MANAGE_USERS`, `MANAGE_REQUESTS`, `REQUEST`, `AUTO_APPROVE`, `REQUEST_VIEW`. `ADMIN` bypasses all checks. Auth uses HTTP-only session cookies (`tunearr_session`). Some routes (torznab, sabnzbd, logs, exploration, auth) are public; most require `requireAuth` middleware. Each user's Plex OAuth token is stored on the `User` entity (`plex_token` column) and used for per-user Plex media server queries. The server config only stores `plexUrl` (shared), not the token. `AuthUser` includes `hasPlexToken` (sent to frontend) and `plexToken` (server-side only). The `/api/auth/store-plex-token` endpoint updates a user's stored Plex token.

**Soulseek integration via torznab/SABnzbd emulation (`/server/api/slskd/`):** The app integrates Soulseek (via an external slskd daemon) into Lidarr's standard indexer+download-client workflow by emulating two services:

- **Torznab indexer** (`/api/torznab`) — Newznab-compatible endpoint that Lidarr queries for music searches. Translates search requests into slskd queries, groups results by user+directory into logical releases (`groupResults.ts`), and returns RSS/XML. Results are cached for 30 minutes. Download URLs point back to `/api/torznab/download/{guid}`, which returns a fake NZB containing base64-encoded slskd metadata (username + file list) via `nzb.ts`.
- **SABnzbd emulator** (`/api/sabnzbd`) — Lidarr sends the NZB here as a "download client". The router decodes the embedded metadata, enqueues P2P downloads with slskd (`transfer.ts`), and tracks progress in-memory (`downloadTracker.ts`). Lidarr polls queue/history endpoints; the emulator maps slskd transfer states to SABnzbd format (`statusMap.ts`).

The result: Lidarr sees a normal indexer and download client, but downloads actually come from Soulseek P2P via slskd.

**Shared code (`/shared/`):** Code shared between frontend and backend. Currently contains `permissions.ts` (Permission enum, `hasPermission()` helper). Importable from both sides.

**Config system** (`server/config.ts`): Persisted as JSON at `APP_CONFIG_DIR/config.json`. `getConfig()` reads from disk and merges with defaults on every call. `setConfig()` validates and writes. `getConfigValue<K>(key)` provides typed single-field access.

**Key patterns:**

- Type-safe generic API helpers per service (e.g., `lidarrGet<T>(path, query)`)
- All external API calls routed through the backend
- Functional components with custom hooks — no class components
- Tailwind utility classes only — no custom CSS files
- `Promise.all()` for concurrent independent requests
- Prettier enforced in CI (auto-commits formatting fixes)
- `ApiError` class for throwing HTTP errors in routes/services — caught by `errorHandler`
- `undici` used for server-side HTTP requests (not node-fetch)

## Environment Variables

- `APP_DATA_DIR` — Host path for persistent data
- `APP_CONFIG_DIR` — Host path for runtime config JSON (default: `./config`)
- `PORT` — Server port (default: 3001)

## Testing

**Every feature MUST have full test coverage — both frontend and backend — before it is considered complete.** No feature is done until its tests are written and passing.

- **Frontend tests** (`pnpm test`): Use Vitest + jsdom + React Testing Library. Test files go in `__tests__/` directories co-located with the code they test. Cover component rendering, user interactions, loading/error states, and hook behavior.
- **Backend tests** (`pnpm test:server`): Use Vitest in node mode. Test files go alongside the code they test (e.g., `server/config.test.ts`). Cover service functions, route handlers, middleware, and edge cases. Mock external API calls — never make real network requests in tests.
- **When modifying existing features**, update or add tests to cover the changes. Never leave existing tests broken.
- **Run both test suites** (`pnpm test` and `pnpm test:server`) before considering any work complete. All tests must pass.

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
