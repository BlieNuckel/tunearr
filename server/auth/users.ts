import { getDataSource } from "../db";
import { User } from "../db/entity/User";
import type { AuthUser } from "./types";
import { hashPassword, verifyPassword } from "./password";
import { Permission } from "../../shared/permissions";

function toAuthUser(row: User): AuthUser {
  return {
    id: row.id,
    username: row.username ?? row.plex_username ?? row.plex_email ?? "unknown",
    userType: row.user_type,
    permissions: row.permissions,
    enabled: !!row.enabled,
    theme: row.theme,
    thumb: row.plex_thumb ?? null,
    hasPlexToken: !!row.plex_token,
    plexToken: row.plex_token ?? null,
  };
}

export async function needsSetup(): Promise<boolean> {
  const rows = await getDataSource().query(
    `SELECT COUNT(*) as count FROM users WHERE (permissions & ?) != 0`,
    [Permission.ADMIN]
  );
  return rows[0].count === 0;
}

export async function createAdminUser(
  username: string,
  password: string
): Promise<AuthUser> {
  const passwordHash = await hashPassword(password);
  const repo = getDataSource().getRepository(User);

  const user = repo.create({
    username,
    password_hash: passwordHash,
    user_type: "local",
    permissions: Permission.ADMIN,
    enabled: 1,
  });
  const saved = await repo.save(user);

  return {
    id: saved.id,
    username,
    userType: "local",
    permissions: Permission.ADMIN,
    enabled: true,
    theme: "system",
    thumb: null,
    hasPlexToken: false,
    plexToken: null,
  };
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthUser | null> {
  const repo = getDataSource().getRepository(User);
  const row = await repo.findOneBy({ username });

  if (!row || !row.password_hash) return null;
  if (!row.enabled) return null;

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;

  return toAuthUser(row);
}

export async function findUserById(id: number): Promise<AuthUser | null> {
  const repo = getDataSource().getRepository(User);
  const row = await repo.findOneBy({ id });
  if (!row) return null;
  return toAuthUser(row);
}

export async function createPlexAdminUser(
  plexId: string,
  plexUsername: string,
  plexEmail: string,
  plexThumb: string,
  plexToken: string
): Promise<AuthUser> {
  const repo = getDataSource().getRepository(User);

  const user = repo.create({
    plex_id: String(plexId),
    plex_username: plexUsername,
    plex_email: plexEmail,
    plex_thumb: plexThumb,
    plex_token: plexToken,
    user_type: "plex",
    permissions: Permission.ADMIN,
    enabled: 1,
  });
  const saved = await repo.save(user);

  return {
    id: saved.id,
    username: plexUsername,
    userType: "plex",
    permissions: Permission.ADMIN,
    enabled: true,
    theme: "system",
    thumb: plexThumb,
    hasPlexToken: true,
    plexToken,
  };
}

export async function findOrCreatePlexUser(
  plexId: string,
  plexUsername: string,
  plexEmail: string,
  plexThumb: string,
  plexToken: string
): Promise<AuthUser> {
  const repo = getDataSource().getRepository(User);
  const existing = await repo.findOneBy({ plex_id: String(plexId) });

  if (existing) {
    await repo
      .createQueryBuilder()
      .update()
      .set({
        plex_username: plexUsername,
        plex_email: plexEmail,
        plex_thumb: plexThumb,
        plex_token: plexToken,
      })
      .where("plex_id = :plexId", { plexId: String(plexId) })
      .callListeners(false)
      .execute();

    return toAuthUser({
      ...existing,
      plex_username: plexUsername,
      plex_email: plexEmail,
      plex_thumb: plexThumb,
      plex_token: plexToken,
    });
  }

  const user = repo.create({
    plex_id: String(plexId),
    plex_username: plexUsername,
    plex_email: plexEmail,
    plex_thumb: plexThumb,
    plex_token: plexToken,
    user_type: "plex",
    permissions: Permission.REQUEST,
    enabled: 1,
  });
  const saved = await repo.save(user);

  return {
    id: saved.id,
    username: plexUsername,
    userType: "plex",
    permissions: Permission.REQUEST,
    enabled: true,
    theme: "system",
    thumb: plexThumb,
    hasPlexToken: true,
    plexToken,
  };
}

export async function linkPlexAccount(
  userId: number,
  plexId: string,
  plexUsername: string,
  plexEmail: string,
  plexThumb: string,
  plexToken: string
): Promise<AuthUser> {
  const repo = getDataSource().getRepository(User);
  const row = await repo.findOneBy({ id: userId });

  if (!row) throw Object.assign(new Error("User not found"), { status: 404 });

  if (row.user_type !== "local") {
    throw Object.assign(new Error("Only local users can link a Plex account"), {
      status: 400,
    });
  }

  const existing = await repo.findOneBy({ plex_id: String(plexId) });
  if (existing) {
    throw Object.assign(
      new Error("This Plex account is already linked to another user"),
      { status: 409 }
    );
  }

  await repo
    .createQueryBuilder()
    .update()
    .set({
      plex_id: String(plexId),
      plex_username: plexUsername,
      plex_email: plexEmail,
      plex_thumb: plexThumb,
      plex_token: plexToken,
      user_type: "plex" as const,
    })
    .where("id = :id", { id: userId })
    .callListeners(false)
    .execute();

  return toAuthUser({
    ...row,
    plex_id: String(plexId),
    plex_username: plexUsername,
    plex_email: plexEmail,
    plex_thumb: plexThumb,
    plex_token: plexToken,
    user_type: "plex",
  });
}

export async function updateUserPlexToken(
  userId: number,
  plexToken: string
): Promise<void> {
  const repo = getDataSource().getRepository(User);
  await repo
    .createQueryBuilder()
    .update()
    .set({ plex_token: plexToken })
    .where("id = :id", { id: userId })
    .callListeners(false)
    .execute();
}

export async function updateUserPreferences(
  userId: number,
  prefs: { theme?: AuthUser["theme"] }
): Promise<void> {
  if (prefs.theme) {
    const repo = getDataSource().getRepository(User);
    await repo
      .createQueryBuilder()
      .update()
      .set({ theme: prefs.theme })
      .where("id = :id", { id: userId })
      .callListeners(false)
      .execute();
  }
}

export async function getAllUsers(): Promise<AuthUser[]> {
  const repo = getDataSource().getRepository(User);
  const rows = await repo.find({ order: { id: "ASC" } });
  return rows.map(toAuthUser);
}

export async function createLocalUser(
  username: string,
  password: string,
  permissions: number
): Promise<AuthUser> {
  const passwordHash = await hashPassword(password);
  const repo = getDataSource().getRepository(User);

  const existing = await repo.findOneBy({ username });
  if (existing) {
    throw Object.assign(new Error("Username already exists"), { status: 409 });
  }

  const user = repo.create({
    username,
    password_hash: passwordHash,
    user_type: "local",
    permissions,
    enabled: 1,
  });
  const saved = await repo.save(user);
  return toAuthUser(saved);
}

export async function updateUserPermissions(
  userId: number,
  permissions: number
): Promise<AuthUser> {
  const repo = getDataSource().getRepository(User);
  const row = await repo.findOneBy({ id: userId });
  if (!row) throw Object.assign(new Error("User not found"), { status: 404 });

  await repo
    .createQueryBuilder()
    .update()
    .set({ permissions })
    .where("id = :id", { id: userId })
    .callListeners(false)
    .execute();

  return toAuthUser({ ...row, permissions });
}

export async function toggleUserEnabled(userId: number): Promise<AuthUser> {
  const repo = getDataSource().getRepository(User);
  const row = await repo.findOneBy({ id: userId });
  if (!row) throw Object.assign(new Error("User not found"), { status: 404 });

  const newEnabled = row.enabled ? 0 : 1;
  await repo
    .createQueryBuilder()
    .update()
    .set({ enabled: newEnabled })
    .where("id = :id", { id: userId })
    .callListeners(false)
    .execute();

  return toAuthUser({ ...row, enabled: newEnabled });
}

export async function deleteUser(userId: number): Promise<void> {
  const repo = getDataSource().getRepository(User);
  const row = await repo.findOneBy({ id: userId });
  if (!row) throw Object.assign(new Error("User not found"), { status: 404 });
  await repo.remove(row);
}
