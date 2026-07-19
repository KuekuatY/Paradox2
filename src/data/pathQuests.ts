import { getSpell } from '@/data/dndFeatures';
import type { CultivationPathId, GameState, InventoryReward } from '@/types';

export interface PathQuestDefinition {
  id: string;
  pathId: CultivationPathId;
  stage: 1 | 2 | 3;
  name: string;
  description: string;
  kind: 'casts' | 'bosses' | 'signature';
  target: number;
  signatureText?: string;
  spellRewardId?: string;
  itemRewards?: InventoryReward[];
  permanentDescription?: string;
}

const pathSettings: Record<CultivationPathId, {
  names: [string, string, string];
  descriptions: [string, string, string];
  signature: string;
  spellRewardId: string;
  artifactId: string;
  permanentDescription: string;
}> = {
  sword: {
    names: ['剑出有痕', '斩关问锋', '万剑归心'],
    descriptions: ['在实战中施展主动剑诀', '击败不同区域首领', '以剑诀施加流血或打断敌势'],
    signature: '流血', spellRewardId: 'sword-breaking-line', artifactId: 'sword-heart-sheath', permanentDescription: '主动技能伤害永久 +8%'
  },
  body: {
    names: ['气血成罡', '肉身镇关', '不坏道胎'],
    descriptions: ['在实战中施展炼体秘术', '击败不同区域首领', '在战斗中生成或消耗护盾'],
    signature: '护盾', spellRewardId: 'body-counter-pulse', artifactId: 'body-blood-bracer', permanentDescription: '护盾效果永久 +12%'
  },
  spell: {
    names: ['术式初成', '法印破关', '万法归藏'],
    descriptions: ['在实战中施展主动法术', '击败不同区域首领', '以法术施加灼烧、封灵或眩晕'],
    signature: '施加了', spellRewardId: 'spell-fire-seal', artifactId: 'spell-five-element-seal', permanentDescription: '技能冷却永久 -1 回合'
  },
  demonic: {
    names: ['魔念化术', '血路斩关', '夺道证心'],
    descriptions: ['在实战中施展主动禁术', '击败不同区域首领', '以禁术施加中毒、流血或吸取生命'],
    signature: '恢复', spellRewardId: 'demonic-blood-oath', artifactId: 'demonic-soul-banner', permanentDescription: '状态命中永久 +12%'
  }
};

export const pathQuests: PathQuestDefinition[] = (Object.keys(pathSettings) as CultivationPathId[]).flatMap(pathId => {
  const setting = pathSettings[pathId];
  return [
    { id: `${pathId}-quest-1`, pathId, stage: 1, name: setting.names[0], description: setting.descriptions[0], kind: 'casts', target: 5, spellRewardId: setting.spellRewardId },
    { id: `${pathId}-quest-2`, pathId, stage: 2, name: setting.names[1], description: setting.descriptions[1], kind: 'bosses', target: 3, itemRewards: [{ itemId: setting.artifactId, quantity: 1 }] },
    { id: `${pathId}-quest-3`, pathId, stage: 3, name: setting.names[2], description: setting.descriptions[2], kind: 'signature', target: 8, signatureText: setting.signature, permanentDescription: setting.permanentDescription }
  ];
});

export function getPathQuestProgress(gameState: GameState, quest: PathQuestDefinition): number {
  if (quest.kind === 'bosses') return gameState.combatZoneProgress.filter(progress => progress.bossDefeated).length;
  const rounds = gameState.events.flatMap(event => event.combat?.rounds ?? []);
  if (quest.kind === 'casts') {
    return rounds.filter(round => {
      const spell = round.playerSpellId ? getSpell(round.playerSpellId) : undefined;
      return spell?.pathId === quest.pathId;
    }).length;
  }
  return rounds.filter(round => {
    const spell = round.playerSpellId ? getSpell(round.playerSpellId) : undefined;
    return spell?.pathId === quest.pathId && round.statusText?.includes(quest.signatureText ?? '');
  }).length;
}

export function getPathQuestCombatBonuses(gameState: Pick<GameState, 'claimedPathQuests' | 'cultivationPath'>): {
  skillDamageMultiplier: number;
  shieldMultiplier: number;
  statusChance: number;
  cooldownReduction: number;
} {
  const mastered = !!gameState.cultivationPath && gameState.claimedPathQuests.includes(`${gameState.cultivationPath}-quest-3`);
  return {
    skillDamageMultiplier: mastered && gameState.cultivationPath === 'sword' ? 1.08 : 1,
    shieldMultiplier: mastered && gameState.cultivationPath === 'body' ? 1.12 : 1,
    statusChance: mastered && gameState.cultivationPath === 'demonic' ? 0.12 : 0,
    cooldownReduction: mastered && gameState.cultivationPath === 'spell' ? 1 : 0
  };
}

export function isPathQuestSpellReward(spellId: string): boolean {
  return pathQuests.some(quest => quest.spellRewardId === spellId);
}
