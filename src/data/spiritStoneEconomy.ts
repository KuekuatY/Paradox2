import { realms } from '@/data/realms';
import type {
  GameState,
  Rarity,
  SpiritStoneTransaction,
  TechniqueGrade
} from '@/types';

export type SpiritStoneEconomyStatus = 'balanced' | 'tight' | 'surplus';

export interface SpiritStoneStageEconomy {
  realmLevel: number;
  realmName: string;
  expectedEventIncomePerTenYears: number;
  expectedOptionalExpensePerTenYears: number;
  maintenanceCost: number;
  sectStipend: number;
  spiritVeinShare: number;
}

export interface SpiritStoneProjection {
  years: number;
  expectedIncome: number;
  expectedExpense: number;
  expectedNet: number;
  projectedBalance: number;
  maintenanceCost: number;
  nextMaintenanceAge: number | null;
  firstBottleneckAge: number | null;
  status: SpiritStoneEconomyStatus;
}

export interface SpiritStoneStageReport {
  realmLevel: number;
  realmName: string;
  averageInitialBalance: number;
  averageTenYearIncome: number;
  averageTenYearExpense: number;
  averageBalance: number;
  depletionRate: number;
  surplusRate: number;
  firstBottleneckAge: number | null;
  status: SpiritStoneEconomyStatus;
}

export interface SpiritStoneEconomyReport {
  iterations: number;
  seed: number;
  stages: SpiritStoneStageReport[];
  warnings: string[];
}

const stageSettings: Array<Omit<SpiritStoneStageEconomy, 'realmName'>> = [
  { realmLevel: 0, expectedEventIncomePerTenYears: 0, expectedOptionalExpensePerTenYears: 0, maintenanceCost: 0, sectStipend: 0, spiritVeinShare: 0 },
  { realmLevel: 1, expectedEventIncomePerTenYears: 8, expectedOptionalExpensePerTenYears: 4, maintenanceCost: 0, sectStipend: 2, spiritVeinShare: 0 },
  { realmLevel: 2, expectedEventIncomePerTenYears: 12, expectedOptionalExpensePerTenYears: 8, maintenanceCost: 2, sectStipend: 3, spiritVeinShare: 0 },
  { realmLevel: 3, expectedEventIncomePerTenYears: 18, expectedOptionalExpensePerTenYears: 14, maintenanceCost: 4, sectStipend: 4, spiritVeinShare: 0 },
  { realmLevel: 4, expectedEventIncomePerTenYears: 28, expectedOptionalExpensePerTenYears: 24, maintenanceCost: 7, sectStipend: 6, spiritVeinShare: 4 },
  { realmLevel: 5, expectedEventIncomePerTenYears: 42, expectedOptionalExpensePerTenYears: 40, maintenanceCost: 12, sectStipend: 8, spiritVeinShare: 7 },
  { realmLevel: 6, expectedEventIncomePerTenYears: 60, expectedOptionalExpensePerTenYears: 58, maintenanceCost: 20, sectStipend: 11, spiritVeinShare: 11 },
  { realmLevel: 7, expectedEventIncomePerTenYears: 86, expectedOptionalExpensePerTenYears: 82, maintenanceCost: 34, sectStipend: 15, spiritVeinShare: 16 },
  { realmLevel: 8, expectedEventIncomePerTenYears: 122, expectedOptionalExpensePerTenYears: 115, maintenanceCost: 52, sectStipend: 21, spiritVeinShare: 24 },
  { realmLevel: 9, expectedEventIncomePerTenYears: 170, expectedOptionalExpensePerTenYears: 160, maintenanceCost: 78, sectStipend: 28, spiritVeinShare: 36 }
];

export const spiritStoneStageEconomy: SpiritStoneStageEconomy[] = stageSettings.map(setting => ({
  ...setting,
  realmName: realms[setting.realmLevel]?.name ?? `境界 ${setting.realmLevel}`
}));

export const spiritStoneItemValues = {
  'spirit-stone-pouch': 4,
  'star-spirit-stone': 8
} as const;

const techniqueGradeCosts: Record<TechniqueGrade, number> = {
  黄: 0,
  玄: 2,
  地: 5,
  天: 10,
  仙: 18
};

const equipmentRarityCosts: Record<Rarity, number> = {
  凡品: 0,
  下品: 0,
  中品: 0,
  上品: 2,
  变异: 3,
  极品: 5,
  神话: 8,
  传说: 12
};

export function getSpiritStoneStageEconomy(realmLevel: number): SpiritStoneStageEconomy {
  const safeLevel = Math.max(0, Math.min(stageSettings.length - 1, Math.round(realmLevel)));
  return spiritStoneStageEconomy[safeLevel] ?? spiritStoneStageEconomy[0];
}

export function getSectStipend(realmLevel: number): number {
  return getSpiritStoneStageEconomy(realmLevel).sectStipend;
}

export function getSpiritVeinShare(realmLevel: number, isLooseCultivator = false): number {
  const share = getSpiritStoneStageEconomy(realmLevel).spiritVeinShare;
  return isLooseCultivator ? Math.floor(share * 0.6) : share;
}

export function getSpiritStoneMaintenanceCost(realmLevel: number): number {
  return getSpiritStoneStageEconomy(realmLevel).maintenanceCost;
}

export function getDungeonFirstClearSpiritStoneReward(realmLevel: number): number {
  return 4 + Math.max(1, Math.round(realmLevel)) * 3;
}

export function getTechniqueSpiritStoneCost(grade: TechniqueGrade, nextLevel: number): number {
  const base = techniqueGradeCosts[grade];
  return base <= 0 ? 0 : base + Math.max(0, Math.round(nextLevel) - 1) * Math.max(1, Math.floor(base / 3));
}

export function getEquipmentEnhancementSpiritStoneCost(rarity: Rarity, nextLevel: number): number {
  return equipmentRarityCosts[rarity] * Math.max(1, Math.round(nextLevel));
}

export function getSpiritStoneProjection(
  gameState: Pick<GameState, 'age' | 'currentRealm' | 'sect' | 'spiritStones'>,
  years = 10
): SpiritStoneProjection {
  const safeYears = Math.max(1, Math.round(years));
  const stage = getSpiritStoneStageEconomy(gameState.currentRealm.level);
  const cycles = safeYears / 10;
  const isLoose = !gameState.sect || gameState.sect.sectId === 'loose';
  const stipend = isLoose ? 0 : stage.sectStipend * (safeYears / 5);
  const veinShare = getSpiritVeinShare(gameState.currentRealm.level, isLoose) * cycles;
  const eventIncome = stage.expectedEventIncomePerTenYears * cycles * (isLoose ? 1.12 : 1);
  const expectedIncome = Math.round(eventIncome + stipend + veinShare);
  const expectedExpense = Math.round((stage.expectedOptionalExpensePerTenYears + stage.maintenanceCost) * cycles);
  const expectedNet = expectedIncome - expectedExpense;
  const projectedBalance = Math.max(0, gameState.spiritStones + expectedNet);
  const firstBottleneckAge = expectedNet < 0
    ? gameState.age + Math.max(1, Math.floor(gameState.spiritStones / -expectedNet * safeYears))
    : null;
  const status: SpiritStoneEconomyStatus = projectedBalance <= stage.maintenanceCost || expectedNet < -Math.max(3, gameState.spiritStones * 0.2)
    ? 'tight'
    : expectedNet > Math.max(8, expectedExpense * 0.35) && gameState.spiritStones > stage.maintenanceCost * 2
      ? 'surplus'
      : 'balanced';

  return {
    years: safeYears,
    expectedIncome,
    expectedExpense,
    expectedNet,
    projectedBalance,
    maintenanceCost: stage.maintenanceCost,
    nextMaintenanceAge: stage.maintenanceCost > 0 ? Math.max(10, Math.floor(gameState.age / 10 + 1) * 10) : null,
    firstBottleneckAge,
    status
  };
}

export function summarizeSpiritStoneLedger(
  ledger: SpiritStoneTransaction[],
  currentAge: number,
  years = 10
): { income: number; expense: number; net: number } {
  const cutoffAge = currentAge - Math.max(1, years);
  const recent = ledger.filter(entry => entry.age > cutoffAge);
  const income = recent.reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
  const expense = recent.reduce((sum, entry) => sum + Math.max(0, -entry.amount), 0);
  return { income, expense, net: income - expense };
}

let cachedReport: SpiritStoneEconomyReport | null = null;

export function getSpiritStoneEconomyReport(): SpiritStoneEconomyReport {
  cachedReport ??= simulateSpiritStoneEconomy(1_000, 20260720);
  return cachedReport;
}

export function simulateSpiritStoneEconomy(iterations = 1_000, seed = 20260720): SpiritStoneEconomyReport {
  const safeIterations = Math.max(100, Math.min(10_000, Math.round(iterations)));
  const random = createSeededRandom(seed);
  const stages = spiritStoneStageEconomy.slice(1).map(stage => {
    const initialBalance = 18 + stage.realmLevel * 12;
    let totalIncome = 0;
    let totalExpense = 0;
    let totalBalance = 0;
    let depleted = 0;
    let surplus = 0;

    for (let index = 0; index < safeIterations; index += 1) {
      const eventIncome = stage.expectedEventIncomePerTenYears * (0.45 + random() * 1.1);
      const stableIncome = stage.sectStipend * 2 + stage.spiritVeinShare;
      const income = Math.max(0, Math.round(eventIncome + stableIncome));
      const expense = Math.max(0, Math.round(
        stage.maintenanceCost + stage.expectedOptionalExpensePerTenYears * (0.55 + random() * 0.9)
      ));
      const balance = Math.max(0, initialBalance + income - expense);
      totalIncome += income;
      totalExpense += expense;
      totalBalance += balance;
      if (expense > initialBalance + income) depleted += 1;
      if (balance >= initialBalance + Math.max(8, stage.expectedEventIncomePerTenYears * 0.75)) surplus += 1;
    }

    const averageTenYearIncome = Math.round(totalIncome / safeIterations * 10) / 10;
    const averageTenYearExpense = Math.round(totalExpense / safeIterations * 10) / 10;
    const averageBalance = Math.round(totalBalance / safeIterations * 10) / 10;
    const depletionRate = depleted / safeIterations;
    const surplusRate = surplus / safeIterations;
    const averageNet = averageTenYearIncome - averageTenYearExpense;
    const status: SpiritStoneEconomyStatus = depletionRate > 0.08 || averageBalance < stage.maintenanceCost
      ? 'tight'
      : surplusRate > 0.55 && averageNet > 8
        ? 'surplus'
        : 'balanced';

    return {
      realmLevel: stage.realmLevel,
      realmName: stage.realmName,
      averageInitialBalance: initialBalance,
      averageTenYearIncome,
      averageTenYearExpense,
      averageBalance,
      depletionRate,
      surplusRate,
      firstBottleneckAge: averageNet < 0 ? Math.max(10, Math.floor(initialBalance / -averageNet * 10)) : null,
      status
    };
  });
  const warnings = stages.flatMap(stage => {
    if (stage.depletionRate > 0.15) return [`${stage.realmName}十年灵石耗尽率超过 15%，经济压力偏高。`];
    if (stage.surplusRate > 0.65) return [`${stage.realmName}灵石过剩率超过 65%，长期消耗偏弱。`];
    return [];
  });
  if (warnings.length === 0) warnings.push('各境界十年收支与资源压力均处于目标区间。');

  return { iterations: safeIterations, seed, stages, warnings };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
