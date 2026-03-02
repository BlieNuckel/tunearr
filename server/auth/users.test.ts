import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDb, closeDatabase } from "../db";
import {
  needsSetup,
  createAdminUser,
  authenticateUser,
  findUserById,
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
    expect(user.role).toBe("admin");
    expect(user.enabled).toBe(true);
    expect(user.theme).toBe("system");
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

describe("authenticateUser", () => {
  it("returns the user on correct credentials", async () => {
    await createAdminUser("admin", "password123");
    const user = await authenticateUser("admin", "password123");
    expect(user).not.toBeNull();
    expect(user!.username).toBe("admin");
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
  });

  it("returns null for non-existent id", () => {
    expect(findUserById(999)).toBeNull();
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
