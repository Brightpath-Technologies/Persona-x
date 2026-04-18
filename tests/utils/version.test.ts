import { describe, expect, it } from "vitest";
import {
  bumpVersion,
  formatSemVer,
  inferBumpType,
  parseSemVer,
} from "../../src/utils/version.js";

describe("parseSemVer", () => {
  it("parses a well-formed version", () => {
    expect(parseSemVer("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseSemVer("0.0.0")).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it("returns null on malformed input", () => {
    expect(parseSemVer("1.2")).toBeNull();
    expect(parseSemVer("1.2.3-beta")).toBeNull();
    expect(parseSemVer("v1.2.3")).toBeNull();
    expect(parseSemVer("abc")).toBeNull();
  });
});

describe("formatSemVer", () => {
  it("roundtrips through parseSemVer", () => {
    const versions = ["0.1.0", "1.0.0", "10.20.30"];
    for (const v of versions) {
      expect(formatSemVer(parseSemVer(v)!)).toBe(v);
    }
  });
});

describe("bumpVersion", () => {
  it("major bump resets minor and patch", () => {
    expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
  });

  it("minor bump resets patch but keeps major", () => {
    expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
  });

  it("patch bump only touches patch", () => {
    expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
  });

  it("falls back to 1.0.0 when input is malformed", () => {
    expect(bumpVersion("not-a-version", "major")).toBe("1.0.0");
  });
});

describe("inferBumpType", () => {
  it("changes to rubric force a major bump", () => {
    expect(inferBumpType(["rubric"])).toBe("major");
  });

  it("changes to boundaries force a major bump", () => {
    expect(inferBumpType(["boundaries"])).toBe("major");
  });

  it("changes to purpose force a major bump", () => {
    expect(inferBumpType(["purpose"])).toBe("major");
  });

  it("changes to panel_role or reasoning are minor", () => {
    expect(inferBumpType(["panel_role"])).toBe("minor");
    expect(inferBumpType(["reasoning"])).toBe("minor");
  });

  it("unknown sections fall through to patch", () => {
    expect(inferBumpType(["metadata_wording"])).toBe("patch");
    expect(inferBumpType([])).toBe("patch");
  });

  it("majors win over minors when multiple sections change", () => {
    expect(inferBumpType(["reasoning", "rubric"])).toBe("major");
  });
});
