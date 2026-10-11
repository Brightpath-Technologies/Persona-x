# Persona-x: Personal Board of Directors
## Business Requirements Document

**Document Version:** 1.0
**Date:** 14 February 2026
**Classification:** Confidential
**Owner:** Brightpath Technologies

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Relationship to Persona-x Framework](#2-relationship-to-persona-x-framework)
3. [Market Opportunity](#3-market-opportunity)
4. [Problem Statement](#4-problem-statement)
5. [Solution: Personal Board of Directors](#5-solution-personal-board-of-directors)
6. [Target Audience](#6-target-audience)
7. [Competitive Landscape](#7-competitive-landscape)
8. [Value Proposition](#8-value-proposition)
9. [Business Objectives & Success Metrics](#9-business-objectives--success-metrics)
10. [Monetisation Strategy](#10-monetisation-strategy)
11. [Go-to-Market Strategy](#11-go-to-market-strategy)
12. [Risk Analysis](#12-risk-analysis)
13. [Investment Requirements & Use of Funds](#13-investment-requirements--use-of-funds)
14. [Financial Projections](#14-financial-projections)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

**Personal Board of Directors** is a consumer-facing product built on the Persona-x structured AI persona framework. It gives individuals access to a curated panel of AI advisors — each with a defined judgement profile, reasoning posture, and communication style — for their most consequential career, life, and business decisions.

High-performing executives and founders have long relied on personal advisory boards: trusted mentors, coaches, and strategists who challenge their thinking from multiple angles. This advantage has been inaccessible to most people. Personal Board of Directors democratises it using Persona-x's panel architecture.

Users present a decision to their Board. Each advisor persona — engineered with calibrated rubric scores across six judgement dimensions — analyses the situation through their distinct lens. The platform delivers individual perspectives and a synthesised Board Brief that maps consensus, highlights disagreements, and surfaces blind spots the user was not seeing.

**What makes this different from "AI advice":**

- **Multi-perspective advisory, not single-voice chat.** Current AI tools provide one undifferentiated perspective. The Board delivers structured challenge from multiple defined reasoning profiles — the same dynamic that makes real advisory boards valuable.
- **Governed personas, not prompt engineering tricks.** Each advisor is a validated Persona-x artefact with explicit rubric scores, reasoning tendencies, boundaries, and invocation rules. Behaviour is consistent, inspectable, and auditable.
- **Decision intelligence, not conversation.** The output is a structured Board Brief — not a chat thread. Analysis, recommendations, tensions, and blind spots are surfaced systematically.
- **Longitudinal memory.** The platform builds a Decision Profile over time — values, risk tolerance, decision patterns, outcomes — that deepens relevance with every session.

**Existing research supporting this product:**

The Persona-x project has already produced extensive market validation across 70+ use cases (see PERSONAL-USE-CASES.md, SMALL-BUSINESS-USE-CASES.md, GRC-USE-CASES.md, UNTAPPED-MARKETS.md), a structured Decision Engine (DECISION-ENGINE.md) for evaluating opportunities, and a complete technical specification (SPEC.md) defining persona creation, validation, and panel runtime.

Personal Board of Directors is the first consumer product to operationalise this body of work.

---

## 2. Relationship to Persona-x Framework

Personal Board of Directors is **built on** Persona-x — it does not replace or duplicate it.

```
┌─────────────────────────────────────────────────────────┐
│                  Consumer Layer                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │       Personal Board of Directors                │    │
│  │  Web app · Mobile app · API                     │    │
│  │  Board Sessions · Board Briefs · Decision Journal│    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │ consumes                       │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │       Persona-x Framework                        │    │
│  │  Persona Definition Files (YAML)                │    │
│  │  Creation Engine · Validation · Panel Runtime    │    │
│  │  Rubric Scoring · Speaking Order · Boundaries    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### What the framework provides

- **Persona schema & validation** — every Board advisor is a validated YAML persona definition file
- **Six-dimension rubric** — Risk Appetite, Evidence Threshold, Tolerance for Ambiguity, Intervention Frequency, Escalation Bias, Delivery vs Rigour (all 1-10)
- **Panel runtime** — persona loading, speaking order, system prompt generation, boundary enforcement
- **Creation engine** — guided persona creation with discovery, population pipeline, and inference rules
- **Versioning & traceability** — semantic versioning, changelog, build trace

### What the product adds

- **Consumer UX** — web and mobile interfaces that make panel interactions accessible to non-technical users
- **Pre-built Board** — 8 curated advisor personas optimised for personal, career, and business decisions
- **Board Brief synthesis** — aggregated output that distills multi-persona perspectives into actionable insight
- **Decision Journal** — longitudinal record of decisions, advisory input, and outcomes
- **Decision Profile** — evolving model of user values, risk tolerance, and decision patterns
- **Subscription commerce** — freemium model with tiered access

---

## 3. Market Opportunity

### 3.1 Market Size

| Segment | 2025 Value | 2028 Projected | CAGR |
|---|---|---|---|
| Global Personal Development | $56.3B | $81.6B | 13.2% |
| AI Productivity & Assistant Tools | $14.2B | $38.7B | 39.8% |
| Executive Coaching & Mentoring | $20.2B | $27.8B | 11.3% |
| Decision Intelligence Software | $10.1B | $22.4B | 30.5% |

**Serviceable Addressable Market (SAM):** $4.8B — knowledge workers and professionals in English-speaking markets seeking AI-powered decision support.

**Serviceable Obtainable Market (SOM):** $120M within 3 years — 2.5% of SAM through differentiated positioning and viral growth.

### 3.2 Market Trends

1. **Decision fatigue is epidemic.** 67% of professionals report anxiety around major career and life choices. Knowledge workers identify decision overload as their primary source of burnout.

2. **AI advisory is normalised.** Consumer AI adoption has crossed the mainstream threshold. Users are comfortable seeking AI input on personal matters — but current tools offer a single, generic voice. They lack the structured multi-perspective challenge that real advisory boards provide.

3. **The coaching gap.** Executive coaching costs $300-$500/hour. Life coaching $75-$250/session. 78% of professionals want a mentor but do not have one. Access to quality advisory is gated by cost, geography, and network.

4. **The loneliness of decision-making.** 61% of leaders feel lonely in their roles. 50% of major career decisions are made without consulting anyone.

5. **Personalisation renaissance.** Users expect tools that learn and adapt. Static advice platforms are giving way to dynamic, context-aware systems.

### 3.3 Timing

The convergence of several forces makes 2026 optimal:
- LLM capabilities have reached the sophistication needed for nuanced, persona-consistent advisory
- The Persona-x framework provides a production-ready foundation for structured multi-persona interactions
- Consumer AI trust has crossed the chasm into early majority
- Remote/hybrid work has expanded the market of people making independent decisions without institutional support

### 3.4 Validation from Existing Research

The PERSONAL-USE-CASES.md document rates 20 consumer decision services by profitability and interest potential. The top-scoring services are:

| Service | Profitability | Interest | Combined |
|---|---|---|---|
| Relationship Decision Clarity | 5/5 | 5/5 | 10 |
| Career Change Sounding Board | 4/5 | 5/5 | 9 |
| Creative Writing Manuscript Panel | 4/5 | 5/5 | 9 |
| Content Creator Strategy Panel | 4/5 | 5/5 | 9 |
| Home Renovation Planning Panel | 4/5 | 4/5 | 8 |

Personal Board of Directors packages the highest-value personal use cases into a single subscription product, with the Board's pre-built personas covering the decision categories that score highest for both profitability and interest.

---

## 4. Problem Statement

### The Core Problem

People face consequential decisions — career pivots, job offers, business strategies, relationship crossroads, financial choices — without access to diverse, high-quality advisory perspectives. They either:

1. **Decide alone** — relying on their own biases, blind spots, and limited frame of reference
2. **Consult friends/family** — who mean well but lack relevant expertise or objectivity
3. **Pay for professionals** — coaching, therapy, consulting — expensive, slow to schedule, narrowly scoped
4. **Ask AI chatbots** — a single undifferentiated perspective, no structured decision framework, limited context memory

### The Consequence

Poor decisions compound. A suboptimal career move costs $50,000-$200,000 in lifetime earnings. A poorly timed business decision can sink a startup. The emotional toll of decision regret drives anxiety, impostor syndrome, and stagnation.

### What Is Missing

There is no product that replicates the experience of presenting a decision to a thoughtfully composed **panel of advisors** — each bringing a different discipline, temperament, and analytical framework — and receiving a synthesised, actionable recommendation that accounts for the user's values, context, and goals.

Persona-x has already solved the hard technical problem: how to create, validate, and run structured AI personas in panel discussions. What is missing is the consumer product that puts this capability in people's hands.

---

## 5. Solution: Personal Board of Directors

### 5.1 How It Works

**Step 1: Present Your Decision**
The user describes their situation, decision, or dilemma. The platform's intake system structures the input, identifies the decision type, and surfaces relevant context from prior sessions.

**Step 2: The Board Convenes**
Each persona independently analyses the situation through their calibrated rubric lens. Advisors may ask clarifying questions, challenge assumptions, or request additional context.

**Step 3: Perspectives Are Delivered**
Each advisor's take is structured as analysis, recommendation, and rationale — presented in the advisor's distinct voice and reasoning style. Rubric-driven behaviour ensures the Strategist consistently thinks in systems, the Devil's Advocate consistently challenges assumptions, and the Analyst consistently brings quantitative rigour.

**Step 4: The Board Brief**
The platform generates a synthesised output — the Board Brief — mapping consensus areas, highlighting disagreements, identifying blind spots, and presenting a weighted recommendation.

**Step 5: Decide & Track**
The user makes their decision. The platform logs the decision, the reasoning, and the advisory input. Over time, it tracks outcomes and refines its understanding of the user's Decision Profile.

### 5.2 The Board — 8 Pre-Built Advisor Personas

Each advisor is a full Persona-x persona definition file with calibrated rubric scores, defined reasoning tendencies, interaction style, and boundaries.

| Persona | Panel Role | Primary Lens | Key Rubric Posture |
|---|---|---|---|
| **The Strategist** | Integrator | Long-term positioning, second-order effects, systems thinking | Risk Appetite: 6, Evidence Threshold: 7, Ambiguity Tolerance: 8 |
| **The Mentor** | Sense-checker | Experience, pattern recognition, emotional wisdom | Risk Appetite: 4, Evidence Threshold: 5, Ambiguity Tolerance: 7 |
| **The Devil's Advocate** | Challenger | Assumptions, risks, failure modes, cognitive biases | Risk Appetite: 3, Evidence Threshold: 9, Intervention Frequency: 9 |
| **The Visionary** | Integrator | Possibility, innovation, unconventional paths | Risk Appetite: 8, Ambiguity Tolerance: 9, Delivery vs Rigour: 7 |
| **The Pragmatist** | Challenger | Execution, resources, constraints, timelines | Risk Appetite: 4, Ambiguity Tolerance: 3, Delivery vs Rigour: 8 |
| **The Analyst** | Challenger | Data, probabilities, financial modelling, ROI | Evidence Threshold: 9, Ambiguity Tolerance: 2, Delivery vs Rigour: 3 |
| **The Coach** | Sense-checker | Confidence, accountability, growth mindset | Risk Appetite: 6, Escalation Bias: 3, Intervention Frequency: 7 |
| **The Ethicist** | Sense-checker | Values alignment, integrity, stakeholder impact | Risk Appetite: 2, Escalation Bias: 8, Evidence Threshold: 6 |

**Panel tension by design:** The Board includes deliberate rubric opposition. The Visionary (Risk Appetite: 8) is structurally opposed to the Ethicist (Risk Appetite: 2). The Pragmatist (Ambiguity Tolerance: 3) creates tension with the Strategist (Ambiguity Tolerance: 8). The Analyst (Evidence Threshold: 9) challenges the Coach (lower evidence demands). This tension is what makes the Board valuable — it surfaces trade-offs that any single perspective would miss.

### 5.3 Mapping to Personal Use Cases

The Board's 8 personas are designed to cover the highest-value personal decision categories identified in PERSONAL-USE-CASES.md:

| Use Case | Primary Board Personas |
|---|---|
| Career Change Sounding Board | Strategist, Pragmatist, Analyst, Coach |
| Relationship Decision Clarity | Mentor, Devil's Advocate, Ethicist, Coach |
| Major Purchase Decision Review | Analyst, Pragmatist, Devil's Advocate, Mentor |
| Personal Finance Strategy | Analyst, Pragmatist, Devil's Advocate, Strategist |
| Relocation Decision Review | Strategist, Pragmatist, Mentor, Analyst |
| Content Creator Strategy | Visionary, Pragmatist, Analyst, Coach |
| Personal Values Audit | Ethicist, Mentor, Devil's Advocate, Coach |
| Study/Education Decision | Analyst, Strategist, Pragmatist, Devil's Advocate |

The 8-persona Board covers all 20 personal use cases without requiring domain-specific persona customisation — because the personas are defined by reasoning posture, not subject-matter expertise.

---

## 6. Target Audience

### 6.1 Primary Segments

#### Segment 1: Career Navigators (45% of TAM)
- **Demographics:** Professionals aged 25-40, knowledge workers, early-to-mid career
- **Decisions:** Job offers, salary negotiations, career pivots, skill development, manager conflicts
- **Pain point:** No mentor, fear of wrong move, analysis paralysis, impostor syndrome
- **Willingness to pay:** $15-$25/month

#### Segment 2: Founders & Entrepreneurs (25% of TAM)
- **Demographics:** Ages 28-50, startup founders, solo entrepreneurs, side-project builders
- **Decisions:** Product strategy, hiring, fundraising timing, pivot vs persist, pricing
- **Pain point:** Lonely at the top, cannot afford a real advisory board, echo chambers
- **Willingness to pay:** $30-$60/month

#### Segment 3: Life Transitioners (20% of TAM)
- **Demographics:** Ages 30-55, facing major life changes
- **Decisions:** Relocation, relationships, financial planning, health priorities, work-life balance
- **Pain point:** Decisions feel overwhelming, friends/family too biased, therapy too slow for practical decisions
- **Willingness to pay:** $10-$20/month

#### Segment 4: Enterprise / L&D (10% of TAM)
- **Demographics:** Companies 200-10,000 employees investing in leadership development
- **Decisions:** Manager decision quality, leadership development, succession planning
- **Pain point:** Coaching does not scale, one-size-fits-all training fails
- **Willingness to pay:** $8-$15/user/month at volume

### 6.2 User Personas

**"Maya" — The Ambitious Professional**
32, Senior Product Manager. Just received a job offer at 40% more pay, but loves her current team and is up for a director role in 6 months. Her friends say "take the money." Her gut says stay. She needs structured perspectives, not opinions.

**"Jordan" — The First-Time Founder**
38, left a VP role 14 months ago. Burning $45K/month with 8 months of runway. Just got a pivot signal from their biggest customer. 3-person team, no board. Needs advisors who will be honest, not supportive.

**"Priya" — The Life Transitioner**
44, considering leaving a stable career to move abroad. Two kids, ageing parents, a mortgage. The decision touches finances, relationships, career identity, and fulfilment simultaneously. Needs a framework, not feelings.

---

## 7. Competitive Landscape

### 7.1 Competitive Matrix

| Competitor | Category | Multi-Persona Panel | Rubric-Driven Behaviour | Decision Framework | Context Memory | Outcome Tracking |
|---|---|:---:|:---:|:---:|:---:|:---:|
| ChatGPT / Claude / Gemini | General AI | No | No | No | Limited | No |
| BetterUp | Digital Coaching | No (1:1 human) | No | Yes | Yes | Partial |
| Coach.me | Habit Coaching | No | No | Partial | Partial | Yes |
| Crystal Knows | Personality Insights | No | No | No | No | No |
| Coda / Notion AI | Productivity + AI | No | No | No | Yes | No |
| **Personal Board of Directors** | **Decision Intelligence** | **Yes (8 personas)** | **Yes (6-dimension rubric)** | **Yes (Board Brief)** | **Yes** | **Yes** |

### 7.2 Competitive Advantages

1. **No one else offers rubric-governed multi-persona advisory.** Current AI tools are monolithic. The Board delivers structured challenge from 8 distinct, calibrated reasoning profiles.

2. **Structured decision output, not open-ended chat.** The Board Brief is a decision artefact — analysis, tensions, blind spots, recommendation — not a conversation transcript.

3. **Inspectable reasoning.** Because every persona has a published rubric profile, users can understand *why* each advisor thinks the way they do. The Analyst demands evidence (Evidence Threshold: 9). The Visionary embraces ambiguity (Ambiguity Tolerance: 9). This transparency builds trust.

4. **Longitudinal Decision Profile.** The platform builds understanding of user values, risk tolerance, and decision patterns over time. This creates deepening relevance and switching costs.

5. **Outcome tracking closes the loop.** No competitor tracks what the user decided and what happened. This feedback loop powers personalisation and builds a proprietary decision intelligence dataset.

### 7.3 Defensibility

| Moat | Description |
|---|---|
| **Persona IP** | 8 deeply engineered personas with calibrated rubric scores, defined boundaries, and tested panel dynamics. Non-trivial to replicate. |
| **Decision data moat** | Aggregate (anonymised) decision patterns create a proprietary dataset for improving advisory quality. |
| **Switching cost** | Users who build a Decision Journal and Decision Profile will not abandon their longitudinal record. |
| **Framework depth** | Built on a validated, versioned persona creation framework — not prompt engineering. Competitors would need to build the foundation first. |
| **Brand potential** | "What does your Board say?" has memetic potential. The product becomes a verb. |

---

## 8. Value Proposition

### For Individuals

> **"The smartest people in any room have advisors. Now you do too."**

A permanent board of 8 advisors — each with a different reasoning profile, expertise, and decision framework — available 24/7 for any decision that matters. No scheduling, no $300/hour fees, no awkward favours. Structured, multi-perspective counsel whenever you need it.

### For Enterprises

> **"Scale decision quality across your organisation."**

Replace one-off coaching with always-on advisory for every manager and leader. Improve decision quality, reduce decision latency, and build a coaching culture without per-session pricing.

### Value Comparison

| Dimension | Without Board | With Board |
|---|---|---|
| Decision inputs | 1-2 perspectives | 8 structured perspectives with defined rubric positions |
| Blind spot coverage | Self-limited | Systematically surfaced by deliberate panel tension |
| Decision speed | Days/weeks of deliberation | Hours to a Board Brief |
| Decision tracking | None | Full journal + outcome tracking |
| Advisory cost | $300+/hour for coaching | $19.99/month |
| Availability | Scheduling-dependent | 24/7, on-demand |
| Reasoning transparency | None (black box) | Inspectable rubric scores and interpretive notes |

---

## 9. Business Objectives & Success Metrics

### 9.1 Year 1

| Objective | Target | Metric |
|---|---|---|
| Launch MVP (web + iOS) | Q2 2026 | Ship date |
| Registered users | 100,000 | Signups |
| Paying subscribers | 8,000 | Conversion rate: 8% |
| Revenue | $1.2M ARR | MRR tracking |
| Retention | 60% M3 retention (paid) | Cohort analysis |
| Board sessions | 500,000 | Session volume |

### 9.2 Year 2

| Objective | Target | Metric |
|---|---|---|
| Registered users | 500,000 | Signups |
| Revenue | $6.5M ARR | MRR tracking |
| Full multi-platform | Web + iOS + Android + API | Platform coverage |
| Enterprise accounts | 20 | B2B contracts |
| NPS | > 55 | Quarterly survey |
| Outcome tracking adoption | 40% of decisions tracked | Feature adoption |

### 9.3 Year 3

| Objective | Target | Metric |
|---|---|---|
| Revenue | $22M ARR | MRR tracking |
| Paid subscribers | 80,000 | Subscription count |
| Enterprise accounts | 100 | B2B contracts |
| International | 5 languages | Localisation coverage |
| Board sessions | 10M+ cumulative | Data moat |

### 9.4 North Star Metric

**Board Sessions Per Month (BSPM):** Total number of decision advisory sessions where the full Board convenes. Captures activation, engagement, and value delivery in a single number.

---

## 10. Monetisation Strategy

### 10.1 Pricing Tiers

#### Free — "Observer"
- **Price:** $0/month
- 3 Board sessions per month
- Access to 3 of 8 personas (The Mentor, The Pragmatist, The Coach)
- Basic Board Brief (text summary only)
- No decision history beyond 30 days
- **Purpose:** Acquisition and activation

#### Pro — "Advisor"
- **Price:** $19.99/month ($199/year)
- Unlimited Board sessions
- All 8 personas
- Full Board Brief with detailed analysis
- Complete Decision Journal and history
- Outcome tracking and decision analytics
- Priority response time
- **Purpose:** Core revenue driver

#### Executive — "Chairman"
- **Price:** $49.99/month ($499/year)
- Everything in Pro
- Deep Decision Mode — extended multi-round Board discussions
- Scenario Modelling — "What if?" branching analysis
- Annual Decision Review — year-in-review of decisions, patterns, growth
- API access for custom integrations
- Priority support
- **Purpose:** High-value users, founders, executives

#### Enterprise
- **Price:** $8-$15/user/month (volume-based)
- Everything in Executive
- Admin dashboard and team analytics
- Custom persona configuration aligned with company values
- SSO/SAML integration
- Decision quality reporting for L&D teams
- Dedicated account management
- **Purpose:** B2B revenue

### 10.2 Revenue Mix Target (Year 3)

| Tier | % Revenue | Subscribers | ARPU/month |
|---|---|---|---|
| Pro | 50% | 55,000 | $16.67* |
| Executive | 25% | 9,200 | $49.99 |
| Enterprise | 25% | ~15,000 seats | $12/seat |

*Blended ARPU accounts for annual discount adoption.

### 10.3 Unit Economics Target

| Metric | Target |
|---|---|
| CAC (blended) | < $35 |
| LTV (Pro) | $340 |
| LTV (Executive) | $900 |
| LTV:CAC | > 8:1 |
| Payback period | < 3 months |
| Gross margin | > 75% |
| AI inference cost per session | < $0.12 |

### 10.4 Bundling Opportunity

As documented in PERSONAL-USE-CASES.md, services cluster into subscription bundles:

| Bundle | Decision Categories | Price |
|---|---|---|
| Life Decisions | Career, Relationship, Relocation, Retirement, Values | $24.99/month |
| Creator Studio | Writing, Music, Portfolio, Content Strategy, Podcast, Game Design | $29.99/month |
| Home & Money | Purchase Review, Renovation, Finance | $19.99/month |
| Everything | All categories via the full 8-persona Board | $39.99/month |

Personal Board of Directors starts as the "Everything" tier — a single Board that handles all decision types through reasoning posture rather than domain expertise.

---

## 11. Go-to-Market Strategy

### 11.1 Phase 1: Community-Led Launch (Q2-Q3 2026)

**Strategy:** Build credibility through content and community before paid acquisition.

**Tactics:**
- **"Board Room" content series** — weekly posts showing real (anonymised) Board sessions across career, business, and life decisions. Publish on LinkedIn, Twitter/X, Substack.
- **Decision templates** — free, shareable decision frameworks ("The Career Pivot Framework," "The Job Offer Scorecard") that introduce the multi-perspective methodology.
- **Waitlist with virality** — early access waitlist where referring 3 people moves position. Target 25,000 pre-launch signups.
- **Creator partnerships** — 10-15 career/productivity creators (50K-500K followers) for authentic integration.

**Channels:** LinkedIn (primary), Twitter/X, YouTube, podcast guest circuit, Product Hunt launch.

**Budget:** $150K

### 11.2 Phase 2: Growth Engine (Q4 2026 - Q2 2027)

**Strategy:** Convert community traction into scalable paid acquisition.

**Tactics:**
- **"What Does Your Board Say?"** — shareable Board Brief summaries users can post (anonymised). Social proof meets virality.
- **SEO content engine** — programmatic content targeting long-tail decision queries ("Should I take a lower-paying job I love?" / "How to decide between two job offers").
- **Paid acquisition** — targeted LinkedIn and Meta campaigns to career transitioners and founders.
- **Referral programme** — give a month, get a month. Users who refer 3 paid subscribers get Executive tier free.
- **Integration partnerships** — Notion, LinkedIn, Slack integrations.

**Budget:** $800K

### 11.3 Phase 3: Enterprise & Expansion (Q3 2027+)

**Strategy:** Layer B2B revenue on proven consumer product.

**Tactics:**
- **Enterprise pilot programme** — 10 design partners from L&D-forward companies.
- **Decision quality research** — partner with a university to validate decision quality improvement. Publish white paper.
- **Channel partnerships** — integrate with BetterUp, Lattice, Culture Amp.
- **International expansion** — localise for Spanish, Portuguese, German, French, Japanese.

**Budget:** $1.5M

---

## 12. Risk Analysis

### 12.1 Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Persona sameness** — advisors feel too similar | Medium | High | Deliberate rubric opposition. Behavioural testing. User feedback loops. Leverage Persona-x validation engine to enforce distinctness. |
| **LLM cost volatility** | Medium | Medium | Multi-model architecture. Smaller models for routine tasks, frontier models for deep analysis. Negotiate volume pricing. |
| **General AI competition** — ChatGPT/Claude adds "personas" | High | Medium | Persona depth + rubric governance + outcome tracking create a differentiated stack. Persona-x framework provides structural advantage that bolt-on features cannot match. |
| **User trust barrier** — reluctance to trust AI with important decisions | Medium | High | Position as "advisory, not decision-making." Transparent reasoning via rubric. Decision Journal builds trust over time. Privacy-first architecture. |
| **Regulatory risk** — AI advice regulation | Low | High | Clear disclaimers. Avoid regulated advice (financial, medical, legal). Focus on decision frameworks. Legal review of persona outputs. Reference persona boundaries from SPEC.md. |
| **Retention challenge** — churn after initial novelty | Medium | High | Decision Journal creates switching cost. Outcome tracking creates ongoing value. Decision Profile deepens relevance. |
| **Data privacy** — users share sensitive personal information | Medium | High | End-to-end encryption. Zero-knowledge architecture option. SOC 2 compliance. Clear data policies. User data export/delete. |

### 12.2 Running Through the Decision Engine

This product opportunity should be evaluated through the Persona-x Decision Engine (DECISION-ENGINE.md). Preliminary scoring against the six evaluation dimensions:

| Dimension | Preliminary Score | Rationale |
|---|---|---|
| Problem Severity | 8/10 | Decision anxiety and advisory inaccessibility are widespread and well-documented |
| Societal Benefit | 8/10 | Democratises access to structured advisory. Improves decision quality for underserved populations. |
| Market Viability | 8/10 | $4.8B SAM. Strong willingness-to-pay signals. Validated by 20 personal use case analyses. |
| Persona-x Fit | 9/10 | The problem is *precisely* what multi-perspective adversarial challenge solves best |
| Defensibility | 7/10 | Framework depth + persona IP + data moat. Risk from general AI platforms offset by structural depth. |
| Execution Complexity | 7/10 | Framework exists. Panel runtime exists. Consumer UX and infrastructure are the primary builds. |

**Composite Score: 7.9/10** — exceeds the 7.0 threshold for proceeding to Stage 2 (Challenge).

### 12.3 Key Assumptions

1. Users will engage with AI advisory for high-stakes personal decisions
2. Multi-perspective advisory is demonstrably more valuable than single-perspective
3. LLM inference costs will continue to decrease 30-50% annually
4. Persona consistency can be maintained at quality across millions of sessions
5. Users will return monthly for ongoing decisions (not a one-time use case)
6. The Persona-x framework's panel runtime can scale to consumer workloads

---

## 13. Investment Requirements & Use of Funds

### 13.1 Funding Ask

**Seed Round:** $3.5M (18-month runway)

### 13.2 Allocation

| Category | Allocation | Amount |
|---|---|---|
| Engineering (team of 8) | 45% | $1,575K |
| AI/ML & Persona Engineering (team of 3) | 15% | $525K |
| Design & Product (team of 3) | 10% | $350K |
| Marketing & Growth | 15% | $525K |
| Operations & Infrastructure | 10% | $350K |
| Legal & Compliance | 5% | $175K |

### 13.3 Key Hires

| Role | Priority | Timing |
|---|---|---|
| CTO / Lead Engineer | P0 | Month 1 |
| Senior Full-Stack Engineers (x3) | P0 | Month 1-3 |
| AI/ML Engineer — Persona Systems | P0 | Month 1 |
| Mobile Engineer (iOS) | P0 | Month 2 |
| Head of Product Design | P0 | Month 2 |
| Content & Community Lead | P1 | Month 3 |
| AI/ML Engineer — Decision Intelligence | P1 | Month 4 |
| Growth Marketing Lead | P1 | Month 5 |
| Backend / Infrastructure Engineer | P1 | Month 5 |
| Mobile Engineer (Android) | P2 | Month 8 |
| Enterprise Sales Lead | P2 | Month 10 |

### 13.4 Milestones to Series A

| Milestone | Target | Description |
|---|---|---|
| Alpha | Q2 2026 | Web app with core Board experience, 1,000 beta users |
| Public launch | Q3 2026 | Web + iOS, freemium live, Product Hunt |
| 50K users | Q4 2026 | Community-driven growth, content engine running |
| $1M ARR | Q1 2027 | Paid conversion validated, retention proven |
| Enterprise pilot | Q2 2027 | 5+ enterprise design partners |
| Series A ready | Q3 2027 | $3-5M ARR trajectory, clear path to $20M |

---

## 14. Financial Projections

### 14.1 Three-Year Revenue Model

| Metric | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Registered users | 100,000 | 500,000 | 1,500,000 |
| Paid subscribers | 8,000 | 35,000 | 80,000 |
| Conversion rate | 8% | 7% | 5.3% |
| Blended ARPU/month | $12.50 | $15.50 | $18.75 |
| Consumer ARR | $1.2M | $6.5M | $18.0M |
| Enterprise ARR | $0 | $0.8M | $4.0M |
| **Total ARR** | **$1.2M** | **$7.3M** | **$22.0M** |
| Gross margin | 72% | 76% | 80% |
| Net burn | ($2.1M) | ($1.8M) | Breakeven |

### 14.2 Path to Profitability

- **Year 1:** Investment phase. Building product, building community. Net burn ~$2.1M.
- **Year 2:** Growth phase. Revenue scales faster than costs. Gross margins improve with AI cost reductions. Net burn ~$1.8M.
- **Year 3:** Approaching breakeven. Enterprise revenue adds high-margin contracts.

### 14.3 Long-Term Opportunity

At maturity (Year 5+):
- $80-120M ARR
- 300,000+ paid subscribers
- 500+ enterprise accounts
- 80%+ gross margins
- 10+ languages
- Category-defining position in consumer decision intelligence

---

## 15. Appendices

### Appendix A: Decision Science Foundation

The multi-persona approach is grounded in established decision science:

- **Wisdom of Crowds (Surowiecki, 2004):** Diverse, independent perspectives aggregated together outperform individual expert judgement.
- **Six Thinking Hats (de Bono, 1985):** Structured parallel thinking from multiple perspectives improves decision quality. Personal Board of Directors operationalises this with Persona-x's rubric-governed personas.
- **Pre-Mortem Analysis (Klein, 2007):** Imagining failure before it happens (The Devil's Advocate) significantly reduces decision risk.
- **Cognitive Bias Mitigation:** Each persona is designed to counterbalance specific biases — confirmation bias (Devil's Advocate), anchoring (Analyst), status quo bias (Visionary), affect heuristic (Pragmatist).

### Appendix B: Relationship to Existing Documentation

| Document | Relationship to This BRD |
|---|---|
| SPEC.md | Defines the framework this product is built on |
| EXECUTIVE-OVERVIEW.md | Explains the underlying technology to non-technical audiences |
| PERSONAL-USE-CASES.md | Market validation — 20 consumer use cases with profitability ratings |
| SMALL-BUSINESS-USE-CASES.md | Adjacent market — potential expansion path |
| GRC-USE-CASES.md | Enterprise market validation — governance/risk/compliance applications |
| UNTAPPED-MARKETS.md | 20 additional market categories for future expansion |
| DECISION-ENGINE.md | The structured pipeline this product should be evaluated through |
| BUILD-PROMPT.md | Technical implementation guidance |

### Appendix C: Glossary

| Term | Definition |
|---|---|
| **Board Session** | A single decision advisory interaction where the full persona panel convenes |
| **Board Brief** | Synthesised output summarising all persona perspectives, tensions, and recommendation |
| **Decision Journal** | User's longitudinal record of decisions, reasoning, advisory input, and outcomes |
| **Decision Profile** | Platform's evolving model of user values, risk tolerance, and decision patterns |
| **Persona** | A Persona-x persona definition file — structured YAML artefact with rubric scores |
| **Panel** | Multi-agent discussion where personas contribute perspectives based on their rubric profiles |
| **Rubric** | Six-dimension scoring system (1-10) defining a persona's judgement posture |
| **BSPM** | Board Sessions Per Month — north star metric |

---

*This document is confidential. Distribution without authorisation is prohibited.*

*Personal Board of Directors — a Brightpath Technologies product built on the Persona-x framework.*

*"Because the best decisions are never made alone."*
