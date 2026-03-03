import { getDb } from "../db";
import type { AuthUser } from "./types";
import type { UserRole } from "../db/types";
import { hashPassword, verifyPassword } from "./password";
import { deleteUserSessions } from "./sessions";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  plex_id: string | null;
  plex_username: string | null;
  plex_email: string | null;
  plex_thumb: string | null;
  role: string;
  enabled: number;
  theme: string;
};

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username ?? row.plex_username ?? row.plex_email ?? "unknown",
    role: row.role as AuthUser["role"],
    enabled: !!row.enabled,
    theme: row.theme as AuthUser["theme"],
    thumb: row.plex_thumb ?? null,
  };
}

export function needsSetup(): boolean {
  const row = getDb()
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    .get() as { count: number };
  return row.count === 0;
}

export async function createAdminUser(
  username: string,
  password: string
): Promise<AuthUser> {
  const passwordHash = await hashPassword(password);

  const result = getDb()
    .prepare(
      `INSERT INTO users (username, password_hash, role, enabled)
       VALUES (?, ?, 'admin', 1)`
    )
    .run(username, passwordHash);

  return {
    id: result.lastInsertRowid as number,
    username,
    role: "admin",
    enabled: true,
    theme: "system",
    thumb: null,
  };
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const row = getDb()
    .prepare(
      `SELECT id, username, password_hash, plex_username, plex_email, plex_thumb, role, enabled, theme
       FROM users WHERE username = ?`
    )
    .get(username) as UserRow | undefined;

  if (!row || !row.password_hash) return null;
  if (!row.enabled) return null;

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;

  return toAuthUser(row);
}

export function findUserById(id: number): AuthUser | null {
  const row = getDb()
    .prepare(
      `SELECT id, username, plex_username, plex_email, plex_thumb, role, enabled, theme
       FROM users WHERE id = ?`
    )
    .get(id) as UserRow | undefined;

  if (!row) return null;

  return toAuthUser(row);
}

export function createPlexAdminUser(
  plexId: string,
  plexUsername: string,
  plexEmail: string,
  plexThumb: string
): AuthUser {
  const result = getDb()
    .prepare(
      `INSERT INTO users (plex_id, plex_username, plex_email, plex_thumb, role, enabled)
       VALUES (?, ?, ?, ?, 'admin', 1)`
    )
    .run(String(plexId), plexUsername, plexEmail, plexThumb);

  return {
    id: result.lastInsertRowid as number,
    username: plexUsername,
    role: "admin",
    enabled: true,
    theme: "system",
    thumb: plexThumb,
  };
}

export function findOrCreatePlexUser(
  plexId: string,
  plexUsername: string,
  plexEmail: string,
  plexThumb: string
): AuthUser {
  const existing = getDb()
    .prepare(
      `SELECT id, username, plex_username, plex_email, plex_thumb, role, enabled, theme
       FROM users WHERE plex_id = ?`
    )
    .get(String(plexId)) as UserRow | undefined;

  if (existing) {
    getDb()
      .prepare(
        `UPDATE users SET plex_username = ?, plex_email = ?, plex_thumb = ?, updated_at = datetime('now')
         WHERE plex_id = ?`
      )
      .run(plexUsername, plexEmail, plexThumb, String(plexId));

    return toAuthUser({
      ...existing,
      plex_username: plexUsername,
      plex_email: plexEmail,
      plex_thumb: plexThumb,
    });
  }

  const result = getDb()
    .prepare(
      `INSERT INTO users (plex_id, plex_username, plex_email, plex_thumb, role, enabled)
       VALUES (?, ?, ?, ?, 'user', 1)`
    )
    .run(String(plexId), plexUsername, plexEmail, plexThumb);

  return {
    id: result.lastInsertRowid as number,
    username: plexUsername,
    role: "user",
    enabled: true,
    theme: "system",
    thumb: plexThumb,
  };
}

export function updateUserPreferences(
  userId: number,
  prefs: { theme?: AuthUser["theme"] }
): void {
  if (prefs.theme) {
    getDb()
      .prepare("UPDATE users SET theme = ?, updated_at = datetime('now') WHERE id = ?")
      .run(prefs.theme, userId);
  }
}

function getAdminCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    .get() as { count: number };
  return row.count;
}

export function listAllUsers(): AuthUser[] {
  const rows = getDb()
    .prepare(
      `SELECT id, username, plex_username, plex_email, plex_thumb, role, enabled, theme
       FROM users ORDER BY id`
    )
    .all() as UserRow[];

  return rows.map(toAuthUser);
}

export function updateUserRole(userId: number, role: UserRole): void {
  const user = findUserById(userId);
  if (!user) {
    const err = new Error("User not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  if (user.role === "admin" && role === "user" && getAdminCount() <= 1) {
    const err = new Error("Cannot demote the last admin") as Error & {
      status: number;
    };
    err.status = 400;
    throw err;
  }

  getDb()
    .prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .run(role, userId);

  if (role === "user" && user.role === "admin") {
    deleteUserSessions(userId);
  }
}

export function updateUserEnabled(userId: number, enabled: boolean): void {
  const user = findUserById(userId);
  if (!user) {
    const err = new Error("User not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  if (!enabled && user.role === "admin" && getAdminCount() <= 1) {
    const err = new Error("Cannot disable the last admin") as Error & {
      status: number;
    };
    err.status = 400;
    throw err;
  }

  getDb()
    .prepare("UPDATE users SET enabled = ?, updated_at = datetime('now') WHERE id = ?")
    .run(enabled ? 1 : 0, userId);

  if (!enabled) {
    deleteUserSessions(userId);
  }
}

export function deleteUser(userId: number): void {
  const user = findUserById(userId);
  if (!user) {
    const err = new Error("User not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  if (user.role === "admin" && getAdminCount() <= 1) {
    const err = new Error("Cannot delete the last admin") as Error & {
      status: number;
    };
    err.status = 400;
    throw err;
  }

  deleteUserSessions(userId);
  getDb().prepare("DELETE FROM users WHERE id = ?").run(userId);
}
