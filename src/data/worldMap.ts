import type {
  ActiveWorldEvent,
  CombatZoneId,
  TravelApproachId,
  WorldCommission,
  WorldEventKind,
  WorldFactionId,
  WorldMapState,
  WorldRegionId,
  WorldRegionKind
} from '@/types';

export interface WorldRegionDefinition {
  id: WorldRegionId;
  name: string;
  kind: WorldRegionKind;
  minRealmLevel: number;
  description: string;
  factionId: WorldFactionId;
  combatZoneId: CombatZoneId;
  resourceItemIds: string[];
  demandItemIds: string[];
  techniqueClue: string;
  baseDanger: number;
  mapPosition: { x: number; y: number };
}

export interface WorldRouteDefinition {
  id: string;
  from: WorldRegionId;
  to: WorldRegionId;
  baseYears: number;
  baseSupplies: number;
  description: string;
}

export interface TravelApproachDefinition {
  id: TravelApproachId;
  name: string;
  description: string;
  timeMultiplier: number;
  supplyModifier: number;
  encounterChance: number;
  explorationBonus: number;
}

export interface WorldFactionDefinition {
  id: WorldFactionId;
  name: string;
  description: string;
}

export const worldFactions: WorldFactionDefinition[] = [
  { id: 'immortal-alliance', name: '九州仙盟', description: '维系宗门与关隘秩序的正道盟约。' },
  { id: 'wandering-league', name: '四海散盟', description: '由散修、船主与探路人组成的松散同盟。' },
  { id: 'myriad-commerce', name: '万宝商会', description: '掌握坊市、渡口和跨域货路的商会。' },
  { id: 'demonic-court', name: '幽都魔庭', description: '盘踞妖域与界关暗面的魔道势力。' }
];

export const worldRegions: WorldRegionDefinition[] = [
  {
    id: 'greenmist', name: '青雾山麓', kind: '山脉', minRealmLevel: 1,
    description: '青雾终年不散，山脚坊村为初入仙途者提供落脚之处。',
    factionId: 'wandering-league', combatZoneId: 'greenmist-outskirts',
    resourceItemIds: ['spirit-herb', 'beast-core', 'spirit-seed'], demandItemIds: ['talisman-paper', 'minor-ward'],
    techniqueClue: '山壁旧刻中偶有本流派黄阶功法的线索。', baseDanger: 0.16,
    mapPosition: { x: 12, y: 78 }
  },
  {
    id: 'blackstone', name: '玄石宗域', kind: '宗门', minRealmLevel: 2,
    description: '宗门矿脉与黑石矿窟彼此相连，炼器师和护矿弟子往来频繁。',
    factionId: 'immortal-alliance', combatZoneId: 'blackstone-mine',
    resourceItemIds: ['spirit-ore', 'array-stone', 'artifact-essence'], demandItemIds: ['beast-core', 'war-talisman'],
    techniqueClue: '矿脉地火可印证黄阶功法中的行气关窍。', baseDanger: 0.22,
    mapPosition: { x: 31, y: 65 }
  },
  {
    id: 'ghost-market', name: '幽灯坊城', kind: '城镇', minRealmLevel: 3,
    description: '白日是寻常坊城，入夜后幽市开门，真货与陷阱都明码标价。',
    factionId: 'myriad-commerce', combatZoneId: 'ghost-market',
    resourceItemIds: ['blood-jade', 'old-manual-page', 'fortune-talisman'], demandItemIds: ['spirit-ore', 'soul-nourishing-pill'],
    techniqueClue: '地下拍卖偶尔流出本流派玄阶残卷。', baseDanger: 0.28,
    mapPosition: { x: 24, y: 47 }
  },
  {
    id: 'falling-star', name: '落星渡海', kind: '海域', minRealmLevel: 4,
    description: '灵舟借星潮横渡内海，渡口商路繁荣，也常有截舟者窥伺。',
    factionId: 'myriad-commerce', combatZoneId: 'falling-star-ferry',
    resourceItemIds: ['star-spirit-stone', 'purple-crystal-marrow', 'spirit-fish'], demandItemIds: ['binding-array-plate', 'mystic-spirit-pill'],
    techniqueClue: '沉舟宝舱中可能藏有本流派玄阶真本。', baseDanger: 0.34,
    mapPosition: { x: 45, y: 48 }
  },
  {
    id: 'thunder-marsh', name: '雷泽妖域', kind: '妖域', minRealmLevel: 5,
    description: '雷云压在泽国上空，异兽以天雷淬体，寻常修士不敢久留。',
    factionId: 'demonic-court', combatZoneId: 'thunder-marsh',
    resourceItemIds: ['thunder-beast-core', 'tribulation-crystal', 'dragon-blood-pill'], demandItemIds: ['protection-talisman', 'grand-array-core'],
    techniqueClue: '雷痕石碑记录着本流派地阶功法的残意。', baseDanger: 0.46,
    mapPosition: { x: 54, y: 70 }
  },
  {
    id: 'ruined-city', name: '太虚荒城', kind: '秘境', minRealmLevel: 6,
    description: '古城在虚实之间浮沉，残阵与旧日守军仍执行早已失效的命令。',
    factionId: 'immortal-alliance', combatZoneId: 'ruined-city',
    resourceItemIds: ['nether-bone', 'mystic-manual-fragment', 'soul-settling-orb'], demandItemIds: ['cinnabar-essence', 'star-spirit-stone'],
    techniqueClue: '城主府禁阁保存着本流派地阶道统。', baseDanger: 0.52,
    mapPosition: { x: 66, y: 48 }
  },
  {
    id: 'star-sea', name: '无涯星海', kind: '海域', minRealmLevel: 7,
    description: '破碎法域如岛屿漂在星海中，航路会随星潮与大战不断改写。',
    factionId: 'wandering-league', combatZoneId: 'star-sea',
    resourceItemIds: ['outer-star-sand', 'heaven-soul-jade', 'celestial-fish'], demandItemIds: ['tribulation-pill', 'immortal-talisman-page'],
    techniqueClue: '法域核心孕育着本流派天阶传承。', baseDanger: 0.6,
    mapPosition: { x: 77, y: 68 }
  },
  {
    id: 'demon-gate', name: '天魔关', kind: '宗门', minRealmLevel: 8,
    description: '仙盟关城挡在界壁裂隙之前，关内军镇与关外魔潮昼夜相争。',
    factionId: 'immortal-alliance', combatZoneId: 'heavenly-demon-gate',
    resourceItemIds: ['tribulation-ward', 'xuanhuang-marrow', 'ancient-immortal-scale'], demandItemIds: ['outer-star-sand', 'grand-array-core'],
    techniqueClue: '战功秘库允许功勋卓著者参悟本流派天阶道卷。', baseDanger: 0.68,
    mapPosition: { x: 82, y: 39 }
  },
  {
    id: 'tribulation-boundary', name: '劫海天门', kind: '秘境', minRealmLevel: 9,
    description: '九重劫意汇成海潮，天门虚影在雷光尽头若隐若现。',
    factionId: 'wandering-league', combatZoneId: 'tribulation-boundary',
    resourceItemIds: ['tribulation-crystal', 'ancient-immortal-scale', 'immortal-herb'], demandItemIds: ['xuanhuang-marrow', 'tribulation-pill'],
    techniqueClue: '天门道痕中藏有本流派仙阶功法的最后一线机缘。', baseDanger: 0.78,
    mapPosition: { x: 87, y: 17 }
  }
];

export const worldRoutes: WorldRouteDefinition[] = [
  { id: 'greenmist-blackstone', from: 'greenmist', to: 'blackstone', baseYears: 2, baseSupplies: 1, description: '沿宗门驿道穿过青雾谷。' },
  { id: 'greenmist-ghost', from: 'greenmist', to: 'ghost-market', baseYears: 3, baseSupplies: 2, description: '顺商队旧路抵达幽灯坊城。' },
  { id: 'blackstone-ghost', from: 'blackstone', to: 'ghost-market', baseYears: 2, baseSupplies: 1, description: '矿车驿路连通宗域与坊城。' },
  { id: 'blackstone-thunder', from: 'blackstone', to: 'thunder-marsh', baseYears: 4, baseSupplies: 2, description: '翻过断雷岭直入泽国边缘。' },
  { id: 'ghost-falling', from: 'ghost-market', to: 'falling-star', baseYears: 3, baseSupplies: 2, description: '随夜航商队前往落星渡口。' },
  { id: 'falling-thunder', from: 'falling-star', to: 'thunder-marsh', baseYears: 3, baseSupplies: 2, description: '溯雷河支流进入妖域。' },
  { id: 'falling-ruined', from: 'falling-star', to: 'ruined-city', baseYears: 4, baseSupplies: 2, description: '借星潮寻找荒城显化之处。' },
  { id: 'thunder-ruined', from: 'thunder-marsh', to: 'ruined-city', baseYears: 3, baseSupplies: 2, description: '穿过雷泽北部的古战场。' },
  { id: 'thunder-star', from: 'thunder-marsh', to: 'star-sea', baseYears: 6, baseSupplies: 3, description: '踏上危险的雷云天路。' },
  { id: 'ruined-star', from: 'ruined-city', to: 'star-sea', baseYears: 5, baseSupplies: 3, description: '从荒城残阵跃迁至星海。' },
  { id: 'star-demon', from: 'star-sea', to: 'demon-gate', baseYears: 3, baseSupplies: 2, description: '随守关灵舟抵达天魔关。' },
  { id: 'demon-tribulation', from: 'demon-gate', to: 'tribulation-boundary', baseYears: 5, baseSupplies: 3, description: '越过界壁，向劫海天门进发。' }
];

export const travelApproaches: TravelApproachDefinition[] = [
  { id: 'safe', name: '安途', description: '绕开险地，耗时和补给较多。', timeMultiplier: 1.25, supplyModifier: 1, encounterChance: 0.05, explorationBonus: 0 },
  { id: 'shortcut', name: '捷径', description: '节省时间，途中可能遇敌。', timeMultiplier: 0.85, supplyModifier: 0, encounterChance: 0.2, explorationBonus: 2 },
  { id: 'perilous', name: '险路', description: '最快且更容易发现机缘，但危险最高。', timeMultiplier: 0.6, supplyModifier: 0, encounterChance: 0.38, explorationBonus: 5 }
];

export function getWorldRegion(id: WorldRegionId | string | null | undefined): WorldRegionDefinition | undefined {
  return worldRegions.find(region => region.id === id);
}

export function getWorldFaction(id: WorldFactionId | string | null | undefined): WorldFactionDefinition | undefined {
  return worldFactions.find(faction => faction.id === id);
}

export function getWorldRegionForCombatZone(zoneId: CombatZoneId | string | null | undefined): WorldRegionDefinition | undefined {
  return worldRegions.find(region => region.combatZoneId === zoneId);
}

export function getWorldRoute(from: WorldRegionId, to: WorldRegionId): WorldRouteDefinition | undefined {
  return worldRoutes.find(route => (
    (route.from === from && route.to === to) || (route.from === to && route.to === from)
  ));
}

export function getConnectedWorldRegions(regionId: WorldRegionId): WorldRegionDefinition[] {
  const connectedIds = worldRoutes.flatMap(route => {
    if (route.from === regionId) return [route.to];
    if (route.to === regionId) return [route.from];
    return [];
  });
  return connectedIds.flatMap(id => {
    const region = getWorldRegion(id);
    return region ? [region] : [];
  });
}

export function isWorldRegionUnlocked(regionId: WorldRegionId, realmLevel: number): boolean {
  const region = getWorldRegion(regionId);
  return !!region && Math.max(1, realmLevel) >= region.minRealmLevel;
}

export function getWorldRegionProgress(worldMap: WorldMapState, regionId: WorldRegionId) {
  return worldMap.regionProgress.find(progress => progress.regionId === regionId) ?? {
    regionId,
    visited: regionId === 'greenmist',
    exploration: 0,
    bossDefeated: false,
    commissionsCompleted: 0
  };
}

export function getWorldFactionReputation(worldMap: WorldMapState, factionId: WorldFactionId): number {
  return worldMap.factionReputations.find(entry => entry.factionId === factionId)?.value ?? 0;
}

export function getWorldFactionTier(reputation: number): { name: string; next: number | null } {
  if (reputation >= 100) return { name: '名震一方', next: null };
  if (reputation >= 60) return { name: '座上之宾', next: 100 };
  if (reputation >= 30) return { name: '颇有声名', next: 60 };
  if (reputation >= 10) return { name: '初获认可', next: 30 };
  return { name: '籍籍无名', next: 10 };
}

export function getTravelPlan(from: WorldRegionId, to: WorldRegionId, approachId: TravelApproachId) {
  const route = getWorldRoute(from, to);
  const approach = travelApproaches.find(entry => entry.id === approachId);
  if (!route || !approach) return null;
  return {
    route,
    approach,
    years: Math.max(1, Math.ceil(route.baseYears * approach.timeMultiplier)),
    supplies: Math.max(1, route.baseSupplies + approach.supplyModifier)
  };
}

export function getWorldDanger(worldMap: WorldMapState, regionId: WorldRegionId): number {
  const region = getWorldRegion(regionId);
  if (!region) return 0;
  const event = worldMap.activeEvents.find(entry => entry.regionId === regionId);
  const eventBonus = event?.kind === 'beast-tide' ? 0.18 : event?.kind === 'sect-war' ? 0.12 : 0;
  const bossRelief = getWorldRegionProgress(worldMap, regionId).bossDefeated ? 0.08 : 0;
  return Math.max(0.05, Math.min(0.95, region.baseDanger + eventBonus - bossRelief));
}

export function getWorldExplorationMultiplier(worldMap: WorldMapState, regionId: WorldRegionId): number {
  const event = worldMap.activeEvents.find(entry => entry.regionId === regionId);
  return event?.kind === 'secret-opening' ? 1.5 : 1;
}

export function getWorldLootMultiplier(worldMap: WorldMapState, regionId: WorldRegionId): number {
  const event = worldMap.activeEvents.find(entry => entry.regionId === regionId);
  return event?.kind === 'beast-tide' ? 1.35 : event?.kind === 'secret-opening' ? 1.2 : 1;
}

export function getWorldCommissionRewardMultiplier(worldMap: WorldMapState, regionId: WorldRegionId): number {
  const event = worldMap.activeEvents.find(entry => entry.regionId === regionId);
  return event?.kind === 'sect-war' ? 1.3 : 1;
}

export function getRegionalBuyPriceMultiplier(worldMap: WorldMapState, itemId: string): number {
  const region = getWorldRegion(worldMap.currentRegionId);
  if (!region) return 1;
  const event = worldMap.activeEvents.find(entry => entry.regionId === region.id);
  const reputation = getWorldFactionReputation(worldMap, region.factionId);
  const reputationDiscount = Math.min(0.12, Math.floor(reputation / 25) * 0.03);
  const regional = region.resourceItemIds.includes(itemId) ? 0.82 : region.demandItemIds.includes(itemId) ? 1.18 : 1;
  const eventMultiplier = event?.kind === 'market-boom' ? 0.85 : 1;
  return Math.max(0.62, regional * eventMultiplier - reputationDiscount);
}

export function getRegionalSellPriceMultiplier(worldMap: WorldMapState, itemId: string): number {
  const region = getWorldRegion(worldMap.currentRegionId);
  if (!region) return 1;
  const event = worldMap.activeEvents.find(entry => entry.regionId === region.id);
  const reputation = getWorldFactionReputation(worldMap, region.factionId);
  const reputationBonus = Math.min(0.1, Math.floor(reputation / 25) * 0.025);
  const regional = region.resourceItemIds.includes(itemId) ? 0.78 : region.demandItemIds.includes(itemId) ? 1.35 : 1;
  const eventMultiplier = event?.kind === 'market-boom' ? 1.2 : 1;
  return Math.max(0.55, regional * eventMultiplier + reputationBonus);
}

export function getRegionalYieldBonus(worldMap: WorldMapState, itemId: string): number {
  const region = getWorldRegion(worldMap.currentRegionId);
  return region?.resourceItemIds.includes(itemId) ? 1 : 0;
}

export function getInitialWorldMapState(age = 0): WorldMapState {
  const worldMap: WorldMapState = {
    currentRegionId: 'greenmist',
    regionProgress: worldRegions.map(region => ({
      regionId: region.id,
      visited: region.id === 'greenmist',
      exploration: 0,
      bossDefeated: false,
      commissionsCompleted: 0
    })),
    factionReputations: worldFactions.map(faction => ({ factionId: faction.id, value: 0 })),
    activeEvents: [],
    commissions: [],
    lastEventRefreshAge: age
  };
  return {
    ...worldMap,
    commissions: createWorldCommissions(worldMap, 'greenmist', age, 1, 0)
  };
}

export function createWorldCommissions(
  worldMap: WorldMapState,
  regionId: WorldRegionId,
  age: number,
  realmLevel: number,
  currentKills: number
): WorldCommission[] {
  const region = getWorldRegion(regionId);
  if (!region) return [];
  const progress = getWorldRegionProgress(worldMap, regionId);
  const stage = Math.max(1, realmLevel);
  const resourceId = region.resourceItemIds[Math.min(region.resourceItemIds.length - 1, Math.floor((stage - 1) / 3))] ?? region.resourceItemIds[0];
  const deliveryQuantity = Math.min(5, 2 + Math.floor(stage / 3));
  const surveyTarget = Math.min(100, progress.exploration + 20);
  const duration = Math.max(20, 42 - stage * 2);
  return [
    {
      id: `world-delivery-${regionId}-${age}-${Date.now()}`,
      regionId, kind: 'delivery', title: `收购${region.name}特产`,
      description: `当地势力正在收集此地灵材，按约交付即可结算。`,
      itemId: resourceId, targetQuantity: deliveryQuantity, baseline: 0,
      spiritStoneReward: 8 + stage * 5 + deliveryQuantity * 2,
      reputationReward: 4 + Math.floor(stage / 2), expiresAtAge: age + duration
    },
    {
      id: `world-survey-${regionId}-${age}-${Date.now()}`,
      regionId, kind: 'survey', title: `补全${region.name}舆图`,
      description: `将当地探索度推进至 ${surveyTarget}% 后回报路线与地脉。`,
      targetQuantity: surveyTarget, baseline: progress.exploration,
      spiritStoneReward: 10 + stage * 6, reputationReward: 5 + Math.floor(stage / 2), expiresAtAge: age + duration
    },
    {
      id: `world-hunt-${regionId}-${age}-${Date.now()}`,
      regionId, kind: 'hunt', title: `清剿${region.name}威胁`,
      description: '在当地战斗区域击败两名敌人，恢复行路秩序。',
      combatZoneId: region.combatZoneId, targetQuantity: 2, baseline: currentKills,
      spiritStoneReward: 12 + stage * 7, reputationReward: 6 + Math.floor(stage / 2), expiresAtAge: age + duration
    }
  ];
}

export function refreshDynamicWorldEvents(worldMap: WorldMapState, age: number, realmLevel: number): WorldMapState {
  const activeEvents = worldMap.activeEvents.filter(event => event.expiresAtAge > age);
  if (age - worldMap.lastEventRefreshAge < 10 && activeEvents.length > 0) {
    return activeEvents.length === worldMap.activeEvents.length ? worldMap : { ...worldMap, activeEvents };
  }
  const unlocked = worldRegions.filter(region => region.minRealmLevel <= Math.max(1, realmLevel));
  const eventKinds: WorldEventKind[] = ['beast-tide', 'sect-war', 'secret-opening', 'market-boom'];
  const nextEvents: ActiveWorldEvent[] = [];
  const usedRegions = new Set<WorldRegionId>();
  const eventCount = Math.min(realmLevel >= 5 ? 3 : 2, unlocked.length);
  for (let index = 0; index < eventCount; index += 1) {
    const kind = eventKinds[Math.floor(Math.random() * eventKinds.length)] ?? 'beast-tide';
    const candidates = getWorldEventCandidates(unlocked, kind).filter(region => !usedRegions.has(region.id));
    const fallback = unlocked.filter(region => !usedRegions.has(region.id));
    const pool = candidates.length > 0 ? candidates : fallback;
    const region = pool[Math.floor(Math.random() * pool.length)];
    if (!region) continue;
    usedRegions.add(region.id);
    nextEvents.push(createActiveWorldEvent(kind, region.id, age, realmLevel, index));
  }
  return {
    ...worldMap,
    activeEvents: nextEvents,
    lastEventRefreshAge: age
  };
}

function getWorldEventCandidates(regions: WorldRegionDefinition[], kind: WorldEventKind): WorldRegionDefinition[] {
  if (kind === 'beast-tide') return regions.filter(region => region.kind === '山脉' || region.kind === '妖域');
  if (kind === 'sect-war') return regions.filter(region => region.kind === '宗门' || region.kind === '城镇');
  if (kind === 'secret-opening') return regions.filter(region => region.kind === '秘境' || region.kind === '山脉');
  return regions.filter(region => region.kind === '城镇' || region.kind === '海域');
}

function createActiveWorldEvent(
  kind: WorldEventKind,
  regionId: WorldRegionId,
  age: number,
  realmLevel: number,
  index: number
): ActiveWorldEvent {
  const region = getWorldRegion(regionId) ?? worldRegions[0];
  const content = {
    'beast-tide': { title: `${region.name}妖潮`, description: '妖兽活动骤增，危险与战斗掉落同时提高。' },
    'sect-war': { title: `${region.name}势力交锋`, description: '各方争夺地脉与关隘，行路更险，委托回报也更受重视。' },
    'secret-opening': { title: `${region.name}秘机显化`, description: '地脉禁制短暂松动，探索推进和稀有机缘明显提高。' },
    'market-boom': { title: `${region.name}坊市繁荣`, description: '商路畅通，购入价格下降，售出货物更容易得到高价。' }
  }[kind];
  return {
    id: `world-event-${kind}-${regionId}-${age}-${index}`,
    kind,
    regionId,
    title: content.title,
    description: content.description,
    startedAge: age,
    expiresAtAge: age + Math.max(12, 26 - realmLevel)
  };
}
