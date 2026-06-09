import type { FeatDefinition, PassiveFeature, SpellDefinition } from '@/types';

export const feats: FeatDefinition[] = [
  {
    id: 'clear-dao-heart',
    name: '道心澄明',
    description: '所有检定 +1，心境与灾劫中的大失败更容易被压住。',
    minRealmLevel: 2,
    bonuses: { checkBonus: 1, reduceGreatFailure: true }
  },
  {
    id: 'fortune-sense',
    name: '机缘嗅觉',
    description: '机缘、资源与宗门检定 +2，储物戒掉落更稳定。',
    minRealmLevel: 2,
    bonuses: { checkBonus: 2 }
  },
  {
    id: 'tribulation-afterglow',
    name: '雷劫余韵',
    description: '突破与渡劫相关检定更稳，失败时少受几分反噬。',
    minRealmLevel: 5,
    bonuses: { breakthroughBonus: 0.04, injuryMultiplier: 0.95, reduceGreatFailure: true }
  },
  {
    id: 'sword-heart',
    name: '剑心通明',
    description: '剑修先攻与战斗检定提高，天然 19 也可能化作大成功。',
    minRealmLevel: 2,
    pathIds: ['sword'],
    bonuses: { initiativeBonus: 2, offenseMultiplier: 1.04, greatSuccessOn19: true }
  },
  {
    id: 'iron-body',
    name: '铁骨铮然',
    description: '体修伤势降低，后手时更能稳住第一合。',
    minRealmLevel: 2,
    pathIds: ['body'],
    bonuses: { injuryMultiplier: 0.9, offenseMultiplier: 1.02 }
  },
  {
    id: 'spell-weaving',
    name: '术式编织',
    description: '法修检定与突破准备更稳定，术式更容易连成章法。',
    minRealmLevel: 2,
    pathIds: ['spell'],
    bonuses: { checkBonus: 1, breakthroughBonus: 0.03, initiativeBonus: 1 }
  },
  {
    id: 'demonic-nerve',
    name: '魔念驭险',
    description: '邪修战斗收益更高，大失败风险被部分压住。',
    minRealmLevel: 2,
    pathIds: ['demonic'],
    bonuses: { offenseMultiplier: 1.05, reduceGreatFailure: true }
  },
  {
    id: 'hundred-arts-hands',
    name: '百艺巧手',
    description: '百艺、资源与功法残篇相关检定 +2。',
    minRealmLevel: 3,
    bonuses: { checkBonus: 2 }
  },
  {
    id: 'sect-true-disciple',
    name: '真传气象',
    description: '宗门任务与突破准备更稳，宗门检定额外受益。',
    minRealmLevel: 3,
    sectIds: ['sword-pavilion', 'alchemy-valley', 'artifact-hall', 'talisman-court', 'array-gate'],
    bonuses: { checkBonus: 1, breakthroughBonus: 0.03 }
  },
  {
    id: 'hehuan-heart-method',
    name: '情缘入道',
    description: '社交、宗门与心境检定更强，合欢心法能把人情化作修行助力。',
    minRealmLevel: 2,
    sectIds: ['hehuan-sect'],
    bonuses: { checkBonus: 2, breakthroughBonus: 0.02 }
  },
  {
    id: 'loose-survivor',
    name: '江湖老辣',
    description: '散修机缘与资源检定更稳，大失败更容易被压住。',
    minRealmLevel: 2,
    sectIds: ['loose'],
    bonuses: { checkBonus: 1, reduceGreatFailure: true }
  },
  {
    id: 'sect-war-banner',
    name: '护宗战旗',
    description: '宗门战斗与大型斗法中攻势更稳。',
    minRealmLevel: 4,
    bonuses: { offenseMultiplier: 1.04, initiativeBonus: 1 }
  }
];

export const spellbook: SpellDefinition[] = [
  {
    id: 'sword-flash-step',
    pathId: 'sword',
    name: '流光起手',
    bookName: '剑谱',
    description: '战斗先攻 +2，首轮抢攻更容易压住敌势。',
    minRealmLevel: 2,
    bonuses: { initiativeBonus: 2, offenseMultiplier: 1.02 }
  },
  {
    id: 'sword-breaking-line',
    pathId: 'sword',
    name: '破线一剑',
    bookName: '剑谱',
    description: '战斗检定更利于大成功，功法联动时收益更明显。',
    minRealmLevel: 4,
    bonuses: { checkBonus: 1, offenseMultiplier: 1.04 }
  },
  {
    id: 'sword-guarding-sheath',
    pathId: 'sword',
    name: '藏锋护身',
    bookName: '剑谱',
    description: '降低战斗伤势，突破前也能稳住锋芒。',
    minRealmLevel: 3,
    bonuses: { injuryMultiplier: 0.94, breakthroughBonus: 0.02 }
  },
  {
    id: 'body-warding-breath',
    pathId: 'body',
    name: '护体长息',
    bookName: '炼体秘卷',
    description: '战斗伤势降低，渡劫时心神更稳。',
    minRealmLevel: 2,
    bonuses: { injuryMultiplier: 0.9, tribulationFocus: 1 }
  },
  {
    id: 'body-counter-pulse',
    pathId: 'body',
    name: '反震血脉',
    bookName: '炼体秘卷',
    description: '反击攻势小幅提高，后手作战时更稳。',
    minRealmLevel: 4,
    bonuses: { offenseMultiplier: 1.04, injuryMultiplier: 0.95 }
  },
  {
    id: 'body-earth-root',
    pathId: 'body',
    name: '地脉扎根',
    bookName: '炼体秘卷',
    description: '突破更稳，灾劫和战斗中的损伤更低。',
    minRealmLevel: 3,
    bonuses: { breakthroughBonus: 0.03, injuryMultiplier: 0.94 }
  },
  {
    id: 'spell-misty-array',
    pathId: 'spell',
    name: '雾锁阵式',
    bookName: '法术书',
    description: '敌方攻势受压，心境、宗门与阵法相关检定更稳。',
    minRealmLevel: 2,
    bonuses: { enemyOffenseMultiplier: 0.95, checkBonus: 1 }
  },
  {
    id: 'spell-fire-seal',
    pathId: 'spell',
    name: '离火法印',
    bookName: '法术书',
    description: '战斗攻势提高，突破时额外稳住灵机。',
    minRealmLevel: 4,
    bonuses: { offenseMultiplier: 1.03, breakthroughBonus: 0.03 }
  },
  {
    id: 'spell-clear-mind',
    pathId: 'spell',
    name: '清心咒',
    bookName: '法术书',
    description: '心境、宗门和突破检定更稳，适合准备冲关。',
    minRealmLevel: 3,
    bonuses: { checkBonus: 2, breakthroughBonus: 0.02 }
  },
  {
    id: 'demonic-shadow-grip',
    pathId: 'demonic',
    name: '摄影夺机',
    bookName: '禁术录',
    description: '先攻与战斗收益提高，险境中更容易反客为主。',
    minRealmLevel: 2,
    bonuses: { initiativeBonus: 1, offenseMultiplier: 1.04 }
  },
  {
    id: 'demonic-blood-oath',
    pathId: 'demonic',
    name: '血契反噬',
    bookName: '禁术录',
    description: '战斗攻势提高，但更依赖压住大失败风险。',
    minRealmLevel: 4,
    bonuses: { offenseMultiplier: 1.06, checkBonus: 1 }
  },
  {
    id: 'demonic-hidden-vein',
    pathId: 'demonic',
    name: '潜血匿息',
    bookName: '禁术录',
    description: '压低敌方攻势，资源与遭遇检定更适合邪修险路。',
    minRealmLevel: 3,
    bonuses: { enemyOffenseMultiplier: 0.96, checkBonus: 1, injuryMultiplier: 0.96 }
  }
];

export const innatePassiveFeatures: PassiveFeature[] = [
  {
    id: 'd20-core',
    name: '道途检定',
    source: '规则',
    description: '事件、战斗与突破会参考 d20 检定、优势劣势和五维调整值。'
  }
];

export function getFeat(id: string): FeatDefinition | undefined {
  return feats.find(feat => feat.id === id);
}

export function getSpell(id: string): SpellDefinition | undefined {
  return spellbook.find(spell => spell.id === id);
}
