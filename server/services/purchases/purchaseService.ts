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

/** Totals in the user's own currency, with the limit they are measured against. All zero until a currency is chosen. */
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

/**
 * Records in the user's own currency, never one from the request: mixed
 * currencies can't be totalled, so a purchase can't be saved before the user
 * has chosen one.
 */
export async function recordPurchase(
  userId: number,
  albumMbid: string,
  price: number
): Promise<RecordPurchaseResult> {
  const { currency } = await readSpendingSettings(userId);
  if (currency === null) {
    throw new ApiError(
      409,
      "Choose your purchase currency in Settings before recording purchases"
    );
  }

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

/** A limit is counted in the old currency, so moving to another one clears it unless the patch sets a new one. */
function withLimitClearedOnSwitch(
  patch: Partial<SpendingSettings>,
  current: SpendingSettings
): Partial<SpendingSettings> {
  const switching =
    current.currency !== null &&
    patch.currency !== undefined &&
    patch.currency !== current.currency;
  if (!switching || patch.monthlyLimit !== undefined) return patch;
  return { ...patch, monthlyLimit: null };
}

export async function writeSpendingSettings(
  userId: number,
  patch: Partial<SpendingSettings>
): Promise<SpendingSettings> {
  const current = await readSpendingSettings(userId);
  const error = spendingSettingsError(patch, current);
  if (error) throw new ApiError(400, error);

  await setUserSpending(userId, withLimitClearedOnSwitch(patch, current));
  return readSpendingSettings(userId);
}

export async function getSpendingSummary(
  userId: number
): Promise<SpendingSummary> {
  const spending = await readSpendingSettings(userId);
  if (spending.currency === null) {
    return { ...spending, month: 0, allTime: 0, albumCount: 0 };
  }
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [month, allTime, albumCount] = await Promise.all([
    sumSpend(userId, spending.currency, monthStart.toISOString()),
    sumSpend(userId, spending.currency, null),
    countPurchases(userId, spending.currency),
  ]);

  return { ...spending, month, allTime, albumCount };
}
