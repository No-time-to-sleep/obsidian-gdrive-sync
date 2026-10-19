import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Manifest = {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  isDesktopOnly: boolean;
};

const manifest = JSON.parse(
  readFileSync("manifest.json", "utf8")
) as Manifest;
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};
const versions = JSON.parse(readFileSync("versions.json", "utf8")) as Record<
  string,
  string
>;

describe("release metadata", () => {
  it("keeps manifest and package versions in sync", () => {
    expect(manifest.version).toBe(pkg.version);
  });

  it("has a versions.json entry for the current version", () => {
    expect(versions[manifest.version]).toBe(manifest.minAppVersion);
  });

  it("is mobile-compatible in manifest", () => {
    expect(manifest.isDesktopOnly).toBe(false);
  });

  it("declares the expected plugin id", () => {
    expect(manifest.id).toBe("gdrive-byo-sync");
  });

  it("keeps the store description within limits", () => {
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.description.length).toBeLessThanOrEqual(250);
  });
});
