/**
 * Semantic Versioning for Persona Files
 *
 * Persona files use semver (MAJOR.MINOR.PATCH):
 * - MAJOR: Breaking changes to the persona's core judgement profile or boundaries
 * - MINOR: New sections added, rubric scores adjusted, reasoning refined
 * - PATCH: Wording fixes, note clarifications, metadata updates
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export function parseSemVer(version: string): SemVer | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
  };
}

export function formatSemVer(version: SemVer): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function bumpVersion(
  current: string,
  type: "major" | "minor" | "patch",
): string {
  const parsed = parseSemVer(current);
  if (!parsed) return "1.0.0";

  switch (type) {
    case "major":
      return formatSemVer({ major: parsed.major + 1, minor: 0, patch: 0 });
    case "minor":
      return formatSemVer({
        major: parsed.major,
        minor: parsed.minor + 1,
        patch: 0,
      });
    case "patch":
      return formatSemVer({
        major: parsed.major,
        minor: parsed.minor,
        patch: parsed.patch + 1,
      });
  }
}

export interface ChangelogEntry {
  version: string;
  date: string;
  author: string;
  changes: string[];
}

/**
 * Determine the appropriate version bump type based on which sections changed.
 */
export function inferBumpType(
  changedSections: string[],
): "major" | "minor" | "patch" {
  const majorSections = ["rubric", "boundaries", "purpose"];
  const minorSections = [
    "panel_role",
    "reasoning",
    "interaction",
    "knowledge_base",
    "invocation",
  ];

  if (changedSections.some((s) => majorSections.includes(s))) {
    return "major";
  }
  if (changedSections.some((s) => minorSections.includes(s))) {
    return "minor";
  }
  return "patch";
}
