import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRecordPurchase = vi.fn();
const mockRemovePurchase = vi.fn();
const mockGetPurchases = vi.fn();
const mockGetSpendingSummary = vi.fn();
const mockReadSpendingSettings = vi.fn();
const mockWriteSpendingSettings = vi.fn();

vi.mock("../services/purchases/purchaseService", () => ({
  recordPurchase: (...args: unknown[]) => mockRecordPurchase(...args),
  removePurchase: (...args: unknown[]) => mockRemovePurchase(...args),
  getPurchases: (...args: unknown[]) => mockGetPurchases(...args),
  getSpendingSummary: (...args: unknown[]) => mockGetSpendingSummary(...args),
  readSpendingSettings: (...args: unknown[]) =>
    mockReadSpendingSettings(...args),
  writeSpendingSettings: (...args: unknown[]) =>
    mockWriteSpendingSettings(...args),
}));

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: (req: { user: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: 7, permissions: 0, username: "erin" };
    next();
  },
}));

vi.mock("../logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import express from "express";
import request from "supertest";
import purchasesRouter from "./purchases";
import { ApiError } from "../middleware/ApiError";
import { errorHandler } from "../middleware/errorHandler";

const app = express();
app.use(express.json());
app.use("/", purchasesRouter);
app.use(errorHandler);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /summary", () => {
  it("returns the signed-in user's summary with their currency and limit", async () => {
    const summary = {
      currency: "SEK",
      monthlyLimit: 50000,
      month: 12000,
      allTime: 90000,
      albumCount: 4,
    };
    mockGetSpendingSummary.mockResolvedValue(summary);

    const res = await request(app).get("/summary");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(summary);
    expect(mockGetSpendingSummary).toHaveBeenCalledWith(7);
  });
});

describe("GET /spending", () => {
  it("returns the signed-in user's spending settings", async () => {
    mockReadSpendingSettings.mockResolvedValue({
      currency: "EUR",
      monthlyLimit: null,
    });

    const res = await request(app).get("/spending");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currency: "EUR", monthlyLimit: null });
    expect(mockReadSpendingSettings).toHaveBeenCalledWith(7);
  });
});

describe("PATCH /spending", () => {
  it("saves only the fields sent, for the signed-in user", async () => {
    mockWriteSpendingSettings.mockResolvedValue({
      currency: "USD",
      monthlyLimit: 2500,
    });

    const res = await request(app)
      .patch("/spending")
      .send({ monthlyLimit: 2500, permissions: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currency: "USD", monthlyLimit: 2500 });
    expect(mockWriteSpendingSettings).toHaveBeenCalledWith(7, {
      currency: undefined,
      monthlyLimit: 2500,
    });
  });

  it("passes a validation failure back as a 400", async () => {
    mockWriteSpendingSettings.mockRejectedValue(
      new ApiError(400, "currency must be a 3-letter ISO 4217 code")
    );

    const res = await request(app)
      .patch("/spending")
      .send({ currency: "dollars" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("currency must be a 3-letter ISO 4217 code");
  });
});

describe("GET /", () => {
  it("lists the user's purchases in the client shape", async () => {
    mockGetPurchases.mockResolvedValue([
      {
        id: 1,
        album_mbid: "rg-1",
        artist_name: "Artist",
        album_title: "Album",
        price: 1299,
        currency: "USD",
        purchased_at: "2026-11-01T00:00:00.000Z",
        user_id: 7,
      },
    ]);

    const res = await request(app).get("/");

    expect(res.body).toEqual([
      {
        id: 1,
        albumMbid: "rg-1",
        artistName: "Artist",
        albumTitle: "Album",
        price: 1299,
        currency: "USD",
        purchasedAt: "2026-11-01T00:00:00.000Z",
      },
    ]);
  });
});
