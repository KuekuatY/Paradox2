import { describe, expect, it } from 'vitest';
import { getJourneyInsights } from '@/data/journeyInsights';
import { realms } from '@/data/realms';
import { normalizeLoadedGameState } from '@/stores/gameStore';

describe('journey insights', () => {
  it('summarizes economy, build quality and actionable bottlenecks', () => {
    const state = normalizeLoadedGameState({
      currentRealm: realms[5], age: 900, lifespan: 1_000, cultivationProgress: 1_800,
      attributes: { 根骨: 100, 神识: 100, 悟性: 100, 气运: 100, 颜值: 100 },
      spiritStones: 5, cultivationPath: 'sword', selectedBuildId: 'sword-burst',
      combatStats: { victories: 3, defeats: 7, injury: 75, bestStreak: 2, currentStreak: 0 },
      spiritStoneLedger: [
        { id: 'income', age: 800, amount: 50, balance: 50, reason: '收入', category: 'world' },
        { id: 'expense', age: 850, amount: -45, balance: 5, reason: '支出', category: 'equipment' }
      ],
      events: []
    });
    const insights = getJourneyInsights(state);
    expect(insights.spiritStoneIncome).toBe(50);
    expect(insights.spiritStoneExpense).toBe(45);
    expect(insights.battleWinRate).toBe(30);
    expect(insights.bottlenecks.some(message => message.includes('突破门槛'))).toBe(true);
    expect(insights.deathRisks.some(message => message.includes('寿元'))).toBe(true);
    expect(insights.deathRisks.some(message => message.includes('伤势'))).toBe(true);
    expect(insights.recommendations.length).toBeGreaterThan(0);
  });
});
