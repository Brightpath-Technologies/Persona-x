import type { InterviewQuestion } from "./biz-case-types";

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    prompt: "What problem are you solving, and who does it affect?",
    challengePersonaSlug: "founder",
  },
  {
    prompt: "Describe your Build option and Buy option. What vendors or products are you comparing?",
    challengePersonaSlug: null,
  },
  {
    prompt: "Is software a core differentiator for your business, or a supporting capability?",
    challengePersonaSlug: "ip-manager",
  },
  {
    prompt: "What is your estimated budget and timeline for each option?",
    challengePersonaSlug: "risk-assessment-specialist",
  },
  {
    prompt: "What are your critical technical requirements — integrations, compliance, data residency, scale?",
    challengePersonaSlug: "cybersecurity-specialist",
  },
  {
    prompt: "What concerns you most about building? About buying?",
    challengePersonaSlug: "contracting-specialist",
  },
  {
    prompt: "What does success look like in 12 months? How will you measure it?",
    challengePersonaSlug: "founder",
  },
];

/** For persona-picker hints — which question topic each persona challenges */
export const PERSONA_CHALLENGE_TOPIC: Record<string, string> = {
  "founder": "Problem framing & success criteria",
  "ip-manager": "Strategic fit & IP ownership",
  "risk-assessment-specialist": "Budget & timeline realism",
  "cybersecurity-specialist": "Technical requirements",
  "contracting-specialist": "Vendor risks & lock-in",
};
