import { afterEach, describe, expect, it, vi } from 'vitest';
import { getIdleCycleDurationMs } from '@/data/idleActivities';
import { realms } from '@/data/realms';
import { getInitialWorldMapState, getWorldRegionProgress } from '@/data/worldMap';
import { normalizeLoadedGameState, useGameStore } from '@/stores/gameStore';

afterEach(() => {
  vi.restoreAllMocks();
  useGameStore.getState().resetGame();
});

function createSectState(overrides: Record<string, unknown> = {}) {
  return normalizeLoadedGameState({
    currentRealm: realms[5],
    age: 80,
    lifespan: 1_000,
    attributes: { 根骨: 500, 神识: 500, 悟性: 500, 气运: 500, 颜值: 500 },
    spiritStones: 500,
    inventory: [{ itemId: 'travel-supply', quantity: 20 }],
    cultivationPath: 'sword',
    sect: { sectId: 'sword-pavilion', rank: '执事', contribution: 500, merit: 500, reputation: 180 },
    events: [],
    ...overrides
  });
}

describe('sect headquarters, rank and facilities', () => {
  it('returns to a high-realm headquarters through the sect relay', () => {
    const state = createSectState({
      currentRealm: realms[1],
      age: 20,
      sect: { sectId: 'demonic-sect', rank: '外门弟子', contribution: 0, merit: 0, reputation: 0 }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    useGameStore.getState().returnToSectHeadquarters();
    const result = useGameStore.getState().gameState;
    expect(result.worldMap.currentRegionId).toBe('thunder-marsh');
    expect(result.age).toBe(22);
    expect(result.inventory).toContainEqual({ itemId: 'travel-supply', quantity: 18 });
  });

  it('requires an explicit headquarters promotion after meeting rank thresholds', () => {
    const state = createSectState({
      currentRealm: realms[1],
      sect: { sectId: 'sword-pavilion', rank: '外门弟子', contribution: 50, merit: 50, reputation: 20 },
      sectManagement: { facilityLevels: { 'mission-hall': 1 }, treasury: 20, influence: 0, npcs: [] }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().promoteSectRank();
    expect(useGameStore.getState().gameState.sect?.rank).toBe('内门弟子');
  });

  it('moves personal stones into the treasury and upgrades a facility', () => {
    const state = createSectState({
      currentRealm: realms[3],
      sect: { sectId: 'sword-pavilion', rank: '真传弟子', contribution: 200, merit: 200, reputation: 80 },
      sectManagement: { facilityLevels: { 'mission-hall': 1 }, treasury: 0, influence: 10, npcs: [] }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    useGameStore.getState().donateSectTreasury(100);
    useGameStore.getState().upgradeSectFacility('mission-hall');
    const result = useGameStore.getState().gameState;
    expect(result.spiritStones).toBe(400);
    expect(result.sectManagement.facilityLevels['mission-hall']).toBe(2);
    expect(result.sectManagement.treasury).toBeLessThan(100);
    expect(result.age).toBe(81);
  });

  it('never lowers an established npc realm when world time passes', () => {
    const state = createSectState({
      sect: { sectId: 'sword-pavilion', rank: '真传弟子', contribution: 500, merit: 500, reputation: 180 },
      sectManagement: {
        facilityLevels: { 'mission-hall': 1 }, treasury: 200, influence: 20,
        npcs: [{
          id: 'npc-master', name: '顾寒川', role: 'master', personality: '严谨寡言', sectId: 'sword-pavilion',
          realmLevel: 8, age: 180, lifespan: 900, affinity: 30, active: true, lastInteractionAge: null
        }]
      }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().upgradeSectFacility('mission-hall');
    expect(useGameStore.getState().gameState.sectManagement.npcs[0].realmLevel).toBe(8);
  });
});

describe('sect npc relationships', () => {
  it('builds affinity and forms one dao-companion bond', () => {
    const state = createSectState({
      sectManagement: {
        facilityLevels: { 'mission-hall': 2 }, treasury: 20, influence: 20,
        npcs: [{
          id: 'npc-companion', name: '沈听雪', role: 'companion', personality: '洒脱重情', sectId: 'sword-pavilion',
          realmLevel: 5, age: 80, lifespan: 500, affinity: 79, active: true, lastInteractionAge: null
        }]
      }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().interactSectNpc('npc-companion', 'visit');
    useGameStore.getState().formDaoCompanion('npc-companion');
    const result = useGameStore.getState().gameState;
    expect(result.sectManagement.npcs[0]).toMatchObject({ role: 'dao-companion', affinity: 85 });
    expect(result.attributes.气运).toBeGreaterThan(state.attributes.气运);
  });

  it('lets a long-serving elder recruit a persistent disciple', () => {
    const state = createSectState({
      currentRealm: realms[6],
      sect: { sectId: 'sword-pavilion', rank: '长老', contribution: 900, merit: 900, reputation: 300 },
      sectManagement: { facilityLevels: { 'mission-hall': 3 }, treasury: 100, influence: 20, npcs: [] }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().recruitSectDisciple();
    const result = useGameStore.getState().gameState;
    expect(result.sectManagement.npcs.some(npc => npc.role === 'disciple')).toBe(true);
    expect(result.sectManagement.influence).toBe(10);
  });
});

describe('sect conflicts and automatic expeditions', () => {
  it('settles a real sect-war combat and transfers regional control', () => {
    const worldMap = getInitialWorldMapState(80);
    const state = createSectState({
      worldMap: {
        ...worldMap,
        activeEvents: [{
          id: 'war-greenmist', kind: 'sect-war', regionId: 'greenmist', title: '青雾争夺',
          description: '测试战争', startedAge: 80, expiresAtAge: 100
        }]
      }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().joinSectConflict('greenmist');
    const combat = useGameStore.getState().gameState.pendingCombat;
    expect(combat?.event.sectConflict).toBe(true);
    if (!combat) throw new Error('Expected sect conflict combat');
    useGameStore.setState({
      gameState: {
        ...useGameStore.getState().gameState,
        pendingCombat: {
          ...combat,
          player: { ...combat.player, attack: 9_999, speed: 9_999 },
          enemy: { ...combat.enemy, hp: 1, defense: 0, dodge: 0 }
        }
      }
    });
    useGameStore.getState().resolveCombatAction('attack');
    const result = useGameStore.getState().gameState;
    expect(getWorldRegionProgress(result.worldMap, 'greenmist')).toMatchObject({
      controllerSectId: 'sword-pavilion', blockaded: false
    });
    expect(result.sectManagement.influence).toBeGreaterThan(state.sectManagement.influence);
    expect(result.worldMap.activeEvents.some(event => event.id === 'war-greenmist')).toBe(false);
  });

  it('runs to a target, gathers resources and automatically returns', () => {
    const state = createSectState();
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    useGameStore.getState().configureAutoExpedition({
      targetRegionId: 'blackstone', approachId: 'safe', autoReturn: true, minSupplies: 0
    });
    useGameStore.getState().startAutoExpedition();
    expect(useGameStore.getState().runAutoExpeditionStep()).toBe(true);
    expect(useGameStore.getState().runAutoExpeditionStep()).toBe(true);
    const result = useGameStore.getState().gameState;
    expect(result.autoExpedition.running).toBe(false);
    expect(result.worldMap.currentRegionId).toBe('greenmist');
    expect(result.autoExpedition.report).toMatchObject({ cycles: 2, battles: 0 });
    expect(result.autoExpedition.report?.itemRewards.length).toBeGreaterThan(0);
  });

  it('uses accrued offline rounds to advance an active expedition', () => {
    const state = createSectState({ offlineCultivation: { remainingRounds: 2 } });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGameStore.getState().configureAutoExpedition({ targetRegionId: 'blackstone', autoReturn: true, minSupplies: 0 });
    useGameStore.getState().startAutoExpedition();

    useGameStore.getState().claimOfflineCultivation();
    const result = useGameStore.getState().gameState;
    expect(result.autoExpedition.running).toBe(false);
    expect(result.autoExpedition.report?.cycles).toBe(2);
    expect(result.offlineCultivation).toBeNull();
  });

  it('starts realtime settlement and ignores stale cultivation stop reasons', () => {
    const state = createSectState({
      lastCultivationSession: {
        source: 'manual', startedAge: 79, endedAge: 80, requestedRounds: 1, completedRounds: 1,
        eventCount: 1, cultivationChange: 0, lifespanChange: 0, spiritStonesChange: 0,
        attributeChanges: {}, eventTitles: ['旧修行记录'], stopReason: 'progress-complete'
      }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGameStore.getState().configureAutoExpedition({ targetRegionId: 'blackstone', autoReturn: true, minSupplies: 0 });
    useGameStore.getState().startAutoExpedition();
    const duration = getIdleCycleDurationMs(useGameStore.getState().gameState);

    expect(useGameStore.getState().gameState.idleActivity.running).toBe(true);
    useGameStore.getState().settleIdleActivity(1_000 + duration * 3);
    const result = useGameStore.getState().gameState;
    expect(result.autoExpedition.running).toBe(false);
    expect(result.autoExpedition.report?.cycles).toBe(2);
    expect(result.worldMap.currentRegionId).toBe('greenmist');
  });
});

describe('sect-world migration', () => {
  it('fills version-seven saves with merit, facilities, npcs and regional ecology', () => {
    const migrated = normalizeLoadedGameState({
      currentRealm: realms[3], age: 60, events: [],
      sect: { sectId: 'alchemy-valley', contribution: 150, reputation: 60 }
    });
    expect(migrated.sect?.merit).toBe(150);
    expect(migrated.sectManagement.npcs).toHaveLength(4);
    expect(migrated.sectManagement.npcs.every(npc => npc.combatHp === npc.combatMaxHp && npc.injury === 0)).toBe(true);
    expect(migrated.sectManagement.facilityLevels['mission-hall']).toBe(1);
    expect(migrated.sectCampaign).toMatchObject({ active: false, completedCount: 0 });
    expect(migrated.autoExpedition.memberNpcIds).toEqual([]);
    expect(migrated.endgame).toMatchObject({ leadershipWon: false, invasionVictories: 0, heavenGateDefeated: false });
    expect(migrated.worldMap.regionProgress.every(progress => (
      Number.isFinite(progress.stability) && Number.isFinite(progress.prosperity) && Number.isFinite(progress.threat)
    ))).toBe(true);
  });

  it('migrates the legacy top sect rank to the explicit current rank', () => {
    const migrated = normalizeLoadedGameState({
      currentRealm: realms[8], age: 900, events: [],
      sect: { sectId: 'array-gate', rank: '太上长老', contribution: 2_000, merit: 2_000, reputation: 600 }
    });
    expect(migrated.sect?.rank).toBe('掌门');
  });
});
