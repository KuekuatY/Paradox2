import { scoreBuild, getBuildArchetype } from '@/data/buildArchetypes';
import { getEquipmentRating } from '@/data/combatZones';
import { getEndgameRequirements } from '@/data/endgame';
import { realms } from '@/data/realms';
import type { GameState } from '@/types';

export interface JourneyInsights {
  buildScore: number;
  buildGrade: string;
  equipmentRating: number;
  battleWinRate: number;
  spiritStoneIncome: number;
  spiritStoneExpense: number;
  spiritStoneNet: number;
  progressPercent: number;
  bottlenecks: string[];
  deathRisks: string[];
  recommendations: string[];
}

export function getJourneyInsights(gameState: GameState): JourneyInsights {
  const equipmentRating = Object.values(gameState.equipment).reduce((total, itemId) => {
    if (!itemId) return total;
    const level = gameState.equipmentEnhancements.find(entry => entry.itemId === itemId)?.level ?? 0;
    const affixIds = gameState.equipmentAffixes.find(entry => entry.itemId === itemId)?.affixIds ?? [];
    const quality = gameState.equipmentQualities.find(entry => entry.itemId === itemId)?.quality ?? 100;
    return total + getEquipmentRating(itemId, level, affixIds, quality);
  }, 0);
  const selectedBuild = getBuildArchetype(gameState.selectedBuildId);
  const archetypeScore = selectedBuild ? scoreBuild(gameState, selectedBuild).score : 0;
  const spellScore = Math.min(80, gameState.equippedSpellIds.length * 18 + gameState.combatSpellProgress.reduce((sum, spell) => sum + spell.level * 2, 0));
  const techniqueScore = Math.min(120, gameState.techniques.reduce((sum, technique) => sum + technique.level * 5, 0));
  const skillScore = Math.min(90, gameState.combatSkills.reduce((sum, skill) => sum + skill.level * 3, 0));
  const buildScore = Math.min(1_000, Math.round(
    archetypeScore * 3.2
    + equipmentRating * 1.5
    + spellScore
    + techniqueScore
    + skillScore
  ));
  const buildGrade = buildScore >= 850 ? '天成道体'
    : buildScore >= 680 ? '宗师构筑'
      : buildScore >= 500 ? '体系成形'
        : buildScore >= 320 ? '初具章法' : '根基松散';
  const victories = gameState.combatStats.victories;
  const battles = victories + gameState.combatStats.defeats;
  const battleWinRate = battles > 0 ? Math.round(victories / battles * 100) : 0;
  const spiritStoneIncome = gameState.spiritStoneLedger.reduce((sum, transaction) => sum + Math.max(0, transaction.amount), 0);
  const spiritStoneExpense = gameState.spiritStoneLedger.reduce((sum, transaction) => sum + Math.max(0, -transaction.amount), 0);
  const nextRealm = realms[gameState.currentRealm.level + 1];
  const requiredProgress = nextRealm?.cultivationRequired ?? gameState.currentRealm.cultivationRequired;
  const progressPercent = requiredProgress > 0 ? Math.min(100, Math.round(gameState.cultivationProgress / requiredProgress * 100)) : 100;
  const bottlenecks: string[] = [];
  const recommendations: string[] = [];
  const deathRisks: string[] = [];

  if (nextRealm) {
    const deficits = Object.entries(nextRealm.requirements.attributes).flatMap(([attribute, target]) => {
      const current = gameState.attributes[attribute as keyof GameState['attributes']];
      return current < (target ?? 0) ? [`${attribute}还差 ${(target ?? 0) - current}`] : [];
    });
    if (progressPercent >= 100 && deficits.length > 0) bottlenecks.push(`修为已满，但突破门槛不足：${deficits.join('、')}`);
    else if (progressPercent < 60) bottlenecks.push(`当前修为仅完成 ${progressPercent}%，仍需稳定积累。`);
  } else {
    const unfinished = getEndgameRequirements(gameState).filter(requirement => requirement.current < requirement.target);
    if (unfinished.length > 0) bottlenecks.push(`飞升尚缺：${unfinished.slice(0, 3).map(requirement => requirement.label).join('、')}`);
  }
  if (equipmentRating < gameState.currentRealm.level * 28) {
    bottlenecks.push('装备评级落后于当前境界。');
    recommendations.push('优先挑战当前区域秘境，获取区域珍藏并重铸多词条装备。');
  }
  if (archetypeScore < 55 && gameState.cultivationPath) {
    bottlenecks.push('当前专长、法术与装备没有围绕同一构筑协同。');
    recommendations.push('在战斗页查看构筑推荐，集中补齐同一套专长、法术、词条与遗物。');
  }
  if (battleWinRate > 0 && battleWinRate < 55) {
    bottlenecks.push(`战斗胜率仅 ${battleWinRate}%。`);
    recommendations.push('降低自动战斗区域，调整防守阈值，并携带恢复生命和真气的丹药。');
  }
  if (gameState.spiritStones < Math.max(20, gameState.currentRealm.level * 12)) {
    bottlenecks.push('灵石储备不足以支撑连续强化、远行和飞升准备。');
    recommendations.push('利用地区需求价差、洞府订单与宗门任务补充灵石。');
  }
  const remainingLife = gameState.lifespan - gameState.age;
  if (remainingLife <= Math.max(10, gameState.lifespan * 0.12)) deathRisks.push(`寿元仅余 ${remainingLife} 年，长耗时行动风险很高。`);
  if (gameState.combatStats.injury >= 70) deathRisks.push(`伤势达到 ${gameState.combatStats.injury}，战斗失败和远行中止风险显著。`);
  if (gameState.autoExpedition.running && gameState.inventory.find(entry => entry.itemId === 'travel-supply')?.quantity === 0) deathRisks.push('自动远行缺少行脚灵粮，队伍会在下一程停止。');
  if (deathRisks.length === 0) deathRisks.push('当前没有迫近的寿元或重伤风险。');
  if (recommendations.length === 0) recommendations.push('当前构筑与资源循环稳定，可以推进区域首领、宗门任务链或飞升目标。');
  if (bottlenecks.length === 0) bottlenecks.push('当前没有明显瓶颈。');

  return {
    buildScore,
    buildGrade,
    equipmentRating,
    battleWinRate,
    spiritStoneIncome,
    spiritStoneExpense,
    spiritStoneNet: spiritStoneIncome - spiritStoneExpense,
    progressPercent,
    bottlenecks,
    deathRisks,
    recommendations
  };
}
