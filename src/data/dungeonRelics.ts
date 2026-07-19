import type { DungeonRouteId } from '@/types';

export interface DungeonRelicDefinition {
  id: string;
  name: string;
  description: string;
  bonuses: {
    attack?: number;
    defense?: number;
    maxHp?: number;
    maxQi?: number;
    speed?: number;
    reward?: number;
  };
}

export const dungeonRelics: DungeonRelicDefinition[] = [
  { id: 'relic-blood-jade', name: '血玉髓', description: '最大生命提高 20%', bonuses: { maxHp: 0.2 } },
  { id: 'relic-sword-mark', name: '古剑痕', description: '攻击提高 15%', bonuses: { attack: 0.15 } },
  { id: 'relic-mountain-seal', name: '镇岳印', description: '防御提高 18%', bonuses: { defense: 0.18 } },
  { id: 'relic-cloud-step', name: '流云履', description: '速度提高 15%', bonuses: { speed: 0.15 } },
  { id: 'relic-spirit-spring', name: '灵泉眼', description: '最大真气提高 30%', bonuses: { maxQi: 0.3 } },
  { id: 'relic-treasure-lamp', name: '寻宝灯', description: '秘境通关奖励提高 25%', bonuses: { reward: 0.25 } }
];

export const dungeonRoutes: Array<{ id: DungeonRouteId; name: string; description: string }> = [
  { id: 'steady', name: '稳行', description: '维持标准敌人与奖励' },
  { id: 'perilous', name: '险行', description: '敌人更强，通关奖励每项 +1' }
];

export function getDungeonRelic(id: string): DungeonRelicDefinition | undefined {
  return dungeonRelics.find(relic => relic.id === id);
}

export function drawDungeonRelicOptions(ownedIds: string[], count = 3): string[] {
  const available = dungeonRelics.filter(relic => !ownedIds.includes(relic.id));
  return [...available]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(relic => relic.id);
}
