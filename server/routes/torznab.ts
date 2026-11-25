import type { Request, Response } from "express";
import express from "express";
import { encodeNzb } from "../api/slskd/nzb";
import { errorMessage, logSlskdFailure } from "../api/slskd/errors";
import { createLogger } from "../logger";
import { buildReleaseTitle } from "../services/torznab/releaseTitle";
import {
  buildCapsXml,
  buildTestResultXml,
  buildResultsXml,
  buildErrorXml,
} from "../services/torznab/xml";
import {
  cleanExpiredCaches,
  getCachedResult,
  cacheResultsForDownload,
  getOrSearchResults,
  buildSearchQuery,
  DEFAULT_LIMIT,
} from "../services/torznab/search";

const log = createLogger("Torznab");

const router = express.Router();

function buildBaseUrl(req: Request): string {
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

router.get("/", async (req: Request, res: Response) => {
  const t = ((req.query.t as string) || "").toLowerCase();

  if (t === "caps") {
    return res.type("text/xml").send(buildCapsXml());
  }

  if (t === "search" || t === "music") {
    return handleSearch(req, res);
  }

  res
    .status(400)
    .type("text/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><error code="202" description="No such function" />`
    );
});

router.get("/download/:guid", (req: Request, res: Response) => {
  cleanExpiredCaches();

  const guid = req.params.guid as string;
  const result = getCachedResult(guid);
  if (!result) {
    res
      .status(404)
      .type("text/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><error code="300" description="Item not found" />`
      );
    return;
  }

  const title = buildReleaseTitle(result.directory);
  const metadata = {
    username: result.username,
    files: result.files.map((f) => ({ filename: f.filename, size: f.size })),
  };

  const nzb = encodeNzb(title, metadata);
  res
    .type("application/x-nzb")
    .set("Content-Disposition", `attachment; filename="${result.guid}.nzb"`)
    .send(nzb);
});

async function handleSearch(req: Request, res: Response): Promise<void> {
  const query = buildSearchQuery({
    q: req.query.q as string | undefined,
    artist: req.query.artist as string | undefined,
    album: req.query.album as string | undefined,
  });

  if (!query) {
    res.type("text/xml").send(buildTestResultXml());
    return;
  }

  const offset = parseInt((req.query.offset as string) || "0", 10) || 0;
  const limit =
    parseInt((req.query.limit as string) || String(DEFAULT_LIMIT), 10) ||
    DEFAULT_LIMIT;

  try {
    const results = await getOrSearchResults(query);
    const baseUrl = buildBaseUrl(req);

    cacheResultsForDownload(results);

    const page = results.slice(offset, offset + limit);
    log.info(
      `Search "${query}": returning ${page.length} of ${results.length} results (offset=${offset}, limit=${limit})`
    );

    const xml = buildResultsXml(page, results.length, offset, baseUrl);
    res.type("text/xml").send(xml);
  } catch (err) {
    logSlskdFailure(log, "Search failed:", err);
    res.type("text/xml").send(buildErrorXml(900, errorMessage(err)));
  }
}

export default router;
