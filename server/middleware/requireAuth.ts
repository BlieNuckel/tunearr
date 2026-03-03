import type { Request, Response, NextFunction } from "express";
import { validateSession } from "../auth/sessions";

export const SESSION_COOKIE_NAME = "tunearr_session";

export function parseCookieValue(
  cookieHeader: string | undefined,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = parseCookieValue(req.headers.cookie, SESSION_COOKIE_NAME);

  if (!token) {
    const err = new Error("Authentication required") as Error & {
      status: number;
    };
    err.status = 401;
    return next(err);
  }

  const user = validateSession(token);
  if (!user) {
    const err = new Error("Invalid or expired session") as Error & {
      status: number;
    };
    err.status = 401;
    return next(err);
  }

  req.user = user;
  next();
}
