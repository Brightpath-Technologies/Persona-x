import type { TeamBrief, PersonaResponse, ProjectResources } from "./team-types";
import type { InterviewAnswer } from "./biz-case-types";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PRINT_STYLES = `
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 760px; margin: 40px auto; color: #111; line-height: 1.7; font-size: 14px; }
  h1 { font-size: 22px; margin: 0 0 4px; font-weight: bold; }
  h2 { font-size: 17px; margin: 28px 0 8px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 18px 0 6px; font-weight: bold; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 10px; padding-left: 20px; }
  li { margin-bottom: 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 24px; font-family: sans-serif; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #777; font-family: sans-serif; margin: 12px 0 2px; }
  pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
  @media print { body { margin: 0; } }
`;

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printHTML(title: string, bodyHTML: string): void {
  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>${bodyHTML}</body>
</html>`;

  const blob = new Blob([fullHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      win.print();
      URL.revokeObjectURL(url);
    });
  } else {
    URL.revokeObjectURL(url);
  }
}

// ── Team: Individual Response ─────────────────────────────────────────────────

export interface ResponseExportData {
  personaName: string;
  contributionType: string;
  tagline: string;
  stance: string;
  content: string;
}

export function buildResponseMarkdown(data: ResponseExportData): string {
  return [
    `# ${data.personaName}`,
    `*${data.contributionType} · ${data.stance}*`,
    ``,
    data.tagline,
    ``,
    `---`,
    ``,
    data.content,
  ].join("\n");
}

export function downloadResponseMarkdown(data: ResponseExportData): void {
  const slug = data.personaName.toLowerCase().replace(/\s+/g, "-");
  downloadFile(`${slug}-response.md`, buildResponseMarkdown(data), "text/markdown");
}

export function downloadResponseText(data: ResponseExportData): void {
  const slug = data.personaName.toLowerCase().replace(/\s+/g, "-");
  const content = [
    data.personaName,
    `${data.contributionType} · ${data.stance}`,
    data.tagline,
    ``,
    `---`,
    ``,
    data.content,
  ].join("\n");
  downloadFile(`${slug}-response.txt`, content, "text/plain");
}

export function printResponse(data: ResponseExportData): void {
  const bodyHTML = `
    <h1>${escapeHtml(data.personaName)}</h1>
    <p class="meta">${escapeHtml(data.contributionType)} · ${escapeHtml(data.stance)} · ${escapeHtml(data.tagline)}</p>
    <pre>${escapeHtml(data.content)}</pre>
  `;
  printHTML(`${data.personaName} — Software Team Advisor`, bodyHTML);
}

// ── Team: Full Brief ──────────────────────────────────────────────────────────

export interface BriefExportData {
  projectBrief: string;
  resources: ProjectResources;
  responses: PersonaResponse[];
  teamBrief: TeamBrief;
  founderVisionContent: string;
}

function verdictLabelText(rec: string): string {
  switch (rec) {
    case "go": return "Go";
    case "conditional_go": return "Conditional Go";
    case "no_go": return "No Go";
    default: return rec;
  }
}

export function buildFullBriefMarkdown(data: BriefExportData): string {
  const { projectBrief, resources, responses, teamBrief, founderVisionContent } = data;
  const lines: string[] = [];

  lines.push(`# Software Team Advisor — Team Brief`);
  lines.push(``);
  lines.push(`## Project`);
  lines.push(``);
  lines.push(projectBrief);

  const resourceLines: string[] = [];
  if (resources.budget?.trim()) resourceLines.push(`- **Budget:** ${resources.budget}`);
  if (resources.team?.trim()) resourceLines.push(`- **Team:** ${resources.team}`);
  if (resources.specialties?.trim()) resourceLines.push(`- **Specialties:** ${resources.specialties}`);
  if (resources.existingTools?.trim()) resourceLines.push(`- **Existing tools:** ${resources.existingTools}`);
  if (resourceLines.length > 0) {
    lines.push(``);
    lines.push(`### Available Resources`);
    lines.push(...resourceLines);
  }

  lines.push(``);
  lines.push(`## Team Verdict: ${verdictLabelText(teamBrief.verdict.recommendation)}`);
  lines.push(``);
  lines.push(teamBrief.verdict.summary);
  if (teamBrief.verdict.conditions.length > 0) {
    lines.push(``);
    lines.push(`**Conditions:**`);
    teamBrief.verdict.conditions.forEach((c) => lines.push(`- ${c}`));
  }

  lines.push(``);
  lines.push(`## Team Alignment (${teamBrief.alignment.strength})`);
  lines.push(``);
  teamBrief.alignment.areas.forEach((a) => lines.push(`- ${a}`));

  if (teamBrief.critical_risks.length > 0) {
    lines.push(``);
    lines.push(`## Critical Risks`);
    lines.push(``);
    teamBrief.critical_risks.forEach((r) => {
      lines.push(`- **${r.risk}** *(raised by ${r.raised_by})*`);
      lines.push(`  ${r.implication}`);
    });
  }

  if (teamBrief.build_priorities.length > 0) {
    lines.push(``);
    lines.push(`## Build Priorities`);
    lines.push(``);
    teamBrief.build_priorities.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
  }

  if (teamBrief.unknowns.length > 0) {
    lines.push(``);
    lines.push(`## Open Questions`);
    lines.push(``);
    teamBrief.unknowns.forEach((u) => lines.push(`- ${u}`));
  }

  if (responses.length > 0) {
    lines.push(``);
    lines.push(`## Specialist Responses`);
    responses.forEach((r) => {
      lines.push(``);
      lines.push(`### ${r.personaName}`);
      lines.push(``);
      lines.push(r.content);
    });
  }

  if (founderVisionContent) {
    lines.push(``);
    lines.push(`## Founder's Vision`);
    lines.push(``);
    lines.push(founderVisionContent);
  }

  return lines.join("\n");
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1");
}

export function downloadFullBriefMarkdown(data: BriefExportData): void {
  downloadFile("team-brief.md", buildFullBriefMarkdown(data), "text/markdown");
}

export function downloadFullBriefText(data: BriefExportData): void {
  downloadFile("team-brief.txt", stripMarkdown(buildFullBriefMarkdown(data)), "text/plain");
}

export function printFullBrief(data: BriefExportData): void {
  const { projectBrief, resources, responses, teamBrief, founderVisionContent } = data;

  const resList: string[] = [];
  if (resources.budget?.trim()) resList.push(`<strong>Budget:</strong> ${escapeHtml(resources.budget)}`);
  if (resources.team?.trim()) resList.push(`<strong>Team:</strong> ${escapeHtml(resources.team)}`);
  if (resources.specialties?.trim()) resList.push(`<strong>Specialties:</strong> ${escapeHtml(resources.specialties)}`);
  if (resources.existingTools?.trim()) resList.push(`<strong>Existing tools:</strong> ${escapeHtml(resources.existingTools)}`);
  const resourcesHTML = resList.length > 0 ? `<p class="meta">${resList.join(" &middot; ")}</p>` : "";

  const conditionsHTML = teamBrief.verdict.conditions.length > 0
    ? `<ul>${teamBrief.verdict.conditions.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`
    : "";

  const risksHTML = teamBrief.critical_risks.length > 0
    ? `<h2>Critical Risks</h2><ul>${teamBrief.critical_risks.map((r) =>
        `<li><strong>${escapeHtml(r.risk)}</strong> <em>(${escapeHtml(r.raised_by)})</em> — ${escapeHtml(r.implication)}</li>`
      ).join("")}</ul>`
    : "";

  const prioritiesHTML = teamBrief.build_priorities.length > 0
    ? `<h2>Build Priorities</h2><ol>${teamBrief.build_priorities.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ol>`
    : "";

  const unknownsHTML = teamBrief.unknowns.length > 0
    ? `<h2>Open Questions</h2><ul>${teamBrief.unknowns.map((u) => `<li>${escapeHtml(u)}</li>`).join("")}</ul>`
    : "";

  const responsesHTML = responses.length > 0
    ? `<h2>Specialist Responses</h2>${responses.map((r) =>
        `<h3>${escapeHtml(r.personaName)}</h3><pre>${escapeHtml(r.content)}</pre>`
      ).join("")}`
    : "";

  const founderHTML = founderVisionContent
    ? `<h2>Founder's Vision</h2><pre>${escapeHtml(founderVisionContent)}</pre>`
    : "";

  const bodyHTML = `
    <h1>Software Team Advisor — Team Brief</h1>
    <h2>Project</h2>
    <p>${escapeHtml(projectBrief)}</p>
    ${resourcesHTML}
    <h2>Team Verdict: ${escapeHtml(verdictLabelText(teamBrief.verdict.recommendation))}</h2>
    <p>${escapeHtml(teamBrief.verdict.summary)}</p>
    ${conditionsHTML}
    <h2>Team Alignment (${escapeHtml(teamBrief.alignment.strength)})</h2>
    <ul>${teamBrief.alignment.areas.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
    ${risksHTML}
    ${prioritiesHTML}
    ${unknownsHTML}
    ${responsesHTML}
    ${founderHTML}
  `;

  printHTML("Software Team Advisor — Team Brief", bodyHTML);
}

// ── Business Case ─────────────────────────────────────────────────────────────

export interface BizCaseExportData {
  answers: InterviewAnswer[];
  narrativeContent: string;
}

export function buildBizCaseMarkdown(data: BizCaseExportData): string {
  const { answers, narrativeContent } = data;
  const lines: string[] = [];

  lines.push(`# Build vs Buy Business Case`);

  if (answers.length > 0) {
    lines.push(``);
    lines.push(`## Interview Q&A`);
    answers.forEach((a, i) => {
      lines.push(``);
      lines.push(`### ${i + 1}. ${a.question}`);
      lines.push(``);
      lines.push(a.answer);
      if (a.challengeContent && a.challengePersonaName) {
        lines.push(``);
        lines.push(`**Expert Input (${a.challengePersonaName}):**`);
        lines.push(``);
        lines.push(a.challengeContent);
      }
    });
  }

  lines.push(``);
  lines.push(`## Business Case Narrative`);
  lines.push(``);
  lines.push(narrativeContent);

  return lines.join("\n");
}

export function downloadBizCaseMarkdown(data: BizCaseExportData): void {
  downloadFile("business-case.md", buildBizCaseMarkdown(data), "text/markdown");
}

export function downloadBizCaseText(data: BizCaseExportData): void {
  downloadFile("business-case.txt", stripMarkdown(buildBizCaseMarkdown(data)), "text/plain");
}

export function printBizCase(data: BizCaseExportData): void {
  const { answers, narrativeContent } = data;

  const qaHTML = answers.length > 0
    ? `<h2>Interview Q&amp;A</h2>${answers.map((a, i) => `
      <h3>${i + 1}. ${escapeHtml(a.question)}</h3>
      <pre>${escapeHtml(a.answer)}</pre>
      ${a.challengeContent && a.challengePersonaName
        ? `<p class="label">Expert Input — ${escapeHtml(a.challengePersonaName)}</p><pre>${escapeHtml(a.challengeContent)}</pre>`
        : ""}
    `).join("")}`
    : "";

  const bodyHTML = `
    <h1>Build vs Buy Business Case</h1>
    ${qaHTML}
    <h2>Business Case Narrative</h2>
    <pre>${escapeHtml(narrativeContent)}</pre>
  `;

  printHTML("Build vs Buy Business Case", bodyHTML);
}
