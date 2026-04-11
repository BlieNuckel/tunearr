import { getDataSource, Purchase } from "../../db/index";
import { getReleaseGroupById } from "../../api/musicbrainz/releaseGroups";
import { getConfig } from "../../config";
import { createLogger } from "../../logger";

type RecordPurchaseResult =
  | { status: "recorded"; id: number }
  | { status: "updated"; id: number };

type RemovePurchaseResult = { status: "removed" } | { status: "not_found" };

export type SpendingSummary = {
  month: number;
  allTime: number;
  albumCount: number;
};

const log = createLogger("purchases");

function getPurchaseRepo() {
  return getDataSource().getRepository(Purchase);
}

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
  const repo = getPurchaseRepo();

  const existing = await repo.findOne({
    where: { user_id: userId, album_mbid: albumMbid },
  });

  if (existing) {
    existing.price = price;
    existing.currency = currency;
    existing.purchased_at = new Date().toISOString();
    const saved = await repo.save(existing);
    log.info(`User ${userId} updated purchase for "${existing.album_title}"`);
    return { status: "updated", id: saved.id };
  }

  const { artistName, albumTitle } = await resolveAlbumInfo(albumMbid);

  const item = repo.create({
    user_id: userId,
    album_mbid: albumMbid,
    artist_name: artistName,
    album_title: albumTitle,
    price,
    currency,
  });

  const saved = await repo.save(item);
  log.info(`User ${userId} recorded purchase of "${albumTitle}"`);

  return { status: "recorded", id: saved.id };
}

export async function removePurchase(
  userId: number,
  albumMbid: string
): Promise<RemovePurchaseResult> {
  const repo = getPurchaseRepo();

  const item = await repo.findOne({
    where: { user_id: userId, album_mbid: albumMbid },
  });

  if (!item) {
    return { status: "not_found" };
  }

  await repo.remove(item);
  log.info(`User ${userId} removed purchase of "${item.album_title}"`);

  return { status: "removed" };
}

export async function getPurchases(userId: number): Promise<Purchase[]> {
  const repo = getPurchaseRepo();

  return repo.find({
    where: { user_id: userId },
    order: { purchased_at: "DESC" },
  });
}

function sumForBoundary(
  userId: number,
  currency: string,
  boundary: string | null
): Promise<{ total: number | null }> {
  const repo = getPurchaseRepo();
  const qb = repo
    .createQueryBuilder("p")
    .select("SUM(p.price)", "total")
    .where("p.user_id = :userId", { userId })
    .andWhere("p.currency = :currency", { currency });

  if (boundary) {
    qb.andWhere("p.purchased_at >= :boundary", { boundary });
  }

  return qb.getRawOne() as Promise<{ total: number | null }>;
}

export async function getSpendingSummary(
  userId: number
): Promise<SpendingSummary> {
  const { currency } = getConfig().spending;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const repo = getPurchaseRepo();
  const [month, allTime, countResult] = await Promise.all([
    sumForBoundary(userId, currency, monthStart.toISOString()),
    sumForBoundary(userId, currency, null),
    repo
      .createQueryBuilder("p")
      .select("COUNT(*)", "count")
      .where("p.user_id = :userId", { userId })
      .andWhere("p.currency = :currency", { currency })
      .getRawOne() as Promise<{ count: number | null }>,
  ]);

  return {
    month: month.total ?? 0,
    allTime: allTime.total ?? 0,
    albumCount: Number(countResult.count) || 0,
  };
}
