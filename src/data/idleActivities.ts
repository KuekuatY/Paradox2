import { getCombatZone } from '@/data/combatZones';
import { getLifeSkill } from '@/data/lifeSkills';
import { getReincarnationIdleSpeedMultiplier } from '@/data/reincarnation';
import type { GameState, YearActionId } from '@/types';

const actionDurations: Record<YearActionId, number> = {
  cultivate: 60_000,
  adventure: 90_000,
  seclusion: 120_000,
  'life-skill': 75_000,
  combat: 60_000
};

type IdleActivityContext = Pick<GameState, 'selectedYearAction' | 'lifeSkillActivity' | 'combatActivity' | 'dungeonRun' | 'reincarnation'>;

export function getIdleCycleDurationMs(gameState: IdleActivityContext): number {
  let duration: number;
  if (gameState.selectedYearAction === 'life-skill') {
    const skill = getLifeSkill(gameState.lifeSkillActivity.skillId);
    duration = actionDurations['life-skill'] + Math.max(0, (skill?.timeCost ?? 1) - 1) * 15_000;
  } else if (gameState.selectedYearAction === 'combat') {
    duration = gameState.dungeonRun || gameState.combatActivity.target === 'boss' ? 90_000 : actionDurations.combat;
  } else {
    duration = actionDurations[gameState.selectedYearAction];
  }
  return Math.max(20_000, Math.round(duration * getReincarnationIdleSpeedMultiplier(gameState.reincarnation)));
}

export function getIdleCyclesPerHour(gameState: IdleActivityContext): number {
  return Math.max(1, Math.floor(3_600_000 / getIdleCycleDurationMs(gameState)));
}

export function getIdleActivityLabel(gameState: IdleActivityContext): string {
  if (gameState.selectedYearAction === 'life-skill') {
    return getLifeSkill(gameState.lifeSkillActivity.skillId)?.name ?? '百艺';
  }
  if (gameState.selectedYearAction === 'combat') {
    const zone = getCombatZone(gameState.dungeonRun?.zoneId ?? gameState.combatActivity.zoneId);
    return gameState.dungeonRun
      ? `${zone?.name ?? '未知区域'}副本`
      : `${zone?.name ?? '未知区域'}${gameState.combatActivity.target === 'boss' ? '首领战' : '历练'}`;
  }
  return {
    cultivate: '打坐修炼',
    adventure: '外出历练',
    seclusion: '闭关参悟',
    'life-skill': '百艺',
    combat: '战斗'
  }[gameState.selectedYearAction];
}
