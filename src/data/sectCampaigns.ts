import type { GameEvent, SectNpcRole } from '@/types';

export interface SectCampaignChoiceDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'event' | 'combat';
  timeCost: number;
  spiritStoneCost?: number;
  combatDifficultyMultiplier?: number;
  effects: GameEvent['effects'];
  sect: {
    contribution?: number;
    merit?: number;
    reputation?: number;
    influence?: number;
    treasury?: number;
  };
  world: {
    stability?: number;
    prosperity?: number;
    threat?: number;
  };
  affinity: Partial<Record<SectNpcRole, number>>;
  consequence: string;
}

export interface SectCampaignStageDefinition {
  id: string;
  name: string;
  description: string;
  choices: [SectCampaignChoiceDefinition, SectCampaignChoiceDefinition];
}

export const sectCampaignStages: SectCampaignStageDefinition[] = [
  {
    id: 'hidden-current',
    name: '山门暗线',
    description: '辖境灵材账目出现缺口，线索同时指向外敌和宗门内部。',
    choices: [
      {
        id: 'investigate-personally', name: '亲自查访', description: '耗时梳理账册并拜访同门，稳妥查清内情。',
        kind: 'event', timeCost: 2, effects: { 神识: 2, 悟性: 1 },
        sect: { merit: 18, reputation: 8, influence: 3 }, world: { stability: 5, threat: -3 },
        affinity: { peer: 6, companion: 4 }, consequence: '同门开始信任你的判断，辖境暗线被逐步拔除。'
      },
      {
        id: 'post-bounty', name: '发布悬赏', description: '动用财库和门人迅速撒网，效率更高但容易打草惊蛇。',
        kind: 'event', timeCost: 1, effects: { 气运: 1 },
        sect: { treasury: -12, merit: 12, influence: 5 }, world: { stability: 2, threat: 2 },
        affinity: { rival: 7, master: 2 }, consequence: '悬赏很快带回消息，也让幕后之人察觉宗门已有动作。'
      }
    ]
  },
  {
    id: 'spirit-convoy',
    name: '灵舟护送',
    description: '一批关系宗门建设的物资必须穿过受扰商路送回驻地。',
    choices: [
      {
        id: 'escort-convoy', name: '正面护送', description: '率队沿主路护送灵舟，以一场硬仗打通商路。',
        kind: 'combat', timeCost: 2, combatDifficultyMultiplier: 1.08, effects: { 根骨: 2, 修为: 5 },
        sect: { contribution: 30, merit: 30, reputation: 12, treasury: 18 }, world: { stability: 7, prosperity: 6, threat: -8 },
        affinity: { companion: 7, rival: 5 }, consequence: '灵舟完整抵达，主路重开，你在同门中的威望明显提高。'
      },
      {
        id: 'secret-detour', name: '改走密道', description: '以个人灵石雇佣向导，避开正面冲突但放任敌人盘踞。',
        kind: 'event', timeCost: 3, spiritStoneCost: 15, effects: { 气运: 2 },
        sect: { contribution: 18, merit: 18, treasury: 12 }, world: { prosperity: 3, threat: 4 },
        affinity: { peer: 4, master: -2 }, consequence: '物资安全抵达，但商路上的威胁仍在积聚。'
      }
    ]
  },
  {
    id: 'border-dispute',
    name: '边境争端',
    description: '邻近势力要求重新划分灵脉边界，宗门内部也分成主和与主战两派。',
    choices: [
      {
        id: 'border-negotiation', name: '赴会谈判', description: '拿出资源和证据争取互市，用长期繁荣换取眼前克制。',
        kind: 'event', timeCost: 2, spiritStoneCost: 20, effects: { 颜值: 2, 神识: 2 },
        sect: { reputation: 20, influence: 6, treasury: -8 }, world: { stability: 10, prosperity: 9, threat: -5 },
        affinity: { master: 5, peer: 6, rival: -4 }, consequence: '边境开启互市，宗门获得稳定声望，但主战派认为你过于克制。'
      },
      {
        id: 'border-assault', name: '先破敌阵', description: '以战斗夺回阵眼和灵脉，让对手在谈判前失去筹码。',
        kind: 'combat', timeCost: 2, combatDifficultyMultiplier: 1.18, effects: { 根骨: 3, 修为: 7 },
        sect: { contribution: 40, merit: 40, influence: 10, treasury: 24 }, world: { stability: -4, prosperity: -3, threat: -10 },
        affinity: { rival: 10, companion: 3, master: 2 }, consequence: '敌阵被破，灵脉归宗门掌控，但边境民生受到战火波及。'
      }
    ]
  },
  {
    id: 'territory-policy',
    name: '辖境定策',
    description: '风波平息后，宗门需要决定如何经营新获得的秩序与资源。',
    choices: [
      {
        id: 'protect-people', name: '休养生息', description: '减免征收并修复阵路，让辖境先恢复稳定与繁荣。',
        kind: 'event', timeCost: 3, effects: { 悟性: 2, 气运: 2 },
        sect: { reputation: 24, influence: 8, treasury: -10 }, world: { stability: 15, prosperity: 14, threat: -8 },
        affinity: { master: 5, peer: 8, companion: 8, disciple: 10 }, consequence: '辖境民心归附，宗门得到一片能长久供养弟子的根基。'
      },
      {
        id: 'expand-spirit-mine', name: '扩采灵脉', description: '趁局势已定扩大开采，以短期资源推动宗门迅速壮大。',
        kind: 'event', timeCost: 2, effects: { 根骨: 2, 神识: 1 },
        sect: { treasury: 55, influence: 12, merit: 20 }, world: { stability: -8, prosperity: -6, threat: 7 },
        affinity: { rival: 8, disciple: -5 }, consequence: '宗门财库迅速充盈，但过度开采为辖境留下了新的隐患。'
      }
    ]
  }
];

export function getSectCampaignStage(stage: number): SectCampaignStageDefinition | undefined {
  return sectCampaignStages[Math.max(0, Math.round(stage))];
}

export function getSectCampaignChoice(stage: number, choiceId: string): SectCampaignChoiceDefinition | undefined {
  return getSectCampaignStage(stage)?.choices.find(choice => choice.id === choiceId);
}
