import { equipmentDefinitions, equipmentSetDefinitions } from '@/data/combatZones';
import type { GameState, InventoryReward } from '@/types';

export interface CodexMilestoneDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'equipment' | 'sets' | 'zones' | 'bosses' | 'dungeons' | 'recipes' | 'relics' | 'reincarnations';
  target: number;
  effects?: {
    根骨?: number;
    神识?: number;
    悟性?: number;
    气运?: number;
    灵石?: number;
  };
  itemRewards?: InventoryReward[];
}

export const codexMilestones: CodexMilestoneDefinition[] = [
  { id: 'codex-equipment-3', name: '初识百器', description: '发现 3 件不同法器', kind: 'equipment', target: 3, itemRewards: [{ itemId: 'artifact-essence', quantity: 3 }] },
  { id: 'codex-equipment-8', name: '器道通览', description: '发现全部 12 件战斗法器', kind: 'equipment', target: 12, effects: { 悟性: 3, 灵石: 15 } },
  { id: 'codex-sets-3', name: '套装宗师', description: '集齐全部 3 套战斗装备', kind: 'sets', target: 3, effects: { 根骨: 4, 悟性: 4 }, itemRewards: [{ itemId: 'artifact-essence', quantity: 6 }] },
  { id: 'codex-zones-3', name: '行遍三域', description: '在 3 个区域留下战斗记录', kind: 'zones', target: 3, effects: { 气运: 3 }, itemRewards: [{ itemId: 'artifact-essence', quantity: 2 }] },
  { id: 'codex-bosses-6', name: '斩关破境', description: '击败 6 位不同区域首领', kind: 'bosses', target: 6, effects: { 根骨: 4, 神识: 4 } },
  { id: 'codex-bosses-9', name: '九域无敌', description: '击败全部 9 位区域首领', kind: 'bosses', target: 9, effects: { 悟性: 6, 气运: 6 }, itemRewards: [{ itemId: 'artifact-essence', quantity: 5 }] },
  { id: 'codex-dungeons-3', name: '秘境行者', description: '通关 3 次秘境', kind: 'dungeons', target: 3, effects: { 根骨: 3, 气运: 3 } },
  { id: 'codex-dungeons-12', name: '九幽踏遍', description: '累计通关 12 次秘境', kind: 'dungeons', target: 12, itemRewards: [{ itemId: 'combat-insight', quantity: 4 }] },
  { id: 'codex-recipes-8', name: '百艺相生', description: '完成 8 种不同配方', kind: 'recipes', target: 8, effects: { 悟性: 5, 灵石: 12 } },
  { id: 'codex-recipes-18', name: '造化万象', description: '完成 18 种不同配方', kind: 'recipes', target: 18, effects: { 神识: 7, 悟性: 7 } },
  { id: 'codex-relics-4', name: '古宝有灵', description: '发现 4 种秘境遗物', kind: 'relics', target: 4, effects: { 气运: 5 } },
  { id: 'codex-reincarnations-3', name: '三世问道', description: '完成 3 次轮回', kind: 'reincarnations', target: 3, effects: { 根骨: 5, 神识: 5 } }
];

const equipmentIds = new Set(equipmentDefinitions.map(definition => definition.itemId));

export function getDiscoveredEquipmentIds(gameState: GameState): string[] {
  const discovered = new Set<string>();
  gameState.inventory.forEach(entry => {
    if (equipmentIds.has(entry.itemId) && entry.quantity > 0) discovered.add(entry.itemId);
  });
  Object.values(gameState.equipment).forEach(itemId => {
    if (itemId && equipmentIds.has(itemId)) discovered.add(itemId);
  });
  gameState.equipmentEnhancements.forEach(entry => discovered.add(entry.itemId));
  gameState.equipmentAffixes.forEach(entry => discovered.add(entry.itemId));
  gameState.events.forEach(event => event.itemRewards?.forEach(reward => {
    if (equipmentIds.has(reward.itemId)) discovered.add(reward.itemId);
  }));
  return Array.from(discovered);
}

export function getCodexProgress(gameState: GameState, milestone: CodexMilestoneDefinition): number {
  if (milestone.kind === 'equipment') return getDiscoveredEquipmentIds(gameState).length;
  if (milestone.kind === 'sets') {
    const discovered = new Set(getDiscoveredEquipmentIds(gameState));
    return equipmentSetDefinitions.filter(set => set.itemIds.every(itemId => discovered.has(itemId))).length;
  }
  if (milestone.kind === 'zones') return gameState.combatZoneProgress.filter(progress => progress.kills > 0 || progress.bossWins > 0).length;
  if (milestone.kind === 'bosses') return gameState.combatZoneProgress.filter(progress => progress.bossDefeated).length;
  if (milestone.kind === 'dungeons') return gameState.dungeonProgress.reduce((sum, progress) => sum + progress.clears, 0);
  if (milestone.kind === 'recipes') return gameState.craftedRecipeIds.length;
  if (milestone.kind === 'relics') return gameState.discoveredRelicIds.length;
  return gameState.reincarnation.lives;
}
