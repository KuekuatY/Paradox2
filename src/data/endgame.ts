import { getSectRankIndex } from '@/data/sectWorld';
import { realms } from '@/data/realms';
import type { AscensionPreparationId, GameState, InventoryReward } from '@/types';

export interface AscensionPreparationDefinition {
  id: AscensionPreparationId;
  name: string;
  description: string;
  timeCost: number;
  spiritStoneCost: number;
  progressPercentCost: number;
  itemCosts: InventoryReward[];
}

export interface EndgameRequirement {
  id: string;
  label: string;
  current: number;
  target: number;
}

export const ASCENSION_PREPARATION_TARGET = 3;
export const INVASION_VICTORY_TARGET = 3;

export const ascensionPreparations: AscensionPreparationDefinition[] = [
  {
    id: 'body', name: '仙躯淬炼', description: '以劫晶和玄黄精粹重塑肉身，使其能承受天门之后的法则。',
    timeCost: 20, spiritStoneCost: 60, progressPercentCost: 0.05,
    itemCosts: [{ itemId: 'tribulation-crystal', quantity: 2 }, { itemId: 'xuanhuang-marrow', quantity: 1 }]
  },
  {
    id: 'soul', name: '元神归一', description: '借天魂玉和定魂法器收束神识，避免飞升时元神离散。',
    timeCost: 20, spiritStoneCost: 60, progressPercentCost: 0.05,
    itemCosts: [{ itemId: 'heaven-soul-jade', quantity: 1 }, { itemId: 'soul-settling-orb', quantity: 1 }]
  },
  {
    id: 'fate', name: '命数定锚', description: '以护劫之物校正命数，让气运在天门开启时不被劫海冲散。',
    timeCost: 20, spiritStoneCost: 80, progressPercentCost: 0.05,
    itemCosts: [{ itemId: 'tribulation-ward', quantity: 1 }, { itemId: 'fortune-talisman', quantity: 1 }]
  }
];

export function getAscensionPreparation(id: AscensionPreparationId | string): AscensionPreparationDefinition | undefined {
  return ascensionPreparations.find(preparation => preparation.id === id);
}

export function getEndgameRequirements(gameState: GameState): EndgameRequirement[] {
  const finalRealm = realms[realms.length - 1];
  const requiredProgress = finalRealm.cultivationRequired;
  const requiresLeadership = !!gameState.sect && gameState.sect.sectId !== 'loose';
  const leadershipReady = !requiresLeadership
    || gameState.endgame.leadershipWon
    || getSectRankIndex(gameState.sect?.rank ?? '') >= getSectRankIndex('掌门');
  return [
    { id: 'realm', label: '抵达渡劫期', current: gameState.currentRealm.level, target: finalRealm.level },
    { id: 'progress', label: '修为圆满', current: Math.min(requiredProgress, gameState.cultivationProgress), target: requiredProgress },
    { id: 'body', label: '仙躯淬炼', current: gameState.endgame.ascensionPreparation.body, target: ASCENSION_PREPARATION_TARGET },
    { id: 'soul', label: '元神归一', current: gameState.endgame.ascensionPreparation.soul, target: ASCENSION_PREPARATION_TARGET },
    { id: 'fate', label: '命数定锚', current: gameState.endgame.ascensionPreparation.fate, target: ASCENSION_PREPARATION_TARGET },
    { id: 'invasion', label: '击退界域入侵', current: gameState.endgame.invasionVictories, target: INVASION_VICTORY_TARGET },
    { id: 'leadership', label: requiresLeadership ? '赢得掌门议决' : '散修道心自证', current: leadershipReady ? 1 : 0, target: 1 },
    { id: 'legacy', label: '立定飞升道愿', current: gameState.endgame.legacyChoice ? 1 : 0, target: 1 },
    { id: 'heaven-gate', label: '击败天门道影', current: gameState.endgame.heavenGateDefeated ? 1 : 0, target: 1 }
  ];
}

export function isAscensionReady(gameState: GameState): boolean {
  return getEndgameRequirements(gameState).every(requirement => requirement.current >= requirement.target);
}
