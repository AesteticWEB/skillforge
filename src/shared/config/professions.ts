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

export const PROFESSION_CORE_SKILLS: Record<ProfessionId, readonly string[]> = {
  'Frontend-разработчик': [
    'skill-frontend-foundations',
    'skill-architecture',
    'skill-state-management',
    'skill-performance',
  ],
  'Backend-разработчик': [
    'skill-backend',
    'skill-api-design',
    'skill-databases',
    'skill-system-design',
  ],
  'Fullstack-разработчик': [
    'skill-architecture',
    'skill-backend',
    'skill-state-management',
    'skill-devops-basics',
  ],
  'Mobile-разработчик (iOS/Android)': [
    'skill-mobile-architecture',
    'skill-mobile-ui',
    'skill-mobile-performance',
    'skill-release-pipeline',
  ],
  'QA Automation (автотесты)': [
    'skill-test-automation',
    'skill-test-design',
    'skill-ci-cd',
    'skill-quality-metrics',
  ],
  'DevOps / SRE': [
    'skill-ci-cd',
    'skill-infra-as-code',
    'skill-observability',
    'skill-reliability',
  ],
  'Data Engineer': [
    'skill-data-pipelines',
    'skill-sql',
    'skill-data-warehouse',
    'skill-stream-processing',
  ],
  'Data Scientist / ML Engineer': [
    'skill-ml-modeling',
    'skill-python-data',
    'skill-experimentation',
    'skill-mlops',
  ],
  'Security Engineer (AppSec)': [
    'skill-threat-modeling',
    'skill-secure-coding',
    'skill-appsec-testing',
    'skill-dependency-security',
  ],
  'Game Developer': [
    'skill-game-engine',
    'skill-gameplay-programming',
    'skill-graphics',
    'skill-optimization',
  ],
};
