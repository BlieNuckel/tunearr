import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { lidarrFetch } from "./fetch";

type Received = {
  method?: string;
  url?: string;
  apiKey?: string;
  body: string;
};

let server: http.Server;
let baseUrl: string;
let received: Received[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({
        method: req.method,
        url: req.url,
        apiKey: req.headers["x-api-key"] as string | undefined,
        body,
      });
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ version: "2.0.0" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("lidarrFetch over a real socket", () => {
  it("completes a GET through the custom dispatcher", async () => {
    received = [];
    const res = await lidarrFetch(`${baseUrl}/api/v1/system/status`, {
      headers: { "X-Api-Key": "key-123" },
    });

    expect(res.ok).toBe(true);
    expect(await res.json()).toEqual({ version: "2.0.0" });
    expect(received).toEqual([
      {
        method: "GET",
        url: "/api/v1/system/status",
        apiKey: "key-123",
        body: "",
      },
    ]);
  });

  it("sends a POST body through the custom dispatcher", async () => {
    received = [];
    await lidarrFetch(`${baseUrl}/api/v1/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "AlbumSearch" }),
    });

    expect(received[0].method).toBe("POST");
    expect(JSON.parse(received[0].body)).toEqual({ name: "AlbumSearch" });
  });
});
