import { In } from "typeorm";
import { getDataSource, Request } from "../../db/index";
import { hasPermission, Permission } from "../../../shared/permissions";
import { getAlbumByMbid } from "../lidarr/helpers";
import { fulfillRequest } from "./fulfillRequest";
import { createLogger } from "../../logger";

type CreateRequestResult =
  | { status: "approved"; requestId: number }
  | { status: "pending"; requestId: number }
  | { status: "already_monitored"; requestId: number }
  | { status: "duplicate_pending"; requestId: number };

type ApproveRequestResult =
  | { status: "approved" }
  | { status: "already_monitored" }
  | { status: "not_found" }
  | { status: "already_resolved" };

type DeclineRequestResult =
  | { status: "declined" }
  | { status: "not_found" }
  | { status: "already_resolved" };

const log = createLogger("requests");

function shouldAutoApprove(userPermissions: number): boolean {
  return hasPermission(userPermissions, [
    Permission.ADMIN,
    Permission.AUTO_APPROVE,
    Permission.MANAGE_REQUESTS,
  ]);
}

function getRequestRepo() {
  return getDataSource().getRepository(Request);
}

async function resolveAlbumInfo(
  albumMbid: string
): Promise<{ artistName: string; albumTitle: string }> {
  const lookupAlbum = await getAlbumByMbid(albumMbid);
  return {
    artistName: lookupAlbum.artist?.artistName ?? "Unknown Artist",
    albumTitle: lookupAlbum.title ?? "Unknown Album",
  };
}

export async function createRequest(
  userId: number,
  userPermissions: number,
  albumMbid: string
): Promise<CreateRequestResult> {
  const repo = getRequestRepo();

  const existingPending = await repo.findOne({
    where: { album_mbid: albumMbid, status: "pending" },
  });

  if (existingPending) {
    return { status: "duplicate_pending", requestId: existingPending.id };
  }

  const { artistName, albumTitle } = await resolveAlbumInfo(albumMbid);

  const request = repo.create({
    user_id: userId,
    album_mbid: albumMbid,
    artist_name: artistName,
    album_title: albumTitle,
    status: "pending",
  });

  const saved = await repo.save(request);
  log.info(`Request #${saved.id} created by user ${userId} for ${albumTitle}`);

  if (shouldAutoApprove(userPermissions)) {
    return processApproval(saved, userId);
  }

  return { status: "pending", requestId: saved.id };
}

async function processApproval(
  request: Request,
  approvedBy: number
): Promise<CreateRequestResult> {
  const repo = getRequestRepo();

  try {
    const result = await fulfillRequest(request.album_mbid);

    request.status = "approved";
    request.approved_by = approvedBy;
    request.approved_at = new Date().toISOString();
    await repo.save(request);

    log.info(`Request #${request.id} auto-approved and fulfilled`);

    if (result.status === "already_monitored") {
      return { status: "already_monitored", requestId: request.id };
    }

    return { status: "approved", requestId: request.id };
  } catch (err) {
    log.error(`Failed to fulfill request #${request.id}: ${err}`);
    throw err;
  }
}

export async function approveRequest(
  requestId: number,
  approvedBy: number
): Promise<ApproveRequestResult> {
  const repo = getRequestRepo();

  const request = await repo.findOne({ where: { id: requestId } });

  if (!request) {
    return { status: "not_found" };
  }

  if (request.status !== "pending") {
    return { status: "already_resolved" };
  }

  const result = await fulfillRequest(request.album_mbid);

  request.status = "approved";
  request.approved_by = approvedBy;
  request.approved_at = new Date().toISOString();
  await repo.save(request);

  log.info(`Request #${requestId} approved by user ${approvedBy}`);

  if (result.status === "already_monitored") {
    return { status: "already_monitored" };
  }

  return { status: "approved" };
}

export async function declineRequest(
  requestId: number
): Promise<DeclineRequestResult> {
  const repo = getRequestRepo();

  const request = await repo.findOne({ where: { id: requestId } });

  if (!request) {
    return { status: "not_found" };
  }

  if (request.status !== "pending") {
    return { status: "already_resolved" };
  }

  request.status = "declined";
  await repo.save(request);

  log.info(`Request #${requestId} declined`);

  return { status: "declined" };
}

export async function getRequests(filters?: {
  status?: string[];
  userId?: number;
}) {
  const repo = getRequestRepo();

  const where: Record<string, unknown> = {};
  if (filters?.status && filters.status.length > 0) {
    where.status =
      filters.status.length === 1 ? filters.status[0] : In(filters.status);
  }
  if (filters?.userId) where.user_id = filters.userId;

  return repo.find({
    where,
    order: { created_at: "DESC" },
    relations: ["user"],
  });
}
