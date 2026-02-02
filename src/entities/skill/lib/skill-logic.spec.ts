import { changeSkillLevel, getIncreaseBlockReason } from '@/entities/skill';
import { Skill } from '@/entities/skill';

describe('skill logic', () => {
  it('blocks upgrades until dependencies are met', () => {
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

    expect(getIncreaseBlockReason(skills, 'advanced')).toBe('Нужно прокачать: Core до уровня 1');

    const coreResult = changeSkillLevel(skills, 'core', 1);
    expect(coreResult.nextLevel).toBe(1);

    const advancedResult = changeSkillLevel(coreResult.skills, 'advanced', 1);
    expect(advancedResult.nextLevel).toBe(1);
  });

  it('clamps upgrades to max level', () => {
    const skills: Skill[] = [
      { id: 'core', name: 'Core', category: 'Engineering', level: 1, maxLevel: 2, deps: [] },
    ];

    const result = changeSkillLevel(skills, 'core', 5);
    expect(result.nextLevel).toBe(2);
  });
});
