import { afterEach, describe, expect, it, vi } from 'vitest';
import { realms } from '@/data/realms';
import { getInitialWorldMapState, getWorldRegionProgress } from '@/data/worldMap';
import { normalizeLoadedGameState, useGameStore } from '@/stores/gameStore';

afterEach(() => {
  vi.restoreAllMocks();
  useGameStore.getState().resetGame();
});

function createWorldState(overrides: Record<string, unknown> = {}) {
  return normalizeLoadedGameState({
    currentRealm: realms[2],
    age: 20,
    lifespan: 300,
    attributes: { 根骨: 200, 神识: 200, 悟性: 200, 气运: 200, 颜值: 20 },
    cultivationPath: 'sword',
    sect: { sectId: 'loose', contribution: 0, reputation: 0 },
    events: [],
    ...overrides
  });
}

describe('world travel and exploration loop', () => {
  it('migrates an old save into a complete valid world state', () => {
    const migrated = normalizeLoadedGameState({ currentRealm: realms[4], age: 80, events: [] });
    expect(migrated.worldMap.currentRegionId).toBe('greenmist');
    expect(migrated.worldMap.regionProgress).toHaveLength(9);
    expect(migrated.worldMap.factionReputations).toHaveLength(4);
    expect(migrated.worldMap.commissions).toHaveLength(3);
  });

  it('consumes time and supplies, settles arrival and selects the local combat zone', () => {
    const state = createWorldState({ inventory: [{ itemId: 'travel-supply', quantity: 4 }] });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    useGameStore.getState().travelWorld('blackstone', 'safe');
    const result = useGameStore.getState().gameState;
    expect(result.age).toBe(23);
    expect(result.worldMap.currentRegionId).toBe('blackstone');
    expect(result.inventory).toContainEqual({ itemId: 'travel-supply', quantity: 2 });
    expect(result.combatActivity.zoneId).toBe('blackstone-mine');
    expect(result.events[result.events.length - 1]?.title).toBe('远行至玄石宗域');
    expect(result.market.lastRefreshAge).toBe(23);
  });

  it('raises exploration and grants a regional resource without forcing combat', () => {
    const state = createWorldState();
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    useGameStore.getState().exploreCurrentRegion();
    const result = useGameStore.getState().gameState;
    expect(result.age).toBe(21);
    expect(getWorldRegionProgress(result.worldMap, 'greenmist').exploration).toBeGreaterThanOrEqual(10);
    expect(result.pendingCombat).toBeNull();
    expect(result.events[result.events.length - 1]?.title).toBe('探索青雾山麓');
    expect(result.inventory.some(entry => ['spirit-herb', 'beast-core', 'spirit-seed'].includes(entry.itemId))).toBe(true);
  });

  it('settles a delivery commission into spirit stones and faction reputation', () => {
    const worldMap = getInitialWorldMapState(20);
    const commission = {
      id: 'test-delivery', regionId: 'greenmist' as const, kind: 'delivery' as const,
      title: '交付灵草', description: '测试委托', targetQuantity: 2, baseline: 0,
      itemId: 'spirit-herb', spiritStoneReward: 20, reputationReward: 7, expiresAtAge: 40
    };
    const state = createWorldState({
      spiritStones: 10,
      inventory: [{ itemId: 'spirit-herb', quantity: 2 }],
      worldMap: { ...worldMap, commissions: [commission] }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().claimWorldCommission('test-delivery');
    const result = useGameStore.getState().gameState;
    expect(result.spiritStones).toBe(30);
    expect(result.inventory).toEqual([]);
    expect(result.worldMap.factionReputations.find(entry => entry.factionId === 'wandering-league')?.value).toBe(7);
    expect(getWorldRegionProgress(result.worldMap, 'greenmist').commissionsCompleted).toBe(1);
  });

  it('turns a fully explored region boss into real combat and records the kill', () => {
    const worldMap = getInitialWorldMapState(20);
    const state = createWorldState({
      currentRealm: realms[1],
      worldMap: {
        ...worldMap,
        regionProgress: worldMap.regionProgress.map(progress => progress.regionId === 'greenmist'
          ? { ...progress, exploration: 100 }
          : progress)
      }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().challengeWorldBoss();
    const combat = useGameStore.getState().gameState.pendingCombat;
    expect(combat?.event.worldBoss).toBe(true);
    if (!combat) throw new Error('Expected world boss combat');
    useGameStore.setState({
      gameState: {
        ...useGameStore.getState().gameState,
        pendingCombat: {
          ...combat,
          player: { ...combat.player, attack: 9999, speed: 9999 },
          enemy: { ...combat.enemy, hp: 1, defense: 0, dodge: 0 }
        }
      }
    });
    useGameStore.getState().resolveCombatAction('attack');
    const result = useGameStore.getState().gameState;
    expect(result.pendingCombat).toBeNull();
    expect(getWorldRegionProgress(result.worldMap, 'greenmist').bossDefeated).toBe(true);
    expect(result.worldMap.factionReputations.find(entry => entry.factionId === 'wandering-league')?.value).toBe(12);
  });
});
