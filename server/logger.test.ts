import { describe, it, expect } from "vitest";
import { serializeData, formatErrorText, type SerializedError } from "./logger";

function withCause<T extends Error>(error: T, cause: unknown): T {
  return Object.assign(error, { cause });
}

function fetchFailed(cause: unknown): TypeError {
  return withCause(new TypeError("fetch failed"), cause);
}

function errnoError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

/** Same shape as undici's AggregateError; the server lib predates the global. */
function aggregateError(errors: Error[], code?: string): Error {
  return Object.assign(new Error(""), { name: "AggregateError", errors, code });
}

describe("serializeData", () => {
  it("passes non-error data through untouched", () => {
    const data = { count: 3 };
    expect(serializeData(data)).toBe(data);
    expect(serializeData("text")).toBe("text");
  });

  it("serializes an error without a cause to name, message and stack", () => {
    const error = new Error("boom");
    expect(serializeData(error)).toEqual({
      name: "Error",
      message: "boom",
      stack: error.stack,
    });
  });

  it("keeps the cause and its code from undici's fetch failed", () => {
    const cause = errnoError(
      "connect ECONNREFUSED 127.0.0.1:5030",
      "ECONNREFUSED"
    );
    const result = serializeData(fetchFailed(cause)) as SerializedError;

    expect(result.message).toBe("fetch failed");
    expect(result.cause).toMatchObject({
      name: "Error",
      message: "connect ECONNREFUSED 127.0.0.1:5030",
      code: "ECONNREFUSED",
    });
  });

  it("keeps each inner error of an AggregateError cause", () => {
    const aggregate = aggregateError(
      [
        errnoError("connect ETIMEDOUT ::1:5030", "ETIMEDOUT"),
        errnoError("connect ETIMEDOUT 127.0.0.1:5030", "ETIMEDOUT"),
      ],
      "ETIMEDOUT"
    );
    const result = serializeData(fetchFailed(aggregate)) as SerializedError;
    const cause = result.cause as SerializedError;

    expect(cause.code).toBe("ETIMEDOUT");
    expect(cause.errors).toEqual([
      expect.objectContaining({ message: "connect ETIMEDOUT ::1:5030" }),
      expect.objectContaining({ message: "connect ETIMEDOUT 127.0.0.1:5030" }),
    ]);
  });

  it("keeps a non-error cause as is", () => {
    const result = serializeData(
      withCause(new Error("outer"), { reason: "x" })
    ) as SerializedError;
    expect(result.cause).toEqual({ reason: "x" });
  });

  it("stops following causes after a fixed depth", () => {
    let error = new Error("level 0");
    for (let i = 1; i <= 10; i++) {
      error = withCause(new Error(`level ${i}`), error);
    }

    let depth = 0;
    let current = serializeData(error) as SerializedError;
    while (current.cause) {
      current = current.cause as SerializedError;
      depth++;
    }
    expect(depth).toBe(5);
  });
});

describe("formatErrorText", () => {
  it("prints the stack, then the cause with its code", () => {
    const cause = errnoError("other side closed", "UND_ERR_SOCKET");
    const text = formatErrorText(
      serializeData(fetchFailed(cause)) as SerializedError
    );

    expect(text).toMatch(/^TypeError: fetch failed/);
    expect(text).toContain("Caused by: Error: other side closed");
    expect(text).toContain("  code: UND_ERR_SOCKET");
  });

  it("lists the inner errors of an aggregate cause", () => {
    const aggregate = aggregateError([
      errnoError("connect ECONNREFUSED ::1:5030", "ECONNREFUSED"),
    ]);
    const text = formatErrorText(
      serializeData(fetchFailed(aggregate)) as SerializedError
    );

    expect(text).toContain("  - Error: connect ECONNREFUSED ::1:5030");
    expect(text).toContain("code: ECONNREFUSED");
  });

  it("prints a non-error cause as JSON", () => {
    const text = formatErrorText(
      serializeData(
        withCause(new Error("outer"), { reason: "x" })
      ) as SerializedError
    );
    expect(text).toContain('Caused by: {"reason":"x"}');
  });
});
