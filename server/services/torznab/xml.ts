import type { GroupedSearchResult } from "../../api/slskd/types";
import { buildReleaseTitle } from "./releaseTitle";

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildCapsXml(): string {
  return [
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
  ].join("\n");
}

export function buildTestResultXml(): string {
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

function buildItemXml(result: GroupedSearchResult, baseUrl: string): string {
  const title = escapeXml(buildReleaseTitle(result.directory, result.formatTag));
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

export function buildResultsXml(
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
