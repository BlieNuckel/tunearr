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
} from "./users";

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
    expect(user.userType).toBe("local");
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
    expect(user.userType).toBe("plex");
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
    expect(user.userType).toBe("plex");
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
