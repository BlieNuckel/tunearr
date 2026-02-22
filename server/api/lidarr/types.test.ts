import { describe, it, expect } from "vitest";
import { extractLidarrError } from "./types";

describe("extractLidarrError", () => {
  it("extracts errorMessage from array format", () => {
    const data = [{ errorMessage: "Artist already exists" }];
    expect(extractLidarrError(data)).toBe("Artist already exists");
  });

  it("extracts message from object format", () => {
    const data = { message: "Not found" };
    expect(extractLidarrError(data)).toBe("Not found");
  });

  it("falls back to JSON.stringify for unknown format", () => {
    const data = { code: 500 };
    expect(extractLidarrError(data)).toBe('{"code":500}');
  });

  it("handles empty array", () => {
    expect(extractLidarrError([])).toBe("[]");
  });

  it("handles array with object missing errorMessage", () => {
    const data = [{ someOtherField: "value" }];
    expect(extractLidarrError(data)).toBe('[{"someOtherField":"value"}]');
  });
});
