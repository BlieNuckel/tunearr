import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDb, closeDatabase } from "../db";
import {
  needsSetup,
  createAdminUser,
  createPlexAdminUser,
  authenticateUser,
  findUserById,
  findOrCreatePlexUser,
  updateUserPreferences,
  listAllUsers,
  updateUserRole,
  updateUserEnabled,
  deleteUser,
} from "./users";
import { createSession, validateSession } from "./sessions";

beforeEach(() => {
  initializeDatabase(":memory:");
});

afterEach(() => {
  closeDatabase();
});

describe("needsSetup", () => {
  it("returns true when no admin users exist", () => {
    expect(needsSetup()).toBe(true);
  });

  it("returns false when an admin user exists", async () => {
    await createAdminUser("admin", "password123");
    expect(needsSetup()).toBe(false);
  });

  it("returns true when only regular users exist", () => {
    getDb()
      .prepare(
        "INSERT INTO users (username, password_hash, role, enabled) VALUES ('user', 'hash', 'user', 1)"
      )
      .run();
    expect(needsSetup()).toBe(true);
  });
});

describe("createAdminUser", () => {
  it("creates an admin user and returns the AuthUser", async () => {
    const user = await createAdminUser("myadmin", "password123");
    expect(user.username).toBe("myadmin");
    expect(user.role).toBe("admin");
    expect(user.enabled).toBe(true);
    expect(user.theme).toBe("system");
    expect(user.thumb).toBeNull();
    expect(user.id).toBeGreaterThan(0);
  });

  it("stores a hashed password (not plaintext)", async () => {
    await createAdminUser("admin", "password123");
    const row = getDb()
      .prepare("SELECT password_hash FROM users WHERE username = 'admin'")
      .get() as { password_hash: string };
    expect(row.password_hash).not.toBe("password123");
    expect(row.password_hash).toContain(":");
  });
});

describe("createPlexAdminUser", () => {
  it("creates an admin user with Plex identity", () => {
    const user = createPlexAdminUser(
      "plex-123",
      "plexadmin",
      "admin@plex.tv",
      "https://thumb.jpg"
    );
    expect(user.username).toBe("plexadmin");
    expect(user.role).toBe("admin");
    expect(user.enabled).toBe(true);
    expect(user.theme).toBe("system");
    expect(user.thumb).toBe("https://thumb.jpg");
    expect(user.id).toBeGreaterThan(0);
  });

  it("completes setup (needsSetup returns false)", () => {
    createPlexAdminUser("plex-123", "plexadmin", "admin@plex.tv", "https://thumb.jpg");
    expect(needsSetup()).toBe(false);
  });
});

describe("authenticateUser", () => {
  it("returns the user on correct credentials", async () => {
    await createAdminUser("admin", "password123");
    const user = await authenticateUser("admin", "password123");
    expect(user).not.toBeNull();
    expect(user!.username).toBe("admin");
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
    getDb()
      .prepare("UPDATE users SET enabled = 0 WHERE username = 'admin'")
      .run();
    const user = await authenticateUser("admin", "password123");
    expect(user).toBeNull();
  });
});

describe("findUserById", () => {
  it("returns the user by id", async () => {
    const created = await createAdminUser("admin", "password123");
    const found = findUserById(created.id);
    expect(found).not.toBeNull();
    expect(found!.username).toBe("admin");
    expect(found!.thumb).toBeNull();
  });

  it("returns null for non-existent id", () => {
    expect(findUserById(999)).toBeNull();
  });

  it("returns plex_username when username is null", () => {
    getDb()
      .prepare(
        `INSERT INTO users (plex_id, plex_username, plex_email, plex_thumb, role, enabled)
         VALUES ('plex-1', 'plexuser', 'plex@test.com', 'https://thumb.jpg', 'user', 1)`
      )
      .run();

    const found = findUserById(1);
    expect(found).not.toBeNull();
    expect(found!.username).toBe("plexuser");
    expect(found!.thumb).toBe("https://thumb.jpg");
  });
});

describe("findOrCreatePlexUser", () => {
  it("creates a new user when plex_id does not exist", () => {
    const user = findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg"
    );

    expect(user.id).toBeGreaterThan(0);
    expect(user.username).toBe("plexuser");
    expect(user.role).toBe("user");
    expect(user.enabled).toBe(true);
    expect(user.theme).toBe("system");
    expect(user.thumb).toBe("https://thumb.jpg");

    const row = getDb()
      .prepare("SELECT plex_id, plex_email FROM users WHERE id = ?")
      .get(user.id) as { plex_id: string; plex_email: string };
    expect(row.plex_id).toBe("plex-123");
    expect(row.plex_email).toBe("plex@test.com");
  });

  it("returns existing user when plex_id already exists", () => {
    const first = findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg"
    );
    const second = findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg"
    );

    expect(second.id).toBe(first.id);
  });

  it("updates plex fields on re-login", () => {
    findOrCreatePlexUser(
      "plex-123",
      "oldname",
      "old@test.com",
      "https://old-thumb.jpg"
    );
    const updated = findOrCreatePlexUser(
      "plex-123",
      "newname",
      "new@test.com",
      "https://new-thumb.jpg"
    );

    expect(updated.username).toBe("newname");
    expect(updated.thumb).toBe("https://new-thumb.jpg");
  });

  it("preserves role and enabled status on re-login", () => {
    const user = findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg"
    );
    getDb()
      .prepare("UPDATE users SET enabled = 0 WHERE id = ?")
      .run(user.id);

    const updated = findOrCreatePlexUser(
      "plex-123",
      "plexuser",
      "plex@test.com",
      "https://thumb.jpg"
    );
    expect(updated.enabled).toBe(false);
  });
});

describe("updateUserPreferences", () => {
  it("updates the user theme", async () => {
    const user = await createAdminUser("admin", "password123");
    updateUserPreferences(user.id, { theme: "dark" });
    const found = findUserById(user.id);
    expect(found!.theme).toBe("dark");
  });

  it("does nothing when no prefs provided", async () => {
    const user = await createAdminUser("admin", "password123");
    updateUserPreferences(user.id, {});
    const found = findUserById(user.id);
    expect(found!.theme).toBe("system");
  });
});

describe("listAllUsers", () => {
  it("returns empty array when no users exist", () => {
    expect(listAllUsers()).toEqual([]);
  });

  it("returns all users ordered by id", async () => {
    await createAdminUser("admin1", "password123");
    await createAdminUser("admin2", "password456");

    const users = listAllUsers();
    expect(users).toHaveLength(2);
    expect(users[0].username).toBe("admin1");
    expect(users[1].username).toBe("admin2");
  });
});

describe("updateUserRole", () => {
  it("updates a user role from admin to user", async () => {
    await createAdminUser("admin1", "password123");
    const admin2 = await createAdminUser("admin2", "password456");

    updateUserRole(admin2.id, "user");

    const updated = findUserById(admin2.id);
    expect(updated!.role).toBe("user");
  });

  it("updates a user role from user to admin", async () => {
    await createAdminUser("admin1", "password123");
    const admin2 = await createAdminUser("admin2", "password456");

    updateUserRole(admin2.id, "user");
    updateUserRole(admin2.id, "admin");

    const updated = findUserById(admin2.id);
    expect(updated!.role).toBe("admin");
  });

  it("prevents demoting the last admin", async () => {
    const admin = await createAdminUser("admin", "password123");

    expect(() => updateUserRole(admin.id, "user")).toThrow(
      "Cannot demote the last admin"
    );
  });

  it("invalidates sessions when demoting to user", async () => {
    await createAdminUser("admin1", "password123");
    const admin2 = await createAdminUser("admin2", "password456");
    const token = createSession(admin2.id);

    expect(validateSession(token)).not.toBeNull();
    updateUserRole(admin2.id, "user");
    expect(validateSession(token)).toBeNull();
  });

  it("throws 404 for non-existent user", () => {
    expect(() => updateUserRole(999, "admin")).toThrow("User not found");
  });
});

describe("updateUserEnabled", () => {
  it("disables a user", async () => {
    await createAdminUser("admin1", "password123");
    const admin2 = await createAdminUser("admin2", "password456");

    updateUserEnabled(admin2.id, false);

    const updated = findUserById(admin2.id);
    expect(updated!.enabled).toBe(false);
  });

  it("re-enables a user", async () => {
    await createAdminUser("admin1", "password123");
    const admin2 = await createAdminUser("admin2", "password456");

    updateUserEnabled(admin2.id, false);
    updateUserEnabled(admin2.id, true);

    const updated = findUserById(admin2.id);
    expect(updated!.enabled).toBe(true);
  });

  it("prevents disabling the last admin", async () => {
    const admin = await createAdminUser("admin", "password123");

    expect(() => updateUserEnabled(admin.id, false)).toThrow(
      "Cannot disable the last admin"
    );
  });

  it("invalidates sessions when disabling", async () => {
    await createAdminUser("admin1", "password123");
    const admin2 = await createAdminUser("admin2", "password456");
    const token = createSession(admin2.id);

    expect(validateSession(token)).not.toBeNull();
    updateUserEnabled(admin2.id, false);
    expect(validateSession(token)).toBeNull();
  });

  it("throws 404 for non-existent user", () => {
    expect(() => updateUserEnabled(999, false)).toThrow("User not found");
  });
});

describe("deleteUser", () => {
  it("deletes a user", async () => {
    await createAdminUser("admin1", "password123");
    const admin2 = await createAdminUser("admin2", "password456");

    deleteUser(admin2.id);

    expect(findUserById(admin2.id)).toBeNull();
    expect(listAllUsers()).toHaveLength(1);
  });

  it("prevents deleting the last admin", async () => {
    const admin = await createAdminUser("admin", "password123");

    expect(() => deleteUser(admin.id)).toThrow(
      "Cannot delete the last admin"
    );
  });

  it("throws 404 for non-existent user", () => {
    expect(() => deleteUser(999)).toThrow("User not found");
  });

  it("deletes sessions when deleting user", async () => {
    await createAdminUser("admin1", "password123");
    const admin2 = await createAdminUser("admin2", "password456");
    const token = createSession(admin2.id);

    expect(validateSession(token)).not.toBeNull();
    deleteUser(admin2.id);
    expect(validateSession(token)).toBeNull();
  });
});
