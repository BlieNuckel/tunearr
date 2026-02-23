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

type CachedSearch = { results: GroupedSearchResult[]; expiresAt: number };
const searchCache = new Map<string, CachedSearch>();

const CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_LIMIT = 100;

function cleanExpiredCaches(): void {
  const now = Date.now();
  for (const [key, entry] of resultCache) {
    if (entry.expiresAt < now) resultCache.delete(key);
  }
  for (const [key, entry] of searchCache) {
    if (entry.expiresAt < now) searchCache.delete(key);
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
  cleanExpiredCaches();

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
    log.error("Search failed:", err);
    res
      .status(500)
      .type("text/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><error code="900" description="Internal error" />`
      );
  }
}

async function getOrSearchResults(
  query: string
): Promise<GroupedSearchResult[]> {
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    log.info(`Search "${query}": serving from cache (${cached.results.length} results)`);
    return cached.results;
  }

  log.info(`Searching slskd for: "${query}"`);

  const searchState = await startSearch(query);
  const waitResult = await waitForSearch(searchState.id);

  if (!waitResult.completed) {
    log.warn(`Search timed out for "${query}", returning partial results`);
  }

  const responses = await getSearchResponses(searchState.id);
  log.info(
    `Search "${query}": ${responses.length} responses, ${responses.reduce((n, r) => n + r.fileCount, 0)} files`
  );
  deleteSearch(searchState.id).catch(() => {});

  const results = groupSearchResults(responses);
  log.info(
    `Search "${query}": ${results.length} grouped results after filtering`
  );

  cleanExpiredCaches();
  searchCache.set(cacheKey, {
    results,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return results;
}

function cacheResultsForDownload(results: GroupedSearchResult[]): void {
  const now = Date.now();
  for (const result of results) {
    resultCache.set(result.guid, { result, expiresAt: now + CACHE_TTL_MS });
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

function buildTestResultXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:newznab="http://www.newznab.com/DTD/2010/feeds/attributes/">',
    "  <channel>",
    "    <title>music-requester slskd</title>",
    "    <item>",
    "      <title>slskd indexer test</title>",
    '      <newznab:attr name="category" value="3000" />',
    '      <newznab:attr name="size" value="0" />',
    `      <newznab:attr name="usenetdate" value="${new Date().toUTCString()}" />`,
    "    </item>",
    "  </channel>",
    "</rss>",
  ].join("\n");
}

function buildResultsXml(
  results: GroupedSearchResult[],
  total: number,
  offset: number,
  baseUrl: string
): string {
  const items = results.map((r) => buildItemXml(r, baseUrl)).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:newznab="http://www.newznab.com/DTD/2010/feeds/attributes/">',
    "  <channel>",
    "    <title>music-requester slskd</title>",
    `    <newznab:response offset="${offset}" total="${total}" />`,
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
