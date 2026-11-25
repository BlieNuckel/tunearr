import { describe, it, expect, vi } from "vitest";
import {
  SlskdUnreachableError,
  describeConnectionFailure,
  errorMessage,
  logSlskdFailure,
} from "./errors";

function undiciFailure(cause: unknown): TypeError {
  return new TypeError("fetch failed", { cause });
}

function codedError(code: string, message = `connect ${code}`): Error {
  return Object.assign(new Error(message), { code });
}

describe("describeConnectionFailure", () => {
  it("explains a refused connection from undici's cause", () => {
    const err = undiciFailure(
      codedError("ECONNREFUSED", "connect ECONNREFUSED 10.200.200.2:5030")
    );

    expect(describeConnectionFailure(err)).toBe(
      "connection refused, is slskd running?"
    );
  });

  it("finds the code inside an AggregateError of per-address attempts", () => {
    const err = undiciFailure(
      new AggregateError([
        codedError("EHOSTUNREACH"),
        codedError("EHOSTUNREACH"),
      ])
    );

    expect(describeConnectionFailure(err)).toBe("host unreachable");
  });

  it("explains an unknown host", () => {
    const err = undiciFailure(codedError("ENOTFOUND"));
    expect(describeConnectionFailure(err)).toBe(
      "host not found, check the slskd URL"
    );
  });

  it("explains a request timeout from AbortSignal.timeout", () => {
    const err = new DOMException("The operation was aborted", "TimeoutError");
    expect(describeConnectionFailure(err)).toBe(
      "no response before the request timed out"
    );
  });

  it("falls back to the innermost message for unknown failures", () => {
    const err = undiciFailure(new Error("something odd"));
    expect(describeConnectionFailure(err)).toBe("something odd");
  });

  it("handles non-error values", () => {
    expect(describeConnectionFailure("boom")).toBe("boom");
  });
});

describe("SlskdUnreachableError", () => {
  it("names the URL and the reason, and keeps the original as cause", () => {
    const cause = undiciFailure(codedError("ECONNREFUSED"));
    const err = new SlskdUnreachableError("http://10.200.200.2:5030", cause);

    expect(err.message).toBe(
      "slskd unreachable at http://10.200.200.2:5030: connection refused, is slskd running?"
    );
    expect(err.name).toBe("SlskdUnreachableError");
    expect(err.cause).toBe(cause);
  });
});

describe("logSlskdFailure", () => {
  it("logs other failures with the error attached", () => {
    const log = { error: vi.fn() };
    const err = new Error("slskd get transfers failed: 401");

    logSlskdFailure(log, "Queue poll failed:", err);

    expect(log.error).toHaveBeenCalledWith("Queue poll failed:", err);
  });

  it("stays quiet for unreachable errors, which slskdFetch already logged", () => {
    const log = { error: vi.fn() };

    logSlskdFailure(
      log,
      "Queue poll failed:",
      new SlskdUnreachableError("http://slskd:5030", new Error("x"))
    );

    expect(log.error).not.toHaveBeenCalled();
  });
});

describe("errorMessage", () => {
  it("returns an error's message", () => {
    expect(errorMessage(new Error("nope"))).toBe("nope");
  });

  it("falls back for non-errors", () => {
    expect(errorMessage(42)).toBe("Unknown error");
  });
});
