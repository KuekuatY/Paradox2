import { getCombatZoneMasteryLevel, getCombatZoneProgress, getEquipmentRating, type CombatZoneDefinition } from '@/data/combatZones';
import type { GameState } from '@/types';

export interface CombatForecast {
  winRate: number;
  averageRounds: number;
  averageHealthPercent: number;
  samples: number;
}

export function simulateCombatForecast(
  gameState: GameState,
  zone: CombatZoneDefinition,
  boss: boolean,
  samples = 400
): CombatForecast {
  const equipmentRating = Object.values(gameState.equipment).reduce((total, itemId) => {
    if (!itemId) return total;
    const level = gameState.equipmentEnhancements.find(entry => entry.itemId === itemId)?.level ?? 0;
    const affixId = gameState.equipmentAffixes.find(entry => entry.itemId === itemId)?.affixId;
    const quality = gameState.equipmentQualities.find(entry => entry.itemId === itemId)?.quality ?? 100;
    return total + getEquipmentRating(itemId, level, affixId, quality);
  }, 0);
  const mastery = getCombatZoneMasteryLevel(getCombatZoneProgress(gameState.combatZoneProgress, zone.id));
  const skillLevels = gameState.combatSkills.reduce((total, skill) => total + skill.level, 0);
  const attributeTotal = gameState.attributes.根骨 * 1.25
    + gameState.attributes.神识
    + gameState.attributes.悟性 * 0.7
    + gameState.attributes.气运 * 0.65;
  const playerPower = 150
    + gameState.currentRealm.level * 78
    + Math.sqrt(Math.max(1, attributeTotal)) * 26
    + equipmentRating * 1.6
    + skillLevels * 9
    + mastery * 18;
  const zonePressure = 260 + zone.minRealmLevel * 120;
  const enemyPower = zonePressure * (boss ? zone.bossDifficulty * 1.3 : 0.94);
  const seed = hashSeed(`${zone.id}-${gameState.currentRealm.level}-${Math.round(attributeTotal)}-${equipmentRating}-${skillLevels}-${boss}`);
  const random = createSeededRandom(seed);
  let victories = 0;
  let totalRounds = 0;
  let totalHealthPercent = 0;

  for (let index = 0; index < samples; index += 1) {
    const playerRoll = playerPower * (0.82 + random() * 0.36);
    const enemyRoll = enemyPower * (0.82 + random() * 0.36);
    const ratio = playerRoll / Math.max(1, enemyRoll);
    const won = ratio >= 1;
    if (won) victories += 1;
    totalRounds += Math.max(2, Math.min(12, Math.round(8.5 - (ratio - 1) * 4 + random() * 2)));
    totalHealthPercent += won
      ? Math.max(8, Math.min(96, Math.round(48 + (ratio - 1) * 42 + random() * 18)))
      : Math.max(0, Math.min(30, Math.round(18 + (ratio - 1) * 24 + random() * 10)));
  }

  return {
    winRate: Math.round(victories / samples * 100),
    averageRounds: Math.round(totalRounds / samples * 10) / 10,
    averageHealthPercent: Math.round(totalHealthPercent / samples),
    samples
  };
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let value = seed || 1;
  return () => {
    value = Math.imul(1664525, value) + 1013904223 >>> 0;
    return value / 4294967296;
  };
}
