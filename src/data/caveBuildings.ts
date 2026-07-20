import type {
  CaveBuildingId,
  CaveOrder,
  CaveProductionJob,
  CaveState,
  GameEvent,
  InventoryReward
} from '@/types';

export interface CaveBuildingDefinition {
  id: CaveBuildingId;
  name: string;
  focus: string;
  description: string;
  maxLevel: number;
  minRealmLevel: number;
  baseSpiritStoneCost: number;
  baseMaterialCosts: InventoryReward[];
}

export interface CaveProductionRecipe {
  id: string;
  buildingId: CaveBuildingId;
  name: string;
  description: string;
  minRealmLevel: number;
  duration: number;
  costs: InventoryReward[];
  rewards: InventoryReward[];
  effects?: GameEvent['effects'];
}

export interface CavePassiveBonuses {
  stoneIncomePerTenYears: number;
  maintenanceReduction: number;
  techniqueCostMultiplier: number;
  equipmentCostReduction: number;
  combatDefenseMultiplier: number;
  productionSpeedMultiplier: number;
  orderRewardMultiplier: number;
}

export const caveBuildings: CaveBuildingDefinition[] = [
  {
    id: 'spirit-vein', name: '聚灵灵脉', focus: '灵石与修炼',
    description: '将洞府下方的灵脉引入主阵，稳定产出灵石，也让洞府更像真正的修行根基。',
    maxLevel: 5, minRealmLevel: 2, baseSpiritStoneCost: 18, baseMaterialCosts: [{ itemId: 'spirit-ore', quantity: 3 }]
  },
  {
    id: 'spirit-field', name: '洞天灵田', focus: '灵材与生产',
    description: '把灵田纳入洞天循环，定期产出灵种和灵草，支撑百艺生产。',
    maxLevel: 5, minRealmLevel: 2, baseSpiritStoneCost: 14, baseMaterialCosts: [{ itemId: 'spirit-seed', quantity: 2 }]
  },
  {
    id: 'alchemy-room', name: '丹房', focus: '炼丹队列',
    description: '丹火不熄的专用丹房，炼丹生产更快，药力也更稳定。',
    maxLevel: 5, minRealmLevel: 2, baseSpiritStoneCost: 22, baseMaterialCosts: [{ itemId: 'spirit-herb', quantity: 4 }]
  },
  {
    id: 'forge-room', name: '炼器室', focus: '法器与强化',
    description: '将炼器炉固定在地火眼上，减少高品法器强化时的灵石损耗。',
    maxLevel: 5, minRealmLevel: 2, baseSpiritStoneCost: 24, baseMaterialCosts: [{ itemId: 'spirit-ore', quantity: 4 }]
  },
  {
    id: 'defense-array', name: '护山阵', focus: '防御与维护',
    description: '以阵纹守住洞府边界，降低维护压力，也能在战斗中减少受创。',
    maxLevel: 5, minRealmLevel: 2, baseSpiritStoneCost: 20, baseMaterialCosts: [{ itemId: 'array-stone', quantity: 3 }]
  },
  {
    id: 'scripture-library', name: '藏经阁', focus: '功法与订单',
    description: '收藏功法残卷与交易契书，降低高阶功法消耗并提高委托回报。',
    maxLevel: 5, minRealmLevel: 3, baseSpiritStoneCost: 28, baseMaterialCosts: [{ itemId: 'old-manual-page', quantity: 2 }]
  }
];

export const caveProductionRecipes: CaveProductionRecipe[] = [
  {
    id: 'cave-grow-herbs', buildingId: 'spirit-field', name: '培育洞天灵草',
    description: '消耗灵种，换取一批可以继续炼丹的灵草。', minRealmLevel: 1, duration: 3,
    costs: [{ itemId: 'spirit-seed', quantity: 1 }], rewards: [{ itemId: 'spirit-herb', quantity: 3 }]
  },
  {
    id: 'cave-refine-stone', buildingId: 'spirit-vein', name: '凝炼灵石袋',
    description: '从灵脉中收拢零散灵光，凝成可收入储物戒的灵石袋。', minRealmLevel: 2, duration: 5,
    costs: [{ itemId: 'spirit-ore', quantity: 2 }], rewards: [{ itemId: 'spirit-stone-pouch', quantity: 2 }]
  },
  {
    id: 'cave-brew-pill', buildingId: 'alchemy-room', name: '炼制聚气丹',
    description: '将灵草炼成适合中短期修炼的丹药。', minRealmLevel: 2, duration: 4,
    costs: [{ itemId: 'spirit-herb', quantity: 3 }], rewards: [{ itemId: 'qi-gathering-pill', quantity: 2 }]
  },
  {
    id: 'cave-forge-ward', buildingId: 'forge-room', name: '锻制护身小器',
    description: '用矿材与妖材炼成一件基础护身法器。', minRealmLevel: 2, duration: 6,
    costs: [{ itemId: 'spirit-ore', quantity: 3 }, { itemId: 'beast-core', quantity: 1 }], rewards: [{ itemId: 'minor-ward', quantity: 1 }]
  },
  {
    id: 'cave-bind-array', buildingId: 'defense-array', name: '布置缚灵阵盘',
    description: '将阵材固定成一件可在战斗中使用的阵盘。', minRealmLevel: 3, duration: 6,
    costs: [{ itemId: 'array-stone', quantity: 2 }, { itemId: 'talisman-paper', quantity: 1 }], rewards: [{ itemId: 'minor-array-plate', quantity: 1 }]
  },
  {
    id: 'cave-copy-manual', buildingId: 'scripture-library', name: '整理玄阶残卷',
    description: '从旧经页中校出一份完整的玄阶残卷。', minRealmLevel: 4, duration: 8,
    costs: [{ itemId: 'old-manual-page', quantity: 2 }], rewards: [{ itemId: 'mystic-manual-fragment', quantity: 1 }]
  }
];

const orderPools: Array<{ minRealmLevel: number; itemId: string; quantity: number; reward: number }> = [
  { minRealmLevel: 1, itemId: 'spirit-herb', quantity: 3, reward: 8 },
  { minRealmLevel: 1, itemId: 'spirit-ore', quantity: 2, reward: 9 },
  { minRealmLevel: 1, itemId: 'talisman-paper', quantity: 4, reward: 8 },
  { minRealmLevel: 2, itemId: 'beast-core', quantity: 2, reward: 15 },
  { minRealmLevel: 2, itemId: 'qi-gathering-pill', quantity: 2, reward: 20 },
  { minRealmLevel: 3, itemId: 'minor-ward', quantity: 1, reward: 28 },
  { minRealmLevel: 4, itemId: 'purple-crystal-marrow', quantity: 2, reward: 46 },
  { minRealmLevel: 4, itemId: 'mystic-manual-fragment', quantity: 2, reward: 48 },
  { minRealmLevel: 4, itemId: 'mystic-spirit-pill', quantity: 2, reward: 42 },
  { minRealmLevel: 5, itemId: 'thunder-beast-core', quantity: 2, reward: 62 },
  { minRealmLevel: 5, itemId: 'dragon-blood-pill', quantity: 1, reward: 60 },
  { minRealmLevel: 7, itemId: 'tribulation-crystal', quantity: 1, reward: 110 },
  { minRealmLevel: 7, itemId: 'outer-star-sand', quantity: 2, reward: 105 },
  { minRealmLevel: 8, itemId: 'xuanhuang-marrow', quantity: 1, reward: 150 },
  { minRealmLevel: 9, itemId: 'ancient-immortal-scale', quantity: 1, reward: 190 }
];

export function getCaveBuilding(id: CaveBuildingId | string | null | undefined): CaveBuildingDefinition | undefined {
  return caveBuildings.find(building => building.id === id);
}

export function getCaveRecipe(id: string | null | undefined): CaveProductionRecipe | undefined {
  return caveProductionRecipes.find(recipe => recipe.id === id);
}

export function getCaveBuildingLevel(cave: CaveState | null | undefined, id: CaveBuildingId): number {
  return Math.max(0, Math.min(5, Math.round(cave?.buildingLevels[id] ?? 0)));
}

export function getCaveBuildingSlots(cave: CaveState | null | undefined): number {
  const libraryActive = cave?.activeBuildingIds.includes('scripture-library') ?? false;
  return 3 + (libraryActive ? Math.floor(getCaveBuildingLevel(cave, 'scripture-library') / 4) : 0);
}

export function getCaveProductionCapacity(cave: CaveState | null | undefined): number {
  const active = new Set(cave?.activeBuildingIds ?? []);
  return 2
    + (active.has('alchemy-room') ? getCaveBuildingLevel(cave, 'alchemy-room') : 0)
    + (active.has('forge-room') ? getCaveBuildingLevel(cave, 'forge-room') : 0);
}

export function getCaveUpgradeCost(building: CaveBuildingDefinition, currentLevel: number): {
  spiritStones: number;
  materials: InventoryReward[];
} {
  const level = Math.max(0, Math.round(currentLevel));
  const scale = 1 + level * 1.25;
  return {
    spiritStones: Math.max(1, Math.round(building.baseSpiritStoneCost * scale)),
    materials: building.baseMaterialCosts.map(cost => ({
      itemId: cost.itemId,
      quantity: Math.max(1, Math.ceil(cost.quantity * (1 + level * 0.5)))
    }))
  };
}

export function getCavePassiveBonuses(cave: CaveState | null | undefined): CavePassiveBonuses {
  const active = new Set(cave?.activeBuildingIds ?? []);
  const level = (id: CaveBuildingId) => active.has(id) ? getCaveBuildingLevel(cave, id) : 0;
  const vein = level('spirit-vein');
  const field = level('spirit-field');
  const alchemy = level('alchemy-room');
  const forge = level('forge-room');
  const defense = level('defense-array');
  const library = level('scripture-library');
  return {
    stoneIncomePerTenYears: vein * 2 + field,
    maintenanceReduction: defense,
    techniqueCostMultiplier: Math.max(0.78, 1 - library * 0.045),
    equipmentCostReduction: forge * 2,
    combatDefenseMultiplier: 1 + defense * 0.025,
    productionSpeedMultiplier: Math.max(0.7, 1 - (alchemy + forge + field) * 0.035),
    orderRewardMultiplier: 1 + library * 0.06
  };
}

export function getCaveProductionDuration(recipe: CaveProductionRecipe, cave: CaveState): number {
  const bonuses = getCavePassiveBonuses(cave);
  const buildingLevel = getCaveBuildingLevel(cave, recipe.buildingId);
  return Math.max(1, Math.ceil(recipe.duration * bonuses.productionSpeedMultiplier * (1 - buildingLevel * 0.025)));
}

export function createCaveOrders(realmLevel: number, age: number): CaveOrder[] {
  const safeLevel = Math.max(1, realmLevel);
  const stageFloor = Math.max(1, safeLevel - 2);
  const available = orderPools.filter(order => order.minRealmLevel <= safeLevel && order.minRealmLevel >= stageFloor);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((order, index) => ({
    id: `cave-order-${age}-${Date.now()}-${index}`,
    itemId: order.itemId,
    quantity: order.quantity,
    spiritStoneReward: order.reward + Math.max(0, realmLevel - order.minRealmLevel) * 5,
    contributionReward: realmLevel >= 4 ? 18 + realmLevel * 3 : 8 + realmLevel * 2,
    expiresAtAge: age + Math.max(20, 50 - realmLevel * 2)
  }));
}

export function getCaveOrderRefreshCost(realmLevel: number): number {
  return 4 + Math.max(1, Math.round(realmLevel)) * 2;
}

export function getCaveInitialState(): CaveState {
  return {
    buildingLevels: {
      'spirit-vein': 1,
      'spirit-field': 1,
      'defense-array': 1
    },
    activeBuildingIds: ['spirit-vein', 'spirit-field', 'defense-array'],
    productionQueue: [],
    orders: createCaveOrders(1, 0),
    lastOrderRefreshAge: 0,
    lastInspectionAge: null
  };
}

export function isCaveBuildingActive(cave: CaveState, buildingId: CaveBuildingId): boolean {
  return cave.activeBuildingIds.includes(buildingId);
}

export function isCaveProductionComplete(job: CaveProductionJob, age: number): boolean {
  return job.completesAtAge <= age;
}
