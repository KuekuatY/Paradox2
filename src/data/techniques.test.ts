import { describe, expect, it } from 'vitest';
import { getTechniqueRewardsByGrade } from '@/data/techniques';

describe('getTechniqueRewardsByGrade', () => {
  it('offers an eligible technique when the grade is not yet known', () => {
    const rewards = getTechniqueRewardsByGrade('sword', '玄', 3, []);

    expect(rewards.length).toBeGreaterThan(0);
    expect(rewards.every(technique => technique.pathId === 'sword' && technique.grade === '玄')).toBe(true);
  });

  it('does not offer a second technique of the same grade', () => {
    const [knownTechnique] = getTechniqueRewardsByGrade('sword', '玄', 3, []);

    expect(getTechniqueRewardsByGrade('sword', '玄', 3, [knownTechnique.id])).toEqual([]);
  });

  it('does not offer a technique before its realm requirement', () => {
    expect(getTechniqueRewardsByGrade('sword', '玄', 2, [])).toEqual([]);
  });
});
