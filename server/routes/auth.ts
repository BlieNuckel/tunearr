import type { Request, Response, NextFunction } from "express";
import express from "express";
import {
  needsSetup,
  createAdminUser,
  createPlexAdminUser,
  authenticateUser,
  findOrCreatePlexUser,
  linkPlexAccount,
  updateUserPreferences,
  updateUserPlexToken,
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
    userType: user.userType,
    permissions: user.permissions,
    theme: user.theme,
    thumb: user.thumb,
    hasPlexToken: user.hasPlexToken,
  };
}

router.get(
  "/setup-status",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ needsSetup: await needsSetup() });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/setup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await needsSetup())) {
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
      const token = await createSession(user.id);
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
      if (!(await needsSetup())) {
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

      const user = await createPlexAdminUser(
        String(plexAccount.id),
        plexAccount.username,
        plexAccount.email,
        plexAccount.thumb,
        authToken
      );

      const token = await createSession(user.id);
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

      const token = await createSession(user.id);
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

      const user = await findOrCreatePlexUser(
        String(plexAccount.id),
        plexAccount.username,
        plexAccount.email,
        plexAccount.thumb,
        authToken
      );

      if (!user.enabled) {
        const err = new Error("Account is disabled") as Error & {
          status: number;
        };
        err.status = 403;
        throw err;
      }

      const token = await createSession(user.id);
      setSessionCookie(res, token);

      res.json({ user: userResponse(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/link-plex",
  requireAuth,
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

      const user = await linkPlexAccount(
        req.user!.id,
        String(plexAccount.id),
        plexAccount.username,
        plexAccount.email,
        plexAccount.thumb,
        authToken
      );

      res.json({ user: userResponse(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = parseCookieValue(req.headers.cookie, SESSION_COOKIE_NAME);
      if (token) {
        await deleteSession(token);
      }
      clearSessionCookie(res);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = parseCookieValue(req.headers.cookie, SESSION_COOKIE_NAME);
    if (!token) {
      return res.json({ user: null });
    }

    const user = await validateSession(token);
    if (!user) {
      clearSessionCookie(res);
      return res.json({ user: null });
    }

    res.json({ user: userResponse(user) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/store-plex-token",
  requireAuth,
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

      await updateUserPlexToken(req.user!.id, authToken);

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/preferences",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
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

      await updateUserPreferences(req.user!.id, { theme });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
