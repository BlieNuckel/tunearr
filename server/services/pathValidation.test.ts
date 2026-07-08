import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  listDirectorySuggestions,
  validateWritableDirectory,
} from "./pathValidation";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "path-validation-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("validateWritableDirectory", () => {
  it("returns valid for an existing writable directory", () => {
    expect(validateWritableDirectory(tmpDir)).toEqual({ valid: true });
  });

  it("returns error for a non-existent path", () => {
    const result = validateWritableDirectory(path.join(tmpDir, "missing"));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("does not exist");
  });

  it("returns error when the path is a file", () => {
    const filePath = path.join(tmpDir, "file.txt");
    fs.writeFileSync(filePath, "content");
    const result = validateWritableDirectory(filePath);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not a directory");
  });

  it("returns error for a non-writable directory", () => {
    if (process.getuid?.() === 0) {
      return;
    }
    const readOnlyDir = path.join(tmpDir, "readonly");
    fs.mkdirSync(readOnlyDir, { mode: 0o555 });
    const result = validateWritableDirectory(readOnlyDir);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("write permission");
  });
});

describe("listDirectorySuggestions", () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, "imports"));
    fs.mkdirSync(path.join(tmpDir, "images"));
    fs.mkdirSync(path.join(tmpDir, "downloads"));
    fs.mkdirSync(path.join(tmpDir, ".hidden"));
    fs.writeFileSync(path.join(tmpDir, "im-a-file.txt"), "content");
  });

  it("lists all visible directories for a path ending in a separator", () => {
    const result = listDirectorySuggestions(tmpDir + path.sep);
    expect(result).toEqual([
      path.join(tmpDir, "downloads"),
      path.join(tmpDir, "images"),
      path.join(tmpDir, "imports"),
    ]);
  });

  it("filters directories by the basename prefix", () => {
    const result = listDirectorySuggestions(path.join(tmpDir, "im"));
    expect(result).toEqual([
      path.join(tmpDir, "images"),
      path.join(tmpDir, "imports"),
    ]);
  });

  it("matches prefix case-insensitively", () => {
    const result = listDirectorySuggestions(path.join(tmpDir, "IM"));
    expect(result).toEqual([
      path.join(tmpDir, "images"),
      path.join(tmpDir, "imports"),
    ]);
  });

  it("excludes files from suggestions", () => {
    const result = listDirectorySuggestions(path.join(tmpDir, "im"));
    expect(result).not.toContain(path.join(tmpDir, "im-a-file.txt"));
  });

  it("hides dot directories unless the prefix starts with a dot", () => {
    expect(listDirectorySuggestions(tmpDir + path.sep)).not.toContain(
      path.join(tmpDir, ".hidden")
    );
    expect(listDirectorySuggestions(path.join(tmpDir, ".h"))).toEqual([
      path.join(tmpDir, ".hidden"),
    ]);
  });

  it("returns empty array for a non-existent base directory", () => {
    expect(
      listDirectorySuggestions(path.join(tmpDir, "missing", "sub"))
    ).toEqual([]);
  });

  it("returns empty array for empty or relative input", () => {
    expect(listDirectorySuggestions("")).toEqual([]);
    expect(listDirectorySuggestions("relative/path")).toEqual([]);
  });
});
