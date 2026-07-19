import type { CombatZoneId, DungeonRouteId } from '@/types';

export interface DungeonRelicBonuses {
  attack?: number;
  defense?: number;
  maxHp?: number;
  maxQi?: number;
  speed?: number;
  reward?: number;
  dodge?: number;
  criticalChance?: number;
  statusChance?: number;
}

export interface DungeonRelicDefinition {
  id: string;
  name: string;
  description: string;
  bonuses: DungeonRelicBonuses;
  zoneIds?: CombatZoneId[];
  setId?: string;
}

export interface DungeonRelicSetDefinition {
  id: string;
  name: string;
  relicIds: string[];
  description: string;
  bonuses: DungeonRelicBonuses;
}

const earlyZones: CombatZoneId[] = ['greenmist-outskirts', 'blackstone-mine', 'ghost-market'];
const midZones: CombatZoneId[] = ['falling-star-ferry', 'thunder-marsh', 'ruined-city'];
const lateZones: CombatZoneId[] = ['star-sea', 'heavenly-demon-gate', 'tribulation-boundary'];

export const dungeonRelics: DungeonRelicDefinition[] = [
  { id: 'relic-blood-jade', name: '血玉髓', description: '最大生命提高 20%', bonuses: { maxHp: 0.2 }, setId: 'blood-edge-set' },
  { id: 'relic-sword-mark', name: '古剑痕', description: '攻击提高 15%', bonuses: { attack: 0.15 } },
  { id: 'relic-mountain-seal', name: '镇岳印', description: '防御提高 18%', bonuses: { defense: 0.18 } },
  { id: 'relic-cloud-step', name: '流云履', description: '速度提高 15%，闪避提高 1', bonuses: { speed: 0.15, dodge: 1 } },
  { id: 'relic-spirit-spring', name: '灵泉眼', description: '最大真气提高 30%', bonuses: { maxQi: 0.3 }, setId: 'spring-cycle-set' },
  { id: 'relic-treasure-lamp', name: '寻宝灯', description: '秘境通关奖励提高 25%', bonuses: { reward: 0.25 } },
  { id: 'relic-edge-echo', name: '断锋回响', description: '攻击提高 9%，暴击率提高 3%', bonuses: { attack: 0.09, criticalChance: 0.03 }, zoneIds: earlyZones, setId: 'blood-edge-set' },
  { id: 'relic-spring-vessel', name: '青瓷泉盏', description: '最大真气提高 18%，防御提高 6%', bonuses: { maxQi: 0.18, defense: 0.06 }, zoneIds: earlyZones, setId: 'spring-cycle-set' },
  { id: 'relic-hunter-talisman', name: '山行猎符', description: '速度提高 8%，奖励提高 10%', bonuses: { speed: 0.08, reward: 0.1 }, zoneIds: earlyZones },
  { id: 'relic-thunder-heart', name: '雷泽心核', description: '攻击提高 10%，状态命中提高 6%', bonuses: { attack: 0.1, statusChance: 0.06 }, zoneIds: midZones, setId: 'thunder-seal-set' },
  { id: 'relic-seal-script', name: '幽封残诏', description: '防御提高 8%，状态命中提高 8%', bonuses: { defense: 0.08, statusChance: 0.08 }, zoneIds: midZones, setId: 'thunder-seal-set' },
  { id: 'relic-poison-vial', name: '万毒琉璃瓶', description: '状态命中提高 12%，最大真气提高 10%', bonuses: { statusChance: 0.12, maxQi: 0.1 }, zoneIds: midZones },
  { id: 'relic-trial-heart', name: '问心古镜', description: '最大生命与防御各提高 10%', bonuses: { maxHp: 0.1, defense: 0.1 }, zoneIds: lateZones, setId: 'star-trial-set' },
  { id: 'relic-star-compass', name: '星海罗盘', description: '速度提高 12%，暴击率提高 4%', bonuses: { speed: 0.12, criticalChance: 0.04 }, zoneIds: lateZones, setId: 'star-trial-set' },
  { id: 'relic-immortal-shard', name: '仙阙残片', description: '攻击、防御与奖励各提高 8%', bonuses: { attack: 0.08, defense: 0.08, reward: 0.08 }, zoneIds: lateZones }
];

export const dungeonRelicSets: DungeonRelicSetDefinition[] = [
  { id: 'blood-edge-set', name: '血锋共鸣', relicIds: ['relic-blood-jade', 'relic-edge-echo'], description: '攻击额外提高 10%，最大生命提高 8%', bonuses: { attack: 0.1, maxHp: 0.08 } },
  { id: 'spring-cycle-set', name: '灵泉周天', relicIds: ['relic-spirit-spring', 'relic-spring-vessel'], description: '最大真气额外提高 20%，防御提高 8%', bonuses: { maxQi: 0.2, defense: 0.08 } },
  { id: 'thunder-seal-set', name: '雷封法域', relicIds: ['relic-thunder-heart', 'relic-seal-script'], description: '攻击提高 8%，状态命中提高 10%', bonuses: { attack: 0.08, statusChance: 0.1 } },
  { id: 'star-trial-set', name: '星镜问心', relicIds: ['relic-trial-heart', 'relic-star-compass'], description: '暴击率提高 5%，闪避提高 2', bonuses: { criticalChance: 0.05, dodge: 2 } }
];

export const dungeonRoutes: Array<{ id: DungeonRouteId; name: string; description: string }> = [
  { id: 'steady', name: '稳行', description: '维持标准敌人与奖励' },
  { id: 'perilous', name: '险行', description: '敌人更强，通关奖励每项 +1' }
];

export function getDungeonRelic(id: string): DungeonRelicDefinition | undefined {
  return dungeonRelics.find(relic => relic.id === id);
}

export function getActiveDungeonRelicSets(ownedIds: string[]): DungeonRelicSetDefinition[] {
  const owned = new Set(ownedIds);
  return dungeonRelicSets.filter(set => set.relicIds.every(id => owned.has(id)));
}

export function getDungeonRelicBonuses(ownedIds: string[]): DungeonRelicBonuses {
  const sources = [
    ...ownedIds.map(getDungeonRelic).filter((relic): relic is DungeonRelicDefinition => !!relic).map(relic => relic.bonuses),
    ...getActiveDungeonRelicSets(ownedIds).map(set => set.bonuses)
  ];
  return sources.reduce<DungeonRelicBonuses>((total, bonuses) => ({
    attack: (total.attack ?? 0) + (bonuses.attack ?? 0),
    defense: (total.defense ?? 0) + (bonuses.defense ?? 0),
    maxHp: (total.maxHp ?? 0) + (bonuses.maxHp ?? 0),
    maxQi: (total.maxQi ?? 0) + (bonuses.maxQi ?? 0),
    speed: (total.speed ?? 0) + (bonuses.speed ?? 0),
    reward: (total.reward ?? 0) + (bonuses.reward ?? 0),
    dodge: (total.dodge ?? 0) + (bonuses.dodge ?? 0),
    criticalChance: (total.criticalChance ?? 0) + (bonuses.criticalChance ?? 0),
    statusChance: (total.statusChance ?? 0) + (bonuses.statusChance ?? 0)
  }), {});
}

export function drawDungeonRelicOptions(ownedIds: string[], count = 3, zoneId?: CombatZoneId): string[] {
  const available = dungeonRelics.filter(relic => (
    !ownedIds.includes(relic.id)
    && (!relic.zoneIds || !zoneId || relic.zoneIds.includes(zoneId))
  ));
  return [...available]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(relic => relic.id);
}
