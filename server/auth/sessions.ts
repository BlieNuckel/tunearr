import { randomBytes } from "crypto";
import { getDataSource } from "../db";
import { Session } from "../db/entity/Session";
import type { AuthUser } from "./types";

const SESSION_EXPIRY_DAYS = 30;

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const repo = getDataSource().getRepository(Session);
  const session = repo.create({
    token,
    user_id: userId,
    expires_at: expiresAt,
  });
  await repo.save(session);

  return token;
}

export async function validateSession(token: string): Promise<AuthUser | null> {
  const ds = getDataSource();
  const row = await ds
    .getRepository(Session)
    .createQueryBuilder("s")
    .innerJoinAndSelect("s.user", "u")
    .where("s.token = :token", { token })
    .getOne();

  if (!row) return null;

  if (new Date(row.expires_at) <= new Date()) {
    await ds.getRepository(Session).delete({ token });
    return null;
  }

  const user = row.user;
  if (!user.enabled) return null;

  return {
    id: user.id,
    username:
      user.username ?? user.plex_username ?? user.plex_email ?? "unknown",
    userType: user.user_type,
    permissions: user.permissions,
    enabled: true,
    theme: user.theme,
    thumb: user.plex_thumb ?? null,
    hasPlexToken: !!user.plex_token,
    plexToken: user.plex_token ?? null,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await getDataSource().getRepository(Session).delete({ token });
}

export async function deleteUserSessions(userId: number): Promise<void> {
  await getDataSource().getRepository(Session).delete({ user_id: userId });
}

export async function cleanExpiredSessions(): Promise<void> {
  await getDataSource()
    .getRepository(Session)
    .createQueryBuilder()
    .delete()
    .where("expires_at <= datetime('now')")
    .execute();
}
