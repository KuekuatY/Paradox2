import { afterEach, describe, expect, it, vi } from 'vitest';
import { realms } from '@/data/realms';
import { spiritRoots } from '@/data/spiritRoots';
import { talents } from '@/data/talents';
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
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'demonic-sect', contribution: 0, reputation: 0 }
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

    expect(seed?.quantity).toBe(2);
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
    expect(result.inventory.find(item => item.itemId === 'spirit-herb')?.quantity).toBe(4);
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

describe('save migration', () => {
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
  });
});
