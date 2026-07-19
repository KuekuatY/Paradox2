import type {
  CombatZoneId,
  CombatZoneProgress,
  EquipmentSlot,
  EquipmentEnhancement,
  EquipmentState,
  GameEvent,
  InventoryReward
} from '@/types';

export interface CombatZoneLoot {
  itemId: string;
  weight: number;
}

export interface CombatZoneDefinition {
  id: CombatZoneId;
  name: string;
  stage: '前期' | '中期' | '后期';
  minRealmLevel: number;
  eventId: string;
  enemy: string;
  bossName: string;
  bossRank: string;
  bossDifficulty: number;
  bossKillsRequired: number;
  firstClearRewards: InventoryReward[];
  description: string;
  effects: GameEvent['effects'];
  dropChance: number;
  bonusQuantityChance: number;
  loot: CombatZoneLoot[];
}

export interface EquipmentBonuses {
  hpMultiplier?: number;
  attackMultiplier?: number;
  defenseMultiplier?: number;
  injuryMultiplier?: number;
  maxQi?: number;
  dodge?: number;
  speed?: number;
  initiative?: number;
}

export interface EquipmentDefinition {
  itemId: string;
  slot: EquipmentSlot;
  effectText: string;
  bonuses: EquipmentBonuses;
}

export interface CombatSupplyDefinition {
  itemId: string;
  kind: 'healing' | 'qi';
  restorePercent: number;
  effectText: string;
}

export const combatZones: CombatZoneDefinition[] = [
  {
    id: 'greenmist-outskirts',
    name: '青雾山麓',
    stage: '前期',
    minRealmLevel: 1,
    eventId: 'combat-beast-hunt',
    enemy: '山魈妖兽',
    bossName: '百年山魈王',
    bossRank: '区域首领',
    bossDifficulty: 1.28,
    bossKillsRequired: 3,
    firstClearRewards: [{ itemId: 'spirit-blade', quantity: 1 }],
    description: '山林妖兽众多，适合初入仙途者磨炼攻守。',
    effects: { 根骨: 1 },
    dropChance: 0.7,
    bonusQuantityChance: 0.08,
    loot: [
      { itemId: 'beast-core', weight: 0.52 },
      { itemId: 'spirit-herb', weight: 0.33 },
      { itemId: 'bone-tempering-pill', weight: 0.15 }
    ]
  },
  {
    id: 'blackstone-mine',
    name: '黑石矿窟',
    stage: '前期',
    minRealmLevel: 2,
    eventId: 'combat-mine-fiend',
    enemy: '矿洞妖影',
    bossName: '地脉石傀',
    bossRank: '区域首领',
    bossDifficulty: 1.3,
    bossKillsRequired: 3,
    firstClearRewards: [{ itemId: 'minor-ward', quantity: 1 }],
    description: '废弃矿道灵气驳杂，妖影与遗矿都藏在暗处。',
    effects: { 根骨: 1, 神识: 1 },
    dropChance: 0.72,
    bonusQuantityChance: 0.1,
    loot: [
      { itemId: 'spirit-ore', weight: 0.42 },
      { itemId: 'beast-core', weight: 0.3 },
      { itemId: 'minor-ward', weight: 0.1 },
      { itemId: 'spirit-stone-pouch', weight: 0.18 }
    ]
  },
  {
    id: 'ghost-market',
    name: '幽市暗巷',
    stage: '前期',
    minRealmLevel: 3,
    eventId: 'combat-ghost-market-raid',
    enemy: '幽市劫修',
    bossName: '幽市执灯人',
    bossRank: '区域首领',
    bossDifficulty: 1.32,
    bossKillsRequired: 4,
    firstClearRewards: [{ itemId: 'old-manual-page', quantity: 2 }],
    description: '黑市交易背后暗流涌动，胜者才有资格带走秘货。',
    effects: { 神识: 1, 气运: 1 },
    dropChance: 0.74,
    bonusQuantityChance: 0.12,
    loot: [
      { itemId: 'blood-jade', weight: 0.35 },
      { itemId: 'fortune-talisman', weight: 0.22 },
      { itemId: 'spirit-blade', weight: 0.1 },
      { itemId: 'old-manual-page', weight: 0.18 },
      { itemId: 'soul-nourishing-pill', weight: 0.15 }
    ]
  },
  {
    id: 'falling-star-ferry',
    name: '落星渡口',
    stage: '中期',
    minRealmLevel: 4,
    eventId: 'mid-combat-spirit-boat-raid',
    enemy: '截舟悍修',
    bossName: '落星舟主',
    bossRank: '中期首领',
    bossDifficulty: 1.34,
    bossKillsRequired: 4,
    firstClearRewards: [{ itemId: 'starfall-blade', quantity: 1 }],
    description: '灵舟与商路在此交汇，截杀者也盯上了往来宝货。',
    effects: { 根骨: 2, 气运: 1 },
    dropChance: 0.76,
    bonusQuantityChance: 0.14,
    loot: [
      { itemId: 'star-spirit-stone', weight: 0.36 },
      { itemId: 'mystic-spirit-pill', weight: 0.28 },
      { itemId: 'purple-crystal-marrow', weight: 0.24 },
      { itemId: 'soul-settling-orb', weight: 0.12 }
    ]
  },
  {
    id: 'thunder-marsh',
    name: '雷泽绝地',
    stage: '中期',
    minRealmLevel: 5,
    eventId: 'mid-combat-thunder-marsh-breakout',
    enemy: '雷泽妖王',
    bossName: '九纹雷兽',
    bossRank: '中期首领',
    bossDifficulty: 1.36,
    bossKillsRequired: 4,
    firstClearRewards: [{ itemId: 'thunder-ward-armor', quantity: 1 }],
    description: '雷意终年不散，妖王借天威淬体，战局凶险。',
    effects: { 根骨: 2, 神识: 2 },
    dropChance: 0.78,
    bonusQuantityChance: 0.16,
    loot: [
      { itemId: 'thunder-beast-core', weight: 0.4 },
      { itemId: 'purple-crystal-marrow', weight: 0.23 },
      { itemId: 'dragon-blood-pill', weight: 0.2 },
      { itemId: 'tribulation-crystal', weight: 0.17 }
    ]
  },
  {
    id: 'ruined-city',
    name: '荒城夜巡',
    stage: '中期',
    minRealmLevel: 6,
    eventId: 'mid-combat-ruined-city-watch',
    enemy: '荒城鬼将',
    bossName: '荒城旧主',
    bossRank: '中期首领',
    bossDifficulty: 1.38,
    bossKillsRequired: 5,
    firstClearRewards: [{ itemId: 'mystic-manual-fragment', quantity: 2 }],
    description: '古城禁制残破，夜色中仍有旧日守军巡游。',
    effects: { 神识: 2, 悟性: 1 },
    dropChance: 0.8,
    bonusQuantityChance: 0.18,
    loot: [
      { itemId: 'nether-bone', weight: 0.34 },
      { itemId: 'soul-settling-orb', weight: 0.2 },
      { itemId: 'mystic-manual-fragment', weight: 0.28 },
      { itemId: 'star-spirit-stone', weight: 0.18 }
    ]
  },
  {
    id: 'star-sea',
    name: '星海战场',
    stage: '后期',
    minRealmLevel: 7,
    eventId: 'late-combat-law-domain-duel',
    enemy: '法域尊者',
    bossName: '星海法王',
    bossRank: '后期首领',
    bossDifficulty: 1.4,
    bossKillsRequired: 5,
    firstClearRewards: [{ itemId: 'tribulation-edge', quantity: 1 }],
    description: '破碎法域彼此吞并，唯有胜者能收拢星海遗珍。',
    effects: { 根骨: 3, 神识: 2, 悟性: 1 },
    dropChance: 0.82,
    bonusQuantityChance: 0.2,
    loot: [
      { itemId: 'outer-star-sand', weight: 0.36 },
      { itemId: 'heaven-soul-jade', weight: 0.2 },
      { itemId: 'immortal-talisman-page', weight: 0.25 },
      { itemId: 'tribulation-pill', weight: 0.19 }
    ]
  },
  {
    id: 'heavenly-demon-gate',
    name: '天魔关',
    stage: '后期',
    minRealmLevel: 8,
    eventId: 'late-combat-heavenly-demon-gate',
    enemy: '域外天魔',
    bossName: '天魔化身',
    bossRank: '后期首领',
    bossDifficulty: 1.42,
    bossKillsRequired: 5,
    firstClearRewards: [{ itemId: 'xuanhuang-robe', quantity: 1 }],
    description: '界壁最薄之处魔潮不息，高阶修士在此以战养道。',
    effects: { 根骨: 3, 神识: 3, 气运: 1 },
    dropChance: 0.84,
    bonusQuantityChance: 0.23,
    loot: [
      { itemId: 'heaven-soul-jade', weight: 0.26 },
      { itemId: 'tribulation-ward', weight: 0.24 },
      { itemId: 'xuanhuang-marrow', weight: 0.24 },
      { itemId: 'ancient-immortal-scale', weight: 0.26 }
    ]
  },
  {
    id: 'tribulation-boundary',
    name: '劫海边界',
    stage: '后期',
    minRealmLevel: 9,
    eventId: 'late-combat-tribulation-guardian',
    enemy: '劫海守关者',
    bossName: '九劫道影',
    bossRank: '飞升守关者',
    bossDifficulty: 1.45,
    bossKillsRequired: 6,
    firstClearRewards: [{ itemId: 'ancient-immortal-scale', quantity: 2 }],
    description: '九重劫意在此凝作守关法身，每一战都直指飞升。',
    effects: { 根骨: 4, 神识: 3, 悟性: 2, 气运: 1 },
    dropChance: 0.88,
    bonusQuantityChance: 0.26,
    loot: [
      { itemId: 'tribulation-crystal', weight: 0.3 },
      { itemId: 'tribulation-ward', weight: 0.22 },
      { itemId: 'ancient-immortal-scale', weight: 0.25 },
      { itemId: 'xuanhuang-marrow', weight: 0.23 }
    ]
  }
];

export const equipmentDefinitions: EquipmentDefinition[] = [
  {
    itemId: 'spirit-blade',
    slot: 'weapon',
    effectText: '攻击 +8%，速度 +2，先攻 +1',
    bonuses: { attackMultiplier: 1.08, speed: 2, initiative: 1 }
  },
  {
    itemId: 'minor-ward',
    slot: 'armor',
    effectText: '生命 +8%，防御 +10%，闪避 +1，战后伤势 -12%',
    bonuses: { hpMultiplier: 1.08, defenseMultiplier: 1.1, dodge: 1, injuryMultiplier: 0.88 }
  },
  {
    itemId: 'soul-settling-orb',
    slot: 'accessory',
    effectText: '真气 +18，闪避 +1，速度 +2',
    bonuses: { maxQi: 18, dodge: 1, speed: 2 }
  },
  {
    itemId: 'heaven-soul-jade',
    slot: 'accessory',
    effectText: '真气 +32，生命 +10%，闪避 +2，先攻 +2',
    bonuses: { maxQi: 32, hpMultiplier: 1.1, dodge: 2, initiative: 2 }
  },
  {
    itemId: 'starfall-blade',
    slot: 'weapon',
    effectText: '攻击 +15%，速度 +4，先攻 +2',
    bonuses: { attackMultiplier: 1.15, speed: 4, initiative: 2 }
  },
  {
    itemId: 'thunder-ward-armor',
    slot: 'armor',
    effectText: '生命 +16%，防御 +18%，闪避 +2，战后伤势 -20%',
    bonuses: { hpMultiplier: 1.16, defenseMultiplier: 1.18, dodge: 2, injuryMultiplier: 0.8 }
  },
  {
    itemId: 'tribulation-edge',
    slot: 'weapon',
    effectText: '攻击 +24%，速度 +6，先攻 +4',
    bonuses: { attackMultiplier: 1.24, speed: 6, initiative: 4 }
  },
  {
    itemId: 'xuanhuang-robe',
    slot: 'armor',
    effectText: '生命 +25%，防御 +28%，闪避 +3，战后伤势 -28%',
    bonuses: { hpMultiplier: 1.25, defenseMultiplier: 1.28, dodge: 3, injuryMultiplier: 0.72 }
  }
];

export const combatSupplyDefinitions: CombatSupplyDefinition[] = [
  { itemId: 'bone-tempering-pill', kind: 'healing', restorePercent: 30, effectText: '恢复 30% 生命' },
  { itemId: 'dragon-blood-pill', kind: 'healing', restorePercent: 45, effectText: '恢复 45% 生命' },
  { itemId: 'tribulation-pill', kind: 'healing', restorePercent: 60, effectText: '恢复 60% 生命' },
  { itemId: 'qi-gathering-pill', kind: 'qi', restorePercent: 35, effectText: '恢复 35% 真气' },
  { itemId: 'soul-nourishing-pill', kind: 'qi', restorePercent: 45, effectText: '恢复 45% 真气' },
  { itemId: 'mystic-spirit-pill', kind: 'qi', restorePercent: 60, effectText: '恢复 60% 真气' }
];

export function getCombatZone(zoneId: CombatZoneId): CombatZoneDefinition | undefined {
  return combatZones.find(zone => zone.id === zoneId);
}

export function getCombatZoneProgress(
  progressList: CombatZoneProgress[],
  zoneId: CombatZoneId
): CombatZoneProgress {
  return progressList.find(progress => progress.zoneId === zoneId) ?? {
    zoneId,
    kills: 0,
    bossDefeated: false,
    bossWins: 0,
    bestRounds: null
  };
}

export function getCombatZoneMasteryLevel(progress: CombatZoneProgress): number {
  return Math.min(10, Math.floor(progress.kills / 10) + Math.min(3, progress.bossWins));
}

export function isCombatZoneUnlocked(
  zoneId: CombatZoneId,
  realmLevel: number,
  progressList: CombatZoneProgress[]
): boolean {
  const zoneIndex = combatZones.findIndex(zone => zone.id === zoneId);
  const zone = combatZones[zoneIndex];
  if (!zone || realmLevel < zone.minRealmLevel) return false;
  if (zoneIndex <= 0) return true;

  return getCombatZoneProgress(progressList, combatZones[zoneIndex - 1].id).bossDefeated;
}

export function isCombatBossAvailable(
  zoneId: CombatZoneId,
  progressList: CombatZoneProgress[]
): boolean {
  const zone = getCombatZone(zoneId);
  if (!zone) return false;
  return getCombatZoneProgress(progressList, zoneId).kills >= zone.bossKillsRequired;
}

export function getEquipmentDefinition(itemId: string | null | undefined): EquipmentDefinition | undefined {
  return itemId ? equipmentDefinitions.find(item => item.itemId === itemId) : undefined;
}

export function getCombatSupply(itemId: string | null | undefined): CombatSupplyDefinition | undefined {
  return itemId ? combatSupplyDefinitions.find(item => item.itemId === itemId) : undefined;
}

export function getEquipmentBonuses(
  equipment: EquipmentState,
  enhancements: EquipmentEnhancement[] = []
): EquipmentBonuses {
  return (Object.values(equipment) as Array<string | null>).reduce<EquipmentBonuses>((total, itemId) => {
    const definition = getEquipmentDefinition(itemId);
    if (!definition) return total;
    const level = enhancements.find(entry => entry.itemId === itemId)?.level ?? 0;
    const base = definition.bonuses;
    const bonuses: EquipmentBonuses = {
      hpMultiplier: 1 + ((base.hpMultiplier ?? 1) - 1) + (definition.slot === 'armor' ? level * 0.02 : 0),
      attackMultiplier: 1 + ((base.attackMultiplier ?? 1) - 1) + (definition.slot === 'weapon' ? level * 0.02 : 0),
      defenseMultiplier: 1 + ((base.defenseMultiplier ?? 1) - 1) + (definition.slot === 'armor' ? level * 0.02 : 0),
      injuryMultiplier: Math.max(0.5, (base.injuryMultiplier ?? 1) - (definition.slot === 'armor' ? level * 0.012 : 0)),
      maxQi: (base.maxQi ?? 0) + (definition.slot === 'accessory' ? level * 3 : 0),
      dodge: (base.dodge ?? 0) + Math.floor(level / 4),
      speed: (base.speed ?? 0) + (definition.slot === 'weapon' ? Math.floor(level / 3) : 0),
      initiative: (base.initiative ?? 0) + (definition.slot === 'weapon' ? Math.floor(level / 4) : 0)
    };

    return {
      hpMultiplier: (total.hpMultiplier ?? 1) * (bonuses.hpMultiplier ?? 1),
      attackMultiplier: (total.attackMultiplier ?? 1) * (bonuses.attackMultiplier ?? 1),
      defenseMultiplier: (total.defenseMultiplier ?? 1) * (bonuses.defenseMultiplier ?? 1),
      injuryMultiplier: (total.injuryMultiplier ?? 1) * (bonuses.injuryMultiplier ?? 1),
      maxQi: (total.maxQi ?? 0) + (bonuses.maxQi ?? 0),
      dodge: (total.dodge ?? 0) + (bonuses.dodge ?? 0),
      speed: (total.speed ?? 0) + (bonuses.speed ?? 0),
      initiative: (total.initiative ?? 0) + (bonuses.initiative ?? 0)
    };
  }, {});
}

export function getEquipmentEnhancementCost(itemId: string, currentLevel: number): InventoryReward[] {
  if (!getEquipmentDefinition(itemId) || currentLevel >= 10) return [];
  if (currentLevel < 3) return [{ itemId: 'spirit-ore', quantity: currentLevel + 2 }];
  if (currentLevel < 7) return [{ itemId: 'purple-crystal-marrow', quantity: currentLevel - 1 }];
  return [{ itemId: 'outer-star-sand', quantity: currentLevel - 4 }];
}

export function createCombatZoneEvent(
  zone: CombatZoneDefinition,
  age: number,
  boss = false,
  firstClear = false
): GameEvent {
  const effects = boss
    ? Object.fromEntries(Object.entries(zone.effects).map(([key, value]) => [
      key,
      typeof value === 'number' ? Math.max(1, Math.round(value * 2)) : value
    ])) as GameEvent['effects']
    : zone.effects;

  return {
    id: `combat-zone-${zone.id}-${boss ? 'boss' : 'normal'}-${age}`,
    combatZoneId: zone.id,
    combatEncounterId: zone.eventId,
    ...(boss ? { combatBoss: true } : {}),
    age,
    type: 'combat',
    title: boss ? `挑战${zone.bossName}` : `镇守${zone.name}`,
    description: boss
      ? `你清理了${zone.name}外围的威胁，终于逼出坐镇此地的${zone.bossName}。这一战将决定道途能否继续向前。`
      : `${zone.description}你循着气机深入其中，与${zone.enemy}正面相遇。`,
    weight: 0,
    effects,
    ...(boss && firstClear ? { itemRewards: zone.firstClearRewards } : {}),
    result: 'success'
  };
}

export function getCombatZoneLootPreview(zone: CombatZoneDefinition): InventoryReward[] {
  return zone.loot.map(entry => ({ itemId: entry.itemId, quantity: 1 }));
}
