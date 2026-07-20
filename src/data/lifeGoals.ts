import type { LifeGoalDefinition } from '@/types';

export const lifeGoals: LifeGoalDefinition[] = [
  {
    id: 'temper-spirit',
    name: '凝练神识',
    description: '以观想与入定打磨灵台，让神识足以承载更高境界。',
    progressKind: 'effectGain',
    target: 22,
    targetLabel: '神识提升',
    effectKeys: ['神识'],
    minRealmLevel: 3,
    reward: { 神识: 6, 修为: 5 },
    completionText: '灵台清明许多，外界纷扰似乎隔了一层薄雾。'
  },
  {
    id: 'forge-foundation',
    name: '打磨根基',
    description: '以筋骨承载灵机，优先补足突破所需的根基。',
    progressKind: 'effectGain',
    target: 22,
    targetLabel: '根骨提升',
    effectKeys: ['根骨'],
    maxRealmLevel: 3,
    reward: { 根骨: 6, 修为: 5 },
    completionText: '肉身根基愈发稳固，日后冲关少了几分虚浮。'
  },
  {
    id: 'read-scriptures',
    name: '参悟道法',
    description: '把心思放在功法与经卷上，积累悟法根基。',
    progressKind: 'effectGain',
    target: 22,
    targetLabel: '悟性提升',
    effectKeys: ['悟性'],
    reward: { 悟性: 6, 修为: 5 },
    completionText: '经卷中的晦涩句子渐渐有了脉络。'
  },
  {
    id: 'gather-fortune',
    name: '积攒资源',
    description: '经营洞府、坊市与宗门关系，为后续突破储备资源。',
    progressKind: 'effectGain',
    target: 18,
    targetLabel: '灵石提升',
    effectKeys: ['灵石'],
    reward: { 灵石: 4, 气运: 2 },
    completionText: '手中资源宽裕许多，许多难事也有了转圜余地。'
  },
  {
    id: 'seek-fortune',
    name: '寻觅机缘',
    description: '多见山河与人情，从偶然里积累气运。',
    progressKind: 'effectGain',
    target: 20,
    targetLabel: '气运提升',
    effectKeys: ['气运'],
    reward: { 气运: 7, 修为: 4 },
    completionText: '几段善缘在暗处汇拢，像是替你铺出一条窄路。'
  },
  {
    id: 'build-reputation',
    name: '经营名望',
    description: '在宗门与同道之间留下好名声，提升外界助力。',
    progressKind: 'effectGain',
    target: 18,
    targetLabel: '颜值提升',
    effectKeys: ['颜值'],
    reward: { 颜值: 7, 灵石: 2 },
    completionText: '你的名声慢慢传开，来往时少了许多冷眼。'
  },
  {
    id: 'weather-hardship',
    name: '历劫砺身',
    description: '灾劫并非全是坏事，能撑过去便是磨砺。',
    progressKind: 'eventCount',
    target: 2,
    targetLabel: '经历灾劫',
    eventTypes: ['disaster'],
    minRealmLevel: 2,
    reward: { 根骨: 7, 气运: 4, 寿命: 1 },
    completionText: '苦厄退去后，肉身与心气都更沉得住。'
  },
  {
    id: 'sect-standing',
    name: '立足宗门',
    description: '承接宗门事务，换取更稳定的资源与人脉。',
    progressKind: 'eventCount',
    target: 3,
    targetLabel: '宗门事务',
    eventTypes: ['sect'],
    minRealmLevel: 2,
    reward: { 灵石: 4, 颜值: 4 },
    completionText: '宗门中终于有了你的一席位置。'
  },
  {
    id: 'prepare-breakthrough',
    name: '冲关筹备',
    description: '围绕下一次突破调整修行，不让瓶颈卡住太久。',
    progressKind: 'effectGain',
    target: 36,
    targetLabel: '修为积累',
    effectKeys: ['修为'],
    minRealmLevel: 3,
    reward: { 根骨: 5, 神识: 4, 悟性: 5, 气运: 4 },
    completionText: '瓶颈前的准备更扎实了，心中也少了几分慌乱。'
  },
  {
    id: 'cross-realm',
    name: '破境立身',
    description: '以一次真正的突破证明此世道途。',
    progressKind: 'breakthrough',
    target: 1,
    targetLabel: '完成突破',
    minRealmLevel: 2,
    reward: { 气运: 8, 修为: 6 },
    completionText: '破境后的余韵尚在，新的道途也随之展开。'
  },
  {
    id: 'sword-intent-chain',
    name: '剑意成势',
    description: '以战斗、修炼与功法打磨剑意，让出手逐渐有自己的锋芒。',
    progressKind: 'pathResource',
    target: 80,
    targetLabel: '剑意积累',
    pathIds: ['sword'],
    priority: 2,
    minRealmLevel: 2,
    reward: { 根骨: 8, 神识: 4, 修为: 6 },
    completionText: '剑意终于不再散乱，收放之间自有锋芒。'
  },
  {
    id: 'body-vital-chain',
    name: '气血成炉',
    description: '以百艺、修炼与正面交锋淬炼气血，把肉身炼成最可靠的根基。',
    progressKind: 'pathResource',
    target: 80,
    targetLabel: '气血积累',
    pathIds: ['body'],
    priority: 2,
    minRealmLevel: 2,
    reward: { 根骨: 9, 气运: 3, 寿命: 1 },
    completionText: '气血在体内周流如炉，连伤势都被压得更稳。'
  },
  {
    id: 'spell-pattern-chain',
    name: '术式成篇',
    description: '用功法、心境与宗门经卷串联术式，让法修构筑逐渐完整。',
    progressKind: 'pathResource',
    target: 80,
    targetLabel: '术式积累',
    pathIds: ['spell'],
    priority: 2,
    minRealmLevel: 2,
    reward: { 神识: 8, 悟性: 6, 修为: 5 },
    completionText: '诸般术式终于连成章法，临敌时少了许多迟滞。'
  },
  {
    id: 'demonic-will-chain',
    name: '魔念驭心',
    description: '把险境、机缘与战斗中的魔念收束起来，不让力量反过来吞没自身。',
    progressKind: 'pathResource',
    target: 80,
    targetLabel: '魔念积累',
    pathIds: ['demonic'],
    priority: 2,
    minRealmLevel: 2,
    reward: { 神识: 5, 气运: 7, 修为: 6 },
    completionText: '魔念被你压入心湖深处，凶险之力也开始听从调遣。'
  }
];

export function getLifeGoalDefinition(id: string): LifeGoalDefinition | undefined {
  return lifeGoals.find(goal => goal.id === id);
}
