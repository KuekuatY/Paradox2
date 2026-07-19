import { codexMilestones, getCodexProgress, getDiscoveredEquipmentIds } from '@/data/codex';
import { combatZones, equipmentDefinitions, getCombatZoneProgress } from '@/data/combatZones';
import { getItem } from '@/data/items';
import { getMarketRefreshCost, getMarketSellPrice } from '@/data/market';
import { useGameStore } from '@/stores/gameStore';

export function MarketPanel({ className = '' }: { className?: string }) {
  const { gameState, refreshMarket, buyMarketItem, sellInventoryItem } = useGameStore();
  const refreshCost = getMarketRefreshCost(gameState.currentRealm.level);
  const busy = !!gameState.pendingEvent || !!gameState.pendingCombat || !!gameState.pendingTribulation;
  const sellable = gameState.inventory.filter(entry => {
    const reserved = Object.values(gameState.equipment).includes(entry.itemId) ? 1 : 0;
    return entry.quantity > reserved && getMarketSellPrice(entry.itemId) > 0;
  });

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">坊市</h2>
          <p className="mt-1 text-sm font-semibold text-[#66766e]">家境 {gameState.familyWealth}</p>
        </div>
        <button
          type="button"
          disabled={busy || gameState.familyWealth < refreshCost}
          onClick={refreshMarket}
          className="rounded-md border border-[#738275]/30 bg-[#eef3df] px-3 py-2 text-xs font-bold text-[#355d58] disabled:opacity-50"
        >
          刷新货单 · 家境 {refreshCost}
        </button>
      </div>

      <section>
        <div className="mb-2 text-sm font-bold text-[#45564f]">本期货单</div>
        {gameState.market.offers.length === 0 ? (
          <div className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 p-3 text-sm text-[#66766e]">货物已售罄。</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {gameState.market.offers.map(offer => {
              const item = getItem(offer.itemId);
              const affordable = gameState.familyWealth >= offer.price;
              return (
                <div key={offer.id} className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-[#355d58]">{item?.name ?? offer.itemId}</div>
                      <div className="mt-0.5 text-xs text-[#66766e]">{item?.type} · {item?.rarity} · x{offer.quantity}</div>
                    </div>
                    <span className="text-xs font-bold text-[#9a5b2f]">家境 {offer.price}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busy || !affordable}
                    onClick={() => buyMarketItem(offer.id)}
                    className={`mt-3 w-full rounded border px-2 py-1.5 text-xs font-bold ${!busy && affordable
                      ? 'border-[#355d58]/35 bg-[#355d58] text-[#fff9e8]'
                      : 'border-[#738275]/15 bg-[#eee8d4]/55 text-[#8d947f]'
                    }`}
                  >
                    买入
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-5 border-t border-[#738275]/20 pt-4">
        <div className="mb-2 text-sm font-bold text-[#45564f]">出售物品</div>
        {sellable.length === 0 ? (
          <div className="text-sm text-[#66766e]">没有可出售的额外物品。</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sellable.map(entry => {
              const item = getItem(entry.itemId);
              const price = getMarketSellPrice(entry.itemId);
              return (
                <div key={entry.itemId} className="flex items-center justify-between gap-3 rounded border border-[#738275]/15 bg-[#fff9e8]/55 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#45564f]">{item?.name ?? entry.itemId} x{entry.quantity}</div>
                    <div className="text-xs text-[#66766e]">单价 家境 {price}</div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => sellInventoryItem(entry.itemId)}
                    className="shrink-0 rounded border border-[#9a5b2f]/30 bg-[#f0dfad]/55 px-3 py-1.5 text-xs font-bold text-[#7a5426] disabled:opacity-50"
                  >
                    卖出 1 件
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function CodexPanel() {
  const { gameState, claimCodexMilestone } = useGameStore();
  const discoveredEquipment = new Set(getDiscoveredEquipmentIds(gameState));
  const busy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || !!gameState.pendingTribulation
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || gameState.pendingFeatOptions.length > 0;

  return (
    <div className="ink-panel rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">修仙图鉴</h2>
          <p className="mt-1 text-xs font-semibold text-[#66766e]">
            法器 {discoveredEquipment.size}/{equipmentDefinitions.length} · 首领 {gameState.combatZoneProgress.filter(progress => progress.bossDefeated).length}/{combatZones.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {codexMilestones.map(milestone => {
          const progress = getCodexProgress(gameState, milestone);
          const claimed = gameState.claimedCodexMilestones.includes(milestone.id);
          const complete = progress >= milestone.target;
          const rewardText = [
            ...Object.entries(milestone.effects ?? {}).map(([key, value]) => `${key} +${value}`),
            ...(milestone.itemRewards ?? []).map(reward => `${getItem(reward.itemId)?.name ?? reward.itemId} x${reward.quantity}`)
          ].join(' · ');
          return (
            <div key={milestone.id} className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-[#355d58]">{milestone.name}</div>
                  <div className="mt-0.5 text-xs text-[#66766e]">{milestone.description}</div>
                </div>
                <span className="text-xs font-bold text-[#6d634d]">{Math.min(progress, milestone.target)}/{milestone.target}</span>
              </div>
              <div className="mt-2 min-h-[20px] text-xs font-semibold text-[#7a5426]">奖励：{rewardText}</div>
              <button
                type="button"
                disabled={!complete || claimed || busy}
                onClick={() => claimCodexMilestone(milestone.id)}
                className={`mt-2 w-full rounded border px-2 py-1.5 text-xs font-bold ${complete && !claimed && !busy
                  ? 'border-[#9a5b2f]/40 bg-[#f0dfad]/70 text-[#7a5426]'
                  : 'border-[#738275]/15 bg-[#eee8d4]/55 text-[#8d947f]'
                }`}
              >
                {claimed ? '已领取' : complete ? '领取奖励' : '尚未完成'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[#738275]/20 pt-4">
        <div className="mb-2 text-sm font-bold text-[#45564f]">法器收集</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {equipmentDefinitions.map(definition => {
            const item = getItem(definition.itemId);
            const found = discoveredEquipment.has(definition.itemId);
            return (
              <div key={definition.itemId} className={`rounded border px-2 py-2 text-center text-xs font-bold ${found
                ? 'border-[#355d58]/25 bg-[#e7eddd]/60 text-[#355d58]'
                : 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
              }`}>
                {found ? item?.name : '未发现'}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-[#738275]/20 pt-4">
        <div className="mb-2 text-sm font-bold text-[#45564f]">敌人与首领</div>
        <div className="space-y-1.5">
          {combatZones.map(zone => {
            const progress = getCombatZoneProgress(gameState.combatZoneProgress, zone.id);
            return (
              <div key={zone.id} className="flex items-center justify-between gap-3 rounded border border-[#738275]/15 bg-[#fff9e8]/50 px-3 py-2 text-xs">
                <span className="font-bold text-[#45564f]">{zone.enemy} · {zone.bossName}</span>
                <span className={progress.bossDefeated ? 'font-bold text-[#355d58]' : 'text-[#66766e]'}>
                  击杀 {progress.kills} · 首领 {progress.bossWins}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
