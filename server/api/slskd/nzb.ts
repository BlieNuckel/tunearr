import type { NzbMetadata } from "./types";

export function encodeNzb(title: string, metadata: NzbMetadata): string {
  const encoded = Buffer.from(JSON.stringify(metadata)).toString("base64");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<nzb xmlns="http://www.newzbin.com/DTD/2003/nzb">',
    `  <head>`,
    `    <meta type="title">${escapeXml(title)}</meta>`,
    `    <meta type="slskd">${encoded}</meta>`,
    `  </head>`,
    `  <file poster="tunearr" date="${Math.floor(Date.now() / 1000)}" subject="${escapeXml(title)}">`,
    `    <groups><group>alt.binaries.music</group></groups>`,
    `    <segments><segment number="1" bytes="${metadata.files.reduce((sum, f) => sum + f.size, 0)}">placeholder@slskd</segment></segments>`,
    `  </file>`,
    `</nzb>`,
  ].join("\n");
}

export function decodeNzb(nzbXml: string): NzbMetadata {
  const match = nzbXml.match(/<meta type="slskd">([^<]+)<\/meta>/);
  if (!match) {
    throw new Error("NZB does not contain slskd metadata");
  }
  return JSON.parse(Buffer.from(match[1], "base64").toString("utf-8"));
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
