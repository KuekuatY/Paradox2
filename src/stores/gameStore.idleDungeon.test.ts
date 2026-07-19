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
  it('migrates legacy saves with safe defaults for the new long-term systems', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      selectedYearAction: 'combat',
      dungeonRun: { zoneId: 'greenmist-outskirts', floor: 2, totalFloors: 5 },
      events: []
    });

    expect(state.dungeonRun).toMatchObject({
      floor: 2,
      currentHp: 130,
      maxHp: 130,
      currentQi: 55,
      maxQi: 55,
      relicIds: [],
      pendingRelicIds: [],
      route: 'steady',
      restsRemaining: 1
    });
    expect(state.idleAutomation).toMatchObject({ enabled: false, targetItemId: null });
    expect(state.reincarnation.upgrades).toEqual({ foundation: 0, longevity: 0, insight: 0, fortune: 0 });
    expect(state.craftedRecipeIds).toEqual([]);
  });

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
      },
      lastCultivationSession: { source: 'offline', completedRounds: 2, requestedRounds: 2 }
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

describe('idle production automation', () => {
  it('switches through prerequisite recipes until the target item is produced', () => {
    const state = createPlayableState({
      currentRealm: realms[2],
      familyWealth: 100,
      inventory: [{ itemId: 'spirit-seed', quantity: 1 }],
      selectedYearAction: 'adventure',
      lifeSkills: [
        { skillId: 'spirit-field', level: 8, exp: 700 },
        { skillId: 'alchemy', level: 8, exp: 700 }
      ],
      idleAutomation: {
        enabled: true,
        targetItemId: 'qi-gathering-pill',
        targetQuantity: 1,
        fallbackSkillId: 'spirit-field',
        priority: 'target-first',
        autoSellRules: [],
        switches: 0,
        soldItems: 0
      }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(useGameStore.getState().runCultivationSession(2, 'idle')).toBe(2);
    const result = useGameStore.getState().gameState;
    expect(result.inventory.find(item => item.itemId === 'qi-gathering-pill')?.quantity).toBeGreaterThanOrEqual(1);
    expect(result.craftedRecipeIds).toEqual(expect.arrayContaining(['field-spirit-herb', 'alchemy-basic-pill']));
    expect(result.idleAutomation.switches).toBe(2);
  });

  it('sells production above the configured reserve', () => {
    const state = createPlayableState({
      currentRealm: realms[2],
      familyWealth: 100,
      inventory: [{ itemId: 'spirit-seed', quantity: 20 }],
      selectedYearAction: 'life-skill',
      lifeSkillActivity: { skillId: 'spirit-field', recipeId: null },
      idleAutomation: {
        enabled: true,
        targetItemId: null,
        targetQuantity: 20,
        fallbackSkillId: 'spirit-field',
        priority: 'target-first',
        autoSellRules: [{ itemId: 'spirit-seed', keepQuantity: 20 }],
        switches: 0,
        soldItems: 0
      }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().runCultivationSession(1, 'idle');
    const result = useGameStore.getState().gameState;
    expect(result.inventory.find(item => item.itemId === 'spirit-seed')?.quantity).toBe(20);
    expect(result.idleAutomation.soldItems).toBe(1);
    expect(result.familyWealth).toBeGreaterThan(100);
  });

  it('saves and switches between three automation presets', () => {
    const state = createPlayableState({
      idleAutomation: {
        enabled: true,
        targetItemId: 'qi-gathering-pill',
        targetQuantity: 8,
        fallbackSkillId: 'spirit-field',
        priority: 'target-first',
        autoSellRules: [{ itemId: 'spirit-seed', keepQuantity: 12 }],
        switches: 4,
        soldItems: 2
      }
    });
    useGameStore.setState({ gameState: state });
    useGameStore.getState().saveAutomationPreset(0);
    useGameStore.getState().setIdleAutomation({ targetItemId: null, targetQuantity: 1 });
    useGameStore.getState().applyAutomationPreset('automation-preset-1');

    expect(useGameStore.getState().gameState.idleAutomation).toMatchObject({
      targetItemId: 'qi-gathering-pill',
      targetQuantity: 8,
      switches: 4,
      soldItems: 2
    });
  });
});

describe('reincarnation and stage legacy', () => {
  it('awards persistent points and keeps purchased upgrades after resetting', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
    const state = createPlayableState({ currentRealm: realms[4] });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().endGame('died', 'meditation');
    expect(useGameStore.getState().gameState.reincarnation.points).toBeGreaterThanOrEqual(1);
    useGameStore.getState().purchaseReincarnationUpgrade('foundation');
    expect(useGameStore.getState().gameState.reincarnation.upgrades.foundation).toBe(1);

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().gameState.reincarnation.upgrades.foundation).toBe(1);
  });

  it('grants a claimable stage reward and permanent reincarnation point', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
    const state = createPlayableState({ currentRealm: realms[2] });
    useGameStore.setState({
      gameState: {
        ...state,
        combatStats: { ...state.combatStats, victories: 3 },
        techniques: [{ techniqueId: 'test-technique', level: 1 }]
      }
    });

    useGameStore.getState().claimStageReward('stage-foundation');
    const result = useGameStore.getState().gameState;
    expect(result.claimedStageRewards).toContain('stage-foundation');
    expect(result.reincarnation.points).toBe(1);
    expect(result.inventory.find(item => item.itemId === 'qi-gathering-pill')?.quantity).toBe(2);
  });
});

describe('five-floor dungeons', () => {
  it('offers a room choice between floors and resolves its effects before continuing', () => {
    const state = createPlayableState({ selectedYearAction: 'combat' });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().startDungeonRun('greenmist-outskirts');
    useGameStore.getState().runDungeonFloor();
    winPendingCombat();
    const pendingRoom = useGameStore.getState().gameState.dungeonRun?.pendingRoom;
    expect(pendingRoom).not.toBeNull();
    useGameStore.getState().resolveDungeonRoom(pendingRoom?.optionIds[pendingRoom.optionIds.length - 1] ?? '');
    expect(useGameStore.getState().gameState.dungeonRun?.pendingRoom).toBeNull();
  });

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
      const pendingRelic = useGameStore.getState().gameState.dungeonRun?.pendingRelicIds[0];
      if (pendingRelic) useGameStore.getState().chooseDungeonRelic(pendingRelic);
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
        dungeonRun: current.gameState.dungeonRun
          ? { ...current.gameState.dungeonRun, floor: 3 }
          : null
      }
    }));

    useGameStore.getState().runDungeonFloor();
    defeatPendingCombat();

    expect(useGameStore.getState().gameState.dungeonRun).toMatchObject({
      zoneId: 'greenmist-outskirts',
      floor: 1,
      totalFloors: 5
    });
  });

  it('keeps damage between floors and offers a relic after the second floor', () => {
    const state = createPlayableState({ selectedYearAction: 'combat' });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().startDungeonRun('greenmist-outskirts');
    useGameStore.getState().runDungeonFloor();
    const duringFirstFight = useGameStore.getState().gameState;
    if (!duringFirstFight.pendingCombat) throw new Error('Expected first dungeon combat');
    const damagedHp = Math.max(1, Math.round(duringFirstFight.pendingCombat.player.maxHp * 0.55));
    useGameStore.setState({
      gameState: {
        ...duringFirstFight,
        pendingCombat: {
          ...duringFirstFight.pendingCombat,
          player: { ...duringFirstFight.pendingCombat.player, hp: damagedHp }
        }
      }
    });
    winPendingCombat();
    expect(useGameStore.getState().gameState.dungeonRun?.currentHp).toBe(damagedHp);

    useGameStore.getState().runDungeonFloor();
    winPendingCombat();
    const relicOptions = useGameStore.getState().gameState.dungeonRun?.pendingRelicIds ?? [];
    expect(relicOptions).toHaveLength(3);
    useGameStore.getState().chooseDungeonRelic(relicOptions[0]);
    expect(useGameStore.getState().gameState.dungeonRun?.relicIds).toContain(relicOptions[0]);
    expect(useGameStore.getState().gameState.discoveredRelicIds).toContain(relicOptions[0]);
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
    let completed = 0;
    while (useGameStore.getState().gameState.dungeonRun && completed < 5) {
      completed += useGameStore.getState().runCultivationSession(5, 'idle');
      const pendingRelic = useGameStore.getState().gameState.dungeonRun?.pendingRelicIds[0];
      if (pendingRelic) useGameStore.getState().chooseDungeonRelic(pendingRelic);
    }
    expect(completed).toBe(5);
    expect(useGameStore.getState().gameState.dungeonRun).toBeNull();
    expect(useGameStore.getState().gameState.lastCultivationSession?.stopReason).toBe('dungeon-cleared');

    useGameStore.setState({ gameState: createAutoState() });
    useGameStore.getState().startDungeonRun('greenmist-outskirts');
    useGameStore.getState().setAutoCombatConfig({ enabled: true });
    useGameStore.getState().setDungeonAutoRepeat(true);
    expect(useGameStore.getState().runCultivationSession(5, 'idle')).toBe(5);
    expect(useGameStore.getState().gameState.dungeonRun).toMatchObject({
      zoneId: 'greenmist-outskirts',
      floor: 1,
      totalFloors: 5
    });
    expect(useGameStore.getState().gameState.dungeonProgress[0]?.clears).toBe(1);
  });
});
