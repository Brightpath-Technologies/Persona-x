"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProfileContext } from "@/lib/profile-context";
import { PROFILE_QUESTION_BANK, scoreResponses } from "@/lib/profile-questions";
import { RubricChart } from "@/components/rubric-chart";
import type {
  ProfileStep,
  SeniorityLevel,
  TimeHorizon,
  ProfileQuestionResponse,
  WebUserProfile,
} from "@/lib/types";

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: "early", label: "Early Career" },
  { value: "mid", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "executive", label: "Executive" },
  { value: "founder", label: "Founder / Owner" },
];

const TIME_HORIZON_OPTIONS: { value: TimeHorizon; label: string }[] = [
  { value: "immediate", label: "Immediate (days/weeks)" },
  { value: "short_term", label: "Short Term (1–3 months)" },
  { value: "medium_term", label: "Medium Term (3–12 months)" },
  { value: "long_term", label: "Long Term (1+ years)" },
];

const STEP_LABELS: Record<ProfileStep, string> = {
  about: "About You",
  goals: "Goals & Constraints",
  assessment: "Judgement Assessment",
  complete: "Your Profile",
};

const STEPS: ProfileStep[] = ["about", "goals", "assessment", "complete"];

export function ProfileForm() {
  const router = useRouter();
  const { profile: existingProfile, saveProfile } = useProfileContext();
  const [step, setStep] = useState<ProfileStep>(existingProfile ? "complete" : "about");

  // About fields
  const [name, setName] = useState(existingProfile?.name ?? "");
  const [background, setBackground] = useState(existingProfile?.background ?? "");
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel>(existingProfile?.seniorityLevel ?? "mid");
  const [domains, setDomains] = useState(existingProfile?.experienceDomains.join(", ") ?? "");
  const [context, setContext] = useState(existingProfile?.context ?? "");

  // Goals fields
  const [primaryGoal, setPrimaryGoal] = useState(existingProfile?.primaryGoal ?? "");
  const [successDefinition, setSuccessDefinition] = useState(existingProfile?.successDefinition ?? "");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>(existingProfile?.timeHorizon ?? "medium_term");
  const [sacrifices, setSacrifices] = useState(existingProfile?.sacrificesAcceptable.join(", ") ?? "");
  const [nonNegotiables, setNonNegotiables] = useState(existingProfile?.nonNegotiables.join(", ") ?? "");
  const [resourceLimits, setResourceLimits] = useState(existingProfile?.resourceLimits ?? "");
  const [weaknesses, setWeaknesses] = useState(existingProfile?.knownWeaknesses.join(", ") ?? "");
  const [blindSpots, setBlindSpots] = useState(existingProfile?.blindSpots.join(", ") ?? "");

  // Assessment
  const [responses, setResponses] = useState<Record<string, number>>({});

  const handleResponse = useCallback((questionId: string, optionIndex: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const allQuestionsAnswered = PROFILE_QUESTION_BANK.every((q) => responses[q.id] !== undefined);

  const splitCommas = (s: string): string[] =>
    s.split(",").map((x) => x.trim()).filter(Boolean);

  const aboutValid = name.trim() && background.trim() && domains.trim() && context.trim();
  const goalsValid = primaryGoal.trim() && successDefinition.trim() && sacrifices.trim() && nonNegotiables.trim() && resourceLimits.trim();

  const buildProfile = useCallback((): WebUserProfile => {
    const questionResponses: ProfileQuestionResponse[] = Object.entries(responses).map(
      ([question_id, selected_option]) => ({ question_id, selected_option })
    );
    const rubric = scoreResponses(questionResponses);

    return {
      name: name.trim(),
      background: background.trim(),
      seniorityLevel,
      experienceDomains: splitCommas(domains),
      context: context.trim(),
      primaryGoal: primaryGoal.trim(),
      successDefinition: successDefinition.trim(),
      timeHorizon,
      sacrificesAcceptable: splitCommas(sacrifices),
      nonNegotiables: splitCommas(nonNegotiables),
      dependencies: [],
      resourceLimits: resourceLimits.trim(),
      knownWeaknesses: splitCommas(weaknesses),
      blindSpots: splitCommas(blindSpots),
      patterns: [],
      rubric,
      completedAt: new Date().toISOString(),
    };
  }, [name, background, seniorityLevel, domains, context, primaryGoal, successDefinition, timeHorizon, sacrifices, nonNegotiables, resourceLimits, weaknesses, blindSpots, responses]);

  const handleComplete = useCallback(() => {
    const profile = buildProfile();
    saveProfile(profile);
    setStep("complete");
  }, [buildProfile, saveProfile]);

  const handleRetake = useCallback(() => {
    setResponses({});
    setStep("about");
  }, []);

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="animate-fade-in">
      {/* Step progress */}
      <nav aria-label="Profile progress" className="mb-8">
        <div role="list" className="flex items-center justify-center gap-2 mb-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              role="listitem"
              aria-current={i === stepIndex ? "step" : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < stepIndex
                  ? "w-1.5 bg-board-accent"
                  : i === stepIndex
                    ? "w-6 bg-board-accent"
                    : "w-1.5 bg-board-text-tertiary/40"
              }`}
            >
              <span className="sr-only">
                {STEP_LABELS[s]}{i < stepIndex ? " (completed)" : i === stepIndex ? " (current)" : ""}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-board-text-tertiary">
          {STEP_LABELS[step]}
        </p>
      </nav>

      {step === "about" && (
        <div className="space-y-6">
          <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
            <h2 className="text-2xl font-serif text-board-text mb-1">About You</h2>
            <p className="text-sm text-board-text-secondary mb-5">
              Tell us about your professional background so your advocate can argue from your position of strength.
            </p>

            <div className="space-y-4">
              <FieldGroup label="Your Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="field-input"
                />
              </FieldGroup>

              <FieldGroup label="Professional Background" hint="A brief summary of your career and expertise">
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="15 years in product management across fintech and SaaS, currently VP Product at a Series B startup..."
                  rows={3}
                  className="field-input resize-none"
                />
              </FieldGroup>

              <FieldGroup label="Seniority Level">
                <div className="flex flex-wrap gap-2">
                  {SENIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSeniorityLevel(opt.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        seniorityLevel === opt.value
                          ? "border-board-accent bg-board-accent/10 text-board-accent"
                          : "border-board-border text-board-text-secondary hover:border-board-accent/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup label="Experience Domains" hint="Separate with commas">
                <input
                  type="text"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  placeholder="Product Management, Fintech, SaaS, B2B"
                  className="field-input"
                />
              </FieldGroup>

              <FieldGroup label="Current Context" hint="What situation or role context are you in right now?">
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Leading product for a startup transitioning from founder-led sales to product-led growth..."
                  rows={2}
                  className="field-input resize-none"
                />
              </FieldGroup>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep("goals")}
            disabled={!aboutValid}
            className="w-full rounded-[12px] bg-board-accent px-6 py-3.5 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90 disabled:opacity-50 disabled:bg-board-surface-raised disabled:text-board-text-secondary disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}

      {step === "goals" && (
        <div className="space-y-6">
          <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
            <h2 className="text-2xl font-serif text-board-text mb-1">Goals & Constraints</h2>
            <p className="text-sm text-board-text-secondary mb-5">
              Define what you are working toward and the boundaries your advocate must respect.
            </p>

            <div className="space-y-4">
              <FieldGroup label="Primary Goal" hint="What are you trying to achieve?">
                <textarea
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  placeholder="Transition the company to product-led growth while maintaining current revenue..."
                  rows={2}
                  className="field-input resize-none"
                />
              </FieldGroup>

              <FieldGroup label="Success Definition" hint="What does a good outcome look like?">
                <input
                  type="text"
                  value={successDefinition}
                  onChange={(e) => setSuccessDefinition(e.target.value)}
                  placeholder="Self-serve pipeline generating 30% of new revenue within 12 months"
                  className="field-input"
                />
              </FieldGroup>

              <FieldGroup label="Time Horizon">
                <div className="flex flex-wrap gap-2">
                  {TIME_HORIZON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTimeHorizon(opt.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        timeHorizon === opt.value
                          ? "border-board-accent bg-board-accent/10 text-board-accent"
                          : "border-board-border text-board-text-secondary hover:border-board-accent/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup label="Acceptable Sacrifices" hint="What are you willing to trade off? Separate with commas">
                <input
                  type="text"
                  value={sacrifices}
                  onChange={(e) => setSacrifices(e.target.value)}
                  placeholder="Short-term revenue dip, additional headcount investment, slower feature velocity"
                  className="field-input"
                />
              </FieldGroup>

              <FieldGroup label="Non-Negotiables" hint="Hard constraints that cannot be compromised. Separate with commas">
                <input
                  type="text"
                  value={nonNegotiables}
                  onChange={(e) => setNonNegotiables(e.target.value)}
                  placeholder="Team retention above 85%, no compromise on data security, maintain profitability"
                  className="field-input"
                />
              </FieldGroup>

              <FieldGroup label="Resource Limits" hint="Budget, time, or capacity constraints">
                <input
                  type="text"
                  value={resourceLimits}
                  onChange={(e) => setResourceLimits(e.target.value)}
                  placeholder="$500K budget, 6-person team, 12-month runway"
                  className="field-input"
                />
              </FieldGroup>

              <FieldGroup label="Known Weaknesses" hint="Optional — self-identified areas of weakness. Separate with commas">
                <input
                  type="text"
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="Impatient with slow progress, tendency to over-commit"
                  className="field-input"
                />
              </FieldGroup>

              <FieldGroup label="Blind Spots" hint="Optional — areas you may not see clearly. Separate with commas">
                <input
                  type="text"
                  value={blindSpots}
                  onChange={(e) => setBlindSpots(e.target.value)}
                  placeholder="Technical debt implications, team capacity limits"
                  className="field-input"
                />
              </FieldGroup>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("about")}
              className="rounded-[12px] border border-board-border px-6 py-3.5 text-sm font-medium text-board-text-secondary transition-colors hover:bg-board-surface"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep("assessment")}
              disabled={!goalsValid}
              className="flex-1 rounded-[12px] bg-board-accent px-6 py-3.5 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90 disabled:opacity-50 disabled:bg-board-surface-raised disabled:text-board-text-secondary disabled:cursor-not-allowed"
            >
              Continue to Assessment
            </button>
          </div>
        </div>
      )}

      {step === "assessment" && (
        <div className="space-y-6">
          <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
            <h2 className="text-2xl font-serif text-board-text mb-1">Judgement Assessment</h2>
            <p className="text-sm text-board-text-secondary mb-3">
              Read each scenario and choose the response closest to how you would actually act — not how you think you should act.
            </p>
            <p className="text-xs text-board-text-tertiary">
              {Object.keys(responses).length} of {PROFILE_QUESTION_BANK.length} answered
            </p>
          </div>

          <div className="space-y-4">
            {PROFILE_QUESTION_BANK.map((question, qi) => (
              <div
                key={question.id}
                className="rounded-[16px] border border-board-border bg-board-surface px-6 py-5"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 rounded-full bg-board-accent/10 px-2.5 py-0.5 text-xs font-medium text-board-accent">
                    {qi + 1}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-board-text-tertiary font-medium">
                    {question.category}
                  </span>
                </div>

                <p className="text-sm text-board-text font-medium mb-1.5">{question.scenario}</p>
                <p className="text-xs text-board-text-tertiary mb-4">{question.context}</p>

                <div className="space-y-2">
                  {question.options.map((option, oi) => {
                    const isSelected = responses[question.id] === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => handleResponse(question.id, oi)}
                        className={`w-full text-left rounded-[10px] border px-4 py-3 text-xs transition-all ${
                          isSelected
                            ? "border-board-accent bg-board-accent/10 text-board-text"
                            : "border-board-border text-board-text-secondary hover:border-board-accent/30 hover:bg-board-surface-raised"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("goals")}
              className="rounded-[12px] border border-board-border px-6 py-3.5 text-sm font-medium text-board-text-secondary transition-colors hover:bg-board-surface"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={!allQuestionsAnswered}
              className="flex-1 rounded-[12px] bg-board-accent px-6 py-3.5 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90 disabled:opacity-50 disabled:bg-board-surface-raised disabled:text-board-text-secondary disabled:cursor-not-allowed"
            >
              View My Profile
            </button>
          </div>
        </div>
      )}

      {step === "complete" && existingProfile && (
        <ProfileComplete
          profile={existingProfile}
          onRetake={handleRetake}
          onGoToBoard={() => router.push("/board")}
        />
      )}

      {step === "complete" && !existingProfile && (
        <div className="text-center py-12 text-board-text-secondary">
          <p>No profile found. Something went wrong — please try again.</p>
          <button
            type="button"
            onClick={handleRetake}
            className="mt-4 text-board-accent hover:underline text-sm"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileComplete({
  profile,
  onRetake,
  onGoToBoard,
}: {
  profile: WebUserProfile;
  onRetake: () => void;
  onGoToBoard: () => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
        <h2 className="text-2xl font-serif text-board-text mb-1">
          {profile.name}&apos;s Judgement Profile
        </h2>
        <p className="text-sm text-board-text-secondary mb-6">
          Your advocate will champion your position using this profile to calibrate their arguments.
        </p>

        <RubricChart rubric={profile.rubric} />
      </div>

      <div className="rounded-[16px] border border-board-border bg-board-surface px-6 py-7">
        <h3 className="text-lg font-serif text-board-text mb-4">Profile Summary</h3>

        <div className="space-y-3 text-sm">
          <SummaryRow label="Background" value={profile.background} />
          <SummaryRow label="Seniority" value={profile.seniorityLevel} />
          <SummaryRow label="Domains" value={profile.experienceDomains.join(", ")} />
          <SummaryRow label="Primary Goal" value={profile.primaryGoal} />
          <SummaryRow label="Success Definition" value={profile.successDefinition} />
          <SummaryRow label="Time Horizon" value={profile.timeHorizon.replace(/_/g, " ")} />
          <SummaryRow label="Non-Negotiables" value={profile.nonNegotiables.join(", ")} />
          <SummaryRow label="Resource Limits" value={profile.resourceLimits} />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetake}
          className="rounded-[12px] border border-board-border px-6 py-3.5 text-sm font-medium text-board-text-secondary transition-colors hover:bg-board-surface"
        >
          Retake Assessment
        </button>
        <button
          type="button"
          onClick={onGoToBoard}
          className="flex-1 rounded-[12px] bg-board-accent px-6 py-3.5 text-sm font-semibold text-board-accent-contrast transition-colors hover:bg-board-accent/90"
        >
          Go to Board of Directors
        </button>
      </div>

      <p className="text-center text-xs text-board-text-tertiary">
        Your profile is saved locally. When you consult the board, a personalised advocate will join the discussion to champion your position.
      </p>
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-board-text mb-1">{label}</label>
      {hint && <p className="text-xs text-board-text-tertiary mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-32 text-board-text-tertiary">{label}</span>
      <span className="text-board-text">{value}</span>
    </div>
  );
}
