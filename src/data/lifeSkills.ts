import type { GameEvent, InventoryReward, LifeSkillId } from '@/types';

export type { LifeSkillId } from '@/types';

export interface LifeSkillRecipe {
  id: string;
  name: string;
  minSkillLevel: number;
  minRealmLevel: number;
  costs: InventoryReward[];
  rewards: InventoryReward[];
  effects: GameEvent['effects'];
  exp: number;
}

export interface LifeSkillDefinition {
  id: LifeSkillId;
  name: string;
  description: string;
  focus: string;
  eventType: GameEvent['type'];
  minRealmLevel: number;
  timeCost: number;
  familyWealthCost: number;
  expGain: number;
  effects: GameEvent['effects'];
  recipes: LifeSkillRecipe[];
}

export const lifeSkills: LifeSkillDefinition[] = [
  {
    id: 'alchemy',
    name: '炼丹',
    description: '开炉炼药，把灵草丹方转成可直接服用的丹药。',
    focus: '修为、丹药、悟性',
    eventType: 'resource',
    minRealmLevel: 1,
    timeCost: 1,
    familyWealthCost: 3,
    expGain: 12,
    effects: { 修为: 6, 悟性: 2 },
    recipes: [
      {
        id: 'alchemy-basic-pill',
        name: '炼制聚气丹',
        minSkillLevel: 1,
        minRealmLevel: 1,
        costs: [{ itemId: 'spirit-herb', quantity: 2 }],
        rewards: [{ itemId: 'qi-gathering-pill', quantity: 1 }],
        effects: { 修为: 3, 悟性: 1 },
        exp: 16
      },
      {
        id: 'alchemy-body-pill',
        name: '炼制淬体丹',
        minSkillLevel: 3,
        minRealmLevel: 2,
        costs: [{ itemId: 'spirit-herb', quantity: 2 }, { itemId: 'beast-core', quantity: 1 }],
        rewards: [{ itemId: 'bone-tempering-pill', quantity: 1 }],
        effects: { 根骨: 2 },
        exp: 20
      }
    ]
  },
  {
    id: 'crafting',
    name: '炼器',
    description: '熔炼金石与兽材，打造护身小器，也磨炼根骨手感。',
    focus: '根骨、法器、家境',
    eventType: 'resource',
    minRealmLevel: 1,
    timeCost: 1,
    familyWealthCost: 4,
    expGain: 12,
    effects: { 根骨: 3, 家境: 1 },
    recipes: [
      {
        id: 'crafting-ward',
        name: '锻制护身小器',
        minSkillLevel: 1,
        minRealmLevel: 1,
        costs: [{ itemId: 'spirit-ore', quantity: 2 }, { itemId: 'beast-core', quantity: 1 }],
        rewards: [{ itemId: 'minor-ward', quantity: 1 }],
        effects: { 根骨: 2, 神识: 1 },
        exp: 16
      },
      {
        id: 'crafting-spirit-blade',
        name: '锻制灵刃',
        minSkillLevel: 3,
        minRealmLevel: 2,
        costs: [{ itemId: 'spirit-ore', quantity: 3 }, { itemId: 'ancient-scale', quantity: 1 }],
        rewards: [{ itemId: 'spirit-blade', quantity: 1 }],
        effects: { 根骨: 4 },
        exp: 22
      },
      {
        id: 'crafting-starfall-blade',
        name: '锻制落星剑',
        minSkillLevel: 5,
        minRealmLevel: 4,
        costs: [{ itemId: 'spirit-ore', quantity: 4 }, { itemId: 'purple-crystal-marrow', quantity: 2 }],
        rewards: [{ itemId: 'starfall-blade', quantity: 1 }],
        effects: { 根骨: 6, 神识: 2 },
        exp: 30
      },
      {
        id: 'crafting-thunder-armor',
        name: '锻制雷纹战甲',
        minSkillLevel: 6,
        minRealmLevel: 5,
        costs: [{ itemId: 'spirit-ore', quantity: 5 }, { itemId: 'thunder-beast-core', quantity: 2 }],
        rewards: [{ itemId: 'thunder-ward-armor', quantity: 1 }],
        effects: { 根骨: 7, 神识: 3 },
        exp: 34
      },
      {
        id: 'crafting-tribulation-edge',
        name: '锻制九劫锋',
        minSkillLevel: 9,
        minRealmLevel: 7,
        costs: [{ itemId: 'tribulation-crystal', quantity: 3 }, { itemId: 'ancient-immortal-scale', quantity: 2 }],
        rewards: [{ itemId: 'tribulation-edge', quantity: 1 }],
        effects: { 根骨: 10, 神识: 5 },
        exp: 46
      },
      {
        id: 'crafting-xuanhuang-robe',
        name: '炼制玄黄法袍',
        minSkillLevel: 10,
        minRealmLevel: 8,
        costs: [{ itemId: 'xuanhuang-marrow', quantity: 2 }, { itemId: 'outer-star-sand', quantity: 3 }],
        rewards: [{ itemId: 'xuanhuang-robe', quantity: 1 }],
        effects: { 根骨: 9, 神识: 7 },
        exp: 50
      }
    ]
  },
  {
    id: 'talisman',
    name: '画符',
    description: '以朱砂灵墨承载气机，符成可护身，也能调运。',
    focus: '气运、符箓、神识',
    eventType: 'mind',
    minRealmLevel: 1,
    timeCost: 1,
    familyWealthCost: 2,
    expGain: 12,
    effects: { 气运: 4, 神识: 1 },
    recipes: [
      {
        id: 'talisman-fortune',
        name: '绘制转运符',
        minSkillLevel: 1,
        minRealmLevel: 1,
        costs: [{ itemId: 'talisman-paper', quantity: 2 }],
        rewards: [{ itemId: 'fortune-talisman', quantity: 1 }],
        effects: { 气运: 2 },
        exp: 16
      },
      {
        id: 'talisman-protection',
        name: '绘制护身符',
        minSkillLevel: 3,
        minRealmLevel: 2,
        costs: [{ itemId: 'talisman-paper', quantity: 2 }, { itemId: 'beast-core', quantity: 1 }],
        rewards: [{ itemId: 'protection-talisman', quantity: 1 }],
        effects: { 神识: 2, 气运: 2 },
        exp: 20
      }
    ]
  },
  {
    id: 'array',
    name: '阵法',
    description: '推演阵纹与方位，强化洞府护持和突破准备。',
    focus: '神识、悟性、护阵',
    eventType: 'mind',
    minRealmLevel: 2,
    timeCost: 2,
    familyWealthCost: 5,
    expGain: 18,
    effects: { 神识: 4, 悟性: 3, 家境: -1 },
    recipes: [
      {
        id: 'array-breakthrough',
        name: '布置聚灵阵',
        minSkillLevel: 1,
        minRealmLevel: 2,
        costs: [{ itemId: 'array-stone', quantity: 2 }, { itemId: 'spirit-ore', quantity: 1 }],
        rewards: [{ itemId: 'minor-array-plate', quantity: 1 }],
        effects: { 神识: 2, 悟性: 2, 修为: 3 },
        exp: 22
      },
      {
        id: 'array-tribulation',
        name: '推演护劫阵',
        minSkillLevel: 4,
        minRealmLevel: 5,
        costs: [{ itemId: 'array-stone', quantity: 3 }, { itemId: 'thunder-beast-core', quantity: 1 }],
        rewards: [{ itemId: 'tribulation-ward', quantity: 1 }],
        effects: { 神识: 4, 气运: 3 },
        exp: 30
      }
    ]
  },
  {
    id: 'fishing',
    name: '钓鱼',
    description: '临水垂钓，等鱼也等机缘，偶尔能钓出奇物。',
    focus: '气运、寿元、灵材',
    eventType: 'daily',
    minRealmLevel: 1,
    timeCost: 1,
    familyWealthCost: 0,
    expGain: 10,
    effects: { 气运: 3, 寿命: 1 },
    recipes: [
      {
        id: 'fishing-spirit-fish',
        name: '垂钓灵鱼',
        minSkillLevel: 1,
        minRealmLevel: 1,
        costs: [],
        rewards: [{ itemId: 'spirit-fish', quantity: 1 }],
        effects: { 气运: 1 },
        exp: 12
      },
      {
        id: 'fishing-deep-pool',
        name: '探钓深潭',
        minSkillLevel: 3,
        minRealmLevel: 3,
        costs: [{ itemId: 'spirit-bait', quantity: 1 }],
        rewards: [{ itemId: 'jade-scale-fish', quantity: 1 }],
        effects: { 气运: 3, 寿命: 1 },
        exp: 20
      }
    ]
  },
  {
    id: 'spirit-field',
    name: '灵田',
    description: '打理灵田药圃，用耐心换来稳定灵材和家底。',
    focus: '家境、灵材、根骨',
    eventType: 'resource',
    minRealmLevel: 1,
    timeCost: 1,
    familyWealthCost: 2,
    expGain: 12,
    effects: { 家境: 3, 根骨: 1 },
    recipes: [
      {
        id: 'field-spirit-herb',
        name: '培育灵草',
        minSkillLevel: 1,
        minRealmLevel: 1,
        costs: [{ itemId: 'spirit-seed', quantity: 1 }],
        rewards: [{ itemId: 'spirit-herb', quantity: 3 }],
        effects: { 家境: 1 },
        exp: 16
      },
      {
        id: 'field-bait',
        name: '培育灵饵',
        minSkillLevel: 2,
        minRealmLevel: 1,
        costs: [{ itemId: 'spirit-herb', quantity: 1 }],
        rewards: [{ itemId: 'spirit-bait', quantity: 2 }],
        effects: { 气运: 1 },
        exp: 14
      }
    ]
  }
];

export function getLifeSkill(skillId: LifeSkillId): LifeSkillDefinition | undefined {
  return lifeSkills.find(skill => skill.id === skillId);
}
