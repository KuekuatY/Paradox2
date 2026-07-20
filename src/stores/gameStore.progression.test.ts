import { afterEach, describe, expect, it, vi } from 'vitest';
import { combatEnemyVariants, combatZones } from '@/data/combatZones';
import { getPathQuestCombatBonuses } from '@/data/pathQuests';
import { realms } from '@/data/realms';
import { normalizeLoadedGameState, useGameStore } from '@/stores/gameStore';
import type { CombatRound, GameEvent } from '@/types';

afterEach(() => {
  vi.restoreAllMocks();
  useGameStore.getState().resetGame();
});

describe('combat spell progression', () => {
  it('learns, upgrades and branches a path spell with the expected insight costs', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[4],
      age: 80,
      events: [],
      cultivationPath: 'sword',
      combatSpellProgress: [{ spellId: 'sword-flash-step', level: 1, branchId: null }],
      equippedSpellIds: ['sword-flash-step'],
      inventory: [{ itemId: 'combat-insight', quantity: 10 }]
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().learnCombatSpell('sword-breaking-line');
    useGameStore.getState().learnCombatSpell('sword-guarding-sheath');
    useGameStore.getState().upgradeCombatSpell('sword-guarding-sheath');
    useGameStore.getState().upgradeCombatSpell('sword-guarding-sheath');
    useGameStore.getState().chooseCombatSpellBranch('sword-guarding-sheath', 'power');
    useGameStore.getState().chooseCombatSpellBranch('sword-guarding-sheath', 'control');

    const result = useGameStore.getState().gameState;
    expect(result.combatSpellProgress.some(entry => entry.spellId === 'sword-breaking-line')).toBe(false);
    expect(result.combatSpellProgress).toContainEqual({
      spellId: 'sword-guarding-sheath',
      level: 3,
      branchId: 'power'
    });
    expect(result.inventory).toContainEqual({ itemId: 'combat-insight', quantity: 6 });
    expect(result.equippedSpellIds).toContain('sword-guarding-sheath');
  });

  it('increases active spell damage through levels and the power branch', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const resolveDamage = (level: number, branchId: 'power' | null) => {
      const state = normalizeLoadedGameState({
        currentRealm: realms[4],
        age: 80,
        attributes: { 根骨: 120, 神识: 120, 悟性: 120, 气运: 120, 颜值: 10 },
        events: [],
        cultivationPath: 'spell',
        combatSpellProgress: [{ spellId: 'spell-fire-seal', level, branchId }],
        equippedSpellIds: ['spell-fire-seal'],
        sect: { sectId: 'loose', contribution: 0, reputation: 0 },
        selectedYearAction: 'combat',
        combatActivity: { zoneId: 'greenmist-outskirts', target: 'normal', autoCombat: { enabled: false } }
      });
      useGameStore.setState({ gameState: state });
      useGameStore.getState().advanceCultivation();
      const combat = useGameStore.getState().gameState.pendingCombat;
      if (!combat) throw new Error('Expected active combat');
      useGameStore.setState({
        gameState: {
          ...useGameStore.getState().gameState,
          pendingCombat: {
            ...combat,
            player: { ...combat.player, qi: combat.player.maxQi, speed: 999 },
            enemy: { ...combat.enemy, hp: 2000, maxHp: 2000, attack: 1, defense: 1, dodge: 1 },
            enemyResistances: []
          }
        }
      });
      useGameStore.getState().resolveCombatAction('technique', 'spell-fire-seal');
      return useGameStore.getState().gameState.pendingCombat?.rounds[0]?.playerDamage ?? 0;
    };

    const baseDamage = resolveDamage(1, null);
    const powerDamage = resolveDamage(3, 'power');
    expect(powerDamage).toBeGreaterThan(baseDamage);
  });
});

describe('enemy variants and boss phases', () => {
  it('provides three distinct variants for every combat zone', () => {
    expect(combatEnemyVariants).toHaveLength(combatZones.length * 3);
    combatZones.forEach(zone => {
      const variants = combatEnemyVariants.filter(enemy => enemy.zoneId === zone.id);
      expect(variants).toHaveLength(3);
      expect(new Set(variants.map(enemy => enemy.name)).size).toBe(3);
      expect(variants.every(enemy => enemy.traitText.length > 0 && enemy.resistances.length > 0)).toBe(true);
    });
  });

  it('lets an enemy resistance suppress the matching spell status', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[4],
      age: 80,
      attributes: { 根骨: 120, 神识: 120, 悟性: 120, 气运: 120, 颜值: 10 },
      events: [],
      cultivationPath: 'spell',
      combatSpellProgress: [{ spellId: 'spell-fire-seal', level: 1, branchId: null }],
      equippedSpellIds: ['spell-fire-seal'],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'combat',
      combatActivity: { zoneId: 'greenmist-outskirts', target: 'normal', autoCombat: { enabled: false } }
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
          enemy: { ...combat.enemy, hp: 1000, maxHp: 1000, attack: 1, defense: 1, dodge: 1 },
          enemyResistances: ['burn']
        }
      }
    });

    useGameStore.getState().resolveCombatAction('technique', 'spell-fire-seal');
    const activeCombat = useGameStore.getState().gameState.pendingCombat;
    expect(activeCombat?.enemyStatuses.some(status => status.id === 'burn')).toBe(false);
    expect(activeCombat?.rounds[0]?.statusText).toContain('抵抗了灼烧');
  });

  it('enters phase two below half health and runs boss mechanics every two turns', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      attributes: { 根骨: 100, 神识: 100, 悟性: 100, 气运: 100, 颜值: 10 },
      events: [],
      cultivationPath: 'sword',
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
    if (!combat) throw new Error('Expected boss combat');
    useGameStore.setState({
      gameState: {
        ...useGameStore.getState().gameState,
        pendingCombat: {
          ...combat,
          player: { ...combat.player, attack: 1, defense: 999, speed: 999 },
          enemy: { ...combat.enemy, hp: 250, maxHp: 500, attack: 1, defense: 999, dodge: 1 }
        }
      }
    });

    useGameStore.getState().resolveCombatAction('attack');
    let activeCombat = useGameStore.getState().gameState.pendingCombat;
    expect(activeCombat?.bossPhase).toBe(2);
    if (!activeCombat) throw new Error('Expected phase two combat');
    useGameStore.setState({
      gameState: {
        ...useGameStore.getState().gameState,
        pendingCombat: { ...activeCombat, turn: 2 }
      }
    });
    useGameStore.getState().resolveCombatAction('attack');
    activeCombat = useGameStore.getState().gameState.pendingCombat;
    const lastRound = activeCombat?.rounds[(activeCombat?.rounds.length ?? 1) - 1];
    expect(lastRound?.bossMechanicText).toContain('蓄势已满');
  });
});

describe('activity queue', () => {
  it('runs queued activity snapshots in order', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'cultivate',
      cultivationPlan: { rounds: 2, stopAtBreakthrough: false }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().enqueueCurrentActivity(17);
    useGameStore.getState().selectYearAction('seclusion');
    useGameStore.getState().enqueueCurrentActivity(1);
    useGameStore.getState().runActivityQueue();

    const result = useGameStore.getState().gameState;
    expect(result.age).toBe(38);
    expect(result.activityQueue).toEqual([]);
    expect(result.lastQueueReport).toMatchObject([
      { label: '修炼', requestedRounds: 17, completedRounds: 17, stopReason: 'completed' },
      { label: '闭关', requestedRounds: 1, completedRounds: 1, stopReason: 'completed' }
    ]);
  });

  it('keeps a blocked queue entry and prioritizes the queue during offline settlement', () => {
    const blocked = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      cultivationProgress: 100,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'cultivate',
      cultivationPlan: { rounds: 2, stopAtBreakthrough: true }
    });
    useGameStore.setState({ gameState: blocked });
    useGameStore.getState().enqueueCurrentActivity(2);
    useGameStore.getState().runActivityQueue();
    let result = useGameStore.getState().gameState;
    expect(result.activityQueue[0]?.rounds).toBe(2);
    expect(result.lastQueueReport[0]).toMatchObject({ completedRounds: 0, stopReason: 'breakthrough' });

    const offline = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'seclusion',
      cultivationPlan: { rounds: 2, stopAtBreakthrough: false },
      offlineCultivation: { remainingRounds: 3 }
    });
    useGameStore.setState({ gameState: offline });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().enqueueCurrentActivity(2);
    useGameStore.getState().selectYearAction('cultivate');
    useGameStore.getState().enqueueCurrentActivity(1);
    useGameStore.getState().claimOfflineCultivation();
    result = useGameStore.getState().gameState;
    expect(result.age).toBe(23);
    expect(result.activityQueue).toEqual([]);
    expect(result.offlineCultivation).toBeNull();
    expect(result.lastQueueReport[0]).toMatchObject({ label: '闭关', completedRounds: 2 });
    expect(result.lastQueueReport[1]).toMatchObject({ label: '修炼', completedRounds: 1 });
  });

  it('stops before the next entry when a completed entry reaches a stop condition', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[1],
      age: 20,
      cultivationProgress: 99,
      events: [],
      sect: { sectId: 'loose', contribution: 0, reputation: 0 },
      selectedYearAction: 'cultivate',
      cultivationPlan: { rounds: 1, stopAtBreakthrough: true }
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().enqueueCurrentActivity(1);
    useGameStore.getState().selectYearAction('seclusion');
    useGameStore.getState().enqueueCurrentActivity(1);

    useGameStore.getState().runActivityQueue();
    const result = useGameStore.getState().gameState;
    expect(result.age).toBe(21);
    expect(result.activityQueue).toHaveLength(1);
    expect(result.activityQueue[0]?.actionId).toBe('seclusion');
    expect(result.lastQueueReport[0]).toMatchObject({ completedRounds: 1, stopReason: 'breakthrough' });
  });
});

describe('equipment, market and presets', () => {
  it('rolls quality once and supports targeted and locked reforging', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[4],
      age: 80,
      events: [],
      cultivationPath: 'sword',
      inventory: [
        { itemId: 'spirit-blade', quantity: 1 },
        { itemId: 'artifact-essence', quantity: 12 }
      ]
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    useGameStore.getState().equipCombatItem('spirit-blade');
    useGameStore.getState().unequipCombatItem('weapon');
    useGameStore.getState().equipCombatItem('spirit-blade');
    useGameStore.getState().reforgeEquipment('spirit-blade', 'sword-heart');
    let result = useGameStore.getState().gameState;
    expect(result.equipmentQualities).toContainEqual({ itemId: 'spirit-blade', quality: 125 });
    expect(result.equipmentAffixes.find(entry => entry.itemId === 'spirit-blade')?.affixIds).toContain('sword-heart');
    expect(result.inventory.some(entry => entry.itemId === 'artifact-essence')).toBe(false);

    useGameStore.setState({
      gameState: {
        ...result,
        inventory: [...result.inventory, { itemId: 'artifact-essence', quantity: 12 }]
      }
    });
    useGameStore.getState().toggleEquipmentAffixLock('spirit-blade');
    useGameStore.getState().reforgeEquipment('spirit-blade', 'nimble');
    result = useGameStore.getState().gameState;
    expect(result.equipmentAffixes.find(entry => entry.itemId === 'spirit-blade')?.affixIds).toContain('sword-heart');
    expect(result.inventory).toContainEqual({ itemId: 'artifact-essence', quantity: 12 });
  });

  it('purchases the unique auction item and removes the listing', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[2],
      age: 30,
      spiritStones: 100,
      events: [],
      market: {
        offers: [{ id: 'test-offer', itemId: 'spirit-herb', price: 3, quantity: 1 }],
        auction: { id: 'test-auction', itemId: 'spirit-blade', price: 55, quantity: 1 },
        priceTrend: 1,
        lastRefreshAge: 30
      }
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().buyMarketItem('test-auction');
    const result = useGameStore.getState().gameState;
    expect(result.spiritStones).toBe(45);
    expect(result.inventory).toContainEqual({ itemId: 'spirit-blade', quantity: 1 });
    expect(result.market.auction).toBeNull();
  });

  it('keeps a custom preset name when the preset is overwritten', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[2],
      age: 30,
      events: [],
      cultivationPath: 'sword',
      combatSpellProgress: [{ spellId: 'sword-flash-step', level: 1, branchId: null }],
      equippedSpellIds: ['sword-flash-step']
    });
    useGameStore.setState({ gameState: state });

    useGameStore.getState().saveCombatPreset(0);
    useGameStore.getState().renameCombatPreset('combat-preset-1', ' 破阵长锋配置 ');
    useGameStore.getState().saveCombatPreset(0);
    expect(useGameStore.getState().gameState.combatPresets[0]).toMatchObject({
      name: '破阵长锋配置',
      pathId: 'sword',
      equippedSpellIds: ['sword-flash-step']
    });
  });
});

describe('cultivation path quest chains', () => {
  it('enforces stage order and grants the skill, artifact and permanent passive', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[4],
      age: 80,
      events: [],
      cultivationPath: 'sword',
      combatSpellProgress: [{ spellId: 'sword-flash-step', level: 1, branchId: null }],
      equippedSpellIds: ['sword-flash-step'],
      combatZoneProgress: combatZones.slice(0, 3).map(zone => ({
        zoneId: zone.id,
        kills: zone.bossKillsRequired,
        bossDefeated: true,
        bossWins: 1,
        bestRounds: 3
      }))
    });
    const castRounds = Array.from({ length: 8 }, (_, index) => createCombatRound(index + 1, {
      playerSpellId: 'sword-flash-step',
      statusText: '流光起手施加了流血'
    }));
    useGameStore.setState({
      gameState: { ...state, events: [createCombatHistoryEvent(castRounds)] }
    });

    useGameStore.getState().claimPathQuest('sword-quest-2');
    expect(useGameStore.getState().gameState.claimedPathQuests).toEqual([]);

    useGameStore.getState().claimPathQuest('sword-quest-1');
    let result = useGameStore.getState().gameState;
    expect(result.claimedPathQuests).toContain('sword-quest-1');
    expect(result.combatSpellProgress.some(entry => entry.spellId === 'sword-breaking-line')).toBe(true);

    useGameStore.getState().claimPathQuest('sword-quest-2');
    result = useGameStore.getState().gameState;
    expect(result.inventory).toContainEqual({ itemId: 'sword-heart-sheath', quantity: 1 });

    useGameStore.getState().claimPathQuest('sword-quest-3');
    result = useGameStore.getState().gameState;
    expect(result.claimedPathQuests).toContain('sword-quest-3');
    expect(getPathQuestCombatBonuses(result).skillDamageMultiplier).toBe(1.08);
  });
});

describe('periodic spirit stone economy', () => {
  it('settles sect stipend and maintenance when an age step crosses the cycle boundary', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[2],
      age: 9,
      lifespan: 200,
      spiritStones: 10,
      sect: { sectId: 'alchemy-valley', rank: '外门弟子', contribution: 0, reputation: 0 },
      events: []
    });
    useGameStore.setState({ gameState: state });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    useGameStore.getState().advanceAge();
    const result = useGameStore.getState().gameState;

    expect(result.age).toBe(11);
    expect(result.spiritStones).toBe(15);
    expect(result.spiritStoneLedger.map(entry => entry.reason)).toEqual([
      '宗门俸禄',
      '洞府与灵脉维护',
      '洞府灵脉分润'
    ]);
  });
});

function createCombatRound(round: number, overrides: Partial<CombatRound> = {}): CombatRound {
  return {
    round,
    playerAction: '施展功法',
    enemyAction: '抵挡',
    playerRating: 100,
    enemyRating: 80,
    playerHp: 100,
    enemyHp: 80,
    playerDamage: 20,
    enemyDamage: 5,
    playerMaxHp: 100,
    enemyMaxHp: 100,
    ...overrides
  };
}

function createCombatHistoryEvent(rounds: CombatRound[]): GameEvent {
  return {
    id: 'quest-combat-history',
    age: 80,
    type: 'combat',
    title: '道途试炼',
    description: '你在连番斗法中磨炼本命传承。',
    effects: {},
    result: 'success',
    combat: {
      victory: true,
      enemyName: '试炼傀儡',
      enemyRank: '同境',
      playerRating: 100,
      enemyRating: 80,
      winRate: 70,
      injuryChange: 0,
      injuryAfter: 0,
      cultivationPercent: 0,
      resultText: '胜',
      styleText: '试炼',
      playerMaxHp: 100,
      enemyMaxHp: 100,
      playerHpAfter: 100,
      enemyHpAfter: 0,
      playerAttack: 20,
      playerDefense: 20,
      playerDodge: 10,
      playerSpeed: 10,
      enemyAttack: 10,
      enemyDefense: 10,
      enemyDodge: 8,
      enemySpeed: 8,
      rounds
    }
  };
}
