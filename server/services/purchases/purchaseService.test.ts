import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetReleaseGroupById = vi.fn();

const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockSave = vi.fn();
const mockRemove = vi.fn();
const mockUpdate = vi.fn();
const mockCreateQueryBuilder = vi.fn();

vi.mock("../../db/index", () => ({
  getDataSource: () => ({
    getRepository: () => ({
      find: (...args: unknown[]) => mockFind(...args),
      findOne: (...args: unknown[]) => mockFindOne(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      save: (...args: unknown[]) => mockSave(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      createQueryBuilder: (...args: unknown[]) =>
        mockCreateQueryBuilder(...args),
    }),
  }),
  Purchase: "Purchase",
  User: "User",
}));

vi.mock("../../api/musicbrainz/releaseGroups", () => ({
  getReleaseGroupById: (...args: unknown[]) => mockGetReleaseGroupById(...args),
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
  readSpendingSettings,
  writeSpendingSettings,
} from "./purchaseService";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetReleaseGroupById.mockResolvedValue({
    artistName: "Test Artist",
    albumTitle: "Test Album",
  });
});

function userRow(currency: string | null, limit: number | null) {
  return { id: 1, spending_currency: currency, spending_monthly_limit: limit };
}

describe("recordPurchase", () => {
  it("creates a new purchase in the user's currency when none exists", async () => {
    mockFindOne
      .mockResolvedValueOnce(userRow("USD", null))
      .mockResolvedValueOnce(null);
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

    const result = await recordPurchase(1, "mbid-1", 999);
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
    mockFindOne
      .mockResolvedValueOnce(userRow("USD", null))
      .mockResolvedValueOnce(existing);
    mockSave.mockResolvedValue({ ...existing, price: 999, currency: "USD" });

    const result = await recordPurchase(1, "mbid-1", 999);
    expect(result).toEqual({ status: "updated", id: 5 });
    expect(existing.price).toBe(999);
    expect(existing.currency).toBe("USD");
    expect(mockGetReleaseGroupById).not.toHaveBeenCalled();
  });

  it("refuses with a 409 until the user has chosen a currency", async () => {
    mockFindOne.mockResolvedValueOnce(userRow(null, null));

    await expect(recordPurchase(1, "mbid-1", 999)).rejects.toMatchObject({
      status: 409,
      message:
        "Choose your purchase currency in Settings before recording purchases",
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("throws when MusicBrainz lookup fails", async () => {
    mockFindOne
      .mockResolvedValueOnce(userRow("USD", null))
      .mockResolvedValueOnce(null);
    mockGetReleaseGroupById.mockResolvedValue(null);

    await expect(recordPurchase(1, "bad-mbid", 999)).rejects.toThrow(
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

function summaryQueryBuilder() {
  const qb = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getRawOne: vi.fn(),
  };
  mockCreateQueryBuilder.mockReturnValue(qb);
  return qb;
}

describe("getSpendingSummary", () => {
  it("returns totals in the user's currency with their limit", async () => {
    mockFindOne.mockResolvedValue(userRow("SEK", 50000));
    const qb = summaryQueryBuilder();
    qb.getRawOne
      .mockResolvedValueOnce({ total: 2000 })
      .mockResolvedValueOnce({ total: 50000 })
      .mockResolvedValueOnce({ count: 12 });

    const result = await getSpendingSummary(1);
    expect(result).toEqual({
      currency: "SEK",
      monthlyLimit: 50000,
      month: 2000,
      allTime: 50000,
      albumCount: 12,
    });
    expect(mockCreateQueryBuilder).toHaveBeenCalledTimes(3);
    for (const call of qb.andWhere.mock.calls.filter((c) =>
      String(c[0]).includes("currency")
    )) {
      expect(call[1]).toEqual({ currency: "SEK" });
    }
  });

  it("returns zeros when no purchases exist", async () => {
    mockFindOne.mockResolvedValue(userRow("USD", null));
    const qb = summaryQueryBuilder();
    qb.getRawOne.mockResolvedValue({ total: null, count: null });

    const result = await getSpendingSummary(1);
    expect(result).toEqual({
      currency: "USD",
      monthlyLimit: null,
      month: 0,
      allTime: 0,
      albumCount: 0,
    });
  });

  it("returns zeros without querying until a currency is chosen", async () => {
    mockFindOne.mockResolvedValue(userRow(null, null));

    expect(await getSpendingSummary(1)).toEqual({
      currency: null,
      monthlyLimit: null,
      month: 0,
      allTime: 0,
      albumCount: 0,
    });
    expect(mockCreateQueryBuilder).not.toHaveBeenCalled();
  });

  it("throws a 404 when the user is gone", async () => {
    mockFindOne.mockResolvedValue(null);

    await expect(getSpendingSummary(1)).rejects.toMatchObject({ status: 404 });
  });
});

describe("readSpendingSettings", () => {
  it("maps the user's columns to spending settings", async () => {
    mockFindOne.mockResolvedValue(userRow("EUR", 1000));

    expect(await readSpendingSettings(1)).toEqual({
      currency: "EUR",
      monthlyLimit: 1000,
    });
  });
});

describe("writeSpendingSettings", () => {
  it("writes only the fields given and returns the stored result", async () => {
    mockFindOne.mockResolvedValue(userRow("USD", 2500));

    const result = await writeSpendingSettings(1, { monthlyLimit: 2500 });

    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { spending_monthly_limit: 2500 }
    );
    expect(result).toEqual({ currency: "USD", monthlyLimit: 2500 });
  });

  it("clears the limit when given null", async () => {
    mockFindOne.mockResolvedValue(userRow("USD", null));

    await writeSpendingSettings(1, { monthlyLimit: null });

    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { spending_monthly_limit: null }
    );
  });

  it("clears the limit when moving to another currency", async () => {
    mockFindOne
      .mockResolvedValueOnce(userRow("USD", 5000))
      .mockResolvedValueOnce(userRow("JPY", null));

    const result = await writeSpendingSettings(1, { currency: "JPY" });

    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { spending_currency: "JPY", spending_monthly_limit: null }
    );
    expect(result).toEqual({ currency: "JPY", monthlyLimit: null });
  });

  it("keeps a limit sent with the new currency", async () => {
    mockFindOne.mockResolvedValue(userRow("USD", 5000));

    await writeSpendingSettings(1, { currency: "JPY", monthlyLimit: 8000 });

    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { spending_currency: "JPY", spending_monthly_limit: 8000 }
    );
  });

  it("keeps the limit when the same currency is sent again", async () => {
    mockFindOne.mockResolvedValue(userRow("USD", 5000));

    await writeSpendingSettings(1, { currency: "USD" });

    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { spending_currency: "USD" }
    );
  });

  it("sets a first currency and limit together", async () => {
    mockFindOne.mockResolvedValue(userRow(null, null));

    await writeSpendingSettings(1, { currency: "SEK", monthlyLimit: 50000 });

    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { spending_currency: "SEK", spending_monthly_limit: 50000 }
    );
  });

  it("refuses a limit before a currency is chosen", async () => {
    mockFindOne.mockResolvedValue(userRow(null, null));

    await expect(
      writeSpendingSettings(1, { monthlyLimit: 5000 })
    ).rejects.toMatchObject({
      status: 400,
      message: "Choose a currency before setting a limit",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("refuses to clear a chosen currency", async () => {
    mockFindOne.mockResolvedValue(userRow("USD", null));

    await expect(
      writeSpendingSettings(1, { currency: null })
    ).rejects.toMatchObject({
      status: 400,
      message: "currency must be a 3-letter ISO 4217 code",
    });
  });

  it.each([
    [{ currency: "usd" }, "currency must be a 3-letter ISO 4217 code"],
    [{ currency: "EURO" }, "currency must be a 3-letter ISO 4217 code"],
    [
      { monthlyLimit: -1 },
      "monthlyLimit must be a non-negative integer or null",
    ],
    [
      { monthlyLimit: 9.5 },
      "monthlyLimit must be a non-negative integer or null",
    ],
  ])("rejects %o with a 400", async (patch, message) => {
    mockFindOne.mockResolvedValue(userRow("USD", null));
    await expect(writeSpendingSettings(1, patch)).rejects.toMatchObject({
      status: 400,
      message,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
