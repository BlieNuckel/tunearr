import type { Request, Response, NextFunction } from "express";

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    const err = new Error("Authentication required") as Error & {
      status: number;
    };
    err.status = 401;
    return next(err);
  }

  if (req.user.role !== "admin") {
    const err = new Error("Admin access required") as Error & {
      status: number;
    };
    err.status = 403;
    return next(err);
  }

  next();
}
