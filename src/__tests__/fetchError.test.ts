import {
  FetchError,
  errorKindOf,
  isRetryableError,
  responseError,
} from "@/utils/fetchError";

function res(status: number, body: unknown): Response {
  return {
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("responseError", () => {
  it("keeps the server's message and retry hints", async () => {
    const error = await responseError(
      res(503, {
        error: "MusicBrainz is busy (returned 503)",
        retryable: true,
        retryAfterMs: 1000,
      }),
      "Failed"
    );

    expect(error).toBeInstanceOf(FetchError);
    expect(error.message).toBe("MusicBrainz is busy (returned 503)");
    expect(error.status).toBe(503);
    expect(error.retryable).toBe(true);
    expect(error.retryAfterMs).toBe(1000);
  });

  it("falls back when the body isn't JSON", async () => {
    const error = await responseError(
      {
        status: 500,
        json: () => Promise.reject(new Error("not json")),
      } as unknown as Response,
      "Failed to load album"
    );

    expect(error.message).toBe("Failed to load album");
    expect(error.retryable).toBe(false);
  });
});

describe("errorKindOf", () => {
  it("tells not found, busy and other apart", () => {
    expect(errorKindOf(new FetchError("x", 404))).toBe("notFound");
    expect(errorKindOf(new FetchError("x", 503, true))).toBe("busy");
    expect(errorKindOf(new FetchError("x", 500))).toBe("other");
    expect(errorKindOf(new Error("x"))).toBe("other");
  });

  it("only treats a flagged FetchError as retryable", () => {
    expect(isRetryableError(new FetchError("x", 503, true))).toBe(true);
    expect(isRetryableError(new FetchError("x", 503))).toBe(false);
    expect(isRetryableError(new Error("x"))).toBe(false);
  });
});
