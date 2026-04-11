import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetReleaseGroupById = vi.fn();

const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockSave = vi.fn();
const mockRemove = vi.fn();
const mockCreateQueryBuilder = vi.fn();

vi.mock("../../db/index", () => ({
  getDataSource: () => ({
    getRepository: () => ({
      find: (...args: unknown[]) => mockFind(...args),
      findOne: (...args: unknown[]) => mockFindOne(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      save: (...args: unknown[]) => mockSave(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
      createQueryBuilder: (...args: unknown[]) =>
        mockCreateQueryBuilder(...args),
    }),
  }),
  Purchase: "Purchase",
}));

vi.mock("../../api/musicbrainz/releaseGroups", () => ({
  getReleaseGroupById: (...args: unknown[]) => mockGetReleaseGroupById(...args),
}));

vi.mock("../../config", () => ({
  getConfig: () => ({
    spending: { currency: "USD", monthlyLimit: null },
  }),
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

import {
  recordPurchase,
  removePurchase,
  getPurchases,
  getSpendingSummary,
} from "./purchaseService";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetReleaseGroupById.mockResolvedValue({
    artistName: "Test Artist",
    albumTitle: "Test Album",
  });
});

describe("recordPurchase", () => {
  it("creates a new purchase when none exists", async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockReturnValue({
      user_id: 1,
      album_mbid: "mbid-1",
      artist_name: "Test Artist",
      album_title: "Test Album",
      price: 999,
      currency: "USD",
    });
    mockSave.mockResolvedValue({
      id: 10,
      user_id: 1,
      album_mbid: "mbid-1",
      price: 999,
      currency: "USD",
    });

    const result = await recordPurchase(1, "mbid-1", 999, "USD");
    expect(result).toEqual({ status: "recorded", id: 10 });
    expect(mockGetReleaseGroupById).toHaveBeenCalledWith("mbid-1");
    expect(mockCreate).toHaveBeenCalledWith({
      user_id: 1,
      album_mbid: "mbid-1",
      artist_name: "Test Artist",
      album_title: "Test Album",
      price: 999,
      currency: "USD",
    });
  });

  it("updates existing purchase", async () => {
    const existing = {
      id: 5,
      user_id: 1,
      album_mbid: "mbid-1",
      album_title: "Test Album",
      price: 500,
      currency: "EUR",
      purchased_at: "2024-01-01T00:00:00Z",
    };
    mockFindOne.mockResolvedValue(existing);
    mockSave.mockResolvedValue({ ...existing, price: 999, currency: "USD" });

    const result = await recordPurchase(1, "mbid-1", 999, "USD");
    expect(result).toEqual({ status: "updated", id: 5 });
    expect(existing.price).toBe(999);
    expect(existing.currency).toBe("USD");
    expect(mockGetReleaseGroupById).not.toHaveBeenCalled();
  });

  it("throws when MusicBrainz lookup fails", async () => {
    mockFindOne.mockResolvedValue(null);
    mockGetReleaseGroupById.mockResolvedValue(null);

    await expect(recordPurchase(1, "bad-mbid", 999, "USD")).rejects.toThrow(
      "Could not resolve release group bad-mbid on MusicBrainz"
    );
  });
});

describe("removePurchase", () => {
  it("returns not_found when item does not exist", async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await removePurchase(1, "mbid-1");
    expect(result).toEqual({ status: "not_found" });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("removes an existing purchase", async () => {
    const item = {
      id: 5,
      user_id: 1,
      album_mbid: "mbid-1",
      album_title: "Test Album",
    };
    mockFindOne.mockResolvedValue(item);

    const result = await removePurchase(1, "mbid-1");
    expect(result).toEqual({ status: "removed" });
    expect(mockRemove).toHaveBeenCalledWith(item);
  });
});

describe("getPurchases", () => {
  it("returns purchases for user ordered by purchased_at DESC", async () => {
    mockFind.mockResolvedValue([]);

    const result = await getPurchases(1);
    expect(result).toEqual([]);
    expect(mockFind).toHaveBeenCalledWith({
      where: { user_id: 1 },
      order: { purchased_at: "DESC" },
    });
  });
});

describe("getSpendingSummary", () => {
  it("returns spending totals for all timeframes", async () => {
    const mockQb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawOne: vi.fn(),
    };

    mockCreateQueryBuilder.mockReturnValue(mockQb);
    mockQb.getRawOne
      .mockResolvedValueOnce({ total: 500 })
      .mockResolvedValueOnce({ total: 2000 })
      .mockResolvedValueOnce({ total: 10000 })
      .mockResolvedValueOnce({ total: 50000 });

    const result = await getSpendingSummary(1);
    expect(result).toEqual({
      week: 500,
      month: 2000,
      year: 10000,
      allTime: 50000,
    });
    expect(mockCreateQueryBuilder).toHaveBeenCalledTimes(4);
  });

  it("returns zeros when no purchases exist", async () => {
    const mockQb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ total: null }),
    };

    mockCreateQueryBuilder.mockReturnValue(mockQb);

    const result = await getSpendingSummary(1);
    expect(result).toEqual({ week: 0, month: 0, year: 0, allTime: 0 });
  });
});
