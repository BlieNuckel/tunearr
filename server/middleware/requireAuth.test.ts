import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "../auth/types";

const mockValidateSession = vi.fn();

vi.mock("../auth/sessions", () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

import express from "express";
import request from "supertest";
import { requireAuth, parseCookieValue } from "./requireAuth";

const app = express();
app.use(requireAuth);
app.get("/test", (req, res) => {
  res.json({ user: req.user });
});
app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(err.status || 500).json({ error: err.message });
  }
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseCookieValue", () => {
  it("returns undefined for no cookie header", () => {
    expect(parseCookieValue(undefined, "tunearr_session")).toBeUndefined();
  });

  it("parses a single cookie", () => {
    expect(parseCookieValue("tunearr_session=abc123", "tunearr_session")).toBe(
      "abc123"
    );
  });

  it("parses the correct cookie from multiple", () => {
    expect(
      parseCookieValue(
        "other=x; tunearr_session=abc123; another=y",
        "tunearr_session"
      )
    ).toBe("abc123");
  });

  it("returns undefined for missing cookie name", () => {
    expect(parseCookieValue("other=x", "tunearr_session")).toBeUndefined();
  });
});

describe("requireAuth middleware", () => {
  it("returns 401 without a cookie", async () => {
    const res = await request(app).get("/test");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("returns 401 for invalid session", async () => {
    mockValidateSession.mockReturnValue(null);
    const res = await request(app)
      .get("/test")
      .set("Cookie", "tunearr_session=badtoken");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired session");
  });

  it("sets req.user and passes through for valid session", async () => {
    const mockUser: AuthUser = {
      id: 1,
      username: "admin",
      role: "admin",
      enabled: true,
      theme: "system",
      thumb: null,
    };
    mockValidateSession.mockReturnValue(mockUser);

    const res = await request(app)
      .get("/test")
      .set("Cookie", "tunearr_session=validtoken");
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(mockUser);
  });
});
