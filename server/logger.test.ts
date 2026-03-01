import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock logger functions that will be available after import
let mockDebug: ReturnType<typeof vi.fn>;
let mockInfo: ReturnType<typeof vi.fn>;
let mockWarn: ReturnType<typeof vi.fn>;
let mockError: ReturnType<typeof vi.fn>;

// Mock winston
vi.mock("winston", () => ({
  default: {
    createLogger: vi.fn(() => ({
      debug: (...args: unknown[]) => (mockDebug || vi.fn())(...args),
      info: (...args: unknown[]) => (mockInfo || vi.fn())(...args),
      warn: (...args: unknown[]) => (mockWarn || vi.fn())(...args),
      error: (...args: unknown[]) => (mockError || vi.fn())(...args),
    })),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      printf: vi.fn(),
      json: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
    },
  },
  format: {
    combine: vi.fn(),
    timestamp: vi.fn(),
    printf: vi.fn(),
    json: vi.fn(),
  },
  transports: {
    Console: vi.fn(),
  },
}));

import { createLogger } from "./logger";

// Mock winston-daily-rotate-file
vi.mock("winston-daily-rotate-file", () => ({
  default: vi.fn(function () {
    return {
      on: vi.fn(),
    };
  }),
}));

// Mock fs
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  },
}));

describe("createLogger", () => {
  beforeEach(() => {
    mockDebug = vi.fn();
    mockInfo = vi.fn();
    mockWarn = vi.fn();
    mockError = vi.fn();
    vi.clearAllMocks();
  });

  it("creates a logger with correct label for info", () => {
    const logger = createLogger("TestLabel");
    logger.info("something happened");

    expect(mockInfo).toHaveBeenCalledWith({
      label: "TestLabel",
      message: "something happened",
    });
  });

  it("creates a logger with correct label for warn", () => {
    const logger = createLogger("MyService");
    logger.warn("watch out");

    expect(mockWarn).toHaveBeenCalledWith({
      label: "MyService",
      message: "watch out",
    });
  });

  it("creates a logger with correct label for error", () => {
    const logger = createLogger("API");
    logger.error("request failed");

    expect(mockError).toHaveBeenCalledWith({
      label: "API",
      message: "request failed",
    });
  });

  it("handles debug messages", () => {
    const logger = createLogger("Debug");
    logger.debug("this is a debug message");

    expect(mockDebug).toHaveBeenCalledWith({
      label: "Debug",
      message: "this is a debug message",
    });
  });

  it("passes data argument when provided", () => {
    const logger = createLogger("Import");
    const data = { path: "/music/track.flac", tracks: 3 };
    logger.info("scan result", data);

    expect(mockInfo).toHaveBeenCalledWith({
      label: "Import",
      message: "scan result",
      data,
    });
  });

  it("passes data for error level", () => {
    const logger = createLogger("API");
    logger.error("failed", { status: 500 });

    expect(mockError).toHaveBeenCalledWith({
      label: "API",
      message: "failed",
      data: { status: 500 },
    });
  });

  it("does not pass data argument when undefined", () => {
    const logger = createLogger("Test");
    logger.info("no data");

    expect(mockInfo).toHaveBeenCalledWith({
      label: "Test",
      message: "no data",
    });
  });

  it("maintains backward compatible interface", () => {
    const logger = createLogger("Test");

    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});
