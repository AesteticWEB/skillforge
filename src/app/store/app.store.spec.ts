import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Scenario } from '@/entities/scenario';
import { Skill } from '@/entities/skill';
import { ScenariosApi } from '@/shared/api/scenarios/scenarios.api';
import { SkillsApi } from '@/shared/api/skills/skills.api';
import { BALANCE } from '@/shared/config';
import { AppStore } from './app.store';

const createStore = (skills: Skill[], scenarios: Scenario[]): AppStore => {
  TestBed.configureTestingModule({
    providers: [
      AppStore,
      {
        provide: SkillsApi,
        useValue: {
          getSkills: () => of(skills),
        },
      },
      {
        provide: ScenariosApi,
        useValue: {
          getScenarios: () => of(scenarios),
        },
      },
    ],
  });

  return TestBed.inject(AppStore);
};

describe('AppStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('blocks upgrades until deps are met and clamps to max', () => {
    const skills: Skill[] = [
      { id: 'core', name: 'Core', category: 'Engineering', level: 0, maxLevel: 2, deps: [] },
      {
        id: 'advanced',
        name: 'Advanced',
        category: 'Engineering',
        level: 0,
        maxLevel: 1,
        deps: ['core'],
      },
    ];

    const store = createStore(skills, []);
    store.setXp(200);

    expect(store.canIncreaseSkill('advanced')).toBe(false);
    store.incrementSkillLevel('advanced');
    expect(store.skills().find((skill) => skill.id === 'advanced')?.level).toBe(0);

    store.incrementSkillLevel('core');
    expect(store.canIncreaseSkill('advanced')).toBe(true);

    store.incrementSkillLevel('advanced');
    store.incrementSkillLevel('advanced');
    expect(store.skills().find((skill) => skill.id === 'advanced')?.level).toBe(1);
  });

  it('applies decision effects to metrics without auto-upgrading skills', () => {
    const skills: Skill[] = [
      { id: 'core', name: 'Core', category: 'Engineering', level: 0, maxLevel: 3, deps: [] },
    ];
    const reputationDelta = BALANCE.effects.reputation.gain * 2;
    const techDebtDelta = -BALANCE.effects.techDebt.relief;
    const scenarios: Scenario[] = [
      {
        id: 'scenario-1',
        title: 'Scenario 1',
        description: 'Test scenario',
        stage: 'internship',
        profession: 'all',
        rewardXp: BALANCE.rewards.scenarioXp,
        correctOptionIds: ['decision-1'],
        decisions: [
          {
            id: 'decision-1',
            text: 'Apply effects',
            effects: {
              reputation: reputationDelta,
              techDebt: techDebtDelta,
              core: BALANCE.effects.skill.gain,
            },
          },
        ],
      },
    ];

    const store = createStore(skills, scenarios);
    store.applyDecision('scenario-1', 'decision-1');

    expect(store.reputation()).toBe(reputationDelta);
    expect(store.techDebt()).toBe(techDebtDelta);
    expect(store.skills().find((skill) => skill.id === 'core')?.level).toBe(0);
    expect(store.progress().decisionHistory).toHaveLength(1);
    expect(store.progress().decisionHistory[0]?.scenarioId).toBe('scenario-1');
  });

  it('computes top skills by level', () => {
    const skills: Skill[] = [
      { id: 'core', name: 'Core', category: 'Engineering', level: 1, maxLevel: 3, deps: [] },
      { id: 'ux', name: 'UX', category: 'Design', level: 2, maxLevel: 4, deps: [] },
      {
        id: 'advanced',
        name: 'Advanced',
        category: 'Engineering',
        level: 2,
        maxLevel: 4,
        deps: ['core'],
      },
      { id: 'ops', name: 'Ops', category: 'Platform', level: 0, maxLevel: 2, deps: [] },
    ];

    const store = createStore(skills, []);
    const top = store.topSkillsByLevel();

    expect(top.map((skill) => skill.id)).toEqual(['advanced', 'ux', 'core']);
  });
});
