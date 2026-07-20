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
  rareRewards: InventoryReward[];
  rareRewardChance: number;
}

export interface DungeonRoomOptionDefinition {
  id: string;
  name: string;
  description: string;
  hpPercent?: number;
  qiPercent?: number;
  spiritStones?: number;
  grantRelic?: boolean;
  rewardMultiplier?: number;
}

export interface DungeonRoomDefinition {
  id: DungeonRoomId;
  name: string;
  description: string;
  zoneIds?: CombatZoneId[];
  options: DungeonRoomOptionDefinition[];
}

const commonDungeonRooms: DungeonRoomDefinition[] = [
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
      { id: 'merchant-tonic', name: '购置灵露', description: '花费灵石恢复 45% 生命与真气', spiritStones: -8, hpPercent: 0.45, qiPercent: 0.45 },
      { id: 'merchant-relic', name: '购置古物', description: '花费灵石取得一件区域遗物', spiritStones: -16, grantRelic: true },
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
      { id: 'treasure-risk', name: '追逐宝光', description: '损失 15% 生命，灵石增加且奖励提高', hpPercent: -0.15, spiritStones: 12, rewardMultiplier: 0.12 },
      { id: 'treasure-safe', name: '循稳路前行', description: '恢复 18% 生命与真气', hpPercent: 0.18, qiPercent: 0.18 }
    ]
  }
];

const regionalDungeonRooms: DungeonRoomDefinition[] = [
  {
    id: 'greenmist-ancestral-tree', name: '雾祖灵槐', description: '古槐根须托着山魈一族的祭器，树心仍有清灵之气。', zoneIds: ['greenmist-outskirts'],
    options: [
      { id: 'greenmist-purify', name: '净化树心', description: '恢复生命与真气，并提高本轮奖励', hpPercent: 0.22, qiPercent: 0.22, rewardMultiplier: 0.08 },
      { id: 'greenmist-take', name: '取走祭器', description: '损失少量生命，获得一件区域遗物', hpPercent: -0.12, grantRelic: true }
    ]
  },
  {
    id: 'blackstone-forge', name: '地火残炉', description: '废弃锻炉仍与矿脉相连，炉底凝着未散器魂。', zoneIds: ['blackstone-mine'],
    options: [
      { id: 'blackstone-quench', name: '借火淬体', description: '损失真气并大幅提高通关奖励', qiPercent: -0.24, rewardMultiplier: 0.2 },
      { id: 'blackstone-salvage', name: '拆取炉芯', description: '获得灵石并恢复少量生命', spiritStones: 14, hpPercent: 0.12 }
    ]
  },
  {
    id: 'ghost-market-contract', name: '幽灯契摊', description: '无人摊位上摆着一份会自行书写的幽市契约。', zoneIds: ['ghost-market'],
    options: [
      { id: 'ghost-sign', name: '签下契约', description: '支付灵石取得遗物，通关奖励同时提高', spiritStones: -18, grantRelic: true, rewardMultiplier: 0.1 },
      { id: 'ghost-burn', name: '焚去契纸', description: '消耗真气摆脱纠缠并恢复生命', qiPercent: -0.18, hpPercent: 0.24 }
    ]
  },
  {
    id: 'falling-star-wreck', name: '坠星沉舟', description: '破损灵舟卡在星潮裂隙中，货舱与阵盘仍可辨认。', zoneIds: ['falling-star-ferry'],
    options: [
      { id: 'star-cargo', name: '打捞货舱', description: '损失生命换取灵石与额外奖励', hpPercent: -0.16, spiritStones: 22, rewardMultiplier: 0.12 },
      { id: 'star-array', name: '修复阵盘', description: '恢复真气并取得区域遗物', qiPercent: 0.3, grantRelic: true }
    ]
  },
  {
    id: 'thunder-marsh-eye', name: '雷泽天眼', description: '雷云在泽心形成短暂空洞，纯粹雷意正沿水面游走。', zoneIds: ['thunder-marsh'],
    options: [
      { id: 'thunder-temper', name: '引雷淬体', description: '承受重创，大幅提高通关奖励', hpPercent: -0.28, rewardMultiplier: 0.28 },
      { id: 'thunder-hide', name: '静候雷歇', description: '恢复生命与真气', hpPercent: 0.2, qiPercent: 0.2 }
    ]
  },
  {
    id: 'ruined-city-library', name: '荒城禁阁', description: '残破书架间漂浮着古修留下的神识刻痕。', zoneIds: ['ruined-city'],
    options: [
      { id: 'ruin-study', name: '推演刻痕', description: '消耗真气，获得遗物并提高奖励', qiPercent: -0.3, grantRelic: true, rewardMultiplier: 0.12 },
      { id: 'ruin-rest', name: '封阁调息', description: '恢复大量生命', hpPercent: 0.42 }
    ]
  },
  {
    id: 'star-sea-rift', name: '法域裂隙', description: '破碎法域互相摩擦，裂隙中不断闪过异界宝光。', zoneIds: ['star-sea'],
    options: [
      { id: 'rift-cross', name: '越界取宝', description: '损失生命与真气，获得遗物和高额奖励加成', hpPercent: -0.2, qiPercent: -0.2, grantRelic: true, rewardMultiplier: 0.22 },
      { id: 'rift-anchor', name: '稳固法域', description: '获得灵石并恢复真气', spiritStones: 28, qiPercent: 0.18 }
    ]
  },
  {
    id: 'demon-gate-bastion', name: '界关残垒', description: '失守的阵垒中还留着守关修士的军资与血迹。', zoneIds: ['heavenly-demon-gate'],
    options: [
      { id: 'bastion-repair', name: '重启阵垒', description: '消耗真气并大幅提高通关奖励', qiPercent: -0.26, rewardMultiplier: 0.25 },
      { id: 'bastion-supply', name: '收拢军资', description: '恢复生命并获得灵石', hpPercent: 0.26, spiritStones: 30 }
    ]
  },
  {
    id: 'tribulation-dao-mark', name: '天门道痕', description: '九道劫痕悬在虚空，触碰其中任何一道都会回应道心。', zoneIds: ['tribulation-boundary'],
    options: [
      { id: 'dao-comprehend', name: '直面道痕', description: '损失大量真气，取得遗物并显著提高奖励', qiPercent: -0.36, grantRelic: true, rewardMultiplier: 0.3 },
      { id: 'dao-withdraw', name: '守心退避', description: '恢复大量生命与真气', hpPercent: 0.3, qiPercent: 0.3 }
    ]
  }
];

export const dungeonRooms: DungeonRoomDefinition[] = [...commonDungeonRooms, ...regionalDungeonRooms];

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

const rareRewardSettings: Record<CombatZoneId, Pick<DungeonDefinition, 'rareRewards' | 'rareRewardChance'>> = {
  'greenmist-outskirts': { rareRewards: [{ itemId: 'spirit-blade', quantity: 1 }], rareRewardChance: 0.18 },
  'blackstone-mine': { rareRewards: [{ itemId: 'minor-ward', quantity: 1 }], rareRewardChance: 0.2 },
  'ghost-market': { rareRewards: [{ itemId: 'soul-settling-orb', quantity: 1 }], rareRewardChance: 0.22 },
  'falling-star-ferry': { rareRewards: [{ itemId: 'starfall-blade', quantity: 1 }], rareRewardChance: 0.24 },
  'thunder-marsh': { rareRewards: [{ itemId: 'thunder-ward-armor', quantity: 1 }], rareRewardChance: 0.26 },
  'ruined-city': { rareRewards: [{ itemId: 'spell-five-element-seal', quantity: 1 }], rareRewardChance: 0.28 },
  'star-sea': { rareRewards: [{ itemId: 'tribulation-edge', quantity: 1 }], rareRewardChance: 0.3 },
  'heavenly-demon-gate': { rareRewards: [{ itemId: 'xuanhuang-robe', quantity: 1 }], rareRewardChance: 0.32 },
  'tribulation-boundary': { rareRewards: [{ itemId: 'heaven-soul-jade', quantity: 1 }], rareRewardChance: 0.35 }
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
  ...rewardSettings[zone.id],
  ...rareRewardSettings[zone.id]
}));

export function getDungeonDefinition(zoneId: CombatZoneId | null | undefined): DungeonDefinition | undefined {
  return zoneId ? dungeonDefinitions.find(dungeon => dungeon.id === zoneId) : undefined;
}

export function getDungeonRoom(roomId: DungeonRoomId | null | undefined): DungeonRoomDefinition | undefined {
  return roomId ? dungeonRooms.find(room => room.id === roomId) : undefined;
}

export function drawDungeonRoom(previousRooms: DungeonRoomId[], zoneId?: CombatZoneId): DungeonRoomDefinition {
  const eligibleRooms = dungeonRooms.filter(room => !room.zoneIds || (!!zoneId && room.zoneIds.includes(zoneId)));
  const freshRooms = eligibleRooms.filter(room => !previousRooms.includes(room.id));
  const pool = freshRooms.length > 0 ? freshRooms : eligibleRooms;
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
    ? [
      ...dungeon.repeatRewards,
      ...(firstClear ? dungeon.firstClearRewards : []),
      ...(Math.random() < dungeon.rareRewardChance ? dungeon.rareRewards : [])
    ]
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
