import { afterEach, describe, expect, it, vi } from 'vitest';
import { lifeSkills } from '@/data/lifeSkills';
import { realms } from '@/data/realms';
import { normalizeLoadedGameState, useGameStore } from '@/stores/gameStore';
import { createSaveSlot } from '@/utils/storage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useGameStore.getState().resetGame();
});

function createPlayableState(overrides: Record<string, unknown> = {}) {
  return normalizeLoadedGameState({
    currentRealm: realms[1],
    age: 20,
    events: [],
    sect: { sectId: 'loose', contribution: 0, reputation: 0 },
    cultivationPlan: { rounds: 1, stopAtBreakthrough: false },
    ...overrides
  });
}

function defeatPendingCombat(): void {
  const state = useGameStore.getState().gameState;
  if (!state.pendingCombat) throw new Error('Expected pending combat');
  useGameStore.setState({
    gameState: {
      ...state,
      pendingCombat: {
        ...state.pendingCombat,
        player: { ...state.pendingCombat.player, hp: 0 }
      }
    }
  });
  useGameStore.getState().resolveCombatAction('attack');
}

function winPendingCombat(): void {
  const state = useGameStore.getState().gameState;
  if (!state.pendingCombat) throw new Error('Expected pending combat');
  useGameStore.setState({
    gameState: {
      ...state,
      pendingCombat: {
        ...state.pendingCombat,
        player: {
          ...state.pendingCombat.player,
          attack: 999_999,
          speed: 999_999
        },
        enemy: {
          ...state.pendingCombat.enemy,
          hp: 1,
          defense: 0,
          dodge: 0,
          speed: 0
        }
      }
    }
  });
  useGameStore.getState().resolveCombatAction('attack');
}

describe('real-time idle activity', () => {
  it('settles only complete cycles and preserves partial progress when paused', () => {
    const state = createPlayableState({ selectedYearAction: 'cultivate' });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().startIdleActivity(1_000);
    expect(useGameStore.getState().settleIdleActivity(60_999)).toBe(0);
    expect(useGameStore.getState().gameState.age).toBe(20);

    expect(useGameStore.getState().settleIdleActivity(61_000)).toBe(1);
    expect(useGameStore.getState().gameState).toMatchObject({
      age: 21,
      idleActivity: { running: true, completedCycles: 1, accumulatedMs: 0 }
    });

    useGameStore.getState().pauseIdleActivity(91_000);
    expect(useGameStore.getState().gameState.idleActivity).toMatchObject({
      running: false,
      accumulatedMs: 30_000,
      completedCycles: 1
    });
  });

  it('uses the persisted idle timestamp for exact offline settlement', () => {
    const now = new Date('2026-07-20T00:00:00.000Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const state = createPlayableState({
      selectedYearAction: 'cultivate',
      offlineCultivation: { remainingRounds: 2 },
      idleActivity: {
        running: true,
        accumulatedMs: 0,
        startedAt: now - 120_001,
        completedCycles: 3,
        stopReason: null
      }
    });
    const saveSlot = createSaveSlot(state);
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify(saveSlot),
      setItem: () => undefined,
      removeItem: () => undefined
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(useGameStore.getState().loadSavedGame()).toBe(true);
    expect(useGameStore.getState().gameState).toMatchObject({
      age: 22,
      offlineCultivation: { remainingRounds: 2 },
      idleActivity: {
        running: true,
        accumulatedMs: 1,
        completedCycles: 5,
        startedAt: now
      }
    });
  });
});

describe('six-art production chain', () => {
  it('gives each basic discipline its deterministic raw material output', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    for (const skill of lifeSkills) {
      const state = createPlayableState({
        currentRealm: realms[2],
        familyWealth: 1_000,
        selectedYearAction: 'life-skill',
        lifeSkillActivity: { skillId: skill.id, recipeId: null }
      });
      useGameStore.setState({ gameState: state });

      expect(useGameStore.getState().runCultivationSession(1, 'manual')).toBe(1);
      const result = useGameStore.getState().gameState;
      for (const reward of skill.baseRewards) {
        expect(result.inventory.find(item => item.itemId === reward.itemId)?.quantity).toBe(reward.quantity);
      }
      expect(result.events[result.events.length - 1]?.itemRewards).toEqual(skill.baseRewards);
    }
  });

  it('stops a paid discipline when family wealth is exhausted', () => {
    const state = createPlayableState({
      familyWealth: 3,
      selectedYearAction: 'life-skill',
      lifeSkillActivity: { skillId: 'alchemy', recipeId: null },
      cultivationPlan: { rounds: 3, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().advanceCultivation();
    const result = useGameStore.getState().gameState;
    expect(result.familyWealth).toBe(0);
    expect(result.inventory.find(item => item.itemId === 'spirit-herb')?.quantity).toBe(1);
    expect(result.lastCultivationSession).toMatchObject({
      completedRounds: 1,
      stopReason: 'resource-shortage'
    });
  });
});

describe('five-floor dungeons', () => {
  it('advances through guards, an elite, and a boss before granting clear rewards', () => {
    const state = createPlayableState({ selectedYearAction: 'combat' });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().startDungeonRun('greenmist-outskirts');

    for (let floor = 1; floor <= 5; floor += 1) {
      useGameStore.getState().runDungeonFloor();
      const event = useGameStore.getState().gameState.pendingCombat?.event;
      expect(event?.combatDungeonFloor).toBe(floor);
      expect(Boolean(event?.combatElite)).toBe(floor === 3);
      expect(Boolean(event?.combatBoss)).toBe(floor === 5);
      winPendingCombat();
    }

    const result = useGameStore.getState().gameState;
    expect(result.dungeonRun).toBeNull();
    expect(result.dungeonProgress.find(entry => entry.zoneId === 'greenmist-outskirts')).toEqual({
      zoneId: 'greenmist-outskirts',
      clears: 1,
      bestFloor: 5
    });
    expect(result.inventory.find(item => item.itemId === 'combat-insight')?.quantity).toBeGreaterThanOrEqual(1);
    expect(result.combatZoneProgress.find(entry => entry.zoneId === 'greenmist-outskirts')?.bossWins).toBe(0);
  });

  it('resets the active run to floor one after a defeat', () => {
    const state = createPlayableState({ selectedYearAction: 'combat' });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().startDungeonRun('greenmist-outskirts');
    useGameStore.setState(current => ({
      gameState: {
        ...current.gameState,
        dungeonRun: { zoneId: 'greenmist-outskirts', floor: 3, totalFloors: 5 }
      }
    }));

    useGameStore.getState().runDungeonFloor();
    defeatPendingCombat();

    expect(useGameStore.getState().gameState.dungeonRun).toEqual({
      zoneId: 'greenmist-outskirts',
      floor: 1,
      totalFloors: 5
    });
  });

  it('stops an automatic run after a clear unless repeat is enabled', () => {
    const createAutoState = () => createPlayableState({
      selectedYearAction: 'combat',
      attributes: { 根骨: 9_999, 神识: 9_999, 悟性: 9_999, 气运: 9_999, 颜值: 9_999 }
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.setState({ gameState: createAutoState() });
    useGameStore.getState().startDungeonRun('greenmist-outskirts');
    useGameStore.getState().setAutoCombatConfig({ enabled: true });
    expect(useGameStore.getState().runCultivationSession(5, 'idle')).toBe(5);
    expect(useGameStore.getState().gameState.dungeonRun).toBeNull();
    expect(useGameStore.getState().gameState.lastCultivationSession?.stopReason).toBe('dungeon-cleared');

    useGameStore.setState({ gameState: createAutoState() });
    useGameStore.getState().startDungeonRun('greenmist-outskirts');
    useGameStore.getState().setAutoCombatConfig({ enabled: true });
    useGameStore.getState().setDungeonAutoRepeat(true);
    expect(useGameStore.getState().runCultivationSession(5, 'idle')).toBe(5);
    expect(useGameStore.getState().gameState.dungeonRun).toEqual({
      zoneId: 'greenmist-outskirts',
      floor: 1,
      totalFloors: 5
    });
    expect(useGameStore.getState().gameState.dungeonProgress[0]?.clears).toBe(1);
  });
});
