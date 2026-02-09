let lastRequestTime = 0;

/** Enforces 1 request per second for MusicBrainz API compliance */
function musicbrainzRateLimiter(req, res, next) {
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
}

module.exports = musicbrainzRateLimiter;
