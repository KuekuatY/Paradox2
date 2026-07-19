import type { GameState, InventoryReward } from '@/types';

export interface StageRequirement {
  label: string;
  current: number;
  target: number;
}

export interface StageRewardDefinition {
  id: string;
  name: string;
  minRealmLevel: number;
  reincarnationPoints: number;
  effects: GameState['events'][number]['effects'];
  itemRewards: InventoryReward[];
  getRequirements: (gameState: GameState) => StageRequirement[];
}

const techniqueLevels = (state: GameState) => state.techniques.reduce((sum, technique) => sum + technique.level, 0);
const dungeonClears = (state: GameState) => state.dungeonProgress.reduce((sum, progress) => sum + progress.clears, 0);
const lifeSkillLevels = (state: GameState) => state.lifeSkills.reduce((sum, skill) => sum + skill.level, 0);
const bossKinds = (state: GameState) => state.combatZoneProgress.filter(progress => progress.bossDefeated).length;

export const stageRewards: StageRewardDefinition[] = [
  {
    id: 'stage-foundation', name: '立足尘世', minRealmLevel: 2, reincarnationPoints: 1,
    effects: { 根骨: 3, 悟性: 3 }, itemRewards: [{ itemId: 'qi-gathering-pill', quantity: 2 }],
    getRequirements: state => [
      { label: '达到筑基期', current: state.currentRealm.level, target: 2 },
      { label: '取得三场胜利', current: state.combatStats.victories, target: 3 },
      { label: '习得一本功法', current: state.techniques.length, target: 1 }
    ]
  },
  {
    id: 'stage-build', name: '构筑成形', minRealmLevel: 4, reincarnationPoints: 2,
    effects: { 神识: 5, 气运: 4 }, itemRewards: [{ itemId: 'combat-insight', quantity: 2 }],
    getRequirements: state => [
      { label: '达到元婴期', current: state.currentRealm.level, target: 4 },
      { label: '功法总层数达到十层', current: techniqueLevels(state), target: 10 },
      { label: '通关一次秘境', current: dungeonClears(state), target: 1 }
    ]
  },
  {
    id: 'stage-tribulation', name: '劫前百艺', minRealmLevel: 6, reincarnationPoints: 3,
    effects: { 根骨: 7, 神识: 7 }, itemRewards: [{ itemId: 'tribulation-ward', quantity: 1 }],
    getRequirements: state => [
      { label: '达到炼虚期', current: state.currentRealm.level, target: 6 },
      { label: '百艺总等级达到二十四', current: lifeSkillLevels(state), target: 24 },
      { label: '完成六种配方', current: state.craftedRecipeIds.length, target: 6 }
    ]
  },
  {
    id: 'stage-ascension', name: '飞升在望', minRealmLevel: 8, reincarnationPoints: 5,
    effects: { 根骨: 10, 神识: 10, 悟性: 10, 气运: 10 }, itemRewards: [{ itemId: 'tribulation-pill', quantity: 2 }],
    getRequirements: state => [
      { label: '达到大乘期', current: state.currentRealm.level, target: 8 },
      { label: '击败六种区域首领', current: bossKinds(state), target: 6 },
      { label: '累计通关五次秘境', current: dungeonClears(state), target: 5 }
    ]
  }
];

export function isStageRewardComplete(gameState: GameState, reward: StageRewardDefinition): boolean {
  return reward.getRequirements(gameState).every(requirement => requirement.current >= requirement.target);
}
