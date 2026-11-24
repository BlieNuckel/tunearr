import {
  getPlexServerAccess,
  isListeningCaptureActive,
  toPlexAccountId,
  type PlexServerAccess,
} from "../plexConnection";
import {
  getActiveSessions,
  type PlexTrackSession,
} from "../../api/plex/sessions";
import { getPlexLinkedUsers, type PlexLinkedUser } from "../../db/signalEvents";
import {
  observeSessions,
  recordMeasuredEpisodes,
  resetWatches,
  retireWatches,
} from "./listenSessions";
import { createLogger } from "../../logger";

const log = createLogger("listen-session-poller");

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
/** The read failure last logged, so a failure that persists is logged once rather than every tick. */
let lastReadFailure: string | null = null;

/**
 * Every linked user with the sessions that are theirs, including users with none, whose
 * open windows must retire. Sessions from accounts no user is linked to are dropped.
 */
function sessionsByUser(
  sessions: PlexTrackSession[],
  users: PlexLinkedUser[],
  access: PlexServerAccess
): Map<PlexLinkedUser, PlexTrackSession[]> {
  const byAccount = new Map(users.map((user) => [user.plexAccountId, user]));
  const grouped = new Map(
    users.map((user) => [user, [] as PlexTrackSession[]])
  );

  for (const session of sessions) {
    const user = byAccount.get(toPlexAccountId(session.accountId, access));
    if (user) grouped.get(user)!.push(session);
  }
  return grouped;
}

async function readSessions(token: string): Promise<PlexTrackSession[] | null> {
  try {
    const sessions = await getActiveSessions(token);
    if (lastReadFailure !== null) {
      log.info("Session poll recovered");
      lastReadFailure = null;
    }
    return sessions;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== lastReadFailure) {
      log.error("Session poll failed", error);
      lastReadFailure = message;
    }
    return null;
  }
}

/**
 * One read of the server's active sessions, split across the users they belong to: advance
 * the windows still playing and commit the ones that ended. A failed read keeps every window
 * open — retiring them on a failed poll would commit each one early, at whatever partial
 * time we happened to have.
 */
export async function runListenSessionPollOnce(
  now = Date.now()
): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    const access = getPlexServerAccess();
    if (!isListeningCaptureActive() || !access) return 0;

    const sessions = await readSessions(access.token);
    if (!sessions) return 0;

    const users = await getPlexLinkedUsers();
    let written = 0;

    for (const [user, userSessions] of sessionsByUser(
      sessions,
      users,
      access
    )) {
      try {
        const live = observeSessions(user.userId, userSessions, now);
        written += await recordMeasuredEpisodes(
          user.userId,
          retireWatches(user.userId, live)
        );
      } catch (error) {
        log.error(
          `Recording sessions failed for ${user.displayName} (user ${user.userId})`,
          error
        );
      }
    }

    if (written > 0) log.info(`Recorded ${written} measured listen episode(s)`);
    return written;
  } finally {
    running = false;
  }
}

export function startListenSessionPoller(intervalMs: number): void {
  if (timer) return;

  const tick = async () => {
    try {
      await runListenSessionPollOnce();
    } catch (error) {
      log.error("Session poll tick failed", error);
    } finally {
      timer = setTimeout(tick, intervalMs);
    }
  };

  timer = setTimeout(tick, intervalMs);
  log.info(`Listen session poller scheduled (interval: ${intervalMs}ms)`);
}

export function stopListenSessionPoller(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  lastReadFailure = null;
  resetWatches();
}
