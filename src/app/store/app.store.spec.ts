import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Scenario } from '@/entities/scenario';
import { Skill } from '@/entities/skill';
import { calcScenarioReward } from '@/entities/rewards';
import { calcStreakMultiplier } from '@/entities/streak';
import { NotificationsStore } from '@/features/notifications';
import { ScenariosApi } from '@/shared/api/scenarios/scenarios.api';
import { SkillsApi } from '@/shared/api/skills/skills.api';
import { BALANCE, SHOP_ITEMS } from '@/shared/config';
import { AppStore } from './app.store';

const START_COINS = BALANCE.newGame?.startCoins ?? 0;

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
    const coinsDelta = 5;
    const expectedRewardCoins = calcScenarioReward({
      reputation: reputationDelta,
      techDebt: techDebtDelta,
      comboMultiplier: calcStreakMultiplier(1),
    });
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
              coins: coinsDelta,
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
    expect(store.coins()).toBe(START_COINS + coinsDelta + expectedRewardCoins);
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

  it('buys a shop item when enough coins', () => {
    const item = SHOP_ITEMS[0];
    const scenarios: Scenario[] = [
      {
        id: 'scenario-buy',
        title: 'Scenario Buy',
        description: 'Earn coins',
        stage: 'internship',
        profession: 'all',
        rewardXp: BALANCE.rewards.scenarioXp,
        correctOptionIds: ['decision-buy'],
        decisions: [
          {
            id: 'decision-buy',
            text: 'Earn',
            effects: {
              coins: 300,
            },
          },
        ],
      },
    ];

    const store = createStore([], scenarios);
    const notifications = TestBed.inject(NotificationsStore);
    const successSpy = jest.spyOn(notifications, 'success');
    const errorSpy = jest.spyOn(notifications, 'error');

    store.applyDecision('scenario-buy', 'decision-buy');
    const beforeCoins = store.coins();
    const result = store.buyItem(item.id);

    expect(result).toBe(true);
    expect(store.inventory().ownedItemIds).toContain(item.id);
    expect(store.coins()).toBe(beforeCoins - item.price);
    expect(successSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('blocks duplicate purchases', () => {
    const item = SHOP_ITEMS[1];
    const scenarios: Scenario[] = [
      {
        id: 'scenario-dupe',
        title: 'Scenario Dupe',
        description: 'Earn coins',
        stage: 'internship',
        profession: 'all',
        rewardXp: BALANCE.rewards.scenarioXp,
        correctOptionIds: ['decision-dupe'],
        decisions: [
          {
            id: 'decision-dupe',
            text: 'Earn',
            effects: {
              coins: 300,
            },
          },
        ],
      },
    ];

    const store = createStore([], scenarios);
    const notifications = TestBed.inject(NotificationsStore);
    const errorSpy = jest.spyOn(notifications, 'error');

    store.applyDecision('scenario-dupe', 'decision-dupe');
    expect(store.buyItem(item.id)).toBe(true);
    const secondAttempt = store.buyItem(item.id);

    expect(secondAttempt).toBe(false);
    expect(store.inventory().ownedItemIds.filter((id) => id === item.id)).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('rejects purchases without enough coins', () => {
    const item = SHOP_ITEMS[2];
    const store = createStore([], []);
    const notifications = TestBed.inject(NotificationsStore);
    const errorSpy = jest.spyOn(notifications, 'error');

    const result = store.buyItem(item.id);

    expect(result).toBe(false);
    expect(store.inventory().ownedItemIds).toHaveLength(0);
    expect(store.coins()).toBe(START_COINS);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('rejects unknown items without changes', () => {
    const store = createStore([], []);
    const notifications = TestBed.inject(NotificationsStore);
    const errorSpy = jest.spyOn(notifications, 'error');

    const result = store.buyItem('unknown-item');

    expect(result).toBe(false);
    expect(store.inventory().ownedItemIds).toHaveLength(0);
    expect(store.coins()).toBe(START_COINS);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('buys a luxury item with cash when company mode is unlocked', () => {
    const luxuryItem = SHOP_ITEMS.find((item) => item.currency === 'cash');
    if (!luxuryItem) {
      throw new Error('No luxury items configured');
    }

    const store = createStore([], []);
    const notifications = TestBed.inject(NotificationsStore);
    const successSpy = jest.spyOn(notifications, 'success');
    const errorSpy = jest.spyOn(notifications, 'error');

    const payload = JSON.parse(store.exportState());
    payload.company = { cash: luxuryItem.price + 50, unlocked: true, level: 'lead' };
    payload.progress = { ...payload.progress, careerStage: 'senior' };
    const importResult = store.importState(JSON.stringify(payload));

    expect(importResult.ok).toBe(true);
    const result = store.buyItem(luxuryItem.id);

    expect(result).toBe(true);
    expect(store.inventory().ownedItemIds).toContain(luxuryItem.id);
    expect(store.company().cash).toBe(payload.company.cash - luxuryItem.price);
    expect(successSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('blocks luxury purchases when company mode is locked', () => {
    const luxuryItem = SHOP_ITEMS.find((item) => item.currency === 'cash');
    if (!luxuryItem) {
      throw new Error('No luxury items configured');
    }

    const store = createStore([], []);
    const notifications = TestBed.inject(NotificationsStore);
    const errorSpy = jest.spyOn(notifications, 'error');

    const payload = JSON.parse(store.exportState());
    payload.company = { cash: luxuryItem.price + 50 };
    payload.progress = { ...payload.progress, careerStage: 'junior' };
    const importResult = store.importState(JSON.stringify(payload));

    expect(importResult.ok).toBe(true);
    const result = store.buyItem(luxuryItem.id);

    expect(result).toBe(false);
    expect(store.inventory().ownedItemIds).not.toContain(luxuryItem.id);
    expect(store.company().cash).toBe(payload.company.cash);
    expect(errorSpy).toHaveBeenCalled();
  });
});
