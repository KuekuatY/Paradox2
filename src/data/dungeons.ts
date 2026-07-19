import { combatZones, createCombatZoneEvent, getCombatZone } from '@/data/combatZones';
import type { CombatZoneId, GameEvent, InventoryReward } from '@/types';

export interface DungeonDefinition {
  id: CombatZoneId;
  name: string;
  description: string;
  totalFloors: number;
  eliteFloor: number;
  repeatRewards: InventoryReward[];
  firstClearRewards: InventoryReward[];
}

const rewardSettings: Record<CombatZoneId, Pick<DungeonDefinition, 'repeatRewards' | 'firstClearRewards'>> = {
  'greenmist-outskirts': { repeatRewards: [{ itemId: 'spirit-herb', quantity: 3 }, { itemId: 'beast-core', quantity: 1 }], firstClearRewards: [{ itemId: 'combat-insight', quantity: 1 }] },
  'blackstone-mine': { repeatRewards: [{ itemId: 'spirit-ore', quantity: 4 }, { itemId: 'artifact-essence', quantity: 1 }], firstClearRewards: [{ itemId: 'combat-insight', quantity: 1 }] },
  'ghost-market': { repeatRewards: [{ itemId: 'blood-jade', quantity: 2 }, { itemId: 'old-manual-page', quantity: 1 }], firstClearRewards: [{ itemId: 'combat-insight', quantity: 2 }] },
  'falling-star-ferry': { repeatRewards: [{ itemId: 'star-spirit-stone', quantity: 2 }, { itemId: 'purple-crystal-marrow', quantity: 1 }], firstClearRewards: [{ itemId: 'artifact-essence', quantity: 2 }] },
  'thunder-marsh': { repeatRewards: [{ itemId: 'thunder-beast-core', quantity: 2 }, { itemId: 'dragon-blood-pill', quantity: 1 }], firstClearRewards: [{ itemId: 'combat-insight', quantity: 2 }] },
  'ruined-city': { repeatRewards: [{ itemId: 'nether-bone', quantity: 2 }, { itemId: 'mystic-manual-fragment', quantity: 1 }], firstClearRewards: [{ itemId: 'artifact-essence', quantity: 3 }] },
  'star-sea': { repeatRewards: [{ itemId: 'outer-star-sand', quantity: 2 }, { itemId: 'tribulation-crystal', quantity: 1 }], firstClearRewards: [{ itemId: 'combat-insight', quantity: 3 }] },
  'heavenly-demon-gate': { repeatRewards: [{ itemId: 'xuanhuang-marrow', quantity: 1 }, { itemId: 'tribulation-crystal', quantity: 2 }], firstClearRewards: [{ itemId: 'artifact-essence', quantity: 4 }] },
  'tribulation-boundary': { repeatRewards: [{ itemId: 'ancient-immortal-scale', quantity: 1 }, { itemId: 'outer-star-sand', quantity: 2 }], firstClearRewards: [{ itemId: 'combat-insight', quantity: 4 }] }
};

export const dungeonDefinitions: DungeonDefinition[] = combatZones.map(zone => ({
  id: zone.id,
  name: `${zone.name}秘境`,
  description: `连续突破${zone.name}中的守卫、精英与区域首领，完成五层挑战。`,
  totalFloors: 5,
  eliteFloor: 3,
  ...rewardSettings[zone.id]
}));

export function getDungeonDefinition(zoneId: CombatZoneId | null | undefined): DungeonDefinition | undefined {
  return zoneId ? dungeonDefinitions.find(dungeon => dungeon.id === zoneId) : undefined;
}

export function createDungeonFloorEvent(
  dungeon: DungeonDefinition,
  floor: number,
  age: number,
  firstClear: boolean
): GameEvent {
  const zone = getCombatZone(dungeon.id) ?? combatZones[0];
  const safeFloor = Math.max(1, Math.min(dungeon.totalFloors, Math.round(floor)));
  const boss = safeFloor === dungeon.totalFloors;
  const elite = safeFloor === dungeon.eliteFloor;
  const baseEvent = createCombatZoneEvent(zone, age, boss, false);
  const floorKind = boss ? '秘境首领' : elite ? '精英守卫' : '秘境守卫';
  const completionRewards = boss
    ? [...dungeon.repeatRewards, ...(firstClear ? dungeon.firstClearRewards : [])]
    : [];

  return {
    ...baseEvent,
    id: `dungeon-${dungeon.id}-${safeFloor}-${age}-${Date.now()}`,
    title: `${dungeon.name} · 第${safeFloor}层`,
    description: `你深入${dungeon.name}第 ${safeFloor}/${dungeon.totalFloors} 层，${floorKind}截住了前路。${boss ? '击败它即可完成本轮秘境。' : ''}`,
    combatElite: elite,
    combatDifficultyMultiplier: boss ? 1.06 : elite ? 1.2 : 0.9 + safeFloor * 0.045,
    combatDungeonFloor: safeFloor,
    combatDungeonTotalFloors: dungeon.totalFloors,
    ...(completionRewards.length > 0 ? { itemRewards: completionRewards } : { itemRewards: undefined })
  };
}
