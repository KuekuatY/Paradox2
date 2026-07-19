import type { GameState } from '@/types';

export interface UnlockGuideDefinition {
  id: string;
  title: string;
  description: string;
  tabLabel: string;
  isUnlocked: (gameState: GameState) => boolean;
}

export const unlockGuides: UnlockGuideDefinition[] = [
  { id: 'guide-path', title: '流派已开启', description: '十岁引气入体后，可从三套构筑中选择方向；推荐会随装备与法术变化。', tabLabel: '前往状态', isUnlocked: state => !!state.cultivationPath },
  { id: 'guide-sect', title: '宗门已开启', description: '十五岁可择宗门，宗门任务、贡献与兑换会影响后续资源。', tabLabel: '查看状态', isUnlocked: state => !!state.sect },
  { id: 'guide-idle', title: '放置修行已开启', description: '选择本年安排后可开始修行，界面会预估每小时产出与停止原因。', tabLabel: '查看修行', isUnlocked: state => state.age >= 10 },
  { id: 'guide-life-skills', title: '百艺已开启', description: '六艺可以组成生产链，自动化会按库存目标补齐前置材料。', tabLabel: '前往百艺', isUnlocked: state => state.currentRealm.level >= 1 },
  { id: 'guide-combat', title: '战斗区域已开启', description: '区域首领、装备套装和战斗预设均在战斗页管理。', tabLabel: '前往战斗', isUnlocked: state => state.currentRealm.level >= 1 },
  { id: 'guide-dungeon', title: '秘境已开启', description: '秘境包含岔路房间、区域遗物与套装，生命和真气会跨层保留。', tabLabel: '前往战斗', isUnlocked: state => state.combatZoneProgress.some(progress => progress.bossDefeated) },
  { id: 'guide-market', title: '坊市已开启', description: '坊市可补足生产瓶颈，法器拍卖也能快速完善构筑。', tabLabel: '前往坊市', isUnlocked: state => state.currentRealm.level >= 2 },
  { id: 'guide-tribulation', title: '雷劫已开启', description: '化神之后突破还需渡劫，装备、功法与准备物资会决定容错。', tabLabel: '查看突破', isUnlocked: state => state.currentRealm.level >= 4 }
];

export function getPendingUnlockGuide(gameState: GameState): UnlockGuideDefinition | null {
  return unlockGuides.find(guide => guide.isUnlocked(gameState) && !gameState.seenUnlockIds.includes(guide.id)) ?? null;
}
