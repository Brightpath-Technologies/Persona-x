/* ═══════════════════════════════════════════════════════════════
   Persona-x — Interactive Components
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initRubricBars();
  initPersonaTabs();
  initPipelineStages();
});

/* ── Navigation ──────────────────────────────────────────────── */
function initNav() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-mobile-toggle');
  const links = document.querySelector('.nav-links');

  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });

    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
      });
    });
  }
}

/* ── Rubric Bar Animation ────────────────────────────────────── */
function initRubricBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bars = entry.target.querySelectorAll('.rubric-bar-fill');
        bars.forEach(bar => {
          const score = bar.dataset.score;
          const width = (score / 10) * 100;
          setTimeout(() => {
            bar.style.width = width + '%';
          }, 100);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const visualiser = document.querySelector('.rubric-visualiser');
  if (visualiser) observer.observe(visualiser);
}

/* ── Persona Tab Switching ───────────────────────────────────── */
function initPersonaTabs() {
  const tabs = document.querySelectorAll('.persona-tab');
  const details = document.querySelectorAll('.persona-detail');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.persona;

      tabs.forEach(t => t.classList.remove('active'));
      details.forEach(d => d.classList.remove('active'));

      tab.classList.add('active');
      const detail = document.getElementById('persona-' + target);
      if (detail) detail.classList.add('active');
    });
  });
}

/* ── Decision Engine Pipeline ────────────────────────────────── */
const PIPELINE_DATA = {
  propose: {
    title: 'Stage 1 — Propose',
    description: 'Raw opportunity ideas are structured into evaluable proposals. The Opportunity Structuring Panel scores each idea across six dimensions and produces a formal Opportunity Brief.',
    personas: [
      { name: 'Opportunity Architect', role: 'Structures the problem-solution framing', icon: '\u{1F3D7}' },
      { name: 'Market Realist', role: 'Validates market size and timing', icon: '\u{1F4CA}' },
      { name: 'Societal Impact Assessor', role: 'Evaluates benefit and harm potential', icon: '\u{1F30D}' },
      { name: 'Technical Feasibility Analyst', role: 'Assesses build complexity', icon: '\u{2699}' },
    ],
    gate: 'Composite score \u2265 7.0, Societal benefit \u2265 5, Persona-x fit \u2265 6'
  },
  challenge: {
    title: 'Stage 2 — Challenge',
    description: 'The Adversarial Challenge Panel stress-tests every assumption. Historical failures are examined, ethical risks are assessed, and financial viability is scrutinised. The Ethical Boundary Guardian has non-negotiable kill authority.',
    personas: [
      { name: 'Sceptical Investor', role: 'Challenges financial viability', icon: '\u{1F4B0}' },
      { name: 'Failure Archaeologist', role: 'Finds historical precedents', icon: '\u{1F50D}' },
      { name: 'Ethical Boundary Guardian', role: 'Assesses harm potential (kill authority)', icon: '\u{1F6E1}' },
      { name: "Customer Devil's Advocate", role: 'Tests real customer willingness', icon: '\u{1F464}' },
    ],
    gate: 'No unresolved critical risks, Ethical Guardian must pass'
  },
  prototype: {
    title: 'Stage 3 — Prototype',
    description: 'The Prototype Design Panel defines exactly what to build, what personas are needed, the user journey, revenue model, and success criteria. Produces a build-ready specification.',
    personas: [
      { name: 'Product Architect', role: 'Defines scope and features', icon: '\u{1F4D0}' },
      { name: 'User Experience Advocate', role: 'Maps the user journey', icon: '\u{1F465}' },
      { name: 'Revenue Model Analyst', role: 'Designs pricing and economics', icon: '\u{1F4C8}' },
      { name: 'Build vs Buy Pragmatist', role: 'Optimises build decisions', icon: '\u{1F527}' },
    ],
    gate: 'Complete specification with achievable success criteria'
  },
  execute: {
    title: 'Stage 4 — Execute',
    description: 'The Execution Readiness Panel validates that the prototype can actually ship. Workstreams are defined, risks are registered, launch plans are set, and a formal Go/No-Go decision is made.',
    personas: [
      { name: 'Delivery Realist', role: 'Validates timelines and workstreams', icon: '\u{1F4CB}' },
      { name: 'Risk Sentinel', role: 'Maintains the risk register', icon: '\u{26A0}' },
      { name: 'Market Entry Strategist', role: 'Plans go-to-market launch', icon: '\u{1F680}' },
      { name: 'Operations Scaler', role: 'Ensures operational readiness', icon: '\u{1F504}' },
    ],
    gate: 'All personas declare ready or conditional, Go/No-Go recommendation'
  }
};

function initPipelineStages() {
  const stages = document.querySelectorAll('.pipeline-stage');
  const detailEl = document.querySelector('.pipeline-detail');

  if (!stages.length || !detailEl) return;

  // Show first stage by default
  updatePipelineDetail('propose', detailEl);
  stages[0].classList.add('active');

  stages.forEach(stage => {
    stage.addEventListener('click', () => {
      const key = stage.dataset.stage;

      stages.forEach(s => s.classList.remove('active'));
      stage.classList.add('active');

      updatePipelineDetail(key, detailEl);
    });
  });
}

function updatePipelineDetail(stageKey, container) {
  const data = PIPELINE_DATA[stageKey];
  if (!data) return;

  container.innerHTML = `
    <h3>${data.title}</h3>
    <p>${data.description}</p>
    <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: var(--accent-subtle); border-radius: var(--radius-sm); font-size: 0.8125rem;">
      <strong>Gate:</strong> ${data.gate}
    </div>
    <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">Panel Personas</h4>
    <div class="panel-personas">
      ${data.personas.map(p => `
        <div class="panel-persona-card">
          <div class="persona-icon">${p.icon}</div>
          <h4>${p.name}</h4>
          <p>${p.role}</p>
        </div>
      `).join('')}
    </div>
  `;
}
