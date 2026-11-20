import { findUserById } from "../../auth/users";
import { createLogger } from "../../logger";
import type { LidarrLifecycleStatus, Request } from "../../db/index";
import type { NotificationEventId } from "../../../shared/notificationEvents";
import { notifyAdmins, notifyUser } from "./dispatcher";
import type { NotificationMessage } from "./types";

type StatusCopy = {
  eventId: NotificationEventId;
  title: string;
  body: (album: string) => string;
};

export type FollowedReleaseNotification = {
  userId: number;
  artistName: string;
  artistMbid: string;
  albumTitle: string;
  releaseGroupMbid: string | null;
};

const REQUESTS_URL = "/library/requests";

/** Lidarr statuses that are worth telling someone about. `wanted` is not news. */
const STATUS_COPY: Partial<Record<LidarrLifecycleStatus, StatusCopy>> = {
  downloading: {
    eventId: "request.downloading",
    title: "Download started",
    body: (album) => `${album} is downloading now.`,
  },
  imported: {
    eventId: "request.imported",
    title: "Ready to play",
    body: (album) => `${album} is in your library.`,
  },
  failed: {
    eventId: "request.failed",
    title: "Request failed",
    body: (album) => `${album} could not be downloaded.`,
  },
};

const log = createLogger("Notifications");

function albumLabel(request: Request): string {
  return `${request.artist_name} – ${request.album_title}`;
}

/**
 * Emission is best effort by construction: a notification must never fail the
 * approval, import, or poll that produced it. The dispatcher already isolates
 * transport errors; this guards the lookups around them.
 */
async function safeNotify(send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (err) {
    log.warn(
      `Failed to emit notification: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

function requestMessage(
  request: Request,
  eventId: NotificationEventId,
  title: string,
  body: string
): NotificationMessage {
  return {
    eventId,
    title,
    body,
    url: REQUESTS_URL,
    data: { requestId: String(request.id), albumMbid: request.album_mbid },
  };
}

export function notifyRequestApproved(request: Request): Promise<void> {
  return safeNotify(() =>
    notifyUser(
      request.user_id,
      requestMessage(
        request,
        "request.approved",
        "Request approved",
        `${albumLabel(request)} is on its way.`
      )
    )
  );
}

export function notifyRequestDeclined(request: Request): Promise<void> {
  return safeNotify(() =>
    notifyUser(
      request.user_id,
      requestMessage(
        request,
        "request.declined",
        "Request declined",
        `${albumLabel(request)} was not approved.`
      )
    )
  );
}

/**
 * Announces a Lidarr lifecycle transition. Callers pass only requests whose
 * status actually changed, so an unchanged poll stays silent.
 */
export function notifyRequestStatus(
  request: Request,
  status: LidarrLifecycleStatus | null
): Promise<void> {
  const copy = status ? STATUS_COPY[status] : undefined;
  if (!copy) return Promise.resolve();

  return safeNotify(() =>
    notifyUser(
      request.user_id,
      requestMessage(
        request,
        copy.eventId,
        copy.title,
        copy.body(albumLabel(request))
      )
    )
  );
}

/** Tells admins a request needs a decision. Auto-approved requests do not. */
export function notifyRequestCreated(request: Request): Promise<void> {
  return safeNotify(async () => {
    const requester = await findUserById(request.user_id);
    const who = requester?.username ?? "Someone";

    await notifyAdmins({
      eventId: "request.created",
      title: "New request",
      body: `${who} requested ${albumLabel(request)}.`,
      url: REQUESTS_URL,
      data: { requestId: String(request.id) },
    });
  });
}

export function notifyFollowedRelease(
  release: FollowedReleaseNotification
): Promise<void> {
  const url = release.releaseGroupMbid
    ? `/album/${release.releaseGroupMbid}`
    : `/artist/${release.artistMbid}`;

  return safeNotify(() =>
    notifyUser(release.userId, {
      eventId: "followed.newRelease",
      title: `New from ${release.artistName}`,
      body: `${release.albumTitle} is out.`,
      url,
      data: { artistMbid: release.artistMbid },
    })
  );
}

export type QuotaWarningNotification = {
  used: number;
  quota: number;
  ratio: number;
  /** True when calls are now refused rather than billed. */
  blocked: boolean;
};

/**
 * Fired on threshold crossings only. Usage is a condition rather than a moment,
 * so emitting it whenever the condition holds would announce it every poll.
 */
export function notifyQuotaWarning(
  warning: QuotaWarningNotification
): Promise<void> {
  const percent = Math.round(warning.ratio * 100);
  const body = warning.blocked
    ? `Live event lookups are paused until the period resets. ${warning.used} of ${warning.quota} calls used.`
    : `${warning.used} of ${warning.quota} monthly live-event calls used. Past the allowance, calls are billed rather than refused.`;

  return notifyAdmins({
    eventId: "live.quotaWarning",
    title: `Live events at ${percent}% of quota`,
    body,
    url: "/settings/integrations",
  });
}

export type TourNotification = {
  userId: number;
  artistName: string;
  artistMbid: string;
  /** `announced`: the artist had no dates before. `closer`: a date beat the closest one known. */
  change: "announced" | "closer";
  dateCount: number;
  place: string;
  eventDate: string;
  /** Null when the user has no location or the venue has no coordinates. */
  distanceKm: number | null;
};

export type LiveStatusNotification = {
  userId: number;
  artistName: string;
  place: string;
  eventDate: string;
  status: "cancelled" | "postponed" | "rescheduled";
};

const SHORT_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
};

function shortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString("en-GB", SHORT_DATE);
}

function tourTitle(notification: TourNotification): string {
  if (notification.change === "closer") {
    return `${notification.artistName} added a date closer to you`;
  }
  const dates =
    notification.dateCount === 1 ? "a date" : `${notification.dateCount} dates`;
  return `${notification.artistName} announced ${dates}`;
}

function tourBody(notification: TourNotification): string {
  const when = `${notification.place}, ${shortDate(notification.eventDate)}`;
  if (notification.distanceKm === null) return `Next: ${when}`;
  return `Closest: ${when} (${Math.round(notification.distanceKm)} km)`;
}

/** One per artist per sweep, never one per date, and the full tour is a tap away. */
export function notifyTourUpdate(
  notification: TourNotification
): Promise<void> {
  return notifyUser(notification.userId, {
    eventId: "live.tourAnnounced",
    title: tourTitle(notification),
    body: tourBody(notification),
    url: `/artist/${notification.artistMbid}`,
  });
}

/**
 * Only for shows the user marked going: they are the ones whose plans just
 * changed.
 */
export function notifyLiveStatusChange(
  notification: LiveStatusNotification
): Promise<void> {
  return notifyUser(notification.userId, {
    eventId: "live.statusChanged",
    title: `${notification.artistName}: show ${notification.status}`,
    body: `${notification.place} on ${shortDate(notification.eventDate)}`,
    url: "/library/live",
  });
}
