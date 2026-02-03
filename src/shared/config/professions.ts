export const PROFESSION_OPTIONS = [
  'Frontend-разработчик',
  'Backend-разработчик',
  'Fullstack-разработчик',
  'Mobile-разработчик (iOS/Android)',
  'QA Automation (автотесты)',
  'DevOps / SRE',
  'Data Engineer',
  'Data Scientist / ML Engineer',
  'Security Engineer (AppSec)',
  'Game Developer',
] as const;

export type ProfessionId = (typeof PROFESSION_OPTIONS)[number];

export const SKILL_STAGE_ORDER = ['internship', 'junior', 'middle', 'senior'] as const;
export type SkillStageId = (typeof SKILL_STAGE_ORDER)[number];

export const SKILL_STAGE_LABELS: Record<SkillStageId, string> = {
  internship: 'Internship',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
};

export const STAGE_SCENARIOS: Record<SkillStageId, readonly string[]> = {
  internship: ['scenario-1', 'scenario-2', 'scenario-3', 'scenario-4'],
  junior: ['scenario-5', 'scenario-6', 'scenario-7', 'scenario-8'],
  middle: ['scenario-9', 'scenario-10', 'scenario-11', 'scenario-12'],
  senior: ['scenario-13', 'scenario-14', 'scenario-15', 'scenario-16'],
};

export const PROFESSION_STAGE_SKILLS: Record<
  ProfessionId,
  Record<SkillStageId, readonly string[]>
> = {
  'Frontend-разработчик': {
    internship: [
      'skill-frontend-foundations',
      'skill-html-semantic',
      'skill-css-layout',
      'skill-git-basics',
    ],
    junior: [
      'skill-state-management',
      'skill-component-design',
      'skill-routing',
      'skill-testing-ui',
    ],
    middle: [
      'skill-performance',
      'skill-architecture',
      'skill-design-system',
      'skill-accessibility',
    ],
    senior: [
      'skill-frontend-architecture-advanced',
      'skill-micro-frontend',
      'skill-frontend-observability',
      'skill-web-security',
    ],
  },
  'Backend-разработчик': {
    internship: ['skill-backend', 'skill-http-basics', 'skill-sql', 'skill-api-design'],
    junior: ['skill-databases', 'skill-auth-basics', 'skill-testing-backend', 'skill-cache-basics'],
    middle: [
      'skill-system-design',
      'skill-performance-backend',
      'skill-messaging',
      'skill-observability',
    ],
    senior: [
      'skill-distributed-systems',
      'skill-scalability',
      'skill-security-backend',
      'skill-reliability',
    ],
  },
  'Fullstack-разработчик': {
    internship: [
      'skill-frontend-foundations',
      'skill-backend',
      'skill-http-basics',
      'skill-git-basics',
    ],
    junior: ['skill-state-management', 'skill-api-design', 'skill-databases', 'skill-testing-ui'],
    middle: [
      'skill-architecture',
      'skill-performance',
      'skill-system-design',
      'skill-devops-basics',
    ],
    senior: [
      'skill-micro-frontend',
      'skill-distributed-systems',
      'skill-observability',
      'skill-reliability',
    ],
  },
  'Mobile-разработчик (iOS/Android)': {
    internship: [
      'skill-mobile-ui',
      'skill-mobile-architecture',
      'skill-mobile-platform-basics',
      'skill-mobile-debugging',
    ],
    junior: [
      'skill-mobile-performance',
      'skill-release-pipeline',
      'skill-mobile-networking',
      'skill-mobile-storage',
    ],
    middle: [
      'skill-mobile-testing',
      'skill-mobile-security',
      'skill-offline-first',
      'skill-mobile-ux-research',
    ],
    senior: [
      'skill-cross-platform-architecture',
      'skill-mobile-observability',
      'skill-app-optimization',
      'skill-scale-mobile-teams',
    ],
  },
  'QA Automation (автотесты)': {
    internship: [
      'skill-test-automation',
      'skill-test-design',
      'skill-quality-metrics',
      'skill-bug-reporting',
    ],
    junior: ['skill-ci-cd', 'skill-test-frameworks', 'skill-api-testing', 'skill-ui-testing'],
    middle: [
      'skill-test-strategy',
      'skill-test-data',
      'skill-performance-testing',
      'skill-security-testing',
    ],
    senior: [
      'skill-quality-leadership',
      'skill-flaky-tests',
      'skill-observability-qa',
      'skill-test-architecture',
    ],
  },
  'DevOps / SRE': {
    internship: ['skill-devops-basics', 'skill-ci-cd', 'skill-infra-as-code', 'skill-linux-basics'],
    junior: [
      'skill-observability',
      'skill-reliability',
      'skill-cloud-basics',
      'skill-containerization',
    ],
    middle: [
      'skill-kubernetes',
      'skill-incident-response',
      'skill-sre-metrics',
      'skill-automation',
    ],
    senior: [
      'skill-capacity-planning',
      'skill-disaster-recovery',
      'skill-platform-engineering',
      'skill-finops',
    ],
  },
  'Data Engineer': {
    internship: ['skill-data-pipelines', 'skill-sql', 'skill-data-warehouse', 'skill-etl-basics'],
    junior: [
      'skill-stream-processing',
      'skill-data-quality',
      'skill-data-modeling',
      'skill-orchestration',
    ],
    middle: [
      'skill-big-data',
      'skill-performance-data',
      'skill-data-governance',
      'skill-data-security',
    ],
    senior: [
      'skill-lakehouse',
      'skill-reliability-data',
      'skill-cost-optimization',
      'skill-architecture-data',
    ],
  },
  'Data Scientist / ML Engineer': {
    internship: [
      'skill-python-data',
      'skill-ml-modeling',
      'skill-experimentation',
      'skill-ml-math',
    ],
    junior: [
      'skill-feature-engineering',
      'skill-model-evaluation',
      'skill-mlops',
      'skill-ml-data-pipelines',
    ],
    middle: [
      'skill-advanced-ml',
      'skill-model-interpretability',
      'skill-ml-deployment',
      'skill-ml-performance',
    ],
    senior: [
      'skill-ml-systems',
      'skill-ml-governance',
      'skill-ml-reliability',
      'skill-ml-product-strategy',
    ],
  },
  'Security Engineer (AppSec)': {
    internship: [
      'skill-secure-coding',
      'skill-threat-modeling',
      'skill-appsec-testing',
      'skill-dependency-security',
    ],
    junior: [
      'skill-owasp',
      'skill-code-review-security',
      'skill-iam-basics',
      'skill-secure-architecture',
    ],
    middle: [
      'skill-security-automation',
      'skill-incident-response-security',
      'skill-vuln-management',
      'skill-penetration-testing',
    ],
    senior: [
      'skill-security-program',
      'skill-risk-management',
      'skill-security-observability',
      'skill-red-team',
    ],
  },
  'Game Developer': {
    internship: [
      'skill-game-engine',
      'skill-gameplay-programming',
      'skill-graphics',
      'skill-optimization',
    ],
    junior: ['skill-level-design', 'skill-game-physics', 'skill-tools-pipeline', 'skill-game-ui'],
    middle: [
      'skill-multiplayer',
      'skill-ai-gameplay',
      'skill-performance-profiling',
      'skill-game-architecture',
    ],
    senior: [
      'skill-rendering-advanced',
      'skill-engine-optimization',
      'skill-live-ops',
      'skill-game-production',
    ],
  },
};
