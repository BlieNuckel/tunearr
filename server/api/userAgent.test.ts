import { describe, it, expect } from "vitest";
import packageJson from "../../package.json" with { type: "json" };
import {
  buildUserAgent,
  TUNEARR_CONTACT_URL,
  TUNEARR_USER_AGENT,
} from "./userAgent";

describe("buildUserAgent", () => {
  it("puts a v before the version", () => {
    expect(buildUserAgent("1.2.3")).toMatch(/^Tunearr\/v1\.2\.3 /);
  });

  it("names the project page as the contact", () => {
    expect(buildUserAgent("1.2.3")).toBe(
      "Tunearr/v1.2.3 (https://github.com/BlieNuckel/tunearr)"
    );
    expect(TUNEARR_CONTACT_URL).toBe("https://github.com/BlieNuckel/tunearr");
  });
});

describe("TUNEARR_USER_AGENT", () => {
  it("takes its version from package.json", () => {
    expect(TUNEARR_USER_AGENT).toBe(
      `Tunearr/v${packageJson.version} (https://github.com/BlieNuckel/tunearr)`
    );
  });
});
