import { getDb } from "../db";
import type { AuthUser } from "./types";
import { hashPassword, verifyPassword } from "./password";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  plex_id: string | null;
  plex_username: string | null;
  plex_email: string | null;
  plex_thumb: string | null;
  user_type: string;
  role: string;
  enabled: number;
  theme: string;
};

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username ?? row.plex_username ?? row.plex_email ?? "unknown",
    userType: row.user_type as AuthUser["userType"],
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
      `INSERT INTO users (username, password_hash, user_type, role, enabled)
       VALUES (?, ?, 'local', 'admin', 1)`
    )
    .run(username, passwordHash);

  return {
    id: result.lastInsertRowid as number,
    username,
    userType: "local",
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
      `SELECT id, username, password_hash, plex_username, plex_email, plex_thumb, user_type, role, enabled, theme
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
      `SELECT id, username, plex_username, plex_email, plex_thumb, user_type, role, enabled, theme
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
      `INSERT INTO users (plex_id, plex_username, plex_email, plex_thumb, user_type, role, enabled)
       VALUES (?, ?, ?, ?, 'plex', 'admin', 1)`
    )
    .run(String(plexId), plexUsername, plexEmail, plexThumb);

  return {
    id: result.lastInsertRowid as number,
    username: plexUsername,
    userType: "plex",
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
      `SELECT id, username, plex_username, plex_email, plex_thumb, user_type, role, enabled, theme
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
      `INSERT INTO users (plex_id, plex_username, plex_email, plex_thumb, user_type, role, enabled)
       VALUES (?, ?, ?, ?, 'plex', 'user', 1)`
    )
    .run(String(plexId), plexUsername, plexEmail, plexThumb);

  return {
    id: result.lastInsertRowid as number,
    username: plexUsername,
    userType: "plex",
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
      .prepare(
        "UPDATE users SET theme = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(prefs.theme, userId);
  }
}
