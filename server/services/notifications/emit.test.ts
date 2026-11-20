import { describe, it, expect, vi, beforeEach } from "vitest";

const mockNotifyUser = vi.fn();
const mockNotifyAdmins = vi.fn();
const mockFindUserById = vi.fn();

vi.mock("./dispatcher", () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
  notifyAdmins: (...args: unknown[]) => mockNotifyAdmins(...args),
}));

vi.mock("../../auth/users", () => ({
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
}));

import {
  notifyFollowedRelease,
  notifyQuotaWarning,
  notifyRequestApproved,
  notifyRequestCreated,
  notifyRequestDeclined,
  notifyRequestStatus,
} from "./emit";
import type { Request } from "../../db/index";

const REQUEST = {
  id: 42,
  user_id: 7,
  album_mbid: "album-mbid",
  artist_name: "Slowdive",
  album_title: "Souvlaki",
} as Request;

beforeEach(() => {
  vi.clearAllMocks();
  mockNotifyUser.mockResolvedValue(undefined);
  mockNotifyAdmins.mockResolvedValue(undefined);
  mockFindUserById.mockResolvedValue({ id: 7, username: "alice" });
});

describe("request decisions", () => {
  it("tells the requester their request was approved", async () => {
    await notifyRequestApproved(REQUEST);

    expect(mockNotifyUser).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        eventId: "request.approved",
        body: "Slowdive – Souvlaki is on its way.",
        url: "/library/requests",
      })
    );
  });

  it("tells the requester their request was declined", async () => {
    await notifyRequestDeclined(REQUEST);

    expect(mockNotifyUser).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ eventId: "request.declined" })
    );
  });

  it("carries the request id so a click can deep link", async () => {
    await notifyRequestApproved(REQUEST);

    expect(mockNotifyUser.mock.calls[0][1].data).toEqual({
      requestId: "42",
      albumMbid: "album-mbid",
    });
  });
});

describe("lifecycle transitions", () => {
  it.each([
    ["downloading", "request.downloading"],
    ["imported", "request.imported"],
    ["failed", "request.failed"],
  ])("announces %s", async (status, eventId) => {
    await notifyRequestStatus(REQUEST, status as never);

    expect(mockNotifyUser).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ eventId })
    );
  });

  it("stays silent for wanted, which is not news", async () => {
    await notifyRequestStatus(REQUEST, "wanted");

    expect(mockNotifyUser).not.toHaveBeenCalled();
  });

  it("stays silent when the status was cleared", async () => {
    await notifyRequestStatus(REQUEST, null);

    expect(mockNotifyUser).not.toHaveBeenCalled();
  });
});

describe("new requests", () => {
  it("names the requester for the admins", async () => {
    await notifyRequestCreated(REQUEST);

    expect(mockNotifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "request.created",
        body: "alice requested Slowdive – Souvlaki.",
      })
    );
  });

  it("falls back to a neutral name when the user cannot be resolved", async () => {
    mockFindUserById.mockResolvedValue(null);

    await notifyRequestCreated(REQUEST);

    expect(mockNotifyAdmins.mock.calls[0][0].body).toBe(
      "Someone requested Slowdive – Souvlaki."
    );
  });
});

describe("live events quota", () => {
  it("warns admins that calls past the allowance are billed", async () => {
    await notifyQuotaWarning({
      used: 800,
      quota: 1000,
      ratio: 0.8,
      blocked: false,
    });

    expect(mockNotifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "live.quotaWarning",
        title: "Live events at 80% of quota",
        body: "800 of 1000 monthly live-event calls used. Past the allowance, calls are billed rather than refused.",
      })
    );
  });

  it("says lookups are paused once calls are refused", async () => {
    await notifyQuotaWarning({
      used: 1000,
      quota: 1000,
      ratio: 1,
      blocked: true,
    });

    expect(mockNotifyAdmins.mock.calls[0][0].body).toBe(
      "Live event lookups are paused until the period resets. 1000 of 1000 calls used."
    );
  });
});

describe("followed releases", () => {
  const RELEASE = {
    userId: 3,
    artistName: "Ride",
    artistMbid: "artist-mbid",
    albumTitle: "Nowhere",
    releaseGroupMbid: "rg-mbid",
  };

  it("deep links to the album when the release group is known", async () => {
    await notifyFollowedRelease(RELEASE);

    expect(mockNotifyUser).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        eventId: "followed.newRelease",
        title: "New from Ride",
        url: "/album/rg-mbid",
      })
    );
  });

  it("falls back to the artist page without a release group", async () => {
    await notifyFollowedRelease({ ...RELEASE, releaseGroupMbid: null });

    expect(mockNotifyUser.mock.calls[0][1].url).toBe("/artist/artist-mbid");
  });
});

describe("failure isolation", () => {
  it("never rejects when the dispatcher throws", async () => {
    mockNotifyUser.mockRejectedValue(new Error("database is gone"));

    await expect(notifyRequestApproved(REQUEST)).resolves.toBeUndefined();
  });

  it("never rejects when the user lookup throws", async () => {
    mockFindUserById.mockRejectedValue(new Error("database is gone"));

    await expect(notifyRequestCreated(REQUEST)).resolves.toBeUndefined();
    expect(mockNotifyAdmins).not.toHaveBeenCalled();
  });
});
