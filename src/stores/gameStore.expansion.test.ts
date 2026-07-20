import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInitialWorldMapState, getWorldRegionProgress } from '@/data/worldMap';
import { realms } from '@/data/realms';
import { normalizeLoadedGameState, useGameStore } from '@/stores/gameStore';

afterEach(() => {
  vi.restoreAllMocks();
  useGameStore.getState().resetGame();
});

function createAdvancedState(overrides: Record<string, unknown> = {}) {
  return normalizeLoadedGameState({
    currentRealm: realms[5],
    age: 300,
    lifespan: 10_000,
    attributes: { 根骨: 900, 神识: 900, 悟性: 900, 气运: 900, 颜值: 500 },
    spiritStones: 1_000,
    cultivationProgress: 500,
    cultivationPath: 'sword',
    inventory: [{ itemId: 'travel-supply', quantity: 30 }],
    sect: { sectId: 'sword-pavilion', rank: '内门弟子', contribution: 100, merit: 100, reputation: 80 },
    events: [],
    ...overrides
  });
}

function forcePendingCombatVictory() {
  const state = useGameStore.getState().gameState;
  const combat = state.pendingCombat;
  if (!combat) throw new Error('Expected pending combat');
  useGameStore.setState({
    gameState: {
      ...state,
      pendingCombat: {
        ...combat,
        player: { ...combat.player, attack: 999_999, speed: 999_999 },
        enemy: { ...combat.enemy, hp: 1, defense: 0, dodge: 0 }
      }
    }
  });
  useGameStore.getState().resolveCombatAction('attack');
}

describe('expedition parties and persistent npc combat state', () => {
  it('uses real turn combat and damages expedition companions', () => {
    const worldMap = getInitialWorldMapState(300);
    const state = createAdvancedState({
      worldMap: {
        ...worldMap,
        activeEvents: [{
          id: 'stable-market', kind: 'market-boom', regionId: 'greenmist', title: '坊市兴盛',
          description: '保持事件刷新稳定', startedAge: 300, expiresAtAge: 340
        }],
        lastEventRefreshAge: 300
      },
      sectManagement: {
        facilityLevels: { 'mission-hall': 1 }, treasury: 100, influence: 20,
        npcs: [{
          id: 'npc-peer', name: '柳照影', role: 'peer', personality: '温和耐心', sectId: 'sword-pavilion',
          realmLevel: 5, age: 305, lifespan: 900, affinity: 70, active: true, lastInteractionAge: null,
          combatHp: 245, combatMaxHp: 245, injury: 0
        }]
      }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.5);

    useGameStore.getState().configureAutoExpedition({
      targetRegionId: 'blackstone', autoReturn: false, minSupplies: 0, memberNpcIds: ['npc-peer']
    });
    useGameStore.getState().startAutoExpedition();
    expect(useGameStore.getState().runAutoExpeditionStep()).toBe(true);

    const result = useGameStore.getState().gameState;
    expect(result.autoExpedition.report).toMatchObject({ battles: 1, victories: 1, memberNpcIds: ['npc-peer'] });
    expect(result.autoExpedition.report?.turns).toBeGreaterThan(0);
    expect(result.combatStats.victories).toBeGreaterThan(state.combatStats.victories);
    expect(result.sectManagement.npcs[0].combatHp).toBeLessThan(245);
    expect(result.events.some(event => event.id.startsWith('expedition-combat-') && event.combat?.victory)).toBe(true);
  });
});

describe('persistent sect campaign', () => {
  it('carries four distinct choices into npc, treasury and territory consequences', () => {
    const state = createAdvancedState({
      sectManagement: {
        facilityLevels: { 'mission-hall': 1 }, treasury: 100, influence: 20,
        npcs: [{
          id: 'npc-peer', name: '柳照影', role: 'peer', personality: '温和耐心', sectId: 'sword-pavilion',
          realmLevel: 5, age: 305, lifespan: 900, affinity: 20, active: true, lastInteractionAge: null,
          combatHp: 245, combatMaxHp: 245, injury: 0
        }]
      }
    });
    const initialProgress = getWorldRegionProgress(state.worldMap, 'greenmist');
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().startSectCampaign();
    useGameStore.getState().advanceSectCampaign('investigate-personally');
    useGameStore.getState().advanceSectCampaign('secret-detour');
    useGameStore.getState().advanceSectCampaign('border-negotiation');
    useGameStore.getState().advanceSectCampaign('protect-people');

    const result = useGameStore.getState().gameState;
    expect(result.sectCampaign).toMatchObject({ active: false, completedCount: 1 });
    expect(result.sectCampaign.branchIds).toEqual([
      'investigate-personally', 'secret-detour', 'border-negotiation', 'protect-people'
    ]);
    expect(result.sectManagement.npcs[0].affinity).toBeGreaterThan(20);
    expect(getWorldRegionProgress(result.worldMap, 'greenmist').stability).toBeGreaterThan(initialProgress.stability);
    expect(result.spiritStones).toBeLessThan(state.spiritStones);
    expect(result.spiritStoneLedger.some(transaction => transaction.reason.includes('赴会谈判') && transaction.amount === -20)).toBe(true);
  });
});

describe('ascension endgame', () => {
  it('consumes time, cultivation and materials for persistent ascension preparation', () => {
    const state = createAdvancedState({
      currentRealm: realms[8], age: 2_000, cultivationProgress: 20_000,
      inventory: [
        { itemId: 'tribulation-crystal', quantity: 2 },
        { itemId: 'xuanhuang-marrow', quantity: 1 }
      ]
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().prepareAscension('body');
    const result = useGameStore.getState().gameState;
    expect(result.endgame.ascensionPreparation.body).toBe(1);
    expect(result.age).toBe(2_020);
    expect(result.cultivationProgress).toBe(19_000);
    expect(result.spiritStones).toBeLessThan(state.spiritStones);
    expect(result.spiritStoneLedger.some(transaction => transaction.reason === '仙躯淬炼' && transaction.amount === -60)).toBe(true);
    expect(result.inventory).toEqual([]);
  });

  it('requires three invasion victories and a real heaven-gate battle before ascension', () => {
    const worldMap = getInitialWorldMapState(3_000);
    const state = createAdvancedState({
      currentRealm: realms[9], age: 3_000, lifespan: 50_000, cultivationProgress: 20_000,
      sect: { sectId: 'loose', rank: '散修', contribution: 0, merit: 0, reputation: 0 },
      worldMap: { ...worldMap, currentRegionId: 'demon-gate' },
      endgame: {
        leadershipWon: false, invasionVictories: 0,
        ascensionPreparation: { body: 3, soul: 3, fate: 3 },
        heavenGateDefeated: false, legacyChoice: 'guardian'
      }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    for (let victory = 0; victory < 3; victory += 1) {
      useGameStore.getState().challengeEndgame('invasion');
      forcePendingCombatVictory();
    }
    expect(useGameStore.getState().gameState.endgame.invasionVictories).toBe(3);
    expect(useGameStore.getState().gameState.status).toBe('playing');

    const beforeGate = useGameStore.getState().gameState;
    useGameStore.setState({
      gameState: {
        ...beforeGate,
        worldMap: { ...beforeGate.worldMap, currentRegionId: 'tribulation-boundary' }
      }
    });
    useGameStore.getState().challengeEndgame('heaven-gate');
    forcePendingCombatVictory();
    const result = useGameStore.getState().gameState;
    expect(result.endgame.heavenGateDefeated).toBe(true);
    expect(result.status).toBe('ended');
    expect(result.endReason).toBe('ascended');
  });
});
