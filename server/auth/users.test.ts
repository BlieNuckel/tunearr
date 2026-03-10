import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "../db";
import {
  needsSetup,
  createAdminUser,
  createPlexAdminUser,
  authenticateUser,
  findUserById,
  findOrCreatePlexUser,
  linkPlexAccount,
  updateUserPreferences,
  getAllUsers,
  createLocalUser,
  updateUserPermissions,
  toggleUserEnabled,
  deleteUser,
} from "./users";
import { Permission } from "../../shared/permissions";

beforeEach(async () => {
  await initializeDatabase(":memory:");
});

afterEach(async () => {
  await closeDatabase();
});

describe("needsSetup", () => {
  it("returns true when no admin users exist", async () => {
    expect(await needsSetup()).toBe(true);
  });

  it("returns false when an admin user exists", async () => {
    await createAdminUser("admin", "password123");
    expect(await needsSetup()).toBe(false);
  });

  it("returns true when only regular users exist", async () => {
    await getDataSource().query(
      "INSERT INTO users (username, password_hash, permissions, enabled) VALUES ('user', 'hash', 8, 1)"
    );
    expect(await needsSetup()).toBe(true);
  });
});

describe("createAdminUser", () => {
  it("creates an admin user and returns the AuthUser", async () => {
    const user = await createAdminUser("myadmin", "password123");
    expect(user.username).toBe("myadmin");
    expect(user.userType).toBe("local");
    expect(user.permissions).toBe(1);
    expect(user.enabled).toBe(true);
    expect(user.theme).toBe("system");
    expect(user.thumb).toBeNull();
    expect(user.id).toBeGreaterThan(0);
  });

  it("stores a hashed password (not plaintext)", async () => {
    await createAdminUser("admin", "password123");
    const rows = await getDataSource().query(
      "SELECT password_hash FROM users WHERE username = 'admin'"
    );
    expect(rows[0].password_hash).not.toBe("password123");
    expect(rows[0].password_hash).toContain(":");
  });
});

describe("createPlexAdminUser", () => {
  it("creates an admin user with Plex identity", async () => {
    const user = await createPlexAdminUser(
      "plex-123",
      "plexadmin",
      "admin@plex.tv",
      "https://thumb.jpg",
      "plex-token-123"
    );
    expect(user.username).toBe("plexadmin");
    expect(user.userType).toBe("plex");
    expect(user.permissions).toBe(1);
    expect(user.enabled).toBe(true);
    expect(user.theme).toBe("system");
    expect(user.thumb).toBe("https://thumb.jpg");
    expect(user.id).toBeGreaterThan(0);
  });

  it("completes setup (needsSetup returns false)", async () => {
    await createPlexAdminUser(
      "plex-123",
      "plexadmin",
      "admin@plex.tv",
      "https://thumb.jpg",
      "plex-token-123"
    );
    expect(await needsSetup()).toBe(false);
  });
});

describe("authenticateUser", () => {
  it("returns the user on correct credentials", async () => {
    await createAdminUser("admin", "password123");
    const user = await authenticateUser("admin", "password123");
    expect(user).not.toBeNull();
    expect(user!.username).toBe("admin");
    expect(user!.userType).toBe("local");
    expect(user!.thumb).toBeNull();
  });

  it("returns null on wrong password", async () => {
    await createAdminUser("admin", "password123");
    const user = await authenticateUser("admin", "wrongpassword");
    expect(user).toBeNull();
  });

  it("returns null for non-existent user", async () => {
    const user = await authenticateUser("nobody", "password123");
    expect(user).toBeNull();
  });

  it("returns null for disabled user", async () => {
    await createAdminUser("admin", "password123");
    await getDataSource().query(
      "UPDATE users SET enabled = 0 WHERE username = 'admin'"
    );
    const user = await authenticateUser("admin", "password123");
    expect(user).toBeNull();
  });
});

describe("findUserById", () => {
  it("returns the user by id", async () => {
    const created = await createAdminUser("admin", "password123");
    const found = await findUserById(created.id);
    expect(found).not.toBeNull();
    expect(found!.username).toBe("admin");
    expect(found!.thumb).toBeNull();
  });

  it("returns null for non-existent id", async () => {
    expect(await findUserById(999)).toBeNull();
  });

  it("returns plex_username when username is null", async () => {
    await getDataSource().query(
      `INSERT INTO users (plex_id, plex_username, plex_email, plex_thumb, permissions, enabled)
       VALUES ('plex-1', 'plexuser', 'plex@test.com', 'https://thumb.jpg', 8, 1)`
    );

    const users = await getDataSource().query(
      "SELECT id FROM users WHERE plex_id = 'plex-1'"
    );
    const found = await findUserById(users[0].id);
    expect(found).not.toBeNull();
    expect(found!.username).toBe("plexuser");
    expect(found!.thumb).toBe("https://thumb.jpg");
  });
});

describe("findOrCreatePlexUser", () => {
  it("creates a new user when plex_id does not exist", async () => {
    const user = await findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg",
      "plex-token-123"
    );

    expect(user.id).toBeGreaterThan(0);
    expect(user.username).toBe("plexuser");
    expect(user.userType).toBe("plex");
    expect(user.permissions).toBe(8);
    expect(user.enabled).toBe(true);
    expect(user.theme).toBe("system");
    expect(user.thumb).toBe("https://thumb.jpg");

    const rows = await getDataSource().query(
      "SELECT plex_id, plex_email FROM users WHERE id = ?",
      [user.id]
    );
    expect(rows[0].plex_id).toBe("plex-123");
    expect(rows[0].plex_email).toBe("plex@test.com");
  });

  it("returns existing user when plex_id already exists", async () => {
    const first = await findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg",
      "plex-token-123"
    );
    const second = await findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg",
      "plex-token-123"
    );

    expect(second.id).toBe(first.id);
  });

  it("updates plex fields on re-login", async () => {
    await findOrCreatePlexUser(
      "plex-123",
      "oldname",
      "old@test.com",
      "https://old-thumb.jpg",
      "plex-token-123"
    );
    const updated = await findOrCreatePlexUser(
      "plex-123",
      "newname",
      "new@test.com",
      "https://new-thumb.jpg",
      "plex-token-456"
    );

    expect(updated.username).toBe("newname");
    expect(updated.thumb).toBe("https://new-thumb.jpg");
  });

  it("preserves permissions and enabled status on re-login", async () => {
    const user = await findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg",
      "plex-token-123"
    );
    await getDataSource().query("UPDATE users SET enabled = 0 WHERE id = ?", [
      user.id,
    ]);

    const updated = await findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg",
      "plex-token-123"
    );
    expect(updated.enabled).toBe(false);
  });
});

describe("linkPlexAccount", () => {
  it("links a Plex account to a local user", async () => {
    const localUser = await createAdminUser("admin", "password123");

    const linked = await linkPlexAccount(
      localUser.id,
      "plex-456",
      "plexname",
      "plex@test.com",
      "https://thumb.jpg",
      "plex-token-456"
    );

    expect(linked.id).toBe(localUser.id);
    expect(linked.userType).toBe("plex");
    expect(linked.username).toBe("admin");
    expect(linked.thumb).toBe("https://thumb.jpg");

    const rows = await getDataSource().query(
      "SELECT plex_id, plex_username, plex_email, user_type, password_hash FROM users WHERE id = ?",
      [localUser.id]
    );
    expect(rows[0].plex_id).toBe("plex-456");
    expect(rows[0].plex_username).toBe("plexname");
    expect(rows[0].plex_email).toBe("plex@test.com");
    expect(rows[0].user_type).toBe("plex");
    expect(rows[0].password_hash).toBeTruthy();
  });

  it("throws when user is already a plex user", async () => {
    const plexUser = await createPlexAdminUser(
      "plex-123",
      "plexadmin",
      "admin@plex.tv",
      "https://thumb.jpg",
      "plex-token-123"
    );

    await expect(
      linkPlexAccount(
        plexUser.id,
        "plex-789",
        "other",
        "o@t.com",
        "https://t.jpg",
        "plex-token-789"
      )
    ).rejects.toThrow("Only local users can link a Plex account");
  });

  it("throws when plex_id is already linked to another user", async () => {
    const localUser = await createAdminUser("admin", "password123");
    await findOrCreatePlexUser(
      "plex-456",
      "existing",
      "e@t.com",
      "https://t.jpg",
      "plex-token-456"
    );

    await expect(
      linkPlexAccount(
        localUser.id,
        "plex-456",
        "plexname",
        "p@t.com",
        "https://t.jpg",
        "plex-token-456"
      )
    ).rejects.toThrow("This Plex account is already linked to another user");
  });

  it("throws when user does not exist", async () => {
    await expect(
      linkPlexAccount(
        999,
        "plex-456",
        "plexname",
        "p@t.com",
        "https://t.jpg",
        "plex-token-456"
      )
    ).rejects.toThrow("User not found");
  });
});

describe("updateUserPreferences", () => {
  it("updates the user theme", async () => {
    const user = await createAdminUser("admin", "password123");
    await updateUserPreferences(user.id, { theme: "dark" });
    const found = await findUserById(user.id);
    expect(found!.theme).toBe("dark");
  });

  it("does nothing when no prefs provided", async () => {
    const user = await createAdminUser("admin", "password123");
    await updateUserPreferences(user.id, {});
    const found = await findUserById(user.id);
    expect(found!.theme).toBe("system");
  });
});

describe("getAllUsers", () => {
  it("returns empty array when no users exist", async () => {
    const users = await getAllUsers();
    expect(users).toEqual([]);
  });

  it("returns all users ordered by id", async () => {
    await createAdminUser("admin", "password123");
    await findOrCreatePlexUser(
      "plex-1",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg",
      "plex-token-1"
    );

    const users = await getAllUsers();
    expect(users).toHaveLength(2);
    expect(users[0].username).toBe("admin");
    expect(users[1].username).toBe("plexuser");
    expect(users[0].id).toBeLessThan(users[1].id);
  });
});

describe("createLocalUser", () => {
  it("creates a user with given permissions", async () => {
    const user = await createLocalUser(
      "testuser",
      "password123",
      Permission.REQUEST | Permission.REQUEST_VIEW
    );

    expect(user.username).toBe("testuser");
    expect(user.userType).toBe("local");
    expect(user.permissions).toBe(Permission.REQUEST | Permission.REQUEST_VIEW);
    expect(user.enabled).toBe(true);
    expect(user.theme).toBe("system");
    expect(user.thumb).toBeNull();
    expect(user.id).toBeGreaterThan(0);
  });

  it("stores a hashed password (not plaintext)", async () => {
    await createLocalUser("testuser", "password123", Permission.REQUEST);
    const rows = await getDataSource().query(
      "SELECT password_hash FROM users WHERE username = 'testuser'"
    );
    expect(rows[0].password_hash).not.toBe("password123");
    expect(rows[0].password_hash).toContain(":");
  });

  it("throws 409 for duplicate username", async () => {
    await createLocalUser("testuser", "password123", Permission.REQUEST);
    await expect(
      createLocalUser("testuser", "otherpass", Permission.REQUEST)
    ).rejects.toThrow("Username already exists");

    try {
      await createLocalUser("testuser", "otherpass", Permission.REQUEST);
    } catch (err: unknown) {
      expect((err as { status: number }).status).toBe(409);
    }
  });
});

describe("updateUserPermissions", () => {
  it("updates the permissions of a user", async () => {
    const user = await createAdminUser("admin", "password123");
    const updated = await updateUserPermissions(
      user.id,
      Permission.REQUEST | Permission.MANAGE_REQUESTS
    );

    expect(updated.permissions).toBe(
      Permission.REQUEST | Permission.MANAGE_REQUESTS
    );

    const rows = await getDataSource().query(
      "SELECT permissions FROM users WHERE id = ?",
      [user.id]
    );
    expect(rows[0].permissions).toBe(
      Permission.REQUEST | Permission.MANAGE_REQUESTS
    );
  });

  it("throws 404 for non-existent user", async () => {
    await expect(
      updateUserPermissions(999, Permission.REQUEST)
    ).rejects.toThrow("User not found");

    try {
      await updateUserPermissions(999, Permission.REQUEST);
    } catch (err: unknown) {
      expect((err as { status: number }).status).toBe(404);
    }
  });
});

describe("toggleUserEnabled", () => {
  it("toggles enabled from true to false", async () => {
    const user = await createAdminUser("admin", "password123");
    expect(user.enabled).toBe(true);

    const toggled = await toggleUserEnabled(user.id);
    expect(toggled.enabled).toBe(false);

    const rows = await getDataSource().query(
      "SELECT enabled FROM users WHERE id = ?",
      [user.id]
    );
    expect(rows[0].enabled).toBe(0);
  });

  it("toggles enabled from false back to true", async () => {
    const user = await createAdminUser("admin", "password123");
    await toggleUserEnabled(user.id);
    const toggled = await toggleUserEnabled(user.id);
    expect(toggled.enabled).toBe(true);
  });

  it("throws 404 for non-existent user", async () => {
    await expect(toggleUserEnabled(999)).rejects.toThrow("User not found");

    try {
      await toggleUserEnabled(999);
    } catch (err: unknown) {
      expect((err as { status: number }).status).toBe(404);
    }
  });
});

describe("deleteUser", () => {
  it("deletes an existing user", async () => {
    const user = await createAdminUser("admin", "password123");
    await deleteUser(user.id);

    const rows = await getDataSource().query(
      "SELECT COUNT(*) as count FROM users WHERE id = ?",
      [user.id]
    );
    expect(rows[0].count).toBe(0);
  });

  it("throws 404 for non-existent user", async () => {
    await expect(deleteUser(999)).rejects.toThrow("User not found");

    try {
      await deleteUser(999);
    } catch (err: unknown) {
      expect((err as { status: number }).status).toBe(404);
    }
  });
});
