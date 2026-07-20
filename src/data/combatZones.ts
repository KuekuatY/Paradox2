import type {
  BossMechanicId,
  CombatZoneId,
  CombatZoneProgress,
  CombatStatusId,
  CultivationPathId,
  EnemyIntentId,
  EquipmentAffixId,
  EquipmentAffixState,
  EquipmentSlot,
  EquipmentEnhancement,
  EquipmentQualityState,
  EquipmentState,
  GameEvent,
  InventoryReward
} from '@/types';
import { getItem } from '@/data/items';

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
  bossMechanic: BossMechanicId;
  bossKillsRequired: number;
  firstClearRewards: InventoryReward[];
  description: string;
  effects: GameEvent['effects'];
  dropChance: number;
  bonusQuantityChance: number;
  loot: CombatZoneLoot[];
}

export interface CombatEnemyVariant {
  id: string;
  zoneId: CombatZoneId;
  name: string;
  traitText: string;
  resistances: CombatStatusId[];
  intentBias: EnemyIntentId;
  difficultyMultiplier: number;
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
  skillDamageMultiplier?: number;
  statusChance?: number;
  shieldMultiplier?: number;
  cooldownReduction?: number;
}

export interface EquipmentDefinition {
  itemId: string;
  slot: EquipmentSlot;
  pathIds?: CultivationPathId[];
  effectText: string;
  bonuses: EquipmentBonuses;
}

export interface EquipmentAffixDefinition {
  id: EquipmentAffixId;
  name: string;
  description: string;
  slots: EquipmentSlot[];
  bonuses: EquipmentBonuses;
}

export interface EquipmentSetDefinition {
  id: string;
  name: string;
  itemIds: string[];
  thresholds: Array<{
    pieces: number;
    description: string;
    bonuses: EquipmentBonuses;
  }>;
}

export interface EquipmentQualityTier {
  id: 'rough' | 'refined' | 'superior' | 'masterwork';
  name: string;
  minQuality: number;
  color: string;
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
    bossMechanic: 'charge',
    bossKillsRequired: 3,
    firstClearRewards: [{ itemId: 'spirit-blade', quantity: 1 }, { itemId: 'combat-insight', quantity: 1 }],
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
    bossMechanic: 'armor-break',
    bossKillsRequired: 3,
    firstClearRewards: [{ itemId: 'minor-ward', quantity: 1 }, { itemId: 'combat-insight', quantity: 1 }],
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
    bossMechanic: 'seal',
    bossKillsRequired: 4,
    firstClearRewards: [{ itemId: 'old-manual-page', quantity: 2 }, { itemId: 'combat-insight', quantity: 1 }],
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
    bossMechanic: 'burn',
    bossKillsRequired: 4,
    firstClearRewards: [{ itemId: 'starfall-blade', quantity: 1 }, { itemId: 'sword-heart-sheath', quantity: 1 }, { itemId: 'combat-insight', quantity: 2 }],
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
    bossMechanic: 'charge',
    bossKillsRequired: 4,
    firstClearRewards: [{ itemId: 'thunder-ward-armor', quantity: 1 }, { itemId: 'body-blood-bracer', quantity: 1 }, { itemId: 'combat-insight', quantity: 2 }],
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
    bossMechanic: 'seal',
    bossKillsRequired: 5,
    firstClearRewards: [{ itemId: 'mystic-manual-fragment', quantity: 2 }, { itemId: 'spell-five-element-seal', quantity: 1 }, { itemId: 'combat-insight', quantity: 2 }],
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
    bossMechanic: 'enrage',
    bossKillsRequired: 5,
    firstClearRewards: [{ itemId: 'tribulation-edge', quantity: 1 }, { itemId: 'demonic-soul-banner', quantity: 1 }, { itemId: 'combat-insight', quantity: 3 }],
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
    bossMechanic: 'burn',
    bossKillsRequired: 5,
    firstClearRewards: [{ itemId: 'xuanhuang-robe', quantity: 1 }, { itemId: 'combat-insight', quantity: 3 }],
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
    bossMechanic: 'enrage',
    bossKillsRequired: 6,
    firstClearRewards: [{ itemId: 'ancient-immortal-scale', quantity: 2 }, { itemId: 'combat-insight', quantity: 4 }],
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

const enemyNames: Record<CombatZoneId, [string, string, string]> = {
  'greenmist-outskirts': ['裂爪山魈', '青苔石猿', '雾林妖巫'],
  'blackstone-mine': ['噬矿妖影', '黑岩石傀', '地脉咒灵'],
  'ghost-market': ['幽市刀客', '提灯守卫', '摄魂术士'],
  'falling-star-ferry': ['截舟悍修', '星舟甲士', '落星阵师'],
  'thunder-marsh': ['雷泽凶兽', '玄甲雷龟', '引雷妖巫'],
  'ruined-city': ['荒城鬼骑', '残垣尸将', '禁宫鬼祭'],
  'star-sea': ['逐星猎手', '法域守卫', '星咒尊者'],
  'heavenly-demon-gate': ['天魔猎魂者', '界壁魔躯', '蚀心魔使'],
  'tribulation-boundary': ['劫海追猎者', '雷壳守关者', '天劫道灵']
};

export const combatEnemyVariants: CombatEnemyVariant[] = combatZones.flatMap(zone => {
  const names = enemyNames[zone.id];
  return [
    {
      id: `${zone.id}-hunter`, zoneId: zone.id, name: names[0],
      traitText: '猎杀：更偏好连续进攻，抵抗流血', resistances: ['bleed'], intentBias: 'attack', difficultyMultiplier: 1.03
    },
    {
      id: `${zone.id}-guardian`, zoneId: zone.id, name: names[1],
      traitText: '坚守：低血量时更常防御，抵抗破甲', resistances: ['armor-break'], intentBias: 'defend', difficultyMultiplier: 1.06
    },
    {
      id: `${zone.id}-mystic`, zoneId: zone.id, name: names[2],
      traitText: '秘法：更偏好催动杀招，抵抗封灵', resistances: ['seal'], intentBias: 'technique', difficultyMultiplier: 1.08
    }
  ] as CombatEnemyVariant[];
});

export function getCombatEnemyVariant(enemyId: string | null | undefined): CombatEnemyVariant | undefined {
  return enemyId ? combatEnemyVariants.find(enemy => enemy.id === enemyId) : undefined;
}

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
  },
  {
    itemId: 'sword-heart-sheath',
    slot: 'accessory',
    pathIds: ['sword'],
    effectText: '剑修限定 · 主动技能伤害 +10%，速度 +3',
    bonuses: { skillDamageMultiplier: 1.1, speed: 3, maxQi: 12 }
  },
  {
    itemId: 'body-blood-bracer',
    slot: 'accessory',
    pathIds: ['body'],
    effectText: '体修限定 · 生命 +10%，护盾效果 +22%',
    bonuses: { hpMultiplier: 1.1, shieldMultiplier: 1.22, injuryMultiplier: 0.96 }
  },
  {
    itemId: 'spell-five-element-seal',
    slot: 'accessory',
    pathIds: ['spell'],
    effectText: '法修限定 · 真气 +36，技能冷却 -1 回合',
    bonuses: { maxQi: 36, cooldownReduction: 1, statusChance: 0.05 }
  },
  {
    itemId: 'demonic-soul-banner',
    slot: 'accessory',
    pathIds: ['demonic'],
    effectText: '邪修限定 · 攻击 +8%，状态命中 +12%',
    bonuses: { attackMultiplier: 1.08, statusChance: 0.12, skillDamageMultiplier: 1.05 }
  }
];

export const equipmentAffixDefinitions: EquipmentAffixDefinition[] = [
  { id: 'keen', name: '锋锐', description: '攻击 +6%，状态命中 +5%', slots: ['weapon'], bonuses: { attackMultiplier: 1.06, statusChance: 0.05 } },
  { id: 'stalwart', name: '镇岳', description: '生命、防御 +7%', slots: ['armor'], bonuses: { hpMultiplier: 1.07, defenseMultiplier: 1.07 } },
  { id: 'nimble', name: '流风', description: '速度 +3，闪避 +1', slots: ['weapon', 'armor', 'accessory'], bonuses: { speed: 3, dodge: 1 } },
  { id: 'spirit-bound', name: '蕴灵', description: '真气 +24，先攻 +1', slots: ['armor', 'accessory'], bonuses: { maxQi: 24, initiative: 1 } },
  { id: 'sword-heart', name: '剑心', description: '攻击 +8%，主动技能伤害 +8%', slots: ['weapon'], bonuses: { attackMultiplier: 1.08, skillDamageMultiplier: 1.08 } },
  { id: 'body-forged', name: '不坏', description: '生命 +10%，护盾效果 +18%', slots: ['armor'], bonuses: { hpMultiplier: 1.1, injuryMultiplier: 0.94, shieldMultiplier: 1.18 } },
  { id: 'spell-channel', name: '通玄', description: '真气 +32，技能冷却 -1 回合', slots: ['accessory'], bonuses: { maxQi: 32, dodge: 1, cooldownReduction: 1 } },
  { id: 'blood-mark', name: '血契', description: '攻击、生命 +5%，状态命中 +10%', slots: ['weapon', 'armor'], bonuses: { attackMultiplier: 1.05, hpMultiplier: 1.05, statusChance: 0.1 } }
];

export const equipmentSetDefinitions: EquipmentSetDefinition[] = [
  {
    id: 'greenmist-set',
    name: '青霭行装',
    itemIds: ['spirit-blade', 'minor-ward', 'soul-settling-orb'],
    thresholds: [
      { pieces: 2, description: '真气 +12', bonuses: { maxQi: 12 } },
      { pieces: 3, description: '护盾 +10%，状态命中 +4%', bonuses: { shieldMultiplier: 1.1, statusChance: 0.04 } }
    ]
  },
  {
    id: 'star-thunder-set',
    name: '星雷战装',
    itemIds: ['starfall-blade', 'thunder-ward-armor', 'heaven-soul-jade'],
    thresholds: [
      { pieces: 2, description: '速度 +3，主动技能伤害 +6%', bonuses: { speed: 3, skillDamageMultiplier: 1.06 } },
      { pieces: 3, description: '状态命中 +8%', bonuses: { statusChance: 0.08 } }
    ]
  },
  {
    id: 'tribulation-set',
    name: '九劫玄黄装',
    itemIds: ['tribulation-edge', 'xuanhuang-robe', 'heaven-soul-jade'],
    thresholds: [
      { pieces: 2, description: '生命、防御 +8%', bonuses: { hpMultiplier: 1.08, defenseMultiplier: 1.08 } },
      { pieces: 3, description: '技能冷却 -1 回合，主动技能伤害 +8%', bonuses: { cooldownReduction: 1, skillDamageMultiplier: 1.08 } }
    ]
  },
  {
    id: 'sword-path-set',
    name: '问剑星锋',
    itemIds: ['starfall-blade', 'thunder-ward-armor', 'sword-heart-sheath'],
    thresholds: [
      { pieces: 2, description: '攻击 +8%，速度 +2', bonuses: { attackMultiplier: 1.08, speed: 2 } },
      { pieces: 3, description: '主动技能伤害 +12%，先攻 +2', bonuses: { skillDamageMultiplier: 1.12, initiative: 2 } }
    ]
  },
  {
    id: 'body-path-set',
    name: '不坏血炉',
    itemIds: ['starfall-blade', 'thunder-ward-armor', 'body-blood-bracer'],
    thresholds: [
      { pieces: 2, description: '生命、防御 +9%', bonuses: { hpMultiplier: 1.09, defenseMultiplier: 1.09 } },
      { pieces: 3, description: '护盾 +25%，战后伤势 -10%', bonuses: { shieldMultiplier: 1.25, injuryMultiplier: 0.9 } }
    ]
  },
  {
    id: 'spell-path-set',
    name: '五行通玄',
    itemIds: ['starfall-blade', 'thunder-ward-armor', 'spell-five-element-seal'],
    thresholds: [
      { pieces: 2, description: '真气 +28，状态命中 +6%', bonuses: { maxQi: 28, statusChance: 0.06 } },
      { pieces: 3, description: '技能冷却 -1 回合，主动技能伤害 +10%', bonuses: { cooldownReduction: 1, skillDamageMultiplier: 1.1 } }
    ]
  },
  {
    id: 'demonic-path-set',
    name: '血煞摄魂',
    itemIds: ['starfall-blade', 'thunder-ward-armor', 'demonic-soul-banner'],
    thresholds: [
      { pieces: 2, description: '攻击、生命 +7%', bonuses: { attackMultiplier: 1.07, hpMultiplier: 1.07 } },
      { pieces: 3, description: '状态命中 +14%，主动技能伤害 +8%', bonuses: { statusChance: 0.14, skillDamageMultiplier: 1.08 } }
    ]
  }
];

export const equipmentQualityTiers: EquipmentQualityTier[] = [
  { id: 'rough', name: '粗制', minQuality: 0, color: '#8d947f' },
  { id: 'refined', name: '精良', minQuality: 95, color: '#355d58' },
  { id: 'superior', name: '上乘', minQuality: 105, color: '#7a5426' },
  { id: 'masterwork', name: '天工', minQuality: 115, color: '#9d3d2f' }
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

export function getEquipmentAffix(affixId: EquipmentAffixId | string | null | undefined): EquipmentAffixDefinition | undefined {
  return affixId ? equipmentAffixDefinitions.find(affix => affix.id === affixId) : undefined;
}

export function getEquipmentAffixCandidates(itemId: string): EquipmentAffixDefinition[] {
  const definition = getEquipmentDefinition(itemId);
  return definition ? equipmentAffixDefinitions.filter(affix => affix.slots.includes(definition.slot)) : [];
}

export function getCombatSupply(itemId: string | null | undefined): CombatSupplyDefinition | undefined {
  return itemId ? combatSupplyDefinitions.find(item => item.itemId === itemId) : undefined;
}

export function getEquipmentBonuses(
  equipment: EquipmentState,
  enhancements: EquipmentEnhancement[] = [],
  affixes: EquipmentAffixState[] = [],
  qualities: EquipmentQualityState[] = []
): EquipmentBonuses {
  const equippedItemIds = (Object.values(equipment) as Array<string | null>).filter((itemId): itemId is string => !!itemId);
  const baseBonuses = equippedItemIds.reduce<EquipmentBonuses>((total, itemId) => {
    const definition = getEquipmentDefinition(itemId);
    if (!definition) return total;
    const level = enhancements.find(entry => entry.itemId === itemId)?.level ?? 0;
    const quality = (qualities.find(entry => entry.itemId === itemId)?.quality ?? 100) / 100;
    const base = definition.bonuses;
    const bonuses: EquipmentBonuses = {
      hpMultiplier: 1 + ((base.hpMultiplier ?? 1) - 1) * quality + (definition.slot === 'armor' ? level * 0.02 : 0),
      attackMultiplier: 1 + ((base.attackMultiplier ?? 1) - 1) * quality + (definition.slot === 'weapon' ? level * 0.02 : 0),
      defenseMultiplier: 1 + ((base.defenseMultiplier ?? 1) - 1) * quality + (definition.slot === 'armor' ? level * 0.02 : 0),
      injuryMultiplier: Math.max(0.5, 1 - (1 - (base.injuryMultiplier ?? 1)) * quality - (definition.slot === 'armor' ? level * 0.012 : 0)),
      maxQi: Math.round((base.maxQi ?? 0) * quality) + (definition.slot === 'accessory' ? level * 3 : 0),
      dodge: Math.round((base.dodge ?? 0) * quality) + Math.floor(level / 4),
      speed: Math.round((base.speed ?? 0) * quality) + (definition.slot === 'weapon' ? Math.floor(level / 3) : 0),
      initiative: Math.round((base.initiative ?? 0) * quality) + (definition.slot === 'weapon' ? Math.floor(level / 4) : 0),
      skillDamageMultiplier: 1 + ((base.skillDamageMultiplier ?? 1) - 1) * quality,
      statusChance: (base.statusChance ?? 0) * quality,
      shieldMultiplier: 1 + ((base.shieldMultiplier ?? 1) - 1) * quality,
      cooldownReduction: base.cooldownReduction ?? 0
    };

    return combineEquipmentBonuses(total, bonuses);
  }, {});

  const affixBonuses = affixes.reduce<EquipmentBonuses>((total, affixState) => {
    if (!equippedItemIds.includes(affixState.itemId)) return total;
    return affixState.affixIds.reduce<EquipmentBonuses>((affixTotal, affixId) => {
      const affix = getEquipmentAffix(affixId);
      return affix ? combineEquipmentBonuses(affixTotal, affix.bonuses) : affixTotal;
    }, total);
  }, baseBonuses);

  return getActiveEquipmentSetThresholds(equipment).reduce<EquipmentBonuses>(
    (total, threshold) => combineEquipmentBonuses(total, threshold.bonuses),
    affixBonuses
  );
}

export function getActiveEquipmentSets(equipment: EquipmentState): Array<{
  definition: EquipmentSetDefinition;
  pieces: number;
}> {
  const equipped = new Set(Object.values(equipment).filter((itemId): itemId is string => !!itemId));
  return equipmentSetDefinitions
    .map(definition => ({
      definition,
      pieces: definition.itemIds.filter(itemId => equipped.has(itemId)).length
    }))
    .filter(entry => entry.pieces > 0);
}

function getActiveEquipmentSetThresholds(equipment: EquipmentState) {
  return getActiveEquipmentSets(equipment).flatMap(({ definition, pieces }) => (
    definition.thresholds.filter(threshold => pieces >= threshold.pieces)
  ));
}

function combineEquipmentBonuses(total: EquipmentBonuses, bonuses: EquipmentBonuses): EquipmentBonuses {
  return {
    hpMultiplier: (total.hpMultiplier ?? 1) * (bonuses.hpMultiplier ?? 1),
    attackMultiplier: (total.attackMultiplier ?? 1) * (bonuses.attackMultiplier ?? 1),
    defenseMultiplier: (total.defenseMultiplier ?? 1) * (bonuses.defenseMultiplier ?? 1),
    injuryMultiplier: (total.injuryMultiplier ?? 1) * (bonuses.injuryMultiplier ?? 1),
    maxQi: (total.maxQi ?? 0) + (bonuses.maxQi ?? 0),
    dodge: (total.dodge ?? 0) + (bonuses.dodge ?? 0),
    speed: (total.speed ?? 0) + (bonuses.speed ?? 0),
    initiative: (total.initiative ?? 0) + (bonuses.initiative ?? 0),
    skillDamageMultiplier: (total.skillDamageMultiplier ?? 1) * (bonuses.skillDamageMultiplier ?? 1),
    statusChance: (total.statusChance ?? 0) + (bonuses.statusChance ?? 0),
    shieldMultiplier: (total.shieldMultiplier ?? 1) * (bonuses.shieldMultiplier ?? 1),
    cooldownReduction: Math.max(total.cooldownReduction ?? 0, bonuses.cooldownReduction ?? 0)
  };
}

export function getEquipmentRating(
  itemId: string,
  level = 0,
  affixIds?: EquipmentAffixId | EquipmentAffixId[] | null,
  quality = 100
): number {
  const definition = getEquipmentDefinition(itemId);
  if (!definition) return 0;
  const equipment: EquipmentState = { weapon: null, armor: null, accessory: null, [definition.slot]: itemId };
  const bonuses = getEquipmentBonuses(
    equipment,
    level > 0 ? [{ itemId, level }] : [],
    affixIds ? [{ itemId, affixIds: Array.isArray(affixIds) ? affixIds : [affixIds] }] : [],
    [{ itemId, quality }]
  );
  return Math.round(
    ((bonuses.hpMultiplier ?? 1) - 1) * 180
    + ((bonuses.attackMultiplier ?? 1) - 1) * 240
    + ((bonuses.defenseMultiplier ?? 1) - 1) * 200
    + (1 - (bonuses.injuryMultiplier ?? 1)) * 140
    + (bonuses.maxQi ?? 0) * 0.8
    + (bonuses.dodge ?? 0) * 8
    + (bonuses.speed ?? 0) * 5
    + (bonuses.initiative ?? 0) * 6
    + ((bonuses.skillDamageMultiplier ?? 1) - 1) * 180
    + (bonuses.statusChance ?? 0) * 120
    + ((bonuses.shieldMultiplier ?? 1) - 1) * 100
    + (bonuses.cooldownReduction ?? 0) * 18
  );
}

export function getEquipmentQualityTier(quality: number): EquipmentQualityTier {
  const safeQuality = Math.max(0, Math.round(quality));
  return [...equipmentQualityTiers].reverse().find(tier => safeQuality >= tier.minQuality) ?? equipmentQualityTiers[0];
}

export function getEquipmentAffixSlotCount(itemId: string, quality = 100): number {
  const rarity = getItem(itemId)?.rarity;
  const baseSlots = rarity === '神话' || rarity === '传说' || rarity === '极品'
    ? 3
    : rarity === '上品' || rarity === '变异'
      ? 2
      : 1;
  return Math.min(3, baseSlots + (quality >= 115 && baseSlots < 3 ? 1 : quality >= 105 && baseSlots === 1 ? 1 : 0));
}

export function getEquipmentEssenceYield(itemId: string): number {
  const rarity = getItem(itemId)?.rarity;
  const yields = { 凡品: 1, 下品: 1, 中品: 2, 上品: 3, 变异: 4, 极品: 5, 神话: 7, 传说: 8 } as const;
  return rarity ? yields[rarity] : 0;
}

export function getEquipmentReforgeCost(itemId: string): number {
  return Math.max(2, getEquipmentEssenceYield(itemId));
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
  const enemyVariant = boss
    ? undefined
    : combatEnemyVariants.filter(enemy => enemy.zoneId === zone.id)[Math.floor(Math.random() * 3)];
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
    ...(enemyVariant ? { combatEnemyId: enemyVariant.id } : {}),
    ...(boss ? { combatBoss: true } : {}),
    age,
    type: 'combat',
    title: boss ? `挑战${zone.bossName}` : `遭遇${enemyVariant?.name ?? zone.enemy}`,
    description: boss
      ? `你清理了${zone.name}外围的威胁，终于逼出坐镇此地的${zone.bossName}。这一战将决定道途能否继续向前。`
      : `${zone.description}你循着气机深入其中，与${enemyVariant?.name ?? zone.enemy}正面相遇。${enemyVariant ? enemyVariant.traitText : ''}`,
    weight: 0,
    effects,
    ...(boss && firstClear ? { itemRewards: zone.firstClearRewards } : {}),
    result: 'success'
  };
}

export function getCombatZoneLootPreview(zone: CombatZoneDefinition): InventoryReward[] {
  return zone.loot.map(entry => ({ itemId: entry.itemId, quantity: 1 }));
}
