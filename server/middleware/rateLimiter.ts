import type { Request, Response, NextFunction } from "express";

let lastRequestTime = 0;

/** Enforces 1 request per second for MusicBrainz API compliance */
const musicbrainzRateLimiter = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const minInterval = 1000;

  if (elapsed < minInterval) {
    const delay = minInterval - elapsed;
    setTimeout(() => {
      lastRequestTime = Date.now();
      next();
    }, delay);
  } else {
    lastRequestTime = now;
    next();
  }
};

export default musicbrainzRateLimiter;
