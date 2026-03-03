import { randomBytes } from "crypto";
import { getDb } from "../db";
import type { AuthUser } from "./types";

type SessionRow = {
  user_id: number;
  username: string;
  plex_username: string | null;
  plex_email: string | null;
  plex_thumb: string | null;
  role: string;
  enabled: number;
  theme: string;
  expires_at: string;
};

const SESSION_EXPIRY_DAYS = 30;

export function createSession(userId: number): string {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  getDb()
    .prepare(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
    )
    .run(token, userId, expiresAt);

  return token;
}

export function validateSession(token: string): AuthUser | null {
  const row = getDb()
    .prepare(
      `SELECT s.user_id, s.expires_at,
              u.username, u.plex_username, u.plex_email, u.plex_thumb,
              u.role, u.enabled, u.theme
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as SessionRow | undefined;

  if (!row) return null;

  if (new Date(row.expires_at) <= new Date()) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  if (!row.enabled) return null;

  return {
    id: row.user_id,
    username: row.username ?? row.plex_username ?? row.plex_email ?? "unknown",
    role: row.role as AuthUser["role"],
    enabled: true,
    theme: row.theme as AuthUser["theme"],
    thumb: row.plex_thumb ?? null,
  };
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function deleteUserSessions(userId: number): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function cleanExpiredSessions(): void {
  getDb()
    .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
    .run();
}
