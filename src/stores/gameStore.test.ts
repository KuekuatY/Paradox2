import { afterEach, describe, expect, it, vi } from 'vitest';
import { realms } from '@/data/realms';
import { spiritRoots } from '@/data/spiritRoots';
import { talents } from '@/data/talents';
import { getCombatZoneMasteryLevel } from '@/data/combatZones';
import { spellbook } from '@/data/dndFeatures';
import { calculateOfflineCultivationRounds, calculateSectMissionReward, normalizeLoadedGameState, useGameStore } from '@/stores/gameStore';
import { createSaveSlot } from '@/utils/storage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useGameStore.getState().resetGame();
});

describe('sect mission settlement', () => {
  it('uses the resolved event result for contribution and reputation', () => {
    expect(calculateSectMissionReward(18, 8, 'great-success')).toEqual({
      contributionGain: 27,
      reputationGain: 12
    });
    expect(calculateSectMissionReward(18, 8, 'neutral')).toEqual({
      contributionGain: 18,
      reputationGain: 8
    });
    expect(calculateSectMissionReward(18, 8, 'great-failure')).toEqual({
      contributionGain: 7,
      reputationGain: 3
    });
  });

  it('allows only one resolved sect mission at the same age', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'sword-pavilion', contribution: 0, reputation: 0 }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().runSectMission('sect-gather-herbs');
    const afterFirstMission = useGameStore.getState().gameState;
    useGameStore.getState().runSectMission('sect-artifact-commission');
    const afterSecondAttempt = useGameStore.getState().gameState;

    expect(afterFirstMission.lastSectMissionAge).toBe(20);
    expect(afterFirstMission.sect?.contribution).toBeGreaterThan(0);
    expect(afterSecondAttempt.events).toHaveLength(afterFirstMission.events.length);
    expect(afterSecondAttempt.sect?.contribution).toBe(afterFirstMission.sect?.contribution);
  });

  it('does not grant combat mission rewards before combat is resolved', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[5],
      age: 20,
      events: [],
      sect: { sectId: 'demonic-sect', contribution: 0, reputation: 0 },
      combatActivity: { zoneId: 'thunder-marsh' }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().runSectMission('sect-demonic-raid');
    const duringCombat = useGameStore.getState().gameState;

    expect(duringCombat.pendingCombat?.event.sectMissionId).toBe('sect-demonic-raid');
    expect(duringCombat.sect?.contribution).toBe(0);
    expect(duringCombat.inventory.some(entry => entry.itemId === 'blood-jade')).toBe(false);
    expect(duringCombat.events).toHaveLength(0);

    const pendingCombat = duringCombat.pendingCombat;
    if (!pendingCombat) throw new Error('Expected a pending combat mission');
    useGameStore.setState({
      gameState: {
        ...duringCombat,
        pendingCombat: {
          ...pendingCombat,
          player: { ...pendingCombat.player, attack: 999, speed: 999 },
          enemy: { ...pendingCombat.enemy, hp: 1, dodge: 0 }
        }
      }
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().resolveCombatAction('attack');
    const afterCombat = useGameStore.getState().gameState;

    expect(afterCombat.pendingCombat).toBeNull();
    expect(afterCombat.sect?.contribution).toBeGreaterThan(0);
    expect(afterCombat.inventory.some(entry => entry.itemId === 'blood-jade')).toBe(true);
  });
});

describe('continuous cultivation', () => {
  it('resolves ordinary cultivation rounds in one action', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'cultivate',
      cultivationPlan: { rounds: 3, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(23);
    expect(result.events).toHaveLength(3);
    expect(result.lastCultivationSession).toMatchObject({
      startedAge: 20,
      endedAge: 23,
      requestedRounds: 3,
      completedRounds: 3,
      eventCount: 3,
      stopReason: 'completed'
    });
  });

  it('stops as soon as cultivation progress reaches the breakthrough point', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      cultivationProgress: 95,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'cultivate',
      cultivationPlan: { rounds: 10, stopAtBreakthrough: true }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(21);
    expect(result.cultivationProgress).toBe(100);
    expect(result.lastCultivationSession?.completedRounds).toBe(1);
    expect(result.lastCultivationSession?.stopReason).toBe('breakthrough');
  });

  it('stops at the childhood path choice', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[0],
      age: 9,
      events: [],
      cultivationPlan: { rounds: 10, stopAtBreakthrough: true }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(10);
    expect(result.pendingPathChoice).toBe(true);
    expect(result.lastCultivationSession?.stopReason).toBe('path-choice');
  });

  it('stops when an adventure starts combat', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'adventure',
      cultivationPlan: { rounds: 10, stopAtBreakthrough: false },
      rival: { name: '测试宿敌', enmity: 20, defeats: 0, active: true }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(21);
    expect(result.pendingCombat).not.toBeNull();
    expect(result.lastCultivationSession?.completedRounds).toBe(1);
    expect(result.lastCultivationSession?.stopReason).toBe('combat');
  });
});

describe('offline cultivation', () => {
  it('accrues one round per 30 minutes up to the 16-round cap', () => {
    const now = new Date('2026-07-19T00:00:00.000Z').getTime();

    expect(calculateOfflineCultivationRounds('2026-07-18T23:31:00.000Z', now)).toBe(0);
    expect(calculateOfflineCultivationRounds('2026-07-18T23:30:00.000Z', now)).toBe(1);
    expect(calculateOfflineCultivationRounds('2026-07-18T16:00:00.000Z', now)).toBe(16);
    expect(calculateOfflineCultivationRounds('invalid', now)).toBe(0);
  });

  it('loads offline rounds from the save timestamp and preserves existing rounds', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      offlineCultivation: { remainingRounds: 2 }
    });
    const saveSlot = createSaveSlot(state);
    delete (saveSlot.gameState as unknown as { idleActivity?: unknown }).idleActivity;
    saveSlot.savedAt = new Date(Date.now() - 61 * 60_000).toISOString();
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify(saveSlot),
      setItem: () => undefined,
      removeItem: () => undefined
    });

    expect(useGameStore.getState().loadSavedGame()).toBe(true);
    expect(useGameStore.getState().gameState.offlineCultivation?.remainingRounds).toBe(4);
  });

  it('settles all available offline rounds when no key event interrupts', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'cultivate',
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false },
      offlineCultivation: { remainingRounds: 3 }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().claimOfflineCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(23);
    expect(result.offlineCultivation).toBeNull();
    expect(result.lastCultivationSession).toMatchObject({
      source: 'offline',
      requestedRounds: 3,
      completedRounds: 3,
      stopReason: 'completed'
    });
  });

  it('keeps unspent offline rounds when combat interrupts settlement', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'adventure',
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false },
      offlineCultivation: { remainingRounds: 4 },
      rival: { name: '测试宿敌', enmity: 20, defeats: 0, active: true }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    useGameStore.getState().claimOfflineCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.pendingCombat).not.toBeNull();
    expect(result.offlineCultivation?.remainingRounds).toBe(3);
    expect(result.lastCultivationSession).toMatchObject({
      source: 'offline',
      requestedRounds: 4,
      completedRounds: 1,
      stopReason: 'combat'
    });
  });
});

describe('life skill activity chains', () => {
  it('switches the main activity when a life skill recipe is selected', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: []
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().selectLifeSkillActivity('alchemy', 'alchemy-basic-pill');
    const result = useGameStore.getState().gameState;

    expect(result.selectedYearAction).toBe('life-skill');
    expect(result.lifeSkillActivity).toEqual({
      skillId: 'alchemy',
      recipeId: 'alchemy-basic-pill'
    });
  });

  it('grants the basic mastery yield bonus at level 5', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'life-skill',
      lifeSkillActivity: { skillId: 'spirit-field', recipeId: null },
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false },
      lifeSkills: [{ skillId: 'spirit-field', level: 5, exp: 400 }]
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    useGameStore.getState().advanceCultivation();
    const seed = useGameStore.getState().gameState.inventory.find(item => item.itemId === 'spirit-seed');

    expect(seed?.quantity).toBe(3);
  });

  it('consumes recipe materials, applies mastery output, and stops when materials run out', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      inventory: [{ itemId: 'spirit-seed', quantity: 1 }],
      selectedYearAction: 'life-skill',
      lifeSkillActivity: { skillId: 'spirit-field', recipeId: 'field-spirit-herb' },
      cultivationPlan: { rounds: 3, stopAtBreakthrough: false },
      lifeSkills: [{ skillId: 'spirit-field', level: 8, exp: 700 }]
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(1);

    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(21);
    expect(result.inventory.find(item => item.itemId === 'spirit-seed')).toBeUndefined();
    expect(result.inventory.find(item => item.itemId === 'spirit-herb')?.quantity).toBe(5);
    expect(result.events[0].itemLosses).toEqual([{ itemId: 'spirit-seed', quantity: 1 }]);
    expect(result.lastCultivationSession).toMatchObject({
      completedRounds: 1,
      requestedRounds: 3,
      stopReason: 'resource-shortage'
    });
  });

  it('retains unspent offline rounds after a recipe runs out of materials', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      inventory: [{ itemId: 'spirit-seed', quantity: 1 }],
      selectedYearAction: 'life-skill',
      lifeSkillActivity: { skillId: 'spirit-field', recipeId: 'field-spirit-herb' },
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false },
      offlineCultivation: { remainingRounds: 4 }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(1);

    useGameStore.getState().claimOfflineCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.offlineCultivation?.remainingRounds).toBe(3);
    expect(result.lastCultivationSession?.stopReason).toBe('resource-shortage');
  });
});

describe('combat activities', () => {
  it('locks combat zones by realm and selects an available zone as the main activity', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: []
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().selectCombatZone('thunder-marsh');
    expect(useGameStore.getState().gameState.combatActivity.zoneId).toBe('greenmist-outskirts');

    useGameStore.getState().selectCombatZone('greenmist-outskirts');
    expect(useGameStore.getState().gameState).toMatchObject({
      selectedYearAction: 'combat',
      combatActivity: { zoneId: 'greenmist-outskirts' }
    });
  });

  it('automatically resolves a selected zone and uses its exclusive loot table', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      attributes: { 根骨: 500, 神识: 500, 悟性: 500, 气运: 500, 颜值: 10 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'combat',
      combatActivity: {
        zoneId: 'greenmist-outskirts',
        autoCombat: { enabled: true, strategy: 'aggressive', useTechnique: true }
      },
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;
    const event = result.events[result.events.length - 1];

    expect(result.pendingCombat).toBeNull();
    expect(result.combatStats.victories).toBe(1);
    expect(event).toMatchObject({
      combatZoneId: 'greenmist-outskirts',
      combatEncounterId: 'combat-beast-hunt'
    });
    expect(event.itemRewards?.[0]?.itemId).toBe('beast-core');
  });

  it('applies equipped combat bonuses without consuming or dropping the equipped item', () => {
    const createCombatState = (withEquipment: boolean) => normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      attributes: { 根骨: 100, 神识: 100, 悟性: 100, 气运: 100, 颜值: 10 },
      inventory: [{ itemId: 'spirit-blade', quantity: 1 }],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      equipment: withEquipment ? { weapon: 'spirit-blade' } : undefined,
      selectedYearAction: 'combat',
      combatActivity: {
        zoneId: 'greenmist-outskirts',
        autoCombat: { enabled: false, strategy: 'balanced', useTechnique: true }
      },
      events: []
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.setState({ gameState: createCombatState(false) });
    useGameStore.getState().advanceCultivation();
    const baseAttack = useGameStore.getState().gameState.pendingCombat?.player.attack ?? 0;

    useGameStore.setState({ gameState: createCombatState(true) });
    useGameStore.getState().advanceCultivation();
    const equippedState = useGameStore.getState().gameState;

    expect(equippedState.pendingCombat?.player.attack).toBeGreaterThan(baseAttack);
    expect(equippedState.equipment.weapon).toBe('spirit-blade');
    expect(equippedState.inventory).toContainEqual({ itemId: 'spirit-blade', quantity: 1 });
    expect(equippedState.pendingCombat?.itemSupportConsumed).not.toContainEqual({ itemId: 'spirit-blade', quantity: 1 });
  });

  it('does not consume equipped artifacts for breakthrough preparation', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[4],
      age: 120,
      spiritStones: 100,
      events: [],
      inventory: [{ itemId: 'soul-settling-orb', quantity: 1 }],
      equipment: { accessory: 'soul-settling-orb' }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().useBreakthroughPreparation('stabilize');
    const result = useGameStore.getState().gameState;

    expect(result.inventory).toContainEqual({ itemId: 'soul-settling-orb', quantity: 1 });
    expect(result.equipment.accessory).toBe('soul-settling-orb');
    expect(result.spiritStones).toBeLessThan(100);
  });

  it('stops an offline batch after an automatic defeat and preserves unused rounds', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[9],
      age: 3000,
      lifespan: 50000,
      attributes: { 根骨: 0, 神识: 0, 悟性: 0, 气运: 0, 颜值: 0 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'combat',
      combatActivity: {
        zoneId: 'tribulation-boundary',
        autoCombat: { enabled: true, strategy: 'aggressive', useTechnique: false }
      },
      offlineCultivation: { remainingRounds: 4 },
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().claimOfflineCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.combatStats.defeats).toBe(1);
    expect(result.offlineCultivation?.remainingRounds).toBe(3);
    expect(result.lastCultivationSession?.stopReason).toBe('combat-defeat');
  });

  it('unlocks and settles a zone boss with a first-clear reward', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[2],
      age: 30,
      attributes: { 根骨: 800, 神识: 800, 悟性: 800, 气运: 800, 颜值: 10 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'combat',
      combatActivity: {
        zoneId: 'greenmist-outskirts',
        autoCombat: { enabled: true, strategy: 'aggressive', useTechnique: true }
      },
      combatZoneProgress: [{
        zoneId: 'greenmist-outskirts',
        kills: 3,
        bossDefeated: false,
        bossWins: 0,
        bestRounds: null
      }],
      cultivationPlan: { rounds: 10, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().challengeCombatBoss('greenmist-outskirts');
    expect(useGameStore.getState().gameState.combatActivity.target).toBe('boss');
    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;
    const progress = result.combatZoneProgress.find(item => item.zoneId === 'greenmist-outskirts');

    expect(result.pendingCombat).toBeNull();
    expect(progress).toMatchObject({ bossDefeated: true, bossWins: 1 });
    expect(result.inventory).toContainEqual({ itemId: 'spirit-blade', quantity: 1 });
    expect(result.lastCultivationSession).toMatchObject({ completedRounds: 1, stopReason: 'boss-cleared' });
    expect(result.combatActivity.target).toBe('normal');

    useGameStore.setState({
      gameState: {
        ...result,
        worldMap: { ...result.worldMap, currentRegionId: 'blackstone' }
      }
    });
    useGameStore.getState().selectCombatZone('blackstone-mine');
    expect(useGameStore.getState().gameState.combatActivity.zoneId).toBe('blackstone-mine');
  });

  it('uses configured qi supplies and includes them in the battle report', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      attributes: { 根骨: 500, 神识: 500, 悟性: 500, 气运: 500, 颜值: 10 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      inventory: [{ itemId: 'qi-gathering-pill', quantity: 1 }],
      selectedYearAction: 'combat',
      combatActivity: {
        zoneId: 'greenmist-outskirts',
        autoCombat: {
          enabled: true,
          strategy: 'aggressive',
          useTechnique: true,
          qiItemId: 'qi-gathering-pill',
          qiAtPercent: 80
        }
      },
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;
    const event = result.events[result.events.length - 1];

    expect(result.inventory.find(item => item.itemId === 'qi-gathering-pill')).toBeUndefined();
    expect(event.combat?.supplyConsumed).toEqual([{ itemId: 'qi-gathering-pill', quantity: 1 }]);
    expect(result.lastCultivationSession?.combat).toMatchObject({
      battles: 1,
      victories: 1,
      defeats: 0,
      suppliesConsumed: [{ itemId: 'qi-gathering-pill', quantity: 1 }]
    });
  });

  it('stops offline combat when a loot target is reached', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      attributes: { 根骨: 500, 神识: 500, 悟性: 500, 气运: 500, 颜值: 10 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'combat',
      combatActivity: {
        zoneId: 'greenmist-outskirts',
        autoCombat: {
          enabled: true,
          strategy: 'aggressive',
          useTechnique: true,
          lootTargetItemId: 'beast-core',
          lootTargetQuantity: 1
        }
      },
      offlineCultivation: { remainingRounds: 4 },
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().claimOfflineCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.inventory).toContainEqual({ itemId: 'beast-core', quantity: 1 });
    expect(result.offlineCultivation?.remainingRounds).toBe(3);
    expect(result.lastCultivationSession?.stopReason).toBe('loot-target');
    expect(result.lastCultivationSession?.combat?.itemRewards).toContainEqual({ itemId: 'beast-core', quantity: 1 });
  });

  it('stops offline combat when a configured supply runs out', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      attributes: { 根骨: 500, 神识: 500, 悟性: 500, 气运: 500, 颜值: 10 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      inventory: [{ itemId: 'qi-gathering-pill', quantity: 1 }],
      selectedYearAction: 'combat',
      combatActivity: {
        zoneId: 'greenmist-outskirts',
        autoCombat: {
          enabled: true,
          strategy: 'aggressive',
          useTechnique: true,
          qiItemId: 'qi-gathering-pill',
          qiAtPercent: 80,
          stopWhenSuppliesEmpty: true
        }
      },
      offlineCultivation: { remainingRounds: 4 },
      cultivationPlan: { rounds: 1, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().claimOfflineCultivation();
    const result = useGameStore.getState().gameState;

    expect(result.offlineCultivation?.remainingRounds).toBe(3);
    expect(result.lastCultivationSession?.stopReason).toBe('resource-shortage');
  });

  it('enhances equipped artifacts with crafting materials and time', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      lifespan: 100,
      events: [],
      inventory: [
        { itemId: 'spirit-blade', quantity: 1 },
        { itemId: 'spirit-ore', quantity: 2 }
      ],
      equipment: { weapon: 'spirit-blade' }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().enhanceCombatEquipment('spirit-blade');
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(21);
    expect(result.inventory.find(item => item.itemId === 'spirit-ore')).toBeUndefined();
    expect(result.equipmentEnhancements).toContainEqual({ itemId: 'spirit-blade', level: 1 });
    expect(result.lifeSkills.find(skill => skill.skillId === 'crafting')?.exp).toBe(12);
    expect(result.events[result.events.length - 1]).toMatchObject({
      title: '强化灵刃',
      itemLosses: [{ itemId: 'spirit-ore', quantity: 2 }]
    });
  });

  it('applies equipment enhancement and zone mastery to combat stats', () => {
    const createState = (enhancementLevel: number, kills: number, bossWins: number) => normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      attributes: { 根骨: 100, 神识: 100, 悟性: 100, 气运: 100, 颜值: 10 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      inventory: [{ itemId: 'spirit-blade', quantity: 1 }],
      equipment: { weapon: 'spirit-blade' },
      equipmentEnhancements: enhancementLevel > 0
        ? [{ itemId: 'spirit-blade', level: enhancementLevel }]
        : [],
      combatZoneProgress: [{
        zoneId: 'greenmist-outskirts',
        kills,
        bossDefeated: bossWins > 0,
        bossWins,
        bestRounds: null
      }],
      selectedYearAction: 'combat',
      combatActivity: {
        zoneId: 'greenmist-outskirts',
        autoCombat: { enabled: false, strategy: 'balanced', useTechnique: true }
      }
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.setState({ gameState: createState(0, 0, 0) });
    useGameStore.getState().advanceCultivation();
    const baseCombat = useGameStore.getState().gameState.pendingCombat;

    useGameStore.setState({ gameState: createState(5, 50, 2) });
    useGameStore.getState().advanceCultivation();
    const improvedCombat = useGameStore.getState().gameState.pendingCombat;

    expect(getCombatZoneMasteryLevel({
      zoneId: 'greenmist-outskirts',
      kills: 50,
      bossDefeated: true,
      bossWins: 2,
      bestRounds: null
    })).toBe(7);
    expect(improvedCombat?.player.attack).toBeGreaterThan(baseCombat?.player.attack ?? 0);
    expect(improvedCombat?.player.defense).toBeGreaterThan(baseCombat?.player.defense ?? 0);
    expect(improvedCombat?.player.speed).toBeGreaterThan(baseCombat?.player.speed ?? 0);
  });

  it('dismantles only spare equipment and preserves the equipped copy', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[2],
      age: 30,
      events: [],
      inventory: [{ itemId: 'spirit-blade', quantity: 2 }],
      equipment: { weapon: 'spirit-blade' }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().dismantleEquipment('spirit-blade');
    let result = useGameStore.getState().gameState;
    expect(result.inventory).toContainEqual({ itemId: 'spirit-blade', quantity: 1 });
    expect(result.inventory).toContainEqual({ itemId: 'artifact-essence', quantity: 2 });

    useGameStore.getState().dismantleEquipment('spirit-blade');
    result = useGameStore.getState().gameState;
    expect(result.inventory).toContainEqual({ itemId: 'spirit-blade', quantity: 1 });
    expect(result.inventory).toContainEqual({ itemId: 'artifact-essence', quantity: 2 });
  });

  it('reforges equipped items and applies the affix in combat', () => {
    const createState = (withAffix: boolean) => normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      attributes: { 根骨: 100, 神识: 100, 悟性: 100, 气运: 100, 颜值: 10 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      inventory: [
        { itemId: 'spirit-blade', quantity: 1 },
        { itemId: 'artifact-essence', quantity: 4 }
      ],
      equipment: { weapon: 'spirit-blade' },
      equipmentAffixes: withAffix ? [{ itemId: 'spirit-blade', affixId: 'keen' }] : [],
      selectedYearAction: 'combat',
      combatActivity: { zoneId: 'greenmist-outskirts', autoCombat: { enabled: false } }
    });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    useGameStore.setState({ gameState: createState(false) });
    useGameStore.getState().reforgeEquipment('spirit-blade');
    const reforged = useGameStore.getState().gameState;
    expect(reforged.equipmentAffixes).toContainEqual({ itemId: 'spirit-blade', affixId: 'keen' });
    expect(reforged.inventory).toContainEqual({ itemId: 'artifact-essence', quantity: 2 });

    useGameStore.setState({ gameState: createState(false) });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().advanceCultivation();
    const baseAttack = useGameStore.getState().gameState.pendingCombat?.player.attack ?? 0;

    useGameStore.setState({ gameState: createState(true) });
    useGameStore.getState().advanceCultivation();
    expect(useGameStore.getState().gameState.pendingCombat?.player.attack).toBeGreaterThan(baseAttack);
  });

  it('saves and restores combat presets', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[2],
      age: 30,
      events: [],
      inventory: [
        { itemId: 'spirit-blade', quantity: 1 },
        { itemId: 'minor-ward', quantity: 1 }
      ],
      equipment: { weapon: 'spirit-blade', armor: 'minor-ward' },
      combatActivity: {
        zoneId: 'greenmist-outskirts',
        autoCombat: { enabled: true, strategy: 'cautious', healAtHpPercent: 50 }
      }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().saveCombatPreset(0);
    const saved = useGameStore.getState().gameState;
    expect(saved.combatPresets[0]).toMatchObject({
      id: 'combat-preset-1',
      equipment: { weapon: 'spirit-blade', armor: 'minor-ward' },
      autoCombat: { enabled: true, strategy: 'cautious', healAtHpPercent: 50 }
    });

    useGameStore.setState({
      gameState: {
        ...saved,
        equipment: { weapon: null, armor: null, accessory: null },
        combatActivity: { ...saved.combatActivity, activePresetId: null, autoCombat: { ...saved.combatActivity.autoCombat, enabled: false } }
      }
    });
    useGameStore.getState().applyCombatPreset('combat-preset-1');
    const applied = useGameStore.getState().gameState;
    expect(applied.equipment).toMatchObject({ weapon: 'spirit-blade', armor: 'minor-ward' });
    expect(applied.combatActivity).toMatchObject({ activePresetId: 'combat-preset-1', autoCombat: { enabled: true } });

    useGameStore.setState({
      gameState: {
        ...applied,
        inventory: applied.inventory.filter(entry => entry.itemId !== 'minor-ward'),
        equipment: { weapon: null, armor: null, accessory: null }
      }
    });
    useGameStore.getState().applyCombatPreset('combat-preset-1');
    expect(useGameStore.getState().gameState.equipment).toMatchObject({
      weapon: 'spirit-blade',
      armor: null
    });
  });

  it('grows combat skills and enforces boss seal turns', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[3],
      age: 60,
      attributes: { 根骨: 200, 神识: 200, 悟性: 200, 气运: 200, 颜值: 10 },
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'combat',
      combatActivity: { zoneId: 'ghost-market', target: 'boss', autoCombat: { enabled: false } },
      combatZoneProgress: [
        { zoneId: 'greenmist-outskirts', kills: 3, bossDefeated: true, bossWins: 1, bestRounds: 3 },
        { zoneId: 'blackstone-mine', kills: 3, bossDefeated: true, bossWins: 1, bestRounds: 3 },
        { zoneId: 'ghost-market', kills: 4, bossDefeated: false, bossWins: 0, bestRounds: null }
      ]
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().advanceCultivation();
    const combat = useGameStore.getState().gameState.pendingCombat;
    expect(combat?.bossMechanicId).toBe('seal');
    if (!combat) throw new Error('Expected boss combat');

    useGameStore.setState({
      gameState: {
        ...useGameStore.getState().gameState,
        pendingCombat: { ...combat, turn: 3, player: { ...combat.player, qi: combat.player.maxQi } }
      }
    });
    useGameStore.getState().resolveCombatAction('technique');
    expect(useGameStore.getState().gameState.pendingCombat?.turn).toBe(3);

    useGameStore.getState().resolveCombatAction('attack');
    const afterAttack = useGameStore.getState().gameState;
    const combatRounds = afterAttack.pendingCombat?.rounds ?? [];
    expect(afterAttack.combatSkills.find(skill => skill.skillId === 'attack')?.exp).toBe(2);
    expect(combatRounds[combatRounds.length - 1]?.bossMechanicText).toContain('封灵');
  });

  it('casts equipped active skills with status effects, qi costs and cooldowns', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[4],
      age: 80,
      attributes: { 根骨: 90, 神识: 120, 悟性: 120, 气运: 90, 颜值: 10 },
      events: [],
      cultivationPath: 'spell',
      equippedSpellIds: ['spell-fire-seal'],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'combat',
      combatActivity: { zoneId: 'greenmist-outskirts', target: 'boss', autoCombat: { enabled: false } },
      combatZoneProgress: [
        { zoneId: 'greenmist-outskirts', kills: 3, bossDefeated: false, bossWins: 0, bestRounds: null }
      ]
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().advanceCultivation();
    const combat = useGameStore.getState().gameState.pendingCombat;
    if (!combat) throw new Error('Expected active combat');

    useGameStore.setState({
      gameState: {
        ...useGameStore.getState().gameState,
        pendingCombat: {
          ...combat,
          player: { ...combat.player, qi: combat.player.maxQi, speed: 999 },
          enemy: { ...combat.enemy, hp: 500, maxHp: 500, attack: 1, dodge: 1 }
        }
      }
    });
    useGameStore.getState().resolveCombatAction('technique', 'spell-fire-seal');
    let activeCombat = useGameStore.getState().gameState.pendingCombat;

    expect(activeCombat?.enemyStatuses).toContainEqual({ id: 'burn', stacks: 1, remainingTurns: 3 });
    expect(activeCombat?.spellCooldowns).toContainEqual({ spellId: 'spell-fire-seal', remainingTurns: 2 });
    expect(activeCombat?.player.qi).toBe((activeCombat?.player.maxQi ?? 0) - 22);
    expect(activeCombat?.rounds[0]?.playerSpellId).toBe('spell-fire-seal');
    expect(activeCombat?.enemyIntentText.length).toBeGreaterThan(0);

    useGameStore.getState().resolveCombatAction('attack');
    activeCombat = useGameStore.getState().gameState.pendingCombat;
    expect(activeCombat?.spellCooldowns).toContainEqual({ spellId: 'spell-fire-seal', remainingTurns: 1 });
  });

  it('provides four active combat skills for every cultivation path', () => {
    (['sword', 'body', 'spell', 'demonic'] as const).forEach(pathId => {
      const pathSpells = spellbook.filter(spell => spell.pathId === pathId);
      expect(pathSpells).toHaveLength(4);
      expect(pathSpells.every(spell => spell.combat.qiCost > 0 && spell.combat.cooldown > 0)).toBe(true);
    });
  });

  it('enforces path-exclusive artifacts and consumes crafted battle support', () => {
    const bodyState = normalizeLoadedGameState({
      currentRealm: realms[4],
      age: 80,
      attributes: { 根骨: 120, 神识: 100, 悟性: 100, 气运: 100, 颜值: 10 },
      events: [],
      cultivationPath: 'body',
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      inventory: [
        { itemId: 'sword-heart-sheath', quantity: 1 },
        { itemId: 'war-talisman', quantity: 1 },
        { itemId: 'binding-array-plate', quantity: 1 }
      ],
      selectedYearAction: 'combat',
      combatActivity: { zoneId: 'greenmist-outskirts', autoCombat: { enabled: false, useBattleConsumables: true } }
    });
    useGameStore.setState({ gameState: bodyState });
    useGameStore.getState().equipCombatItem('sword-heart-sheath');
    expect(useGameStore.getState().gameState.equipment.accessory).toBeNull();

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().advanceCultivation();
    expect(useGameStore.getState().gameState.pendingCombat?.itemSupportConsumed).toEqual(expect.arrayContaining([
      { itemId: 'war-talisman', quantity: 1 },
      { itemId: 'binding-array-plate', quantity: 1 }
    ]));

    const swordState = normalizeLoadedGameState({
      ...bodyState,
      cultivationPath: 'sword',
      equipment: { accessory: 'sword-heart-sheath' }
    });
    expect(swordState.equipment.accessory).toBe('sword-heart-sheath');
  });

  it('buys and sells market goods at persisted prices', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      spiritStones: 100,
      events: [],
      market: {
        offers: [{ id: 'test-offer', itemId: 'spirit-ore', price: 4, quantity: 1 }],
        lastRefreshAge: 20
      }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().buyMarketItem('test-offer');
    expect(useGameStore.getState().gameState.spiritStones).toBe(96);
    expect(useGameStore.getState().gameState.inventory).toContainEqual({ itemId: 'spirit-ore', quantity: 1 });

    useGameStore.getState().sellInventoryItem('spirit-ore');
    expect(useGameStore.getState().gameState.spiritStones).toBe(97);
    expect(useGameStore.getState().gameState.inventory).toEqual([]);
  });

  it('claims codex milestones only once', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[4],
      age: 120,
      events: [],
      inventory: [
        { itemId: 'spirit-blade', quantity: 1 },
        { itemId: 'minor-ward', quantity: 1 },
        { itemId: 'soul-settling-orb', quantity: 1 }
      ]
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().claimCodexMilestone('codex-equipment-3');
    let result = useGameStore.getState().gameState;
    expect(result.claimedCodexMilestones).toContain('codex-equipment-3');
    expect(result.inventory).toContainEqual({ itemId: 'artifact-essence', quantity: 3 });

    useGameStore.getState().claimCodexMilestone('codex-equipment-3');
    result = useGameStore.getState().gameState;
    expect(result.inventory).toContainEqual({ itemId: 'artifact-essence', quantity: 3 });
  });
});

describe('save migration', () => {
  it('migrates legacy family wealth and economic effects into spirit stones', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[2],
      familyWealth: 77,
      events: [{
        id: 'legacy-wealth-event',
        age: 20,
        type: 'resource',
        title: '旧档资源',
        description: '旧经济字段',
        effects: { 家境: 5 },
        appliedEffects: { 家境: 3 },
        result: 'neutral'
      }],
      lastCultivationSession: {
        source: 'manual',
        startedAge: 19,
        endedAge: 20,
        requestedRounds: 1,
        completedRounds: 1,
        eventCount: 1,
        cultivationChange: 0,
        lifespanChange: 0,
        familyWealthChange: 3,
        attributeChanges: {},
        eventTitles: ['旧档资源'],
        stopReason: 'completed'
      }
    });

    expect(state.spiritStones).toBe(77);
    expect(state.events[0]?.effects.灵石).toBe(5);
    expect((state.events[0]?.effects as { 家境?: number }).家境).toBeUndefined();
    expect(state.lastCultivationSession?.spiritStonesChange).toBe(3);
  });

  it('rebinds serialized definitions to current canonical data', () => {
    const loaded = normalizeLoadedGameState({
      status: 'playing',
      currentRealm: { ...realms[3], maxAge: 1 },
      spiritRoot: { ...spiritRoots[0], description: '旧版描述' },
      talent: { ...talents[0], description: '旧版描述' },
      events: []
    });

    expect(loaded.currentRealm).toBe(realms[3]);
    expect(loaded.spiritRoot).toBe(spiritRoots[0]);
    expect(loaded.talent).toBe(talents[0]);
  });

  it('normalizes malformed values without retaining an impossible sect rank', () => {
    const loaded = normalizeLoadedGameState({
      currentRealm: realms[1],
      events: [],
      attributes: null,
      inventory: [null, { itemId: 'missing-item', quantity: 99 }],
      sect: {
        sectId: 'sword-pavilion',
        rank: '太上长老',
        contribution: 9999,
        reputation: 20
      }
    });

    expect(loaded.currentRealm).toBe(realms[1]);
    expect(loaded.inventory).toEqual([]);
    expect(loaded.sect?.rank).toBe('内门弟子');
    expect(loaded.lastSectMissionAge).toBeNull();
    expect(loaded.cultivationPlan).toEqual({ rounds: 1, stopAtBreakthrough: true });
    expect(loaded.lifeSkillActivity).toEqual({ skillId: 'spirit-field', recipeId: null });
    expect(loaded.lastCultivationSession).toBeNull();
    expect(loaded.combatActivity).toEqual({
      zoneId: 'greenmist-outskirts',
      target: 'normal',
      activePresetId: null,
      dungeonAutoRepeat: false,
      autoCombat: {
        enabled: false,
        strategy: 'balanced',
        useTechnique: true,
        useBattleConsumables: false,
        healingItemId: null,
        healAtHpPercent: 35,
        qiItemId: null,
        qiAtPercent: 25,
        stopWhenSuppliesEmpty: false,
        lootTargetItemId: null,
        lootTargetQuantity: 1
      }
    });
    expect(loaded.equipment).toEqual({ weapon: null, armor: null, accessory: null });
    expect(loaded.equipmentEnhancements).toEqual([]);
    expect(loaded.equipmentAffixes).toEqual([]);
    expect(loaded.combatSkills).toEqual([
      { skillId: 'attack', level: 1, exp: 0 },
      { skillId: 'defense', level: 1, exp: 0 },
      { skillId: 'technique', level: 1, exp: 0 }
    ]);
    expect(loaded.combatPresets).toEqual([]);
    expect(loaded.market.offers).toHaveLength(6);
    expect(loaded.claimedCodexMilestones).toEqual([]);
  });

  it('keeps only owned and correctly slotted equipment from old saves', () => {
    const loaded = normalizeLoadedGameState({
      currentRealm: realms[4],
      events: [],
      inventory: [
        { itemId: 'spirit-blade', quantity: 1 },
        { itemId: 'soul-settling-orb', quantity: 1 }
      ],
      equipment: {
        weapon: 'spirit-blade',
        armor: 'soul-settling-orb',
        accessory: 'soul-settling-orb'
      }
    });

    expect(loaded.equipment).toEqual({
      weapon: 'spirit-blade',
      armor: null,
      accessory: 'soul-settling-orb'
    });
  });

  it('marks lower-realm combat bosses as cleared when migrating legacy saves', () => {
    const loaded = normalizeLoadedGameState({
      currentRealm: realms[4],
      events: []
    });
    useGameStore.setState({ gameState: loaded });

    expect(loaded.combatZoneProgress
      .filter(progress => ['greenmist-outskirts', 'blackstone-mine', 'ghost-market'].includes(progress.zoneId))
      .every(progress => progress.bossDefeated)).toBe(true);

    useGameStore.setState({
      gameState: {
        ...loaded,
        worldMap: { ...loaded.worldMap, currentRegionId: 'falling-star' }
      }
    });
    useGameStore.getState().selectCombatZone('falling-star-ferry');
    expect(useGameStore.getState().gameState.combatActivity.zoneId).toBe('falling-star-ferry');
  });
});
