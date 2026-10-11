// Canonical human-contributor roles. Shared by the contributors directory and
// the per-edition credit form so roles stay consistent everywhere.

export const CONTRIBUTOR_ROLES = [
  { value: "reporter", label: "Reporter" },
  { value: "writer", label: "Writer" },
  { value: "copy_editor", label: "Copy editor" },
  { value: "photographer", label: "Photographer" },
  { value: "illustrator", label: "Illustrator / artist" },
  { value: "expert", label: "Subject-matter expert" },
  { value: "fact_checker", label: "Fact-checker" },
  { value: "editor", label: "Editor" },
  { value: "other", label: "Other" },
] as const;

export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number]["value"];

const LABELS: Record<string, string> = Object.fromEntries(
  CONTRIBUTOR_ROLES.map((r) => [r.value, r.label])
);

export function roleLabel(value: string): string {
  return LABELS[value] ?? value;
}
