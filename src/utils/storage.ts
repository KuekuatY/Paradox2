import { initialReincarnationState } from '@/data/reincarnation';
import type { GameRecord, GameState, ReincarnationState, ReincarnationUpgradeId, SaveSlotIndex, SavedGameSlot } from '@/types';

const STORAGE_KEY = 'gameRecords';
const LEGACY_SAVE_SLOT_KEY = 'currentGameSave';
const SAVE_SLOT_KEY_PREFIX = 'currentGameSave:';
const SAVE_BACKUP_KEY_PREFIX = 'currentGameSaveBackup:';
const REINCARNATION_KEY = 'reincarnationLegacy';
const SAVE_VERSION = 5;
const PRIMARY_EVENT_LIMIT = 200;
const FALLBACK_EVENT_LIMIT = 50;
const DEFAULT_STATS = {
  根骨: 0,
  神识: 0,
  悟性: 0,
  气运: 0,
  颜值: 0
};

export function saveGameRecord(record: GameRecord): void {
  const records = getGameRecords();
  records.unshift(record);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 10)));
  } catch {
    // A failed history write must not interrupt game-over settlement.
  }
}

export function getGameRecords(): GameRecord[] {
  const stored = readStorage(STORAGE_KEY);
  if (!stored) return [];

  try {
    const records = JSON.parse(stored);
    if (!Array.isArray(records)) return [];

    return records
      .map(normalizeGameRecord)
      .filter((record): record is GameRecord => record !== null);
  } catch {
    removeStorage(STORAGE_KEY);
    return [];
  }
}

export function clearGameRecords(): void {
  removeStorage(STORAGE_KEY);
}

export function saveGameState(gameState: GameState, slot: SaveSlotIndex = 1): boolean {
  const key = getSaveSlotKey(slot);
  const existing = readStorage(key) ?? (slot === 1 ? readStorage(LEGACY_SAVE_SLOT_KEY) : null);
  if (existing) writeStorage(getSaveBackupKey(slot), existing);
  const primarySave = createSaveSlot(gameState, PRIMARY_EVENT_LIMIT, false);
  if (writeStorage(key, JSON.stringify(primarySave))) return true;

  const fallbackSave = createSaveSlot(gameState, FALLBACK_EVENT_LIMIT, true);
  return writeStorage(key, JSON.stringify(fallbackSave));
}

export function createSaveSlot(
  gameState: GameState,
  eventLimit = PRIMARY_EVENT_LIMIT,
  stripCombatRounds = false
): SavedGameSlot {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    gameState: compactGameStateForSave(gameState, eventLimit, stripCombatRounds)
  };
}

export function compactGameStateForSave(
  gameState: GameState,
  eventLimit = PRIMARY_EVENT_LIMIT,
  stripCombatRounds = false
): GameState {
  const safeLimit = Math.max(0, Math.floor(eventLimit));
  const events = (safeLimit === 0 ? [] : gameState.events.slice(-safeLimit))
    .map(event => stripCombatRounds && event.combat
      ? { ...event, combat: { ...event.combat, rounds: [] } }
      : event
    );

  return {
    ...gameState,
    events
  };
}

export function getSavedGame(slot: SaveSlotIndex = 1): SavedGameSlot | null {
  const primaryKey = getSaveSlotKey(slot);
  const primary = readStorage(primaryKey) ?? (slot === 1 ? readStorage(LEGACY_SAVE_SLOT_KEY) : null);
  const parsedPrimary = parseSaveSlot(primary);
  if (parsedPrimary) {
    if (!readStorage(primaryKey) && slot === 1) writeStorage(primaryKey, JSON.stringify(parsedPrimary));
    return parsedPrimary;
  }

  const backup = parseSaveSlot(readStorage(getSaveBackupKey(slot)));
  if (backup) {
    writeStorage(primaryKey, JSON.stringify(backup));
    return backup;
  }
  return null;
}

export function getSavedGameSlots(): Array<{ slot: SaveSlotIndex; save: SavedGameSlot | null; hasBackup: boolean }> {
  return ([1, 2, 3] as SaveSlotIndex[]).map(slot => ({
    slot,
    save: getSavedGame(slot),
    hasBackup: parseSaveSlot(readStorage(getSaveBackupKey(slot))) !== null
  }));
}

export function hasSavedGame(slot?: SaveSlotIndex): boolean {
  return slot ? getSavedGame(slot) !== null : ([1, 2, 3] as SaveSlotIndex[]).some(index => getSavedGame(index) !== null);
}

export function clearSavedGame(slot: SaveSlotIndex = 1): void {
  removeStorage(getSaveSlotKey(slot));
  removeStorage(getSaveBackupKey(slot));
  if (slot === 1) removeStorage(LEGACY_SAVE_SLOT_KEY);
}

export function exportSavedGame(slot: SaveSlotIndex = 1): string | null {
  const save = getSavedGame(slot);
  return save ? JSON.stringify(save, null, 2) : null;
}

export function importSavedGame(serialized: string, slot: SaveSlotIndex = 1): SavedGameSlot | null {
  const imported = parseSaveSlot(serialized);
  if (!imported) return null;
  const key = getSaveSlotKey(slot);
  const existing = readStorage(key) ?? (slot === 1 ? readStorage(LEGACY_SAVE_SLOT_KEY) : null);
  if (existing) writeStorage(getSaveBackupKey(slot), existing);
  return writeStorage(key, JSON.stringify(imported)) ? imported : null;
}

export function getReincarnationState(): ReincarnationState {
  const stored = readStorage(REINCARNATION_KEY);
  if (!stored) return { ...initialReincarnationState, upgrades: { ...initialReincarnationState.upgrades } };
  try {
    const value = JSON.parse(stored) as unknown;
    if (!isRecord(value)) return { ...initialReincarnationState, upgrades: { ...initialReincarnationState.upgrades } };
    const upgrades = isRecord(value.upgrades) ? value.upgrades : {};
    const normalizedUpgrades = (Object.keys(initialReincarnationState.upgrades) as ReincarnationUpgradeId[])
      .reduce<ReincarnationState['upgrades']>((result, id) => {
        result[id] = Math.max(0, Math.min(10, Math.floor(normalizeNumber(upgrades[id]))));
        return result;
      }, { ...initialReincarnationState.upgrades });
    return {
      points: Math.max(0, Math.floor(normalizeNumber(value.points))),
      totalEarned: Math.max(0, Math.floor(normalizeNumber(value.totalEarned))),
      lives: Math.max(0, Math.floor(normalizeNumber(value.lives))),
      ascensions: Math.max(0, Math.floor(normalizeNumber(value.ascensions))),
      lastGain: Math.max(0, Math.floor(normalizeNumber(value.lastGain))),
      upgrades: normalizedUpgrades
    };
  } catch {
    return { ...initialReincarnationState, upgrades: { ...initialReincarnationState.upgrades } };
  }
}

export function saveReincarnationState(state: ReincarnationState): boolean {
  return writeStorage(REINCARNATION_KEY, JSON.stringify(state));
}

function normalizeGameRecord(record: unknown): GameRecord | null {
  if (!record || typeof record !== 'object') return null;

  const value = record as Partial<GameRecord>;
  const stats = normalizeStats(value.stats);
  const date = typeof value.date === 'string' && !Number.isNaN(new Date(value.date).getTime())
    ? value.date
    : new Date().toISOString();

  return {
    id: typeof value.id === 'string' ? value.id : Date.now().toString(),
    date,
    characterName: normalizeCharacterName(value.characterName),
    finalRealm: typeof value.finalRealm === 'string' ? value.finalRealm : '未知境界',
    age: typeof value.age === 'number' && Number.isFinite(value.age) ? value.age : 0,
    spiritRoot: typeof value.spiritRoot === 'string' ? value.spiritRoot : '',
    talent: typeof value.talent === 'string' ? value.talent : '',
    result: value.result === 'ascended' ? 'ascended' : 'died',
    stats,
    spiritStones: normalizeNumber(
      value.spiritStones
      ?? (record as { familyWealth?: unknown }).familyWealth
      ?? (value.stats as { 灵石?: unknown; 家境?: unknown } | undefined)?.灵石
      ?? (value.stats as { 家境?: unknown } | undefined)?.家境
    ),
    achievements: Array.isArray(value.achievements)
      ? value.achievements.filter((achievement): achievement is string => typeof achievement === 'string')
      : []
  };
}

function normalizeStats(stats: unknown): GameRecord['stats'] {
  if (!stats || typeof stats !== 'object') return DEFAULT_STATS;

  const value = stats as Partial<GameRecord['stats']>;
  return {
    根骨: normalizeNumber(value.根骨),
    神识: normalizeNumber(value.神识),
    悟性: normalizeNumber(value.悟性),
    气运: normalizeNumber(value.气运),
    颜值: normalizeNumber(value.颜值)
  };
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeCharacterName(value: unknown): string {
  if (typeof value !== 'string') return '无名';

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 12) : '无名';
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPlausibleGameState(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.currentRealm)) return false;
  const hasRealmIdentity = typeof value.currentRealm.name === 'string'
    || typeof value.currentRealm.level === 'number';
  return hasRealmIdentity && Array.isArray(value.events);
}

function parseSaveSlot(serialized: string | null): SavedGameSlot | null {
  if (!serialized) return null;
  try {
    const saveSlot = JSON.parse(serialized) as unknown;
    if (!isRecord(saveSlot)) return null;
    if (saveSlot.version !== 1 && saveSlot.version !== 2 && saveSlot.version !== 3 && saveSlot.version !== 4 && saveSlot.version !== SAVE_VERSION) return null;
    if (!isPlausibleGameState(saveSlot.gameState)) return null;
    const savedAt = typeof saveSlot.savedAt === 'string' && !Number.isNaN(new Date(saveSlot.savedAt).getTime())
      ? saveSlot.savedAt
      : new Date().toISOString();
    return {
      version: SAVE_VERSION,
      savedAt,
      gameState: saveSlot.gameState as unknown as GameState
    };
  } catch {
    return null;
  }
}

function getSaveSlotKey(slot: SaveSlotIndex): string {
  return `${SAVE_SLOT_KEY_PREFIX}${slot}`;
}

function getSaveBackupKey(slot: SaveSlotIndex): string {
  return `${SAVE_BACKUP_KEY_PREFIX}${slot}`;
}
