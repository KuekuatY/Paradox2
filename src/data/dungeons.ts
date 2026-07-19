import { combatZones, createCombatZoneEvent, getCombatZone } from '@/data/combatZones';
import type { CombatZoneId, DungeonRoomId, DungeonRouteId, GameEvent, InventoryReward } from '@/types';

export interface DungeonDefinition {
  id: CombatZoneId;
  name: string;
  description: string;
  totalFloors: number;
  eliteFloor: number;
  bossTwist: string;
  bossModifiers: { hp?: number; attack?: number; defense?: number; speed?: number; dodge?: number };
  repeatRewards: InventoryReward[];
  firstClearRewards: InventoryReward[];
}

export interface DungeonRoomOptionDefinition {
  id: string;
  name: string;
  description: string;
  hpPercent?: number;
  qiPercent?: number;
  familyWealth?: number;
  grantRelic?: boolean;
  rewardMultiplier?: number;
}

export interface DungeonRoomDefinition {
  id: DungeonRoomId;
  name: string;
  description: string;
  options: DungeonRoomOptionDefinition[];
}

export const dungeonRooms: DungeonRoomDefinition[] = [
  {
    id: 'spirit-spring', name: '灵泉石室', description: '石缝间涌出未受浊气侵染的灵泉。',
    options: [
      { id: 'spring-heal', name: '浸洗伤体', description: '恢复 35% 生命与 15% 真气', hpPercent: 0.35, qiPercent: 0.15 },
      { id: 'spring-meditate', name: '静坐纳灵', description: '恢复 55% 真气', qiPercent: 0.55 }
    ]
  },
  {
    id: 'wandering-merchant', name: '秘境行商', description: '戴斗笠的行商守着一盏长明灯，货物来路不明。',
    options: [
      { id: 'merchant-tonic', name: '购置灵露', description: '花费家境恢复 45% 生命与真气', familyWealth: -8, hpPercent: 0.45, qiPercent: 0.45 },
      { id: 'merchant-relic', name: '购置古物', description: '花费家境取得一件区域遗物', familyWealth: -16, grantRelic: true },
      { id: 'merchant-leave', name: '谢绝离去', description: '保留资源继续前进' }
    ]
  },
  {
    id: 'ancient-trial', name: '古修试炼', description: '残阵亮起，唯有承受试炼者能取走阵心遗物。',
    options: [
      { id: 'trial-endure', name: '正面受试', description: '损失 22% 生命，取得一件区域遗物', hpPercent: -0.22, grantRelic: true },
      { id: 'trial-study', name: '推演阵眼', description: '损失 28% 真气，本轮通关奖励提高', qiPercent: -0.28, rewardMultiplier: 0.18 },
      { id: 'trial-withdraw', name: '绕阵而行', description: '不冒风险' }
    ]
  },
  {
    id: 'hidden-treasure', name: '岔路藏宝', description: '两条岔路分别传来宝光与平稳灵机。',
    options: [
      { id: 'treasure-risk', name: '追逐宝光', description: '损失 15% 生命，家境增加且奖励提高', hpPercent: -0.15, familyWealth: 12, rewardMultiplier: 0.12 },
      { id: 'treasure-safe', name: '循稳路前行', description: '恢复 18% 生命与真气', hpPercent: 0.18, qiPercent: 0.18 }
    ]
  }
];

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
  bossTwist: {
    'greenmist-outskirts': '山魈王每三回合蓄力扑杀，控制技能可打断。',
    'blackstone-mine': '石傀会层层压碎护甲，拖延越久防线越薄。',
    'ghost-market': '执灯人封锁真气，需保留普攻与防守应对。',
    'falling-star-ferry': '舟主点燃甲板，持续灼烧迫使你尽快决胜。',
    'thunder-marsh': '雷泽妖尊蓄雷后进入狂暴，后半程攻势骤增。',
    'ruined-city': '尸王以冥火破防，护盾与恢复时机尤为关键。',
    'star-sea': '星海巨兽吞吐星潮，速度不足时会连续失去先手。',
    'heavenly-demon-gate': '天魔化身以封灵叠加狂暴，需先控制再爆发。',
    'tribulation-boundary': '劫兽随血线降低不断增幅，斩杀窗口极短。'
  }[zone.id],
  bossModifiers: {
    'greenmist-outskirts': { speed: 1.12 },
    'blackstone-mine': { defense: 1.2 },
    'ghost-market': { dodge: 2 },
    'falling-star-ferry': { attack: 1.12 },
    'thunder-marsh': { hp: 1.18 },
    'ruined-city': { attack: 1.06, defense: 1.12 },
    'star-sea': { speed: 1.18, dodge: 2 },
    'heavenly-demon-gate': { hp: 1.1, attack: 1.15 },
    'tribulation-boundary': { hp: 1.25, attack: 1.12 }
  }[zone.id],
  ...rewardSettings[zone.id]
}));

export function getDungeonDefinition(zoneId: CombatZoneId | null | undefined): DungeonDefinition | undefined {
  return zoneId ? dungeonDefinitions.find(dungeon => dungeon.id === zoneId) : undefined;
}

export function getDungeonRoom(roomId: DungeonRoomId | null | undefined): DungeonRoomDefinition | undefined {
  return roomId ? dungeonRooms.find(room => room.id === roomId) : undefined;
}

export function drawDungeonRoom(previousRooms: DungeonRoomId[]): DungeonRoomDefinition {
  const freshRooms = dungeonRooms.filter(room => !previousRooms.includes(room.id));
  const pool = freshRooms.length > 0 ? freshRooms : dungeonRooms;
  return pool[Math.floor(Math.random() * pool.length)] ?? dungeonRooms[0];
}

export function createDungeonFloorEvent(
  dungeon: DungeonDefinition,
  floor: number,
  age: number,
  firstClear: boolean,
  route: DungeonRouteId = 'steady',
  rewardBonus = 0
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
  const routeRewardBonus = route === 'perilous' ? 1 : 0;
  const adjustedCompletionRewards = completionRewards.map(reward => ({
    ...reward,
    quantity: reward.quantity + routeRewardBonus + Math.max(0, Math.floor(reward.quantity * rewardBonus))
  }));

  return {
    ...baseEvent,
    id: `dungeon-${dungeon.id}-${safeFloor}-${age}-${Date.now()}`,
    title: `${dungeon.name} · 第${safeFloor}层`,
    description: `你沿${route === 'perilous' ? '险行' : '稳行'}路线深入${dungeon.name}第 ${safeFloor}/${dungeon.totalFloors} 层，${floorKind}截住了前路。${boss ? `击败它即可完成本轮秘境。${dungeon.bossTwist}` : ''}`,
    combatElite: elite,
    combatDifficultyMultiplier: (boss ? 1.06 : elite ? 1.2 : 0.9 + safeFloor * 0.045) * (route === 'perilous' ? 1.18 : 1),
    combatDungeonFloor: safeFloor,
    combatDungeonTotalFloors: dungeon.totalFloors,
    ...(adjustedCompletionRewards.length > 0 ? { itemRewards: adjustedCompletionRewards } : { itemRewards: undefined })
  };
}
