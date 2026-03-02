import { getDb } from "../db";
import type { AuthUser } from "./types";
import { hashPassword, verifyPassword } from "./password";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  enabled: number;
  theme: string;
};

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
  };
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const row = getDb()
    .prepare(
      "SELECT id, username, password_hash, role, enabled, theme FROM users WHERE username = ?"
    )
    .get(username) as UserRow | undefined;

  if (!row || !row.password_hash) return null;
  if (!row.enabled) return null;

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;

  return {
    id: row.id,
    username: row.username,
    role: row.role as AuthUser["role"],
    enabled: true,
    theme: row.theme as AuthUser["theme"],
  };
}

export function findUserById(id: number): AuthUser | null {
  const row = getDb()
    .prepare(
      "SELECT id, username, role, enabled, theme FROM users WHERE id = ?"
    )
    .get(id) as UserRow | undefined;

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    role: row.role as AuthUser["role"],
    enabled: !!row.enabled,
    theme: row.theme as AuthUser["theme"],
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
