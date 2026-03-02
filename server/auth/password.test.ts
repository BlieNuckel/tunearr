import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("returns a salt:key formatted string", async () => {
    const hash = await hashPassword("testpassword");
    const parts = hash.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBe(64);
    expect(parts[1].length).toBe(128);
  });

  it("produces different hashes for the same password", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await verifyPassword("correctpassword", hash);
    expect(result).toBe(true);
  });

  it("returns false for incorrect password", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await verifyPassword("wrongpassword", hash);
    expect(result).toBe(false);
  });

  it("returns false for malformed stored hash", async () => {
    const result = await verifyPassword("anything", "nocolon");
    expect(result).toBe(false);
  });

  it("returns false for empty stored hash", async () => {
    const result = await verifyPassword("anything", "");
    expect(result).toBe(false);
  });
});
