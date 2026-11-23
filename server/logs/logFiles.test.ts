import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { listLogFiles } from "./logFiles";

let dir: string;

function touch(name: string, content = "") {
  fs.writeFileSync(path.join(dir, name), content);
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "log-files-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("listLogFiles", () => {
  it("returns nothing when the directory does not exist", () => {
    expect(listLogFiles(path.join(dir, "missing"))).toEqual([]);
  });

  it("orders days newest first and a day's size parts highest first", () => {
    touch("tunearr-2026-11-21.json");
    touch("tunearr-2026-11-23.json");
    touch("tunearr-2026-11-23.json.2");
    touch("tunearr-2026-11-23.json.10");
    touch("tunearr-2026-11-23.json.1");
    touch("tunearr-2026-11-22.json");

    expect(listLogFiles(dir).map((file) => path.basename(file.path))).toEqual([
      "tunearr-2026-11-23.json.10",
      "tunearr-2026-11-23.json.2",
      "tunearr-2026-11-23.json.1",
      "tunearr-2026-11-23.json",
      "tunearr-2026-11-22.json",
      "tunearr-2026-11-21.json",
    ]);
  });

  it("ignores text logs, audit files and the current-file symlink", () => {
    touch("tunearr-2026-11-23.json");
    touch("tunearr-2026-11-23.log");
    touch(".abc123-audit.json");
    touch("other-2026-11-23.json");
    fs.symlinkSync(
      path.join(dir, "tunearr-2026-11-23.json"),
      path.join(dir, "tunearr.json")
    );

    expect(listLogFiles(dir).map((file) => path.basename(file.path))).toEqual([
      "tunearr-2026-11-23.json",
    ]);
  });

  it("reports each file's size", () => {
    touch("tunearr-2026-11-23.json", "12345");

    expect(listLogFiles(dir)[0].size).toBe(5);
  });
});
