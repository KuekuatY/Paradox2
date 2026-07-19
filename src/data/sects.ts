import type { CultivationSect, CultivationSectId, SectExchangeDefinition, SectMissionDefinition } from '@/types';

export const cultivationSects: CultivationSect[] = [
  {
    id: 'loose',
    name: '散修',
    grade: '无宗无派',
    tendency: '自由机缘',
    description: '不拜山门，不受规矩束缚。机缘来得更野，突破与功法则更看命数。',
    effect: { 气运: 4, 家境: -1 },
    modifiers: { 事件权重: { encounter: 1.15, resource: 1.08, sect: 0.35 } },
    contributionGain: 0,
    reputationGain: 0
  },
  {
    id: 'sword-pavilion',
    name: '问剑阁',
    grade: '中等宗门',
    tendency: '剑修战斗',
    description: '阁中弟子以剑立身，宗门小比与外出斩妖极多，适合走锋芒道途。',
    effect: { 根骨: 3, 神识: 1 },
    modifiers: { 修为倍率: 1.03, 事件权重: { combat: 1.18, sect: 1.12 } },
    contributionGain: 12,
    reputationGain: 8
  },
  {
    id: 'alchemy-valley',
    name: '青炉谷',
    grade: '中等宗门',
    tendency: '炼丹灵田',
    description: '谷中丹房与灵田相连，擅长以丹药、灵草和温养心神稳步修行。',
    effect: { 悟性: 2, 家境: 2 },
    modifiers: { 寿命倍率: 1.03, 事件权重: { resource: 1.15, daily: 1.08, sect: 1.1 } },
    contributionGain: 14,
    reputationGain: 7
  },
  {
    id: 'artifact-hall',
    name: '百炼堂',
    grade: '中等宗门',
    tendency: '炼器法器',
    description: '堂中炉火不熄，弟子多以炼器、护身法器和宗门委托积攒资源。',
    effect: { 根骨: 2, 家境: 2 },
    modifiers: { 属性倍率: 1.02, 事件权重: { resource: 1.12, combat: 1.05, sect: 1.1 } },
    contributionGain: 14,
    reputationGain: 7
  },
  {
    id: 'talisman-court',
    name: '玄符院',
    grade: '大宗分院',
    tendency: '画符护劫',
    description: '院中重符箓与护劫法，弟子擅长化解险境，也更容易获得符箓资源。',
    effect: { 神识: 2, 气运: 2 },
    modifiers: { 灾劫抗性: 0.04, 事件权重: { disaster: 0.88, sect: 1.12, mind: 1.06 } },
    contributionGain: 12,
    reputationGain: 9
  },
  {
    id: 'array-gate',
    name: '天枢阵门',
    grade: '大宗分院',
    tendency: '阵法突破',
    description: '阵门讲究推演与布势，适合稳住突破准备和法修构筑。',
    effect: { 悟性: 2, 神识: 2 },
    modifiers: { 修为倍率: 1.02, 事件权重: { mind: 1.12, sect: 1.15, daily: 1.05 } },
    contributionGain: 12,
    reputationGain: 9
  },
  {
    id: 'hehuan-sect',
    name: '合欢宗',
    grade: '隐世宗门',
    tendency: '情缘心法',
    description: '此宗重心性、人缘与情缘道法，善借往来关系化解阻滞，亦容易卷入同道风波。',
    effect: { 颜值: 4, 神识: 1, 气运: 1 },
    modifiers: { 修为倍率: 1.02, 事件权重: { social: 1.28, encounter: 1.12, sect: 1.12, disaster: 1.04 } },
    contributionGain: 10,
    reputationGain: 12
  },
  {
    id: 'demonic-sect',
    name: '血影宗',
    grade: '魔道宗门',
    tendency: '邪修争斗',
    description: '宗内强者为尊，资源来得快，仇怨也来得快，适合高风险高收益的邪修路数。',
    effect: { 根骨: 2, 气运: 2, 颜值: -1 },
    modifiers: { 修为倍率: 1.05, 灾劫抗性: -0.03, 事件权重: { combat: 1.22, resource: 1.12, disaster: 1.08 } },
    contributionGain: 16,
    reputationGain: 5
  }
];

export function getCultivationSect(id: CultivationSectId | null | undefined): CultivationSect | undefined {
  return cultivationSects.find(sect => sect.id === id);
}

export const sectMissions: SectMissionDefinition[] = [
  {
    id: 'sect-duel-training',
    name: '宗门小比',
    description: '参与同门斗法，以战斗证明根基。',
    eventType: 'combat',
    minRealmLevel: 1,
    effects: { 修为: 8, 根骨: 2, 神识: 1 },
    contribution: 18,
    reputation: 8
  },
  {
    id: 'sect-gather-herbs',
    name: '采集灵材',
    description: '为宗门采集灵草与矿材，稳稳换取贡献。',
    eventType: 'resource',
    minRealmLevel: 1,
    effects: { 修为: 4, 气运: 1, 家境: 1 },
    contribution: 16,
    reputation: 5,
    itemRewards: [{ itemId: 'spirit-herb', quantity: 2 }]
  },
  {
    id: 'sect-alchemy-commission',
    name: '丹房委托',
    description: '替丹房处理火候与药性，适合悟性较高的修士。',
    eventType: 'daily',
    sectIds: ['alchemy-valley', 'hehuan-sect'],
    effects: { 悟性: 2, 神识: 1, 修为: 5 },
    contribution: 22,
    reputation: 7,
    itemRewards: [{ itemId: 'qi-gathering-pill', quantity: 1 }]
  },
  {
    id: 'sect-artifact-commission',
    name: '炼器委托',
    description: '协助锻炉淬器，换取法器与贡献。',
    eventType: 'resource',
    sectIds: ['artifact-hall', 'sword-pavilion'],
    effects: { 根骨: 2, 悟性: 1, 修为: 5 },
    contribution: 22,
    reputation: 7,
    itemRewards: [{ itemId: 'spirit-blade', quantity: 1 }]
  },
  {
    id: 'sect-talisman-ward',
    name: '绘制护符',
    description: '替同门绘制护符，能积累符箓与声望。',
    eventType: 'mind',
    sectIds: ['talisman-court', 'array-gate'],
    effects: { 神识: 2, 气运: 1, 修为: 4 },
    contribution: 20,
    reputation: 9,
    itemRewards: [{ itemId: 'minor-ward', quantity: 1 }]
  },
  {
    id: 'sect-social-mediation',
    name: '调解同门',
    description: '斡旋同门争执，讲究颜值、心性与人情。',
    eventType: 'social',
    sectIds: ['hehuan-sect', 'alchemy-valley', 'talisman-court'],
    effects: { 颜值: 2, 神识: 1, 家境: 1 },
    contribution: 18,
    reputation: 12
  },
  {
    id: 'sect-demonic-raid',
    name: '血影夺材',
    description: '随魔道同门突袭秘藏，收益高，风险也高。',
    eventType: 'combat',
    sectIds: ['demonic-sect'],
    effects: { 修为: 12, 根骨: 2, 气运: 1, 寿命: -1 },
    contribution: 28,
    reputation: 6,
    itemRewards: [{ itemId: 'blood-jade', quantity: 1 }]
  },
  {
    id: 'loose-secret-market',
    name: '黑市换宝',
    description: '以散修身份出入黑市，赌一份不稳定的资源。',
    eventType: 'resource',
    looseOnly: true,
    effects: { 气运: 2, 家境: -1, 修为: 6 },
    contribution: 0,
    reputation: 0,
    itemRewards: [{ itemId: 'old-manual-page', quantity: 1 }]
  },
  {
    id: 'loose-wild-ruins',
    name: '野外遗迹',
    description: '独自探查荒僻遗迹，机缘与风险并存。',
    eventType: 'encounter',
    looseOnly: true,
    effects: { 气运: 3, 神识: 1, 修为: 8 },
    contribution: 0,
    reputation: 0,
    itemRewards: [{ itemId: 'beast-core', quantity: 1 }]
  }
];

export const sectExchanges: SectExchangeDefinition[] = [
  {
    id: 'sect-exchange-pill',
    name: '兑换丹药',
    description: '以贡献换取一瓶适合当前境界的丹药。',
    cost: 35,
    itemRewards: [{ itemId: 'qi-gathering-pill', quantity: 1 }]
  },
  {
    id: 'sect-exchange-ward',
    name: '兑换护符',
    description: '换取护身符箓，用于战斗、灾劫或突破准备。',
    cost: 45,
    itemRewards: [{ itemId: 'protection-talisman', quantity: 1 }]
  },
  {
    id: 'sect-exchange-preparation',
    name: '请求护法',
    description: '请宗门长辈护法，直接增加突破准备。',
    cost: 80,
    minRank: '内门弟子',
    preparation: 'array',
    effects: { 神识: 2, 气运: 1 }
  },
  {
    id: 'sect-exchange-manual',
    name: '兑换功法线索',
    description: '用贡献换一条功法线索，有机会获得本流派当前阶段功法。',
    cost: 120,
    minRank: '内门弟子',
    techniqueRewardGrade: '玄',
    effects: { 悟性: 2 }
  },
  {
    id: 'sect-exchange-combat-insight',
    name: '兑换斗法残印',
    description: '以贡献换取一枚斗法残印，用于领悟或升级主动技能。',
    cost: 65,
    itemRewards: [{ itemId: 'combat-insight', quantity: 1 }]
  },
  {
    id: 'sect-exchange-hehuan',
    name: '情缘心法指点',
    description: '合欢宗长辈点拨心法，提升社交与心境根基。',
    cost: 70,
    sectIds: ['hehuan-sect'],
    effects: { 颜值: 4, 神识: 2, 修为: 5 }
  },
  {
    id: 'loose-exchange-market',
    name: '散修黑市',
    description: '不花贡献，改以家境和气运搏一份资源。',
    cost: 0,
    looseOnly: true,
    effects: { 家境: -2, 气运: 2 },
    itemRewards: [{ itemId: 'fortune-talisman', quantity: 1 }]
  }
];

export function getSectMission(id: string): SectMissionDefinition | undefined {
  return sectMissions.find(mission => mission.id === id);
}

export function getSectExchange(id: string): SectExchangeDefinition | undefined {
  return sectExchanges.find(exchange => exchange.id === id);
}
