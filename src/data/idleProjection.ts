import { getCombatZone } from '@/data/combatZones';
import { getDungeonDefinition } from '@/data/dungeons';
import { getIdleCycleDurationMs, getIdleCyclesPerHour } from '@/data/idleActivities';
import { getItem } from '@/data/items';
import { getLifeSkill, lifeSkills, type LifeSkillRecipe } from '@/data/lifeSkills';
import type { GameState, InventoryReward } from '@/types';

export interface IdleProjection {
  cyclesPerHour: number;
  cycleSeconds: number;
  outputsPerHour: Array<{ itemId: string; quantity: number }>;
  targetEtaMinutes: number | null;
  bottleneck: string | null;
  summary: string;
}

export function getIdleProjection(gameState: GameState): IdleProjection {
  const cycleMs = getIdleCycleDurationMs(gameState);
  const cyclesPerHour = getIdleCyclesPerHour(gameState);
  const outputsPerCycle = getCurrentOutputs(gameState);
  const outputsPerHour = outputsPerCycle.map(output => ({
    itemId: output.itemId,
    quantity: Math.round(output.quantity * cyclesPerHour * 10) / 10
  }));
  const target = gameState.idleAutomation.targetItemId;
  const targetPlan = target ? getTargetPlan(gameState, target) : null;
  const currentQuantity = target ? getQuantity(gameState, target) : 0;
  const deficit = target ? Math.max(0, gameState.idleAutomation.targetQuantity - currentQuantity) : 0;
  const targetEtaMinutes = targetPlan && deficit > 0
    ? Math.ceil(targetPlan.cyclesPerItem * deficit * cycleMs / 60_000)
    : target && deficit === 0
      ? 0
      : null;
  const summary = outputsPerHour.length > 0
    ? outputsPerHour.slice(0, 3).map(output => `${getItem(output.itemId)?.name ?? output.itemId} ${formatQuantity(output.quantity)}/时`).join(' · ')
    : getActionProjectionText(gameState, cyclesPerHour);

  return {
    cyclesPerHour,
    cycleSeconds: Math.round(cycleMs / 1000),
    outputsPerHour,
    targetEtaMinutes,
    bottleneck: targetPlan?.bottleneck ?? null,
    summary
  };
}

function getCurrentOutputs(gameState: GameState): InventoryReward[] {
  if (gameState.selectedYearAction === 'life-skill') {
    const skill = getLifeSkill(gameState.lifeSkillActivity.skillId);
    const recipe = skill?.recipes.find(entry => entry.id === gameState.lifeSkillActivity.recipeId);
    return recipe?.rewards ?? skill?.baseRewards ?? [];
  }
  if (gameState.selectedYearAction !== 'combat') return [];
  if (gameState.dungeonRun) {
    const dungeon = getDungeonDefinition(gameState.dungeonRun.zoneId);
    return (dungeon?.repeatRewards ?? []).map(reward => ({ ...reward, quantity: reward.quantity / Math.max(1, dungeon?.totalFloors ?? 5) }));
  }
  const zone = getCombatZone(gameState.combatActivity.zoneId);
  if (!zone) return [];
  const totalWeight = zone.loot.reduce((sum, loot) => sum + loot.weight, 0);
  return zone.loot.map(loot => ({
    itemId: loot.itemId,
    quantity: zone.dropChance * loot.weight / Math.max(0.01, totalWeight)
  }));
}

function getTargetPlan(gameState: GameState, itemId: string): { cyclesPerItem: number; bottleneck: string | null } | null {
  const recipeEntry = findRecipeForOutput(itemId, gameState);
  if (!recipeEntry) {
    const currentOutput = getCurrentOutputs(gameState).find(output => output.itemId === itemId);
    return currentOutput && currentOutput.quantity > 0
      ? { cyclesPerItem: 1 / currentOutput.quantity, bottleneck: null }
      : { cyclesPerItem: 1, bottleneck: `${getItem(itemId)?.name ?? itemId}没有已解锁的自动获取途径` };
  }
  const rewardQuantity = recipeEntry.recipe.rewards.find(reward => reward.itemId === itemId)?.quantity ?? 1;
  let cycles = 1;
  let bottleneck: string | null = null;
  for (const cost of recipeEntry.recipe.costs) {
    const available = getQuantity(gameState, cost.itemId);
    if (available >= cost.quantity) continue;
    const producer = findRecipeForOutput(cost.itemId, gameState);
    if (!producer) {
      bottleneck = `缺少${getItem(cost.itemId)?.name ?? cost.itemId}，需先通过战斗、坊市或基础采集补足`;
      continue;
    }
    const produced = producer.recipe.rewards.find(reward => reward.itemId === cost.itemId)?.quantity ?? 1;
    cycles += Math.ceil((cost.quantity - available) / produced);
    bottleneck ??= `自动链会先转向${producer.recipe.name}`;
  }
  return { cyclesPerItem: cycles / rewardQuantity, bottleneck };
}

function findRecipeForOutput(itemId: string, gameState: GameState): { recipe: LifeSkillRecipe } | null {
  for (const skill of lifeSkills) {
    const progress = gameState.lifeSkills.find(entry => entry.skillId === skill.id)?.level ?? 1;
    const recipe = skill.recipes.find(entry => (
      entry.rewards.some(reward => reward.itemId === itemId)
      && entry.minRealmLevel <= gameState.currentRealm.level
      && entry.minSkillLevel <= progress
    ));
    if (recipe) return { recipe };
  }
  return null;
}

function getActionProjectionText(gameState: GameState, cyclesPerHour: number): string {
  if (gameState.selectedYearAction === 'cultivate') return `预计完成 ${cyclesPerHour} 轮修炼/时`;
  if (gameState.selectedYearAction === 'adventure') return `预计触发 ${cyclesPerHour} 次历练/时`;
  if (gameState.selectedYearAction === 'seclusion') return `预计完成 ${cyclesPerHour} 轮闭关/时`;
  return `预计完成 ${cyclesPerHour} 轮/时`;
}

function getQuantity(gameState: GameState, itemId: string): number {
  return gameState.inventory.find(entry => entry.itemId === itemId)?.quantity ?? 0;
}

function formatQuantity(value: number): string {
  return value >= 10 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
}
