import type { Request, Response } from "express";
import type { GroupedSearchResult } from "../api/slskd/types";
import express from "express";
import {
  startSearch,
  waitForSearch,
  getSearchResponses,
  deleteSearch,
} from "../api/slskd/search";
import { groupSearchResults } from "../api/slskd/groupResults";
import { encodeNzb } from "../api/slskd/nzb";
import { createLogger } from "../logger";

const log = createLogger("Torznab");

const router = express.Router();

type CachedResult = { result: GroupedSearchResult; expiresAt: number };
const resultCache = new Map<string, CachedResult>();

const CACHE_TTL_MS = 30 * 60 * 1000;

function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of resultCache) {
    if (entry.expiresAt < now) resultCache.delete(key);
  }
}

function buildBaseUrl(req: Request): string {
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

router.get("/", async (req: Request, res: Response) => {
  const t = ((req.query.t as string) || "").toLowerCase();

  if (t === "caps") {
    return sendCaps(res);
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
  cleanExpiredCache();

  const guid = req.params.guid as string;
  const cached = resultCache.get(guid);
  if (!cached) {
    res
      .status(404)
      .type("text/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><error code="300" description="Item not found" />`
      );
    return;
  }

  const { result } = cached;
  const title = `${result.username} - ${result.directory.split("\\").pop() || result.directory}`;
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

function sendCaps(res: Response): void {
  res
    .type("text/xml")
    .send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<caps>",
        '  <server title="music-requester slskd" />',
        "  <searching>",
        '    <search available="yes" supportedParams="q" />',
        '    <music-search available="yes" supportedParams="q,artist,album" />',
        "  </searching>",
        "  <categories>",
        '    <category id="3000" name="Audio">',
        '      <subcat id="3010" name="MP3" />',
        '      <subcat id="3040" name="Lossless" />',
        "    </category>",
        "  </categories>",
        "</caps>",
      ].join("\n")
    );
}

async function handleSearch(req: Request, res: Response): Promise<void> {
  const query = buildSearchQuery(req);
  if (!query) {
    res
      .status(400)
      .type("text/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><error code="100" description="Missing search query" />`
      );
    return;
  }

  log.info(`Searching slskd for: ${query}`);

  try {
    const searchState = await startSearch(query);
    await waitForSearch(searchState.id);
    const responses = await getSearchResponses(searchState.id);
    deleteSearch(searchState.id).catch(() => {});

    const results = groupSearchResults(responses);

    cleanExpiredCache();
    const baseUrl = buildBaseUrl(req);
    const now = Date.now();
    for (const result of results) {
      resultCache.set(result.guid, { result, expiresAt: now + CACHE_TTL_MS });
    }

    const xml = buildResultsXml(results, baseUrl);
    res.type("text/xml").send(xml);
  } catch (err) {
    log.error("Search failed:", err);
    res
      .status(500)
      .type("text/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><error code="900" description="Internal error" />`
      );
  }
}

function buildSearchQuery(req: Request): string {
  const q = req.query.q as string | undefined;
  const artist = req.query.artist as string | undefined;
  const album = req.query.album as string | undefined;

  if (q) return q;
  if (artist && album) return `${artist} ${album}`;
  if (artist) return artist;

  return "";
}

function buildResultsXml(
  results: GroupedSearchResult[],
  baseUrl: string
): string {
  const items = results.map((r) => buildItemXml(r, baseUrl)).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:newznab="http://www.newznab.com/DTD/2010/feeds/attributes/">',
    "  <channel>",
    "    <title>music-requester slskd</title>",
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");
}

function buildItemXml(result: GroupedSearchResult, baseUrl: string): string {
  const title = escapeXml(
    `${result.username} - ${result.directory.split("\\").pop() || result.directory}`
  );
  const downloadUrl = `${baseUrl}/api/torznab/download/${result.guid}`;

  return [
    "    <item>",
    `      <title>${title}</title>`,
    `      <enclosure url="${escapeXml(downloadUrl)}" length="${result.totalSize}" type="application/x-nzb" />`,
    `      <newznab:attr name="category" value="${result.category}" />`,
    `      <newznab:attr name="size" value="${result.totalSize}" />`,
    `      <newznab:attr name="files" value="${result.files.length}" />`,
    result.bitRate > 0
      ? `      <newznab:attr name="audio:bitrate" value="${result.bitRate}" />`
      : "",
    `      <newznab:attr name="usenetdate" value="${new Date().toUTCString()}" />`,
    "    </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default router;
