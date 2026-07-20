import type {
  CultivationSectId,
  SectFacilityId,
  SectManagementState,
  SectNpcState,
  WorldFactionId,
  WorldRegionId
} from '@/types';

export interface SectWorldProfile {
  sectId: CultivationSectId;
  headquartersRegionId: WorldRegionId | null;
  factionId: WorldFactionId;
  specialty: string;
  territoryResourceId: string | null;
}

export interface SectFacilityDefinition {
  id: SectFacilityId;
  name: string;
  focus: string;
  description: string;
  maxLevel: number;
  baseTreasuryCost: number;
  minRank: string;
}

export interface SectFacilityBonuses {
  missionRewardMultiplier: number;
  techniqueCostMultiplier: number;
  periodicPillIncome: number;
  conflictPowerMultiplier: number;
  treasuryIncomePerTenYears: number;
  npcAffinityBonus: number;
}

export interface SectRankDefinition {
  name: string;
  minRealmLevel: number;
  merit: number;
  reputation: number;
  influence: number;
}

export const sectWorldProfiles: SectWorldProfile[] = [
  { sectId: 'loose', headquartersRegionId: null, factionId: 'wandering-league', specialty: '四海为家', territoryResourceId: null },
  { sectId: 'sword-pavilion', headquartersRegionId: 'greenmist', factionId: 'immortal-alliance', specialty: '剑冢试炼', territoryResourceId: 'spirit-blade' },
  { sectId: 'alchemy-valley', headquartersRegionId: 'greenmist', factionId: 'immortal-alliance', specialty: '丹田共生', territoryResourceId: 'spirit-herb' },
  { sectId: 'artifact-hall', headquartersRegionId: 'blackstone', factionId: 'immortal-alliance', specialty: '地火锻器', territoryResourceId: 'spirit-ore' },
  { sectId: 'talisman-court', headquartersRegionId: 'ghost-market', factionId: 'myriad-commerce', specialty: '符市行契', territoryResourceId: 'talisman-paper' },
  { sectId: 'array-gate', headquartersRegionId: 'ruined-city', factionId: 'immortal-alliance', specialty: '古城阵枢', territoryResourceId: 'array-stone' },
  { sectId: 'hehuan-sect', headquartersRegionId: 'falling-star', factionId: 'wandering-league', specialty: '星渡情缘', territoryResourceId: 'fortune-talisman' },
  { sectId: 'demonic-sect', headquartersRegionId: 'thunder-marsh', factionId: 'demonic-court', specialty: '雷泽血炼', territoryResourceId: 'blood-jade' }
];

export const sectFacilities: SectFacilityDefinition[] = [
  {
    id: 'mission-hall', name: '任务堂', focus: '任务与贡献',
    description: '整理区域委托与宗门功绩，提高任务所得和宗门影响。',
    maxLevel: 5, baseTreasuryCost: 30, minRank: '内门弟子'
  },
  {
    id: 'scripture-vault', name: '藏经楼', focus: '功法研习',
    description: '收录各地功法与注解，降低功法修炼所需灵石。',
    maxLevel: 5, baseTreasuryCost: 38, minRank: '真传弟子'
  },
  {
    id: 'alchemy-peak', name: '炼丹峰', focus: '丹药供给',
    description: '稳定供给宗门丹药，每十年为成员发放修炼资粮。',
    maxLevel: 5, baseTreasuryCost: 34, minRank: '内门弟子'
  },
  {
    id: 'guardian-array', name: '护山大阵', focus: '战争与防御',
    description: '庇护驻地与辖境，提高势力战争中的防守能力。',
    maxLevel: 5, baseTreasuryCost: 45, minRank: '执事'
  },
  {
    id: 'spirit-mine', name: '宗门灵矿', focus: '宗门财库',
    description: '经营受控区域的灵脉，周期性补充宗门财库。',
    maxLevel: 5, baseTreasuryCost: 42, minRank: '执事'
  }
];

export const sectRanks: SectRankDefinition[] = [
  { name: '外门弟子', minRealmLevel: 1, merit: 0, reputation: 0, influence: 0 },
  { name: '内门弟子', minRealmLevel: 1, merit: 40, reputation: 15, influence: 0 },
  { name: '真传弟子', minRealmLevel: 3, merit: 120, reputation: 50, influence: 5 },
  { name: '执事', minRealmLevel: 4, merit: 320, reputation: 120, influence: 15 },
  { name: '长老', minRealmLevel: 6, merit: 800, reputation: 260, influence: 40 },
  { name: '掌门', minRealmLevel: 8, merit: 1600, reputation: 520, influence: 100 }
];

const npcNames: Record<Exclude<CultivationSectId, 'loose'>, [string, string, string, string]> = {
  'sword-pavilion': ['顾寒川', '柳照影', '裴问锋', '沈听雪'],
  'alchemy-valley': ['温长青', '苏药眠', '陆青禾', '白芷'],
  'artifact-hall': ['岳重炉', '霍明砂', '石惊火', '商晚钟'],
  'talisman-court': ['宁玄墨', '符清秋', '江照纸', '谢灵章'],
  'array-gate': ['周天衡', '林枢月', '许观星', '楚归盘'],
  'hehuan-sect': ['花无昼', '洛含烟', '晏知情', '孟星遥'],
  'demonic-sect': ['厉九阴', '殷红绡', '燕骨生', '阎照夜']
};

const personalities = ['严谨寡言', '温和耐心', '锋芒好胜', '洒脱重情'];

export function getSectWorldProfile(sectId: CultivationSectId | null | undefined): SectWorldProfile | undefined {
  return sectWorldProfiles.find(profile => profile.sectId === sectId);
}

export function getSectsAtRegion(regionId: WorldRegionId): CultivationSectId[] {
  return sectWorldProfiles
    .filter(profile => profile.headquartersRegionId === regionId)
    .map(profile => profile.sectId);
}

export function isAtSectHeadquarters(sectId: CultivationSectId, regionId: WorldRegionId): boolean {
  const headquarters = getSectWorldProfile(sectId)?.headquartersRegionId;
  return sectId === 'loose' || headquarters === regionId;
}

export function getSectFacility(id: SectFacilityId | string | null | undefined): SectFacilityDefinition | undefined {
  return sectFacilities.find(facility => facility.id === id);
}

export function getSectFacilityLevel(management: SectManagementState | null | undefined, id: SectFacilityId): number {
  return Math.max(0, Math.min(5, Math.round(management?.facilityLevels[id] ?? 0)));
}

export function getSectFacilityUpgradeCost(facility: SectFacilityDefinition, currentLevel: number): number {
  const level = Math.max(0, Math.round(currentLevel));
  return Math.round(facility.baseTreasuryCost * (1 + level * 1.35));
}

export function getSectFacilityBonuses(management: SectManagementState | null | undefined): SectFacilityBonuses {
  const level = (id: SectFacilityId) => getSectFacilityLevel(management, id);
  return {
    missionRewardMultiplier: 1 + level('mission-hall') * 0.08,
    techniqueCostMultiplier: Math.max(0.76, 1 - level('scripture-vault') * 0.048),
    periodicPillIncome: level('alchemy-peak'),
    conflictPowerMultiplier: 1 + level('guardian-array') * 0.07,
    treasuryIncomePerTenYears: level('spirit-mine') * 8,
    npcAffinityBonus: Math.floor((level('mission-hall') + level('scripture-vault')) / 3)
  };
}

export function getSectRankIndex(rank: string): number {
  if (rank === '太上长老') return sectRanks.length - 1;
  return Math.max(0, sectRanks.findIndex(definition => definition.name === rank));
}

export function getNextSectRank(rank: string): SectRankDefinition | null {
  return sectRanks[getSectRankIndex(rank) + 1] ?? null;
}

export function canPromoteSectRank(
  rank: string,
  realmLevel: number,
  merit: number,
  reputation: number,
  influence: number
): boolean {
  const next = getNextSectRank(rank);
  return !!next
    && realmLevel >= next.minRealmLevel
    && merit >= next.merit
    && reputation >= next.reputation
    && influence >= next.influence;
}

export function createInitialSectManagement(sectId: CultivationSectId | null, playerAge: number, realmLevel: number): SectManagementState {
  return {
    facilityLevels: sectId && sectId !== 'loose' ? { 'mission-hall': 1 } : {},
    treasury: sectId && sectId !== 'loose' ? 20 : 0,
    influence: 0,
    npcs: sectId && sectId !== 'loose' ? createSectNpcs(sectId, playerAge, realmLevel) : [],
    lastDiscipleRecruitAge: null
  };
}

export function createSectNpcs(
  sectId: Exclude<CultivationSectId, 'loose'>,
  playerAge: number,
  realmLevel: number
): SectNpcState[] {
  const names = npcNames[sectId];
  const roles: SectNpcState['role'][] = ['master', 'peer', 'rival', 'companion'];
  return names.map((name, index) => {
    const role = roles[index];
    const ageOffset = role === 'master' ? 80 + realmLevel * 12 : role === 'peer' ? 3 : role === 'rival' ? 5 : 1;
    const age = Math.max(15, playerAge + ageOffset);
    const npcRealmLevel = Math.max(1, Math.min(9, realmLevel + (role === 'master' ? 2 : role === 'rival' ? 1 : 0)));
    const combatMaxHp = getSectNpcCombatMaxHp(npcRealmLevel);
    return {
      id: `sect-npc-${sectId}-${index + 1}`,
      name,
      role,
      personality: personalities[index],
      sectId,
      realmLevel: npcRealmLevel,
      age,
      lifespan: age + 180 + realmLevel * 80,
      affinity: role === 'master' ? 30 : role === 'rival' ? -10 : role === 'companion' ? 20 : 10,
      active: true,
      lastInteractionAge: null,
      combatHp: combatMaxHp,
      combatMaxHp,
      injury: 0
    };
  });
}

export function createDiscipleNpc(sectId: CultivationSectId, playerAge: number, index: number): SectNpcState {
  const combatMaxHp = getSectNpcCombatMaxHp(1);
  return {
    id: `sect-disciple-${sectId}-${playerAge}-${index}`,
    name: ['阿宁', '叶小满', '楚见微', '顾远山'][index % 4],
    role: 'disciple',
    personality: personalities[index % personalities.length],
    sectId,
    realmLevel: 1,
    age: 15,
    lifespan: 180,
    affinity: 25,
    active: true,
    lastInteractionAge: null,
    combatHp: combatMaxHp,
    combatMaxHp,
    injury: 0
  };
}

export function getSectNpcCombatMaxHp(realmLevel: number): number {
  return 70 + Math.max(1, Math.min(9, Math.round(realmLevel))) * 35;
}
