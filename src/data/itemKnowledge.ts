import { combatZones, getEquipmentDefinition } from '@/data/combatZones';
import { dungeonDefinitions } from '@/data/dungeons';
import { getItem } from '@/data/items';
import { lifeSkills } from '@/data/lifeSkills';
import { isMarketCatalogItem } from '@/data/market';

export interface ItemKnowledge {
  sources: string[];
  uses: string[];
}

export function getItemKnowledge(itemId: string): ItemKnowledge {
  const item = getItem(itemId);
  const sources = new Set<string>();
  const uses = new Set<string>();

  lifeSkills.forEach(skill => {
    if (skill.baseRewards.some(reward => reward.itemId === itemId)) sources.add(`${skill.name}基础采集`);
    skill.recipes.forEach(recipe => {
      if (recipe.rewards.some(reward => reward.itemId === itemId)) sources.add(`${skill.name}：${recipe.name}`);
      if (recipe.costs.some(cost => cost.itemId === itemId)) uses.add(`${skill.name}：${recipe.name}`);
    });
  });
  combatZones.forEach(zone => {
    if (zone.loot.some(loot => loot.itemId === itemId)) sources.add(`${zone.name}战斗掉落`);
    if (zone.firstClearRewards.some(reward => reward.itemId === itemId)) sources.add(`${zone.name}首领首胜`);
  });
  dungeonDefinitions.forEach(dungeon => {
    if (dungeon.repeatRewards.some(reward => reward.itemId === itemId)) sources.add(`${dungeon.name}通关`);
    if (dungeon.firstClearRewards.some(reward => reward.itemId === itemId)) sources.add(`${dungeon.name}首通`);
  });
  if (isMarketCatalogItem(itemId)) sources.add('坊市货单或拍卖');
  if (item?.usable) uses.add('在储物戒中直接使用');
  if (getEquipmentDefinition(itemId)) uses.add('装备、强化、重铸或分解');
  if (item?.type === '丹药') uses.add('丹药类突破准备');
  if (item?.type === '法器') uses.add('法器类突破准备');
  if (item?.type === '符箓') uses.add('符箓类突破准备或检定');
  if (item?.type === '阵材') uses.add('阵法类突破准备');
  uses.add('在坊市出售换取家境');

  if (sources.size === 0) sources.add('机缘、资源或宗门事件');
  return { sources: Array.from(sources), uses: Array.from(uses) };
}
