import { describe, it, expect } from "vitest";
import { parseResponseJson } from "./parseResponseJson";

function makeResponse(
  body: string,
  contentType: string | null,
  status = 200,
): Response {
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  return new Response(body, { status, headers });
}

describe("parseResponseJson", () => {
  it("parses valid JSON response", async () => {
    const response = makeResponse('{"id":1}', "application/json");
    const data = await parseResponseJson(response);
    expect(data).toEqual({ id: 1 });
  });

  it("parses JSON with charset suffix", async () => {
    const response = makeResponse("[1,2]", "application/json; charset=utf-8");
    const data = await parseResponseJson(response);
    expect(data).toEqual([1, 2]);
  });

  it("throws on HTML response", async () => {
    const response = makeResponse(
      "<!DOCTYPE html><html><body>Not Found</body></html>",
      "text/html",
      404,
    );
    await expect(parseResponseJson(response)).rejects.toThrow(
      "Lidarr returned non-JSON response",
    );
    await expect(
      parseResponseJson(
        makeResponse("<!DOCTYPE html>", "text/html", 404),
      ),
    ).rejects.toThrow("404");
  });

  it("throws on plain text response", async () => {
    const response = makeResponse("not json", "text/plain", 200);
    await expect(parseResponseJson(response)).rejects.toThrow(
      "non-JSON response",
    );
  });

  it("truncates long body in error message", async () => {
    const longBody = "x".repeat(500);
    const response = makeResponse(longBody, "text/plain", 500);
    try {
      await parseResponseJson(response);
      expect.fail("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg.length).toBeLessThan(400);
      expect(msg).toContain("…");
    }
  });
});
