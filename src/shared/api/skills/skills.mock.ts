import { Skill } from '@/entities/skill';

export const SKILLS_MOCK: Skill[] = [
  {
    id: 'skill-architecture',
    name: 'Frontend Architecture',
    category: 'Engineering',
    level: 2,
    maxLevel: 5,
    deps: [],
  },
  {
    id: 'skill-performance',
    name: 'Performance Tuning',
    category: 'Engineering',
    level: 1,
    maxLevel: 5,
    deps: ['skill-architecture'],
  },
  {
    id: 'skill-research',
    name: 'Product Discovery',
    category: 'Product',
    level: 3,
    maxLevel: 5,
    deps: [],
  },
  {
    id: 'skill-mentorship',
    name: 'Team Mentorship',
    category: 'Leadership',
    level: 2,
    maxLevel: 5,
    deps: ['skill-research'],
  },
];
