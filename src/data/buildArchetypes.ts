import { getEquipmentAffix } from '@/data/combatZones';
import { getFeat, getSpell } from '@/data/dndFeatures';
import { getDungeonRelic } from '@/data/dungeonRelics';
import { getItem } from '@/data/items';
import type { CultivationPathId, EquipmentAffixId, GameState } from '@/types';

export interface BuildCombatBonuses {
  attack?: number;
  defense?: number;
  maxHp?: number;
  maxQi?: number;
  speed?: number;
  dodge?: number;
  criticalChance?: number;
  statusChance?: number;
}

export interface BuildArchetype {
  id: string;
  pathId: CultivationPathId;
  name: string;
  summary: string;
  playstyle: string;
  featIds: string[];
  spellIds: string[];
  equipmentIds: string[];
  affixIds: EquipmentAffixId[];
  relicIds: string[];
  bonuses: BuildCombatBonuses;
}

export interface BuildSynergyCheck {
  label: string;
  detail: string;
  matched: boolean;
}

export interface BuildScore {
  build: BuildArchetype;
  score: number;
  checks: BuildSynergyCheck[];
}

export const buildArchetypes: BuildArchetype[] = [
  {
    id: 'sword-flow', pathId: 'sword', name: '流光剑阵', summary: '先攻、速度与连续出剑', playstyle: '抢先破势，以短冷却剑招持续压血线。',
    featIds: ['sword-heart'], spellIds: ['sword-flash-step', 'sword-thousand-edge'], equipmentIds: ['starfall-blade', 'sword-heart-sheath'], affixIds: ['nimble', 'sword-heart'], relicIds: ['relic-cloud-step', 'relic-sword-mark'],
    bonuses: { attack: 0.07, speed: 3, criticalChance: 0.025 }
  },
  {
    id: 'sword-breaker', pathId: 'sword', name: '破甲斩关', summary: '破甲、暴击与斩杀', playstyle: '先用破线一剑瓦解防御，再以重剑招收束。',
    featIds: ['sword-heart', 'sect-war-banner'], spellIds: ['sword-breaking-line', 'sword-thousand-edge'], equipmentIds: ['tribulation-edge', 'sword-heart-sheath'], affixIds: ['keen', 'sword-heart'], relicIds: ['relic-sword-mark', 'relic-edge-echo'],
    bonuses: { attack: 0.1, criticalChance: 0.035, statusChance: 0.04 }
  },
  {
    id: 'sword-sheath', pathId: 'sword', name: '藏锋守御', summary: '护盾、反击与持久战', playstyle: '藏锋减伤，等敌势衰竭后反攻。',
    featIds: ['clear-dao-heart', 'sword-heart'], spellIds: ['sword-guarding-sheath', 'sword-breaking-line'], equipmentIds: ['minor-ward', 'sword-heart-sheath'], affixIds: ['stalwart', 'spirit-bound'], relicIds: ['relic-mountain-seal', 'relic-spirit-spring'],
    bonuses: { defense: 0.1, maxHp: 0.08, maxQi: 10 }
  },
  {
    id: 'body-bulwark', pathId: 'body', name: '不坏金身', summary: '生命、护盾与减伤', playstyle: '以高生命和护盾磨过首领的危险阶段。',
    featIds: ['iron-body', 'tribulation-afterglow'], spellIds: ['body-warding-breath', 'body-earth-root'], equipmentIds: ['thunder-ward-armor', 'body-blood-bracer'], affixIds: ['body-forged', 'stalwart'], relicIds: ['relic-blood-jade', 'relic-mountain-seal'],
    bonuses: { maxHp: 0.14, defense: 0.08 }
  },
  {
    id: 'body-counter', pathId: 'body', name: '震岳反击', summary: '防守反击与眩晕', playstyle: '正面承伤，以反震和控制夺回节奏。',
    featIds: ['iron-body', 'sect-war-banner'], spellIds: ['body-counter-pulse', 'body-mountain-crash'], equipmentIds: ['thunder-ward-armor', 'body-blood-bracer'], affixIds: ['body-forged', 'keen'], relicIds: ['relic-mountain-seal', 'relic-trial-heart'],
    bonuses: { attack: 0.06, defense: 0.08, statusChance: 0.05 }
  },
  {
    id: 'body-blood', pathId: 'body', name: '血炉长生', summary: '恢复、气血与续航', playstyle: '依靠恢复和生命上限完成连续秘境。',
    featIds: ['iron-body', 'clear-dao-heart'], spellIds: ['body-warding-breath', 'body-earth-root'], equipmentIds: ['xuanhuang-robe', 'body-blood-bracer'], affixIds: ['body-forged', 'spirit-bound'], relicIds: ['relic-blood-jade', 'relic-spring-vessel'],
    bonuses: { maxHp: 0.11, maxQi: 14, defense: 0.05 }
  },
  {
    id: 'spell-control', pathId: 'spell', name: '五行禁阵', summary: '封灵、控制与状态命中', playstyle: '限制敌方技能，用阵式和异常状态掌控回合。',
    featIds: ['spell-weaving', 'hundred-arts-hands'], spellIds: ['spell-misty-array', 'spell-nine-thunder'], equipmentIds: ['spell-five-element-seal', 'soul-settling-orb'], affixIds: ['spell-channel', 'spirit-bound'], relicIds: ['relic-spirit-spring', 'relic-seal-script'],
    bonuses: { maxQi: 22, statusChance: 0.08, dodge: 1 }
  },
  {
    id: 'spell-burst', pathId: 'spell', name: '九霄雷火', summary: '高耗法术与爆发', playstyle: '积蓄真气，以雷火法术迅速结束战斗。',
    featIds: ['spell-weaving', 'sect-war-banner'], spellIds: ['spell-fire-seal', 'spell-nine-thunder'], equipmentIds: ['starfall-blade', 'spell-five-element-seal'], affixIds: ['spell-channel', 'keen'], relicIds: ['relic-spirit-spring', 'relic-thunder-heart'],
    bonuses: { attack: 0.09, maxQi: 28, criticalChance: 0.02 }
  },
  {
    id: 'spell-cycle', pathId: 'spell', name: '清心万法', summary: '冷却、恢复与稳定循环', playstyle: '清除负面状态，在长战中维持法术循环。',
    featIds: ['clear-dao-heart', 'spell-weaving'], spellIds: ['spell-clear-mind', 'spell-misty-array'], equipmentIds: ['xuanhuang-robe', 'spell-five-element-seal'], affixIds: ['spell-channel', 'stalwart'], relicIds: ['relic-spirit-spring', 'relic-spring-vessel'],
    bonuses: { defense: 0.07, maxQi: 24, maxHp: 0.06 }
  },
  {
    id: 'demonic-poison', pathId: 'demonic', name: '万毒噬魂', summary: '中毒、封灵与持续伤害', playstyle: '叠加毒煞并封锁敌方技能，以持续伤害取胜。',
    featIds: ['demonic-nerve', 'clear-dao-heart'], spellIds: ['demonic-shadow-grip', 'demonic-soul-devour'], equipmentIds: ['demonic-soul-banner', 'soul-settling-orb'], affixIds: ['blood-mark', 'spirit-bound'], relicIds: ['relic-poison-vial', 'relic-seal-script'],
    bonuses: { statusChance: 0.1, attack: 0.05, maxQi: 12 }
  },
  {
    id: 'demonic-blood', pathId: 'demonic', name: '血河夺命', summary: '吸血、爆发与高风险', playstyle: '用血契制造高额伤害，并从斩杀中恢复。',
    featIds: ['demonic-nerve', 'sect-war-banner'], spellIds: ['demonic-blood-oath', 'demonic-soul-devour'], equipmentIds: ['tribulation-edge', 'demonic-soul-banner'], affixIds: ['blood-mark', 'keen'], relicIds: ['relic-blood-jade', 'relic-edge-echo'],
    bonuses: { attack: 0.11, maxHp: 0.06, criticalChance: 0.025 }
  },
  {
    id: 'demonic-shadow', pathId: 'demonic', name: '匿影夺机', summary: '闪避、先攻与资源收益', playstyle: '避开正面对撞，依靠速度和机缘稳定探险。',
    featIds: ['fortune-sense', 'demonic-nerve'], spellIds: ['demonic-hidden-vein', 'demonic-shadow-grip'], equipmentIds: ['demonic-soul-banner', 'heaven-soul-jade'], affixIds: ['nimble', 'blood-mark'], relicIds: ['relic-cloud-step', 'relic-treasure-lamp'],
    bonuses: { dodge: 2, speed: 3, attack: 0.05 }
  }
];

export function getBuildArchetype(id: string | null | undefined): BuildArchetype | undefined {
  return id ? buildArchetypes.find(build => build.id === id) : undefined;
}

export function getPathBuilds(pathId: CultivationPathId | null | undefined): BuildArchetype[] {
  return pathId ? buildArchetypes.filter(build => build.pathId === pathId) : [];
}

export function scoreBuild(gameState: GameState, build: BuildArchetype): BuildScore {
  const equippedItems = Object.values(gameState.equipment).filter((itemId): itemId is string => !!itemId);
  const equippedAffixes = gameState.equipmentAffixes
    .filter(entry => equippedItems.includes(entry.itemId))
    .map(entry => entry.affixId);
  const ownedRelics = new Set([
    ...gameState.discoveredRelicIds,
    ...(gameState.dungeonRun?.relicIds ?? [])
  ]);
  const checkGroups: Array<{ label: string; wanted: string[]; owned: string[]; resolve: (id: string) => string }> = [
    { label: '专长', wanted: build.featIds, owned: gameState.feats, resolve: id => getFeat(id)?.name ?? id },
    { label: '法术', wanted: build.spellIds, owned: gameState.equippedSpellIds, resolve: id => getSpell(id)?.name ?? id },
    { label: '装备', wanted: build.equipmentIds, owned: equippedItems, resolve: id => getItem(id)?.name ?? id },
    { label: '词缀', wanted: build.affixIds, owned: equippedAffixes, resolve: id => getEquipmentAffix(id)?.name ?? id },
    { label: '遗物', wanted: build.relicIds, owned: Array.from(ownedRelics), resolve: id => getDungeonRelic(id)?.name ?? id }
  ];
  const checks = checkGroups.map(group => {
    const matchedIds = group.wanted.filter(id => group.owned.includes(id));
    return {
      label: group.label,
      detail: group.wanted.map(group.resolve).join(' / '),
      matched: matchedIds.length > 0
    };
  });
  const matchedCount = checks.filter(check => check.matched).length;
  const techniqueLevels = gameState.techniques.reduce((sum, technique) => sum + technique.level, 0);
  const foundationScore = gameState.cultivationPath === build.pathId ? 15 : 0;
  const techniqueScore = Math.min(10, Math.floor(techniqueLevels / 2));
  return { build, checks, score: Math.min(100, foundationScore + techniqueScore + matchedCount * 15) };
}

export function getRecommendedBuild(gameState: GameState): BuildScore | null {
  const scores = getPathBuilds(gameState.cultivationPath).map(build => scoreBuild(gameState, build));
  return scores.sort((left, right) => right.score - left.score || left.build.id.localeCompare(right.build.id))[0] ?? null;
}

export function getSelectedBuildBonuses(gameState: GameState): BuildCombatBonuses {
  const build = getBuildArchetype(gameState.selectedBuildId);
  if (!build || build.pathId !== gameState.cultivationPath) return {};
  const synergy = 0.55 + scoreBuild(gameState, build).score / 220;
  return Object.fromEntries(Object.entries(build.bonuses).map(([key, value]) => [key, value * synergy])) as BuildCombatBonuses;
}
