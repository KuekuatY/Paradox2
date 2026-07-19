import { codexMilestones, getCodexProgress, getDiscoveredEquipmentIds } from '@/data/codex';
import { combatZones, equipmentDefinitions, getCombatZoneProgress } from '@/data/combatZones';
import { getItem, items } from '@/data/items';
import { getItemKnowledge } from '@/data/itemKnowledge';
import { getMarketRefreshCost, getMarketSellPrice } from '@/data/market';
import { useGameStore } from '@/stores/gameStore';
import { getPathQuestProgress, pathQuests } from '@/data/pathQuests';
import { getCultivationPath } from '@/data/cultivationPaths';
import { getBalanceReport } from '@/data/balanceSimulator';

export function BalanceReportPanel() {
  const report = getBalanceReport();
  return (
    <div className="ink-panel rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="ink-title text-xl font-bold">数值推演</h2>
          <p className="mt-1 text-xs font-semibold text-[#66766e]">固定种子 {report.seed} · 每流派 {report.iterations} 次完整轮回</p>
        </div>
        <span className="rounded border border-[#738275]/20 bg-[#eef3df]/65 px-2 py-1 text-xs font-bold text-[#355d58]">开发报告</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {report.paths.map(path => (
          <div key={path.pathId} className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#355d58]">{path.pathName}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${path.status === 'stable'
                ? 'bg-[#e7eddd] text-[#355d58]'
                : path.status === 'watch' ? 'bg-[#f0dfad]/65 text-[#7a5426]' : 'bg-[#f2d9d2] text-[#9d3d2f]'
              }`}>{path.status === 'stable' ? '稳定' : path.status === 'watch' ? '观察' : '风险'}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-[#66766e]">
              <span>飞升率 {Math.round(path.completionRate * 100)}%</span>
              <span>平均飞升 {path.averageAscensionAge ?? '--'} 岁</span>
              <span>门槛等待 {path.averageGateWait} 年</span>
              <span>战斗指数 {path.combatIndex}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1 rounded-md border border-[#738275]/20 bg-[#fff9e8]/65 px-3 py-2 text-xs leading-relaxed text-[#66766e]">
        {report.warnings.map(warning => <div key={warning}>· {warning}</div>)}
      </div>
    </div>
  );
}

export function MarketPanel({ className = '' }: { className?: string }) {
  const { gameState, refreshMarket, buyMarketItem, sellInventoryItem } = useGameStore();
  const refreshCost = getMarketRefreshCost(gameState.currentRealm.level);
  const busy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
  const sellable = gameState.inventory.filter(entry => {
    const reserved = Object.values(gameState.equipment).includes(entry.itemId) ? 1 : 0;
    return entry.quantity > reserved && getMarketSellPrice(entry.itemId) > 0;
  });

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">坊市</h2>
          <p className="mt-1 text-sm font-semibold text-[#66766e]">
            家境 {gameState.familyWealth} · 行情 {gameState.market.priceTrend > 1.05 ? '走高' : gameState.market.priceTrend < 0.95 ? '走低' : '平稳'}
          </p>
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
        <div className="mb-2 text-sm font-bold text-[#45564f]">法器拍卖</div>
        {gameState.market.auction ? (() => {
          const auction = gameState.market.auction;
          const item = getItem(auction.itemId);
          const affordable = gameState.familyWealth >= auction.price;
          return (
            <div className="rounded-md border border-[#a9823c]/30 bg-[#f0dfad]/35 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-[#7a5426]">{item?.name ?? auction.itemId}</div>
                  <div className="mt-0.5 text-xs text-[#66766e]">{item?.rarity} · 本期唯一</div>
                </div>
                <span className="text-xs font-bold text-[#9a5b2f]">家境 {auction.price}</span>
              </div>
              <button
                type="button"
                disabled={busy || !affordable}
                onClick={() => buyMarketItem(auction.id)}
                className="mt-3 w-full rounded border border-[#9a5b2f]/35 bg-[#f0dfad]/70 px-2 py-1.5 text-xs font-bold text-[#7a5426] disabled:opacity-45"
              >
                竞得法器
              </button>
            </div>
          );
        })() : (
          <div className="text-sm text-[#66766e]">本期没有法器上拍。</div>
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
            法器 {discoveredEquipment.size}/{equipmentDefinitions.length} · 首领 {gameState.combatZoneProgress.filter(progress => progress.bossDefeated).length}/{combatZones.length} · 配方 {gameState.craftedRecipeIds.length} · 遗物 {gameState.discoveredRelicIds.length}
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

      <div className="mt-4 border-t border-[#738275]/20 pt-4">
        <div className="mb-2 text-sm font-bold text-[#45564f]">物品来源索引</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(item => {
            const knowledge = getItemKnowledge(item.id);
            return (
              <div key={item.id} className="rounded border border-[#738275]/15 bg-[#fff9e8]/50 px-3 py-2 text-xs leading-relaxed">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#355d58]">{item.name}</span>
                  <span className="text-[#6d634d]">{item.type} · {item.rarity}</span>
                </div>
                <div className="mt-1 text-[#66766e]">来源：{knowledge.sources.slice(0, 3).join('、')}</div>
                <div className="mt-0.5 text-[#66766e]">用途：{knowledge.uses.slice(0, 3).join('、')}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PathQuestPanel({ className = '' }: { className?: string }) {
  const { gameState, claimPathQuest } = useGameStore();
  const quests = pathQuests.filter(quest => quest.pathId === gameState.cultivationPath);
  const path = getCultivationPath(gameState.cultivationPath);
  const busy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
  if (!path || quests.length === 0) return null;

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="ink-title text-xl font-bold">{path.name}道途</h2>
        <p className="mt-1 text-xs font-semibold text-[#66766e]">三阶段传承</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {quests.map(quest => {
          const progress = getPathQuestProgress(gameState, quest);
          const claimed = gameState.claimedPathQuests.includes(quest.id);
          const previousClaimed = quest.stage === 1 || gameState.claimedPathQuests.includes(`${quest.pathId}-quest-${quest.stage - 1}`);
          const complete = progress >= quest.target && previousClaimed;
          const reward = quest.spellRewardId
            ? '专属主动技能'
            : quest.itemRewards?.map(item => `${getItem(item.itemId)?.name ?? item.itemId} x${item.quantity}`).join('、')
              ?? quest.permanentDescription
              ?? '道途奖励';
          return (
            <div key={quest.id} className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-[#9a5b2f]">第 {quest.stage} 阶段</div>
                  <div className="font-bold text-[#355d58]">{quest.name}</div>
                </div>
                <span className="text-xs font-bold text-[#6d634d]">{Math.min(progress, quest.target)}/{quest.target}</span>
              </div>
              <p className="mt-1 min-h-[32px] text-xs leading-relaxed text-[#66766e]">{quest.description}</p>
              <div className="mt-2 text-xs font-semibold text-[#7a5426]">奖励：{reward}</div>
              <button
                type="button"
                disabled={busy || !complete || claimed}
                onClick={() => claimPathQuest(quest.id)}
                className="mt-2 w-full rounded border border-[#9a5b2f]/25 bg-[#f0dfad]/55 px-2 py-1.5 text-xs font-bold text-[#7a5426] disabled:opacity-45"
              >
                {claimed ? '已完成' : previousClaimed ? complete ? '领取奖励' : '进行中' : '前序未完成'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
