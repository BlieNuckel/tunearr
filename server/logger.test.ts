import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "./logger";

describe("createLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:30:00.000Z"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("formats info messages with timestamp, level, and label", () => {
    const logger = createLogger("TestLabel");
    logger.info("something happened");

    expect(console.log).toHaveBeenCalledWith(
      "2026-01-15T12:30:00.000Z [INFO] [TestLabel] something happened"
    );
  });

  it("formats warn messages", () => {
    const logger = createLogger("MyService");
    logger.warn("watch out");

    expect(console.warn).toHaveBeenCalledWith(
      "2026-01-15T12:30:00.000Z [WARN] [MyService] watch out"
    );
  });

  it("formats error messages", () => {
    const logger = createLogger("API");
    logger.error("request failed");

    expect(console.error).toHaveBeenCalledWith(
      "2026-01-15T12:30:00.000Z [ERROR] [API] request failed"
    );
  });

  it("suppresses debug messages by default", () => {
    const logger = createLogger("Debug");
    logger.debug("this should not appear");

    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("serializes data argument as JSON on a new line", () => {
    const logger = createLogger("Import");
    const data = { path: "/music/track.flac", tracks: 3 };
    logger.info("scan result", data);

    expect(console.log).toHaveBeenCalledWith(
      "2026-01-15T12:30:00.000Z [INFO] [Import] scan result",
      '\n{\n  "path": "/music/track.flac",\n  "tracks": 3\n}'
    );
  });

  it("serializes data for error level", () => {
    const logger = createLogger("API");
    logger.error("failed", { status: 500 });

    expect(console.error).toHaveBeenCalledWith(
      "2026-01-15T12:30:00.000Z [ERROR] [API] failed",
      '\n{\n  "status": 500\n}'
    );
  });

  it("does not pass data argument when undefined", () => {
    const logger = createLogger("Test");
    logger.info("no data");

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      "2026-01-15T12:30:00.000Z [INFO] [Test] no data"
    );
  });
});
