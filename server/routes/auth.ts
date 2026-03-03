import type { Request, Response, NextFunction } from "express";
import express from "express";
import {
  needsSetup,
  createAdminUser,
  createPlexAdminUser,
  authenticateUser,
  findOrCreatePlexUser,
  updateUserPreferences,
} from "../auth/users";
import { createSession, deleteSession } from "../auth/sessions";
import type { AuthUser } from "../auth/types";
import {
  requireAuth,
  SESSION_COOKIE_NAME,
  parseCookieValue,
} from "../middleware/requireAuth";
import { validateSession } from "../auth/sessions";
import { getPlexAccountFull } from "../api/plex/account";
import { getConfigValue } from "../config";

const TUNEARR_SERVER_CLIENT_ID = "tunearr-server";

const router = express.Router();

const VALID_THEMES = ["light", "dark", "system"] as const;

function setSessionCookie(res: Response, token: string) {
  const maxAge = 30 * 24 * 60 * 60 * 1000;
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge,
    path: "/",
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

function userResponse(user: AuthUser) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    theme: user.theme,
    thumb: user.thumb,
  };
}

router.get("/setup-status", (_req: Request, res: Response) => {
  res.json({ needsSetup: needsSetup() });
});

router.post(
  "/setup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!needsSetup()) {
        const err = new Error("Setup already completed") as Error & {
          status: number;
        };
        err.status = 400;
        throw err;
      }

      const { username, password } = req.body;

      if (!username || typeof username !== "string" || username.length < 3) {
        const err = new Error(
          "Username must be at least 3 characters"
        ) as Error & { status: number };
        err.status = 400;
        throw err;
      }

      if (!password || typeof password !== "string" || password.length < 8) {
        const err = new Error(
          "Password must be at least 8 characters"
        ) as Error & { status: number };
        err.status = 400;
        throw err;
      }

      const user = await createAdminUser(username, password);
      const token = createSession(user.id);
      setSessionCookie(res, token);

      res.status(201).json({ user: userResponse(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/plex-setup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!needsSetup()) {
        const err = new Error("Setup already completed") as Error & {
          status: number;
        };
        err.status = 400;
        throw err;
      }

      const { authToken } = req.body;

      if (!authToken || typeof authToken !== "string") {
        const err = new Error("authToken is required") as Error & {
          status: number;
        };
        err.status = 400;
        throw err;
      }

      const plexAccount = await getPlexAccountFull(
        authToken,
        TUNEARR_SERVER_CLIENT_ID
      );

      const user = createPlexAdminUser(
        String(plexAccount.id),
        plexAccount.username,
        plexAccount.email,
        plexAccount.thumb
      );

      const token = createSession(user.id);
      setSessionCookie(res, token);

      res.status(201).json({ user: userResponse(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        const err = new Error("Username and password are required") as Error & {
          status: number;
        };
        err.status = 400;
        throw err;
      }

      const user = await authenticateUser(username, password);
      if (!user) {
        const err = new Error("Invalid username or password") as Error & {
          status: number;
        };
        err.status = 401;
        throw err;
      }

      const token = createSession(user.id);
      setSessionCookie(res, token);

      res.json({ user: userResponse(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/plex-login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { authToken } = req.body;

      if (!authToken || typeof authToken !== "string") {
        const err = new Error("authToken is required") as Error & {
          status: number;
        };
        err.status = 400;
        throw err;
      }

      const plexAccount = await getPlexAccountFull(
        authToken,
        TUNEARR_SERVER_CLIENT_ID
      );

      const user = findOrCreatePlexUser(
        String(plexAccount.id),
        plexAccount.username,
        plexAccount.email,
        plexAccount.thumb
      );

      if (!user.enabled) {
        const err = new Error("Account is disabled") as Error & {
          status: number;
        };
        err.status = 403;
        throw err;
      }

      const token = createSession(user.id);
      setSessionCookie(res, token);

      res.json({ user: userResponse(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/logout", (req: Request, res: Response) => {
  const token = parseCookieValue(req.headers.cookie, SESSION_COOKIE_NAME);
  if (token) {
    deleteSession(token);
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

router.get("/me", (req: Request, res: Response) => {
  const token = parseCookieValue(req.headers.cookie, SESSION_COOKIE_NAME);
  if (!token) {
    return res.json({ user: null });
  }

  const user = validateSession(token);
  if (!user) {
    clearSessionCookie(res);
    return res.json({ user: null });
  }

  res.json({ user: userResponse(user) });
});

router.get("/app-status", requireAuth, (_req: Request, res: Response) => {
  res.json({ lidarrConfigured: !!getConfigValue("lidarrUrl") });
});

router.patch(
  "/preferences",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { theme } = req.body;

      if (theme !== undefined) {
        if (!VALID_THEMES.includes(theme)) {
          const err = new Error(
            "Theme must be 'light', 'dark', or 'system'"
          ) as Error & { status: number };
          err.status = 400;
          throw err;
        }
      }

      updateUserPreferences(req.user!.id, { theme });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
