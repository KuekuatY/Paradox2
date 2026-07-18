import { afterEach, describe, expect, it, vi } from 'vitest';
import { realms } from '@/data/realms';
import { spiritRoots } from '@/data/spiritRoots';
import { talents } from '@/data/talents';
import { calculateSectMissionReward, normalizeLoadedGameState, useGameStore } from '@/stores/gameStore';

afterEach(() => {
  vi.restoreAllMocks();
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
  });
});
