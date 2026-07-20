import { describe, expect, it } from 'vitest';
import { buildArchetypes, getPathBuilds, getRecommendedBuild, getSelectedBuildBonuses } from '@/data/buildArchetypes';
import { simulateBalanceReport } from '@/data/balanceSimulator';
import {
  getEquipmentEnhancementSpiritStoneCost,
  getSpiritStoneEconomyReport,
  getSpiritStoneProjection,
  getTechniqueSpiritStoneCost,
  simulateSpiritStoneEconomy
} from '@/data/spiritStoneEconomy';
import { dungeonRelics, getActiveDungeonRelicSets, getDungeonRelicBonuses } from '@/data/dungeonRelics';
import { dungeonDefinitions, dungeonRooms } from '@/data/dungeons';
import { getIdleProjection } from '@/data/idleProjection';
import { getItemKnowledge } from '@/data/itemKnowledge';
import { realms } from '@/data/realms';
import { normalizeLoadedGameState } from '@/stores/gameStore';

describe('twelve cultivation builds', () => {
  it('provides three selectable builds for every path', () => {
    expect(buildArchetypes).toHaveLength(12);
    expect(['sword', 'body', 'spell', 'demonic'].map(pathId => getPathBuilds(pathId as 'sword').length)).toEqual([3, 3, 3, 3]);
  });

  it('scores current synergies and applies the selected build bonuses', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[4], events: [], cultivationPath: 'sword', selectedBuildId: 'sword-flow',
      feats: ['sword-heart'], equippedSpellIds: ['sword-flash-step'], combatSpellProgress: [{ spellId: 'sword-flash-step', level: 1 }]
    });
    expect(getRecommendedBuild(state)?.score).toBeGreaterThan(15);
    expect(getSelectedBuildBonuses(state).attack).toBeGreaterThan(0);
  });
});

describe('dungeon relic pools and sets', () => {
  it('gives every dungeon a room pool and a distinct boss twist', () => {
    expect(dungeonRooms).toHaveLength(4);
    expect(new Set(dungeonDefinitions.map(dungeon => dungeon.bossTwist)).size).toBe(dungeonDefinitions.length);
    expect(new Set(dungeonDefinitions.map(dungeon => JSON.stringify(dungeon.bossModifiers))).size).toBe(dungeonDefinitions.length);
  });

  it('contains global and stage-exclusive relics', () => {
    expect(dungeonRelics.length).toBeGreaterThan(12);
    expect(dungeonRelics.some(relic => relic.zoneIds?.includes('thunder-marsh'))).toBe(true);
  });

  it('activates a two-piece set and aggregates its extra bonuses', () => {
    const ids = ['relic-blood-jade', 'relic-edge-echo'];
    expect(getActiveDungeonRelicSets(ids)[0]?.name).toBe('血锋共鸣');
    expect(getDungeonRelicBonuses(ids).attack).toBeCloseTo(0.19);
    expect(getDungeonRelicBonuses(ids).maxHp).toBeCloseTo(0.28);
  });
});

describe('idle projection and developer simulation', () => {
  it('projects production output, target time and prerequisite bottlenecks', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[2], events: [], selectedYearAction: 'life-skill',
      lifeSkillActivity: { skillId: 'alchemy', recipeId: 'alchemy-basic-pill' },
      idleAutomation: { enabled: true, targetItemId: 'qi-gathering-pill', targetQuantity: 2, fallbackSkillId: 'spirit-field', priority: 'target-first', autoSellRules: [] }
    });
    const projection = getIdleProjection(state);
    expect(projection.outputsPerHour[0]?.itemId).toBe('qi-gathering-pill');
    expect(projection.targetEtaMinutes).toBeGreaterThan(0);
    expect(projection.bottleneck).toContain('培育灵草');
  });

  it('runs deterministically and reports all four paths', () => {
    const first = simulateBalanceReport(200, 42);
    const second = simulateBalanceReport(200, 42);
    expect(first).toEqual(second);
    expect(first.paths).toHaveLength(4);
  });

  it('derives item sources and uses from live game data', () => {
    const knowledge = getItemKnowledge('qi-gathering-pill');
    expect(knowledge.sources.some(source => source.includes('炼丹'))).toBe(true);
    expect(knowledge.uses.some(use => use.includes('直接使用'))).toBe(true);
  });
});

describe('spirit stone economy', () => {
  it('keeps technique and equipment costs progressive by grade', () => {
    expect(getTechniqueSpiritStoneCost('黄', 5)).toBe(0);
    expect(getTechniqueSpiritStoneCost('天', 4)).toBeGreaterThan(getTechniqueSpiritStoneCost('玄', 1));
    expect(getEquipmentEnhancementSpiritStoneCost('上品', 5)).toBe(10);
    expect(getEquipmentEnhancementSpiritStoneCost('极品', 5)).toBeGreaterThan(10);
  });

  it('projects current liquidity and produces a deterministic stage report', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[5],
      age: 220,
      spiritStones: 18,
      sect: { sectId: 'alchemy-valley', rank: '外门弟子', contribution: 0, reputation: 0 },
      events: []
    });
    const projection = getSpiritStoneProjection(state);
    expect(projection.expectedIncome).toBeGreaterThan(0);
    expect(projection.maintenanceCost).toBeGreaterThan(0);
    expect(getSpiritStoneEconomyReport().stages).toHaveLength(9);
    const first = simulateSpiritStoneEconomy(200, 42);
    const second = simulateSpiritStoneEconomy(200, 42);
    expect(first).toEqual(second);
    expect(first.stages).toHaveLength(9);
  });
});
