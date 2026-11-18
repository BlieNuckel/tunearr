import type { Purchase } from "../../db/index";
import {
  countPurchases,
  deletePurchase,
  findPurchase,
  getUserSpending,
  insertPurchase,
  listPurchases,
  setUserSpending,
  sumSpend,
  updatePurchasePrice,
} from "../../db/purchases";
import { getReleaseGroupById } from "../../api/musicbrainz/releaseGroups";
import { ApiError } from "../../middleware/ApiError";
import {
  spendingSettingsError,
  type SpendingSettings,
} from "../../../shared/currency";
import { createLogger } from "../../logger";

type RecordPurchaseResult =
  { status: "recorded"; id: number } | { status: "updated"; id: number };

type RemovePurchaseResult = { status: "removed" } | { status: "not_found" };

/** Totals in the user's own currency, with the limit they are measured against. */
export type SpendingSummary = SpendingSettings & {
  month: number;
  allTime: number;
  albumCount: number;
};

const log = createLogger("purchases");

async function resolveAlbumInfo(
  albumMbid: string
): Promise<{ artistName: string; albumTitle: string }> {
  const info = await getReleaseGroupById(albumMbid);
  if (!info) {
    throw new Error(
      `Could not resolve release group ${albumMbid} on MusicBrainz`
    );
  }
  return info;
}

export async function recordPurchase(
  userId: number,
  albumMbid: string,
  price: number,
  currency: string
): Promise<RecordPurchaseResult> {
  const existing = await findPurchase(userId, albumMbid);
  if (existing) {
    const saved = await updatePurchasePrice(
      existing,
      price,
      currency,
      new Date().toISOString()
    );
    log.info(`User ${userId} updated purchase for "${existing.album_title}"`);
    return { status: "updated", id: saved.id };
  }

  const { artistName, albumTitle } = await resolveAlbumInfo(albumMbid);
  const saved = await insertPurchase({
    userId,
    albumMbid,
    artistName,
    albumTitle,
    price,
    currency,
  });
  log.info(`User ${userId} recorded purchase of "${albumTitle}"`);

  return { status: "recorded", id: saved.id };
}

export async function removePurchase(
  userId: number,
  albumMbid: string
): Promise<RemovePurchaseResult> {
  const item = await findPurchase(userId, albumMbid);
  if (!item) {
    return { status: "not_found" };
  }

  await deletePurchase(item);
  log.info(`User ${userId} removed purchase of "${item.album_title}"`);

  return { status: "removed" };
}

export async function getPurchases(userId: number): Promise<Purchase[]> {
  return listPurchases(userId);
}

export async function readSpendingSettings(
  userId: number
): Promise<SpendingSettings> {
  const spending = await getUserSpending(userId);
  if (!spending) throw new ApiError(404, "User not found");
  return spending;
}

export async function writeSpendingSettings(
  userId: number,
  patch: Partial<SpendingSettings>
): Promise<SpendingSettings> {
  const error = spendingSettingsError(patch);
  if (error) throw new ApiError(400, error);

  await setUserSpending(userId, patch);
  return readSpendingSettings(userId);
}

export async function getSpendingSummary(
  userId: number
): Promise<SpendingSummary> {
  const spending = await readSpendingSettings(userId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [month, allTime, albumCount] = await Promise.all([
    sumSpend(userId, spending.currency, monthStart.toISOString()),
    sumSpend(userId, spending.currency, null),
    countPurchases(userId, spending.currency),
  ]);

  return { ...spending, month, allTime, albumCount };
}
