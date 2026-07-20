import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCaveOrders } from '@/data/caveBuildings';
import {
  getInitialWorldMapState,
  applyExpiredWorldConsequences,
  getWorldRegionProgress,
  getRegionalBuyPriceMultiplier,
  getRegionalSellPriceMultiplier,
  getTravelPlan,
  refreshDynamicWorldEvents,
  worldFactions,
  worldRegions,
  worldRoutes
} from '@/data/worldMap';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('world map definitions', () => {
  it('covers all requested region kinds with connected valid routes', () => {
    expect(new Set(worldRegions.map(region => region.kind))).toEqual(
      new Set(['城镇', '宗门', '山脉', '秘境', '妖域', '海域'])
    );
    expect(worldRegions).toHaveLength(9);
    expect(worldFactions).toHaveLength(4);
    expect(worldRoutes.every(route => (
      worldRegions.some(region => region.id === route.from)
      && worldRegions.some(region => region.id === route.to)
    ))).toBe(true);
    expect(getTravelPlan('greenmist', 'blackstone', 'safe')).toMatchObject({ years: 3, supplies: 2 });
    expect(getTravelPlan('greenmist', 'blackstone', 'perilous')).toMatchObject({ years: 2, supplies: 1 });
  });

  it('applies local supply, demand, reputation and market-boom pricing', () => {
    const base = getInitialWorldMapState(20);
    const worldMap = {
      ...base,
      currentRegionId: 'ghost-market' as const,
      factionReputations: base.factionReputations.map(entry => entry.factionId === 'myriad-commerce'
        ? { ...entry, value: 60 }
        : entry),
      activeEvents: [{
        id: 'boom', kind: 'market-boom' as const, regionId: 'ghost-market' as const,
        title: '坊市繁荣', description: '测试', startedAge: 20, expiresAtAge: 40
      }]
    };
    expect(getRegionalBuyPriceMultiplier(worldMap, 'blood-jade')).toBeLessThan(0.75);
    expect(getRegionalBuyPriceMultiplier(worldMap, 'soul-nourishing-pill')).toBeGreaterThan(0.85);
    expect(getRegionalSellPriceMultiplier(worldMap, 'soul-nourishing-pill')).toBeGreaterThan(1.5);
    expect(getRegionalSellPriceMultiplier(worldMap, 'blood-jade')).toBeLessThan(1.2);
  });

  it('refreshes multiple dynamic events and expires the previous cycle', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const initial = getInitialWorldMapState(0);
    const first = refreshDynamicWorldEvents(initial, 10, 5);
    const second = refreshDynamicWorldEvents(first, 40, 5);
    expect(first.activeEvents).toHaveLength(3);
    expect(new Set(first.activeEvents.map(event => event.regionId)).size).toBe(3);
    expect(second.lastEventRefreshAge).toBe(40);
    expect(second.activeEvents.every(event => event.startedAge === 40)).toBe(true);
  });

  it('prioritizes local resources when creating cave orders', () => {
    const base = getInitialWorldMapState(80);
    const worldMap = { ...base, currentRegionId: 'thunder-marsh' as const };
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const orders = createCaveOrders(5, 80, worldMap);
    expect(orders.some(order => order.itemId === 'thunder-beast-core')).toBe(true);
  });

  it('turns ignored beast tides and sect wars into lasting regional pressure', () => {
    const initial = getInitialWorldMapState(20);
    const worldMap = {
      ...initial,
      activeEvents: [
        { id: 'beasts', kind: 'beast-tide' as const, regionId: 'greenmist' as const, title: '妖潮', description: '测试', startedAge: 20, expiresAtAge: 30 },
        { id: 'war', kind: 'sect-war' as const, regionId: 'blackstone' as const, title: '大战', description: '测试', startedAge: 20, expiresAtAge: 30 }
      ]
    };
    const resolved = applyExpiredWorldConsequences(worldMap, 31);
    expect(getWorldRegionProgress(resolved, 'greenmist').threat).toBeGreaterThan(getWorldRegionProgress(initial, 'greenmist').threat);
    expect(getWorldRegionProgress(resolved, 'blackstone').stability).toBeLessThan(getWorldRegionProgress(initial, 'blackstone').stability);
    expect(resolved.activeEvents).toEqual([]);
  });
});
