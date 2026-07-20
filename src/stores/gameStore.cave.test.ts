import { afterEach, describe, expect, it, vi } from 'vitest';
import { realms } from '@/data/realms';
import { normalizeLoadedGameState, useGameStore } from '@/stores/gameStore';

afterEach(() => {
  vi.restoreAllMocks();
  useGameStore.getState().resetGame();
});

function createCaveState(overrides: Record<string, unknown> = {}) {
  return normalizeLoadedGameState({
    currentRealm: realms[2],
    age: 20,
    lifespan: 200,
    spiritStones: 200,
    sect: { sectId: 'alchemy-valley', rank: '外门弟子', contribution: 0, reputation: 0 },
    cave: {
      buildingLevels: { 'spirit-vein': 1, 'spirit-field': 1, 'defense-array': 1 },
      activeBuildingIds: ['spirit-vein', 'spirit-field', 'defense-array'],
      productionQueue: [],
      orders: [],
      lastOrderRefreshAge: 20,
      lastInspectionAge: null
    },
    events: [],
    ...overrides
  });
}

describe('cave building and production loop', () => {
  it('builds a room by consuming time, spirit stones and materials', () => {
    const state = createCaveState({ inventory: [{ itemId: 'spirit-herb', quantity: 4 }] });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().upgradeCaveBuilding('alchemy-room');
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(21);
    expect(result.spiritStones).toBe(178);
    expect(result.inventory).toEqual([]);
    expect(result.cave.buildingLevels['alchemy-room']).toBe(1);
    expect(result.spiritStoneLedger[result.spiritStoneLedger.length - 1]).toMatchObject({ amount: -22, category: 'cave' });
  });

  it('queues production and settles its output when the completion age is reached', () => {
    const state = createCaveState({
      inventory: [{ itemId: 'spirit-herb', quantity: 3 }],
      cave: {
        buildingLevels: { 'spirit-vein': 1, 'alchemy-room': 1, 'defense-array': 1 },
        activeBuildingIds: ['spirit-vein', 'alchemy-room', 'defense-array'],
        productionQueue: [],
        orders: [],
        lastOrderRefreshAge: 20,
        lastInspectionAge: null
      }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().startCaveProduction('cave-brew-pill');
    let result = useGameStore.getState().gameState;
    expect(result.inventory).toEqual([]);
    expect(result.cave.productionQueue).toHaveLength(1);
    useGameStore.getState().toggleCaveBuilding('alchemy-room');
    expect(useGameStore.getState().gameState.cave.activeBuildingIds).toContain('alchemy-room');

    const completesAtAge = result.cave.productionQueue[0].completesAtAge;
    useGameStore.setState({ gameState: { ...result, age: completesAtAge } });
    useGameStore.getState().claimCaveProduction();
    result = useGameStore.getState().gameState;
    expect(result.inventory).toContainEqual({ itemId: 'qi-gathering-pill', quantity: 2 });
    expect(result.cave.productionQueue).toEqual([]);
    expect(result.events[result.events.length - 1]?.title).toBe('洞府生产完成');
  });

  it('exchanges an order for spirit stones and sect contribution', () => {
    const state = createCaveState({
      spiritStones: 100,
      inventory: [{ itemId: 'spirit-ore', quantity: 2 }],
      cave: {
        buildingLevels: { 'spirit-vein': 1, 'spirit-field': 1, 'defense-array': 1 },
        activeBuildingIds: ['spirit-vein', 'spirit-field', 'defense-array'],
        productionQueue: [],
        orders: [{
          id: 'test-cave-order', itemId: 'spirit-ore', quantity: 2,
          spiritStoneReward: 9, contributionReward: 12, expiresAtAge: 40
        }],
        lastOrderRefreshAge: 20,
        lastInspectionAge: null
      }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().claimCaveOrder('test-cave-order');
    const result = useGameStore.getState().gameState;
    expect(result.spiritStones).toBe(109);
    expect(result.inventory).toEqual([]);
    expect(result.sect?.contribution).toBe(12);
    expect(result.cave.orders).toEqual([]);
  });
});

describe('cave inspection and migration', () => {
  it('resolves one inspection and enforces its five-year cooldown', () => {
    const state = createCaveState({ spiritStones: 50 });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    useGameStore.getState().inspectCave();
    const afterFirst = useGameStore.getState().gameState;
    expect(afterFirst.spiritStones).toBe(59);
    expect(afterFirst.events[afterFirst.events.length - 1]?.title).toBe('灵脉震鸣');

    useGameStore.getState().inspectCave();
    expect(useGameStore.getState().gameState.events).toHaveLength(afterFirst.events.length);
  });

  it('turns an enemy incursion into a real turn-based cave defense battle', () => {
    const state = createCaveState();
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.6);

    useGameStore.getState().inspectCave();
    const result = useGameStore.getState().gameState;
    expect(result.pendingCombat?.event.title).toBe('洞府争夺');
    expect(result.pendingCombat?.player.defense).toBeGreaterThan(0);
    expect(result.cave.lastInspectionAge).toBe(20);
  });

  it('provides old saves with a valid cave state', () => {
    const migrated = normalizeLoadedGameState({ currentRealm: realms[3], age: 60, events: [] });
    expect(migrated.cave.activeBuildingIds).toHaveLength(3);
    expect(migrated.cave.buildingLevels['spirit-vein']).toBe(1);
    expect(migrated.cave.orders).toHaveLength(3);
  });
});
