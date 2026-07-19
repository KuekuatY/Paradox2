import { describe, expect, it } from 'vitest';
import { combatZones } from '@/data/combatZones';
import { simulateCombatForecast } from '@/data/combatBalance';
import { normalizeLoadedGameState } from '@/stores/gameStore';
import { realms } from '@/data/realms';

describe('combat balance forecast', () => {
  it('simulates every stage deterministically and keeps bosses harder than normal enemies', () => {
    combatZones.forEach(zone => {
      const realm = realms.find(entry => entry.level === zone.minRealmLevel) ?? realms[1];
      const attributeValue = 40 + zone.minRealmLevel * 70;
      const gameState = normalizeLoadedGameState({
        currentRealm: realm,
        age: 20,
        attributes: { 根骨: attributeValue, 神识: attributeValue, 悟性: attributeValue, 气运: attributeValue, 颜值: 10 },
        events: [],
        combatSkills: [
          { skillId: 'attack', level: Math.min(20, 1 + zone.minRealmLevel), exp: 0 },
          { skillId: 'defense', level: Math.min(20, 1 + zone.minRealmLevel), exp: 0 },
          { skillId: 'technique', level: Math.min(20, 1 + zone.minRealmLevel), exp: 0 }
        ]
      });
      const normal = simulateCombatForecast(gameState, zone, false, 300);
      const boss = simulateCombatForecast(gameState, zone, true, 300);

      expect(normal).toEqual(simulateCombatForecast(gameState, zone, false, 300));
      expect(normal.winRate).toBeGreaterThanOrEqual(boss.winRate);
      expect(normal.winRate).toBeGreaterThan(5);
      expect(boss.winRate).toBeLessThan(96);
      expect(normal.averageRounds).toBeGreaterThanOrEqual(2);
      expect(normal.averageRounds).toBeLessThanOrEqual(12);
    });
  });
});
