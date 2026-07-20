import type { GameState, ReincarnationState, ReincarnationUpgradeId } from '@/types';

export interface ReincarnationUpgradeDefinition {
  id: ReincarnationUpgradeId;
  name: string;
  description: string;
  maxLevel: number;
}

export const reincarnationUpgrades: ReincarnationUpgradeDefinition[] = [
  { id: 'foundation', name: '先天道基', description: '每级令新生五维各提高 2 点', maxLevel: 10 },
  { id: 'longevity', name: '长生余韵', description: '每级令每次突破所得寿元提高 5%', maxLevel: 10 },
  { id: 'insight', name: '宿慧不昧', description: '每级令实时修行周期缩短 3%', maxLevel: 10 },
  { id: 'fortune', name: '命数眷顾', description: '每级提高新生初始灵石，5级后天赋四选一', maxLevel: 10 }
];

export const initialReincarnationState: ReincarnationState = {
  points: 0,
  totalEarned: 0,
  lives: 0,
  ascensions: 0,
  lastGain: 0,
  upgrades: { foundation: 0, longevity: 0, insight: 0, fortune: 0 }
};

export function getReincarnationUpgradeCost(state: ReincarnationState, id: ReincarnationUpgradeId): number {
  return (state.upgrades[id] ?? 0) + 1;
}

export function calculateReincarnationGain(gameState: GameState, ascended: boolean): number {
  const bossKinds = gameState.combatZoneProgress.filter(progress => progress.bossDefeated).length;
  const dungeonClears = gameState.dungeonProgress.reduce((sum, progress) => sum + progress.clears, 0);
  return Math.max(1, Math.floor(
    gameState.currentRealm.level / 2
    + gameState.completedGoals.length / 3
    + bossKinds / 3
    + dungeonClears / 2
    + (ascended ? 8 : 0)
  ));
}

export function awardReincarnation(
  state: ReincarnationState,
  gain: number,
  ascended: boolean
): ReincarnationState {
  const safeGain = Math.max(0, Math.floor(gain));
  return {
    ...state,
    points: state.points + safeGain,
    totalEarned: state.totalEarned + safeGain,
    lives: state.lives + 1,
    ascensions: state.ascensions + (ascended ? 1 : 0),
    lastGain: safeGain
  };
}

export function getReincarnationOrigin(state: ReincarnationState): { name: string; description: string } {
  if (state.totalEarned >= 50) return { name: '天命遗族', description: '新生初始灵石额外提高 20，幼年根基更为深厚。' };
  if (state.totalEarned >= 20) return { name: '轮回世家', description: '新生初始灵石额外提高 10，前世余荫仍在。' };
  return { name: '尘世凡胎', description: '尚未积成足以改变出身的轮回余韵。' };
}

export function getReincarnationStartingAttributeBonus(state: ReincarnationState): number {
  return state.upgrades.foundation * 2;
}

export function getReincarnationStartingSpiritStonesBonus(state: ReincarnationState): number {
  const originBonus = state.totalEarned >= 50 ? 20 : state.totalEarned >= 20 ? 10 : 0;
  return originBonus + state.upgrades.fortune * 3;
}

export function getReincarnationLifespanMultiplier(state: ReincarnationState): number {
  return 1 + state.upgrades.longevity * 0.05;
}

export function getReincarnationIdleSpeedMultiplier(state: ReincarnationState): number {
  return Math.max(0.7, 1 - state.upgrades.insight * 0.03);
}

export function getReincarnationTalentChoiceCount(state: ReincarnationState): number {
  return state.upgrades.fortune >= 5 ? 4 : 3;
}
