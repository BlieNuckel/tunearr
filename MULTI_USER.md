# Multi-User Support — Implementation Plan

Tracking issue: [#58](https://github.com/BlieNuckel/tunearr/issues/58)

## Progress

- [x] Phase 1: SQLite database layer
- [x] Phase 2: Local admin authentication
- [ ] Phase 3: Plex OAuth sign-in
- [ ] Phase 4: Roles & user management
- [ ] Phase 5: Request system — backend
- [ ] Phase 6: Request UI — user side
- [ ] Phase 7: Admin request management UI
- [ ] Phase 8: Polish & advanced features

## Dependency Graph

```
Phase 1 (SQLite)
  └→ Phase 2 (Local auth)
       ├→ Phase 3 (Plex OAuth)
       └→ Phase 4 (Roles)
            └→ Phase 5 (Request backend)
                 ├→ Phase 6 (Request UI - user)
                 └→ Phase 7 (Request UI - admin)
                      └→ Phase 8 (Polish)
```

---

## Phase 1: SQLite Database Layer

Everything else (users, sessions, requests) needs persistent storage. The current JSON config file won't scale for multi-user data.

- Add `better-sqlite3` (fast, zero-config, fits the existing file-based pattern)
- Create a migration system (simple versioned SQL files)
- Initial schema: `users` table, `sessions` table
- Keep the existing JSON config for app-level settings — the DB is for user-scoped data

---

## Phase 2: Local Admin Authentication

Need auth before anything else. Start with a simple local admin account.

- First-run setup flow: create admin account (username + password)
- Login/logout API endpoints (`/api/auth/login`, `/api/auth/logout`)
- Session middleware (cookie-based with DB-backed sessions)
- Auth middleware that injects `req.user` on all routes
- Protect `/api/settings` as admin-only
- Frontend: login page, auth context, redirect unauthenticated users
- **At this point:** app works exactly as before, but behind a login wall

---

## Phase 3: Plex OAuth Sign-in

The natural auth method for this app's audience. Builds on the auth system from Phase 2.

- Implement Plex OAuth flow (PIN-based auth via `plex.tv/api/v2/pins`)
- On successful Plex auth, create or match a local user record
- Link Plex identity (Plex user ID, email, thumb) to the local user
- Admin can still log in with local credentials as fallback
- Frontend: "Sign in with Plex" button on login page

---

## Phase 4: Roles & User Management

Need roles before the request system can distinguish who needs approval.

- Role system: `admin` and `user` (stored in `users` table)
- First Plex sign-in user (or local setup user) is auto-admin
- Admin UI page: list users, assign/revoke admin role, disable accounts
- Route-level permission middleware (`requireAdmin`, `requireAuth`)
- Non-admin users can browse/search but cannot add directly (prep for Phase 5)

---

## Phase 5: Request System — Backend

Core feature — the actual request/approval workflow.

- `requests` table: album MBID, artist MBID, user ID, status (pending/approved/rejected/available), timestamps, admin notes
- `POST /api/requests` — creates a pending request (for non-admin users)
- `GET /api/requests` — list requests (filtered by user for non-admins, all for admins)
- `PUT /api/requests/:id/approve` — admin approves → triggers existing Lidarr add flow
- `PUT /api/requests/:id/reject` — admin rejects with optional note
- Admins bypass the request flow entirely (direct add like today)
- Modify `/api/lidarr/add` to check role: admin → direct add, user → create request

---

## Phase 6: Request UI — User Side

Users need to see and manage their requests.

- "Request" button replaces "Add" for non-admin users in search results
- "My Requests" page: list of user's requests with status indicators
- Visual status: pending (yellow), approved/downloading (blue), available (green), rejected (red)
- Already-requested albums shown differently in search results (no double-requesting)

---

## Phase 7: Admin Request Management UI

Admins need a dashboard to process requests.

- Admin "Requests" page: filterable list of all pending/processed requests
- Approve/reject actions with optional notes
- Show who requested what and when
- Bulk approve/reject

---

## Phase 8: Polish & Advanced Features

Optional / future enhancements.

- Auto-approve setting (per-user or global — skip approval for trusted users)
- Request notifications (e.g., webhook/Discord when request approved)
- Request limits (max pending requests per user)
- Per-user Plex library suggestions on Discover page (use their own Plex token)
