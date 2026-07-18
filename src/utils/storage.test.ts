import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombatReport, GameEvent } from '@/types';
import { realms } from '@/data/realms';
import { normalizeLoadedGameState } from '@/stores/gameStore';
import { compactGameStateForSave, createSaveSlot, getSavedGame, saveGameState } from '@/utils/storage';

function createEvent(index: number, withCombat = false): GameEvent {
  return {
    id: `event-${index}`,
    age: index,
    type: 'daily',
    title: `事件 ${index}`,
    description: '测试事件',
    effects: {},
    ...(withCombat ? {
      combat: {
        rounds: [{ round: 1 }, { round: 2 }]
      } as unknown as CombatReport
    } : {}),
    result: 'neutral'
  };
}

function createState() {
  const state = normalizeLoadedGameState({ currentRealm: realms[1], events: [] });
  return {
    ...state,
    events: Array.from({ length: 230 }, (_, index) => createEvent(index, index === 229))
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('save compaction', () => {
  it('keeps only the newest events and can strip historical combat rounds', () => {
    const compacted = compactGameStateForSave(createState(), 50, true);

    expect(compacted.events).toHaveLength(50);
    expect(compacted.events[0].id).toBe('event-180');
    expect(compacted.events[compacted.events.length - 1]?.combat?.rounds).toEqual([]);
    expect(createSaveSlot(compacted).version).toBe(2);
  });

  it('falls back to a smaller save when the first browser write exceeds quota', () => {
    const stored: string[] = [];
    let attempts = 0;
    vi.stubGlobal('localStorage', {
      setItem: (_key: string, value: string) => {
        attempts += 1;
        if (attempts === 1) throw new Error('quota');
        stored.push(value);
      },
      getItem: () => null,
      removeItem: () => undefined
    });

    expect(saveGameState(createState())).toBe(true);
    expect(attempts).toBe(2);
    expect(JSON.parse(stored[0]).gameState.events).toHaveLength(50);
  });

  it('reports failure when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new Error('disabled'); },
      getItem: () => null,
      removeItem: () => undefined
    });

    expect(saveGameState(createState())).toBe(false);
  });
});

describe('save version compatibility', () => {
  it('accepts a version 1 save and exposes it as the current version', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => undefined,
      getItem: () => JSON.stringify({
        version: 1,
        savedAt: '2026-01-01T00:00:00.000Z',
        gameState: { currentRealm: realms[2], events: [] }
      }),
      removeItem: () => undefined
    });

    expect(getSavedGame()?.version).toBe(2);
  });

  it('rejects saves without a usable realm and event history', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => undefined,
      getItem: () => JSON.stringify({ version: 1, gameState: {} }),
      removeItem: () => undefined
    });

    expect(getSavedGame()).toBeNull();
  });
});
