import { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import {
  caveBuildings,
  caveProductionRecipes,
  getCaveBuildingLevel,
  getCaveBuildingSlots,
  getCaveOrderRefreshCost,
  getCavePassiveBonuses,
  getCaveProductionCapacity,
  getCaveRecipe,
  getCaveUpgradeCost,
  isCaveBuildingActive,
  isCaveProductionComplete
} from '@/data/caveBuildings';
import { getItem } from '@/data/items';
import type { GameState, InventoryReward } from '@/types';

export default function CavePanel({ className = '' }: { className?: string }) {
  const {
    gameState,
    toggleCaveBuilding,
    upgradeCaveBuilding,
    startCaveProduction,
    claimCaveProduction,
    refreshCaveOrders,
    claimCaveOrder,
    inspectCave
  } = useGameStore();
  const [batchSize, setBatchSize] = useState<1 | 3 | 5>(1);
  const busy = isGameBusy(gameState);
  const cave = gameState.cave;
  const unlocked = gameState.currentRealm.level >= 2;
  const bonuses = getCavePassiveBonuses(cave);
  const completedJobs = cave.productionQueue.filter(job => isCaveProductionComplete(job, gameState.age));
  const activeRecipes = caveProductionRecipes.filter(recipe => (
    gameState.currentRealm.level >= recipe.minRealmLevel
      && isCaveBuildingActive(cave, recipe.buildingId)
  ));
  const refreshCost = getCaveOrderRefreshCost(gameState.currentRealm.level);

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">洞府经营</h2>
          <p className="mt-1 text-xs font-semibold text-[#66766e]">
            激活建筑 {cave.activeBuildingIds.length}/{getCaveBuildingSlots(cave)} · 生产队列 {cave.productionQueue.length}/{getCaveProductionCapacity(cave)}
          </p>
        </div>
        <div className="text-right text-sm font-bold text-[#9a5b2f]">灵石 {gameState.spiritStones}</div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CaveMetric label="灵脉分润" value={`+${bonuses.stoneIncomePerTenYears}/十年`} />
        <CaveMetric label="维护减免" value={`-${bonuses.maintenanceReduction}`} />
        <CaveMetric label="功法折耗" value={`${Math.round((1 - bonuses.techniqueCostMultiplier) * 100)}%`} />
        <CaveMetric label="订单加成" value={`+${Math.round((bonuses.orderRewardMultiplier - 1) * 100)}%`} />
      </div>

      <section>
        <SectionTitle title="洞府建筑" note="激活建筑才会提供效果或开放对应生产。" />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {caveBuildings.map(building => {
            const level = getCaveBuildingLevel(cave, building.id);
            const active = isCaveBuildingActive(cave, building.id);
            const locked = gameState.currentRealm.level < building.minRealmLevel;
            const cost = getCaveUpgradeCost(building, level);
            const affordable = gameState.spiritStones >= cost.spiritStones
              && cost.materials.every(material => getInventoryQuantity(gameState, material.itemId) >= material.quantity);
            const hasQueuedProduction = cave.productionQueue.some(job => getCaveRecipe(job.recipeId)?.buildingId === building.id);
            const canToggle = !locked && level > 0 && !hasQueuedProduction && (active || cave.activeBuildingIds.length < getCaveBuildingSlots(cave));
            return (
              <div key={building.id} className={`rounded-md border p-3 ${active
                ? 'border-[#355d58]/35 bg-[#e7eddd]/60'
                : 'border-[#738275]/20 bg-[#fffdf2]/70'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-[#355d58]">{building.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-[#7a5426]">{building.focus}</div>
                  </div>
                  <span className="shrink-0 rounded bg-[#fff9e8] px-2 py-0.5 text-xs font-bold text-[#6d634d]">
                    {locked ? `境界 ${building.minRealmLevel} 解锁` : `Lv.${level}/${building.maxLevel}`}
                  </span>
                </div>
                <p className="mt-2 min-h-[42px] text-xs leading-relaxed text-[#66766e]">{building.description}</p>
                <div className="mt-2 text-xs font-semibold text-[#6d634d]">
                  {level >= building.maxLevel ? '建筑效果已达圆满' : `下一级：灵石 ${cost.spiritStones} · ${formatCosts(cost.materials)}`}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={busy || !canToggle}
                    onClick={() => toggleCaveBuilding(building.id)}
                    className={`rounded border px-2 py-1.5 text-xs font-bold ${active
                      ? 'border-[#355d58]/30 bg-[#eef3df] text-[#355d58]'
                      : 'border-[#738275]/25 bg-[#fff9e8] text-[#7a5426]'
                    } disabled:opacity-45`}
                  >
                    {hasQueuedProduction ? '生产中' : active ? '停用建筑' : '激活建筑'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || locked || level >= building.maxLevel || !affordable || gameState.age >= gameState.lifespan - 1}
                    onClick={() => upgradeCaveBuilding(building.id)}
                    className="rounded border border-[#9a5b2f]/30 bg-[#f0dfad]/60 px-2 py-1.5 text-xs font-bold text-[#7a5426] disabled:opacity-45"
                  >
                    {level >= building.maxLevel ? '已达上限' : level === 0 ? '建造' : '升级'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 border-t border-[#738275]/20 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionTitle title="生产队列" note="生产会随年龄推进完成，离线修行也会结算。" />
          <div className="flex overflow-hidden rounded border border-[#738275]/20 bg-[#fff9e8]">
            {([1, 3, 5] as const).map(size => (
              <button key={size} type="button" onClick={() => setBatchSize(size)} className={`px-2 py-1 text-xs font-bold ${batchSize === size ? 'bg-[#355d58] text-[#fff9e8]' : 'text-[#66766e]'}`}>x{size}</button>
            ))}
          </div>
        </div>
        {cave.productionQueue.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {cave.productionQueue.map(job => {
              const recipe = getCaveRecipe(job.recipeId);
              const progress = recipe ? Math.min(100, Math.max(0, Math.round((gameState.age - job.startedAge) / Math.max(1, job.completesAtAge - job.startedAge) * 100))) : 0;
              return (
                <div key={job.id} className="rounded border border-[#738275]/15 bg-[#fff9e8]/55 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#45564f]">{recipe?.name ?? job.recipeId} x{job.quantity}</span>
                    <span className="font-semibold text-[#7a5426]">{isCaveProductionComplete(job, gameState.age) ? '已完成' : `${progress}% · ${job.completesAtAge} 岁`}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#eee8d4]"><div className="h-full bg-[#6d9a7c]" style={{ width: `${progress}%` }} /></div>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {activeRecipes.length === 0 ? (
            <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/55 px-3 py-3 text-xs text-[#66766e]">请先激活丹房、炼器室或其他生产建筑。</div>
          ) : activeRecipes.map(recipe => {
            const scaledCosts = recipe.costs.map(cost => ({ ...cost, quantity: cost.quantity * batchSize }));
            const scaledRewards = recipe.rewards.map(reward => ({ ...reward, quantity: reward.quantity * batchSize }));
            const affordable = scaledCosts.every(cost => getInventoryQuantity(gameState, cost.itemId) >= cost.quantity);
            const capacity = cave.productionQueue.length < getCaveProductionCapacity(cave);
            return (
              <div key={recipe.id} className="rounded border border-[#738275]/15 bg-[#fff9e8]/55 px-3 py-2">
                <div className="font-bold text-[#355d58]">{recipe.name}</div>
                <div className="mt-1 text-xs leading-relaxed text-[#66766e]">{recipe.description}</div>
                <div className="mt-1 text-xs font-semibold text-[#6d634d]">耗材：{formatCosts(scaledCosts)} · 产出：{formatCosts(scaledRewards)}</div>
                <button
                  type="button"
                  disabled={busy || !affordable || !capacity}
                  onClick={() => startCaveProduction(recipe.id, batchSize)}
                  className="mt-2 w-full rounded border border-[#355d58]/25 bg-[#eef3df] px-2 py-1.5 text-xs font-bold text-[#355d58] disabled:opacity-45"
                >
                  {!capacity ? '队列已满' : affordable ? '开始生产' : '材料不足'}
                </button>
              </div>
            );
          })}
        </div>
        {completedJobs.length > 0 && (
          <button type="button" disabled={busy} onClick={claimCaveProduction} className="mt-2 w-full rounded border border-[#9a5b2f]/30 bg-[#f0dfad]/65 px-2 py-2 text-xs font-bold text-[#7a5426] disabled:opacity-45">
            领取已完成产出（{completedJobs.length}）
          </button>
        )}
      </section>

      <section className="mt-5 border-t border-[#738275]/20 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionTitle title="洞府委托" note="交付储物戒中的物品，换取灵石与宗门贡献。" />
          <button type="button" disabled={busy || !unlocked || gameState.spiritStones < refreshCost} onClick={refreshCaveOrders} className="rounded border border-[#738275]/25 bg-[#fff9e8] px-2 py-1.5 text-xs font-bold text-[#7a5426] disabled:opacity-45">刷新 · 灵石 {refreshCost}</button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {cave.orders.map(order => {
            const itemName = getItem(order.itemId)?.name ?? order.itemId;
            const enough = getInventoryQuantity(gameState, order.itemId) >= order.quantity;
            const expired = order.expiresAtAge < gameState.age;
            const contributionReward = gameState.sect && gameState.sect.sectId !== 'loose' ? order.contributionReward : 0;
            const spiritStoneReward = Math.max(1, Math.round(order.spiritStoneReward * bonuses.orderRewardMultiplier));
            return (
              <div key={order.id} className="rounded border border-[#738275]/15 bg-[#fff9e8]/55 px-3 py-2">
                <div className="font-bold text-[#45564f]">{itemName} x{order.quantity}</div>
                <div className="mt-1 text-xs text-[#66766e]">奖励灵石 {spiritStoneReward}{contributionReward > 0 ? ` · 贡献 ${contributionReward}` : ''} · {order.expiresAtAge} 岁前</div>
                <button type="button" disabled={busy || !unlocked || expired || !enough} onClick={() => claimCaveOrder(order.id)} className="mt-2 w-full rounded border border-[#355d58]/25 bg-[#eef3df] px-2 py-1.5 text-xs font-bold text-[#355d58] disabled:opacity-45">
                  {expired ? '已过期' : enough ? '交付委托' : '材料不足'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 border-t border-[#738275]/20 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-[#45564f]">洞府巡查</div>
            <div className="mt-1 text-xs text-[#66766e]">每隔五年可巡查一次，可能发现灵脉、灵田或外敌动静。</div>
          </div>
          <button
            type="button"
            disabled={busy || gameState.currentRealm.level < 2 || (cave.lastInspectionAge !== null && gameState.age - cave.lastInspectionAge < 5)}
            onClick={inspectCave}
            className="rounded border border-[#9a5b2f]/30 bg-[#f0dfad]/65 px-3 py-2 text-xs font-bold text-[#7a5426] disabled:opacity-45"
          >
            {cave.lastInspectionAge !== null && gameState.age - cave.lastInspectionAge < 5 ? '巡查冷却中' : '巡视洞府'}
          </button>
        </div>
      </section>
    </div>
  );
}

function CaveMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/55 px-2 py-2 text-center">
      <div className="text-[11px] font-semibold text-[#66766e]">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-[#355d58]">{value}</div>
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <div className="text-sm font-bold text-[#45564f]">{title}</div>
      <div className="mt-0.5 text-xs text-[#66766e]">{note}</div>
    </div>
  );
}

function formatCosts(costs: InventoryReward[]): string {
  if (costs.length === 0) return '无';
  return costs.map(cost => `${getItem(cost.itemId)?.name ?? cost.itemId} x${cost.quantity}`).join('、');
}

function getInventoryQuantity(gameState: GameState, itemId: string): number {
  return gameState.inventory.find(entry => entry.itemId === itemId)?.quantity ?? 0;
}

function isGameBusy(gameState: GameState): boolean {
  return !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
}
