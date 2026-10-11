import path from "path";
import { readFile, readdir } from "fs/promises";
import { parse as parseYaml } from "yaml";

// The editorial board is staffed by persona-x persona definitions (reused from
// the Decision Engine). We read the YAML directly and extract just the fields
// the board needs — no coupling to the persona-x runtime.

const BOARD_DIR = path.join(process.cwd(), "personas", "board");

export interface BoardMember {
  id: string; // file slug
  name: string;
  contribution: string; // panel_role.contribution_type
  expectedValue: string; // panel_role.expected_value
  challengeStrength: string; // interaction.challenge_strength
  systematicallyQuestions: string[];
}

let cache: BoardMember[] | null = null;

export async function loadEditorialBoard(): Promise<BoardMember[]> {
  if (cache) return cache;

  const files = (await readdir(BOARD_DIR)).filter((f) => f.endsWith(".yaml"));
  const members: BoardMember[] = [];

  for (const file of files) {
    const text = await readFile(path.join(BOARD_DIR, file), "utf8");
    const doc = parseYaml(text) as Record<string, unknown>;
    const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
    const role = (doc.panel_role ?? {}) as Record<string, unknown>;
    const reasoning = (doc.reasoning ?? {}) as Record<string, unknown>;
    const interaction = (doc.interaction ?? {}) as Record<string, unknown>;

    members.push({
      id: file.replace(/\.yaml$/, ""),
      name: String(metadata.name ?? file),
      contribution: String(role.contribution_type ?? "reviewer"),
      expectedValue: String(role.expected_value ?? ""),
      challengeStrength: String(interaction.challenge_strength ?? "moderate"),
      systematicallyQuestions: Array.isArray(reasoning.systematically_questions)
        ? (reasoning.systematically_questions as unknown[]).map(String)
        : [],
    });
  }

  cache = members.sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}
