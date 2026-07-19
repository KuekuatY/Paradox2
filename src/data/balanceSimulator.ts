import { buildArchetypes } from '@/data/buildArchetypes';
import { cultivationPaths } from '@/data/cultivationPaths';
import { realms } from '@/data/realms';
import type { Attributes, CultivationPathId } from '@/types';

export interface BalancePathReport {
  pathId: CultivationPathId;
  pathName: string;
  completionRate: number;
  averageAscensionAge: number | null;
  averageGateWait: number;
  combatIndex: number;
  buildSpread: number;
  status: 'stable' | 'watch' | 'risk';
}

export interface BalanceReport {
  iterations: number;
  seed: number;
  paths: BalancePathReport[];
  warnings: string[];
}

let cachedReport: BalanceReport | null = null;

export function getBalanceReport(): BalanceReport {
  cachedReport ??= simulateBalanceReport(1_000, 20260720);
  return cachedReport;
}

export function simulateBalanceReport(iterations = 1_000, seed = 20260720): BalanceReport {
  const safeIterations = Math.max(100, Math.min(10_000, Math.round(iterations)));
  const random = createSeededRandom(seed);
  const paths = cultivationPaths.map(path => {
    const results = Array.from({ length: safeIterations }, () => simulateLife(path.id, random));
    const completed = results.filter(result => result.completed);
    const completionRate = completed.length / safeIterations;
    const averageAscensionAge = completed.length > 0
      ? Math.round(completed.reduce((sum, result) => sum + result.age, 0) / completed.length)
      : null;
    const averageGateWait = Math.round(results.reduce((sum, result) => sum + result.gateWait, 0) / safeIterations * 10) / 10;
    const combatIndex = getPathCombatIndex(path.id);
    const buildSpread = getPathBuildSpread(path.id);
    const status: BalancePathReport['status'] = completionRate < 0.38 || averageGateWait > 420
      ? 'risk'
      : completionRate < 0.58 || averageGateWait > 260 || buildSpread > 18
        ? 'watch'
        : 'stable';
    return { pathId: path.id, pathName: path.name, completionRate, averageAscensionAge, averageGateWait, combatIndex, buildSpread, status };
  });
  const completionRates = paths.map(path => path.completionRate);
  const combatIndexes = paths.map(path => path.combatIndex);
  const warnings: string[] = [];
  if (Math.max(...completionRates) - Math.min(...completionRates) > 0.18) warnings.push('流派飞升率差距超过 18%，需要检查中后期属性门槛。');
  if (Math.max(...combatIndexes) - Math.min(...combatIndexes) > 22) warnings.push('流派战斗指数差距偏大，弱势构筑可能依赖特定装备。');
  paths.filter(path => path.status === 'risk').forEach(path => warnings.push(`${path.pathName}存在高风险：飞升率或门槛等待时间超出目标区间。`));
  paths.filter(path => path.buildSpread > 18).forEach(path => warnings.push(`${path.pathName}三套构筑强度跨度较大，建议复查协同加成。`));
  if (warnings.length === 0) warnings.push('本轮模拟未发现超过阈值的主线失衡。');
  return { iterations: safeIterations, seed, paths, warnings };
}

function simulateLife(pathId: CultivationPathId, random: () => number): { completed: boolean; age: number; gateWait: number } {
  const path = cultivationPaths.find(entry => entry.id === pathId) ?? cultivationPaths[0];
  const attributes: Attributes = { 根骨: 18, 神识: 18, 悟性: 18, 气运: 18, 颜值: 18 };
  Object.entries(path.effect).forEach(([key, value]) => {
    if (key in attributes && typeof value === 'number') attributes[key as keyof Attributes] += value;
  });
  let age = 10;
  let gateWait = 0;
  for (let targetLevel = 2; targetLevel <= 9; targetLevel += 1) {
    const target = realms[targetLevel];
    const growthScale = targetLevel <= 3 ? 1 : targetLevel <= 6 ? 1.42 : 1.9;
    const progressYears = Math.ceil((target.cultivationRequired / (17 + targetLevel * 3)) / (path.modifiers.修为倍率 ?? 1));
    for (let year = 0; year < progressYears; year += 1) {
      growAttributes(attributes, pathId, growthScale, random);
      age += 1;
    }
    let waiting = 0;
    while (!meetsRequirements(attributes, target.requirements.attributes) && waiting < Math.max(100, targetLevel * 90)) {
      growAttributes(attributes, pathId, growthScale * 1.12, random);
      age += 1;
      waiting += 1;
    }
    gateWait += waiting;
    if (!meetsRequirements(attributes, target.requirements.attributes) || age >= target.maxAge) return { completed: false, age, gateWait };
    const breakthroughChance = Math.min(0.92, 0.69 + attributes.气运 / 2400 + (path.modifiers.灾劫抗性 ?? 0) * 0.35);
    if (random() > breakthroughChance && random() > 0.52) {
      age += Math.ceil(8 * targetLevel);
      gateWait += Math.ceil(8 * targetLevel);
    }
  }
  return { completed: true, age, gateWait };
}

function growAttributes(attributes: Attributes, pathId: CultivationPathId, scale: number, random: () => number): void {
  const focus: Record<CultivationPathId, Array<keyof Attributes>> = {
    sword: ['根骨', '神识'], body: ['根骨', '气运'], spell: ['神识', '悟性'], demonic: ['气运', '神识']
  };
  (Object.keys(attributes) as Array<keyof Attributes>).forEach(key => {
    const focused = focus[pathId].includes(key);
    const variance = 0.72 + random() * 0.7;
    attributes[key] += (focused ? 1.45 : 0.92) * scale * variance;
  });
}

function meetsRequirements(attributes: Attributes, requirements: Partial<Attributes>): boolean {
  return Object.entries(requirements).every(([key, value]) => attributes[key as keyof Attributes] >= (value ?? 0));
}

function getPathCombatIndex(pathId: CultivationPathId): number {
  const builds = buildArchetypes.filter(build => build.pathId === pathId);
  return Math.round(builds.reduce((sum, build) => sum
    + (build.bonuses.attack ?? 0) * 220
    + (build.bonuses.defense ?? 0) * 150
    + (build.bonuses.maxHp ?? 0) * 120
    + (build.bonuses.maxQi ?? 0) * 0.45
    + (build.bonuses.speed ?? 0) * 2
    + (build.bonuses.dodge ?? 0) * 5
    + (build.bonuses.statusChance ?? 0) * 100, 0) / Math.max(1, builds.length));
}

function getPathBuildSpread(pathId: CultivationPathId): number {
  const ratings = buildArchetypes.filter(build => build.pathId === pathId).map(build => (
    (build.bonuses.attack ?? 0) * 220
    + (build.bonuses.defense ?? 0) * 150
    + (build.bonuses.maxHp ?? 0) * 120
    + (build.bonuses.maxQi ?? 0) * 0.45
    + (build.bonuses.statusChance ?? 0) * 100
  ));
  return Math.round(Math.max(...ratings) - Math.min(...ratings));
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
