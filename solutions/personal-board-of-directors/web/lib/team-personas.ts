import type { TeamMemberProfile } from "./team-types";

export const COST_PER_PERSONA = 0.02;
export const BRIEF_COST = 0.05;

/**
 * Catalogue entry for each software team persona.
 * Order determines the display order in the selector grid.
 */
export const TEAM_PERSONA_CATALOGUE: TeamMemberProfile[] = [
  {
    id: "founder",
    name: "Founder",
    tagline: "Product vision, business case, and speed-to-market decisions.",
    contributionType: "integrator",
  },
  {
    id: "frontend-developer",
    name: "Frontend Developer",
    tagline: "Client-side architecture, component design, and browser performance.",
    contributionType: "challenger",
  },
  {
    id: "backend-developer",
    name: "Backend Developer",
    tagline: "API design, data modelling, and server-side reliability.",
    contributionType: "challenger",
  },
  {
    id: "software-engineer",
    name: "Software Engineer",
    tagline: "System architecture, code quality, and long-term maintainability.",
    contributionType: "sense-checker",
  },
  {
    id: "ui-ux-specialist",
    name: "UI/UX Specialist",
    tagline: "User flows, interaction design, and accessibility standards.",
    contributionType: "integrator",
  },
  {
    id: "brand-manager",
    name: "Brand Manager",
    tagline: "Brand identity, tone of voice, and market positioning.",
    contributionType: "integrator",
  },
  {
    id: "ip-manager",
    name: "IP Manager",
    tagline: "Open-source licences, trademarks, and intellectual property risk.",
    contributionType: "sense-checker",
  },
  {
    id: "cybersecurity-specialist",
    name: "Cybersecurity Specialist",
    tagline: "Threat modelling, security controls, and data protection.",
    contributionType: "challenger",
  },
  {
    id: "contracting-specialist",
    name: "Contracting Specialist",
    tagline: "Vendor agreements, terms of service, and contractual obligations.",
    contributionType: "sense-checker",
  },
  {
    id: "risk-assessment-specialist",
    name: "Risk Assessment Specialist",
    tagline: "Project risks, dependency exposure, and mitigation planning.",
    contributionType: "sense-checker",
  },
];

/**
 * Compute the estimated cost for a given team composition.
 */
export function estimateCost(personaCount: number): number {
  return personaCount * COST_PER_PERSONA + BRIEF_COST;
}

