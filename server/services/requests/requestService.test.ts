import { describe, it, expect, vi, beforeEach } from "vitest";
import { In } from "typeorm";
import { Permission } from "../../../shared/permissions";

const mockFulfillRequest = vi.fn();
const mockGetAlbumByMbid = vi.fn();

const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockSave = vi.fn();

vi.mock("../../db/index", () => ({
  getDataSource: () => ({
    getRepository: () => ({
      find: (...args: unknown[]) => mockFind(...args),
      findOne: (...args: unknown[]) => mockFindOne(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      save: (...args: unknown[]) => mockSave(...args),
    }),
  }),
  Request: "Request",
}));

vi.mock("./fulfillRequest", () => ({
  fulfillRequest: (...args: unknown[]) => mockFulfillRequest(...args),
}));

vi.mock("../lidarr/helpers", () => ({
  getAlbumByMbid: (...args: unknown[]) => mockGetAlbumByMbid(...args),
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

import {
  createRequest,
  approveRequest,
  declineRequest,
  getRequests,
} from "./requestService";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAlbumByMbid.mockResolvedValue({
    title: "Test Album",
    artist: { artistName: "Test Artist" },
  });
});

describe("createRequest", () => {
  it("returns duplicate_pending when a pending request exists for the album", async () => {
    mockFindOne.mockResolvedValue({ id: 5 });

    const result = await createRequest(1, Permission.REQUEST, "mbid-1");
    expect(result).toEqual({ status: "duplicate_pending", requestId: 5 });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a pending request for a normal user", async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockReturnValue({ user_id: 1, album_mbid: "mbid-1" });
    mockSave.mockResolvedValue({
      id: 10,
      user_id: 1,
      album_mbid: "mbid-1",
      status: "pending",
    });

    const result = await createRequest(1, Permission.REQUEST, "mbid-1");
    expect(result).toEqual({ status: "pending", requestId: 10 });
    expect(mockFulfillRequest).not.toHaveBeenCalled();
  });

  it("auto-approves for admin users", async () => {
    mockFindOne.mockResolvedValue(null);
    const savedRequest = {
      id: 10,
      user_id: 1,
      album_mbid: "mbid-1",
      status: "pending",
    };
    mockCreate.mockReturnValue(savedRequest);
    mockSave.mockResolvedValue(savedRequest);
    mockFulfillRequest.mockResolvedValue({
      status: "success",
      artistName: "Test Artist",
      albumTitle: "Test Album",
    });

    const result = await createRequest(1, Permission.ADMIN, "mbid-1");
    expect(result).toEqual({ status: "approved", requestId: 10 });
    expect(mockFulfillRequest).toHaveBeenCalledWith("mbid-1");
  });

  it("auto-approves for users with AUTO_APPROVE permission", async () => {
    mockFindOne.mockResolvedValue(null);
    const savedRequest = {
      id: 10,
      user_id: 1,
      album_mbid: "mbid-1",
      status: "pending",
    };
    mockCreate.mockReturnValue(savedRequest);
    mockSave.mockResolvedValue(savedRequest);
    mockFulfillRequest.mockResolvedValue({
      status: "success",
      artistName: "Test Artist",
      albumTitle: "Test Album",
    });

    const result = await createRequest(
      1,
      Permission.REQUEST | Permission.AUTO_APPROVE,
      "mbid-1"
    );
    expect(result).toEqual({ status: "approved", requestId: 10 });
  });

  it("auto-approves for users with MANAGE_REQUESTS permission", async () => {
    mockFindOne.mockResolvedValue(null);
    const savedRequest = {
      id: 10,
      user_id: 1,
      album_mbid: "mbid-1",
      status: "pending",
    };
    mockCreate.mockReturnValue(savedRequest);
    mockSave.mockResolvedValue(savedRequest);
    mockFulfillRequest.mockResolvedValue({
      status: "success",
      artistName: "Test Artist",
      albumTitle: "Test Album",
    });

    const result = await createRequest(
      1,
      Permission.REQUEST | Permission.MANAGE_REQUESTS,
      "mbid-1"
    );
    expect(result).toEqual({ status: "approved", requestId: 10 });
    expect(mockFulfillRequest).toHaveBeenCalledWith("mbid-1");
  });

  it("returns already_monitored when auto-approve finds existing album", async () => {
    mockFindOne.mockResolvedValue(null);
    const savedRequest = {
      id: 10,
      user_id: 1,
      album_mbid: "mbid-1",
      status: "pending",
    };
    mockCreate.mockReturnValue(savedRequest);
    mockSave.mockResolvedValue(savedRequest);
    mockFulfillRequest.mockResolvedValue({
      status: "already_monitored",
      artistName: "Test Artist",
      albumTitle: "Test Album",
    });

    const result = await createRequest(1, Permission.ADMIN, "mbid-1");
    expect(result).toEqual({ status: "already_monitored", requestId: 10 });
  });
});

describe("approveRequest", () => {
  it("returns not_found when request does not exist", async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await approveRequest(999, 1);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns already_resolved when request is not pending", async () => {
    mockFindOne.mockResolvedValue({ id: 1, status: "approved" });
    const result = await approveRequest(1, 1);
    expect(result).toEqual({ status: "already_resolved" });
  });

  it("approves a pending request", async () => {
    const req = { id: 1, status: "pending", album_mbid: "mbid-1" };
    mockFindOne.mockResolvedValue(req);
    mockSave.mockResolvedValue(req);
    mockFulfillRequest.mockResolvedValue({
      status: "success",
      artistName: "Test Artist",
      albumTitle: "Test Album",
    });

    const result = await approveRequest(1, 2);
    expect(result).toEqual({ status: "approved" });
    expect(req.status).toBe("approved");
    expect(mockFulfillRequest).toHaveBeenCalledWith("mbid-1");
  });
});

describe("declineRequest", () => {
  it("returns not_found when request does not exist", async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await declineRequest(999);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns already_resolved when request is not pending", async () => {
    mockFindOne.mockResolvedValue({ id: 1, status: "approved" });
    const result = await declineRequest(1);
    expect(result).toEqual({ status: "already_resolved" });
  });

  it("declines a pending request", async () => {
    const req = { id: 1, status: "pending" };
    mockFindOne.mockResolvedValue(req);
    mockSave.mockResolvedValue(req);

    const result = await declineRequest(1);
    expect(result).toEqual({ status: "declined" });
    expect(req.status).toBe("declined");
  });
});

describe("getRequests", () => {
  it("returns requests with user info", async () => {
    mockFind.mockResolvedValue([]);
    const result = await getRequests();
    expect(result).toEqual([]);
    expect(mockFind).toHaveBeenCalledWith({
      where: {},
      order: { created_at: "DESC" },
      relations: ["user"],
    });
  });

  it("filters by single status", async () => {
    mockFind.mockResolvedValue([]);
    await getRequests({ status: ["pending"] });
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "pending" } })
    );
  });

  it("filters by multiple statuses using In()", async () => {
    mockFind.mockResolvedValue([]);
    await getRequests({ status: ["pending", "approved"] });
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: In(["pending", "approved"]) },
      })
    );
  });

  it("does not filter status when array is empty", async () => {
    mockFind.mockResolvedValue([]);
    await getRequests({ status: [] });
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("filters by userId", async () => {
    mockFind.mockResolvedValue([]);
    await getRequests({ userId: 5 });
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 5 } })
    );
  });
});
