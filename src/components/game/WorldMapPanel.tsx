import { useEffect, useMemo, useState } from 'react';
import { combatZones, getCombatZoneProgress } from '@/data/combatZones';
import inkLandscape from '@/assets/ink-landscape.png';
import { getItem } from '@/data/items';
import { realms } from '@/data/realms';
import {
  getConnectedWorldRegions,
  getTravelPlan,
  getWorldCommissionRewardMultiplier,
  getWorldDanger,
  getWorldFaction,
  getWorldFactionReputation,
  getWorldFactionTier,
  getWorldRegion,
  getWorldRegionProgress,
  isWorldRegionUnlocked,
  travelApproaches,
  worldFactions,
  worldRegions
} from '@/data/worldMap';
import { useGameStore } from '@/stores/gameStore';
import type { TravelApproachId, WorldCommission, WorldRegionId } from '@/types';

export default function WorldMapPanel({ className = '' }: { className?: string }) {
  const { gameState, challengeWorldBoss, claimWorldCommission, exploreCurrentRegion, travelWorld } = useGameStore();
  const [selectedRegionId, setSelectedRegionId] = useState<WorldRegionId>(gameState.worldMap.currentRegionId);
  const [approachId, setApproachId] = useState<TravelApproachId>('safe');
  const currentRegion = getWorldRegion(gameState.worldMap.currentRegionId) ?? worldRegions[0];
  const selectedRegion = getWorldRegion(selectedRegionId) ?? currentRegion;
  const selectedCombatZone = combatZones.find(zone => zone.id === selectedRegion.combatZoneId);
  const currentProgress = getWorldRegionProgress(gameState.worldMap, currentRegion.id);
  const selectedProgress = getWorldRegionProgress(gameState.worldMap, selectedRegion.id);
  const connectedIds = useMemo(
    () => new Set(getConnectedWorldRegions(currentRegion.id).map(region => region.id)),
    [currentRegion.id]
  );
  const travelPlan = selectedRegion.id !== currentRegion.id
    ? getTravelPlan(currentRegion.id, selectedRegion.id, approachId)
    : null;
  const supplies = gameState.inventory.find(entry => entry.itemId === 'travel-supply')?.quantity ?? 0;
  const busy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
  const selectedUnlocked = isWorldRegionUnlocked(selectedRegion.id, gameState.currentRealm.level);
  const canTravel = !!travelPlan
    && connectedIds.has(selectedRegion.id)
    && selectedUnlocked
    && supplies >= travelPlan.supplies
    && gameState.age + travelPlan.years < gameState.lifespan
    && !busy;
  const danger = Math.round(getWorldDanger(gameState.worldMap, selectedRegion.id) * 100);
  const totalExploration = Math.round(
    gameState.worldMap.regionProgress.reduce((sum, progress) => sum + progress.exploration, 0) / worldRegions.length
  );

  useEffect(() => {
    setSelectedRegionId(gameState.worldMap.currentRegionId);
  }, [gameState.worldMap.currentRegionId]);

  if (gameState.currentRealm.name === '幼年期') {
    return (
      <div className={`ink-panel rounded-lg p-5 ${className}`}>
        <h2 className="ink-title text-xl font-bold">九州舆图</h2>
        <div className="mt-4 rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-5 text-center text-sm font-semibold text-[#66766e]">
          十岁引气入体后，方可离家远行。
        </div>
      </div>
    );
  }

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">九州舆图</h2>
          <p className="mt-1 text-sm font-semibold text-[#66766e]">
            当前 · {currentRegion.name} · 天下探索 {totalExploration}%
          </p>
        </div>
        <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/65 px-3 py-2 text-right text-xs text-[#66766e]">
          <div>行脚灵粮 {supplies}</div>
          <div>{getWorldFaction(currentRegion.factionId)?.name}声望 {getWorldFactionReputation(gameState.worldMap, currentRegion.factionId)}</div>
        </div>
      </div>

      {gameState.worldMap.activeEvents.length > 0 && (
        <section className="mb-4">
          <div className="mb-2 text-sm font-bold text-[#45564f]">天下异动</div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {gameState.worldMap.activeEvents.map(event => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedRegionId(event.regionId)}
                className="rounded-md border border-[#a9823c]/25 bg-[#f0dfad]/40 px-3 py-2 text-left"
              >
                <span className="block text-xs font-bold text-[#7a5426]">{event.title} · 至 {event.expiresAtAge} 岁</span>
                <span className="mt-1 block text-xs leading-relaxed text-[#66766e]">{event.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mb-4 overflow-hidden rounded-md border border-[#738275]/25 bg-[#e7eddd]/65">
        <div
          className="relative hidden h-[430px] bg-cover bg-center sm:block"
          style={{ backgroundImage: `linear-gradient(rgba(247,239,217,.72),rgba(231,237,221,.82)), url(${inkLandscape})` }}
        >
          {worldRegions.map(region => (
            <WorldMapNode
              key={region.id}
              region={region}
              current={region.id === currentRegion.id}
              selected={region.id === selectedRegion.id}
              unlocked={isWorldRegionUnlocked(region.id, gameState.currentRealm.level)}
              progress={getWorldRegionProgress(gameState.worldMap, region.id).exploration}
              onSelect={() => setSelectedRegionId(region.id)}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 p-2 sm:hidden">
          {worldRegions.map(region => {
            const unlocked = isWorldRegionUnlocked(region.id, gameState.currentRealm.level);
            const progress = getWorldRegionProgress(gameState.worldMap, region.id);
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => setSelectedRegionId(region.id)}
                className={`min-h-[68px] rounded border px-2 py-2 text-left text-xs ${selectedRegion.id === region.id
                  ? 'border-[#355d58]/45 bg-[#355d58] text-[#fff9e8]'
                  : unlocked
                    ? 'border-[#738275]/25 bg-[#fffdf2]/80 text-[#45564f]'
                    : 'border-[#738275]/15 bg-[#eee8d4]/65 text-[#8d947f]'
                }`}
              >
                <span className="block font-bold">{region.name}{region.id === currentRegion.id ? ' · 当前' : ''}</span>
                <span className="mt-1 block">{unlocked ? `${region.kind} · 探索 ${progress.exploration}%` : `${getRealmName(region.minRealmLevel)}解锁`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4 rounded-md border border-[#738275]/25 bg-[#fffdf2]/75 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-[#263832]">{selectedRegion.name}</h3>
              <span className="rounded border border-[#738275]/25 bg-[#eef3df] px-2 py-0.5 text-xs font-bold text-[#355d58]">{selectedRegion.kind}</span>
              <span className={`rounded border px-2 py-0.5 text-xs font-bold ${danger >= 60 ? 'border-[#9d3d2f]/30 bg-[#f2ddd4] text-[#9d3d2f]' : 'border-[#a9823c]/25 bg-[#f0dfad]/45 text-[#7a5426]'}`}>危险 {danger}%</span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#59645f]">{selectedRegion.description}</p>
          </div>
          <div className="text-right text-xs font-semibold text-[#66766e]">
            <div>探索 {selectedProgress.exploration}%</div>
            <div>{selectedCombatZone?.bossName ?? '区域首领'} · {selectedProgress.bossDefeated ? '已平定' : selectedProgress.exploration >= 100 ? '已现身' : '踪迹未明'}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 border-t border-[#738275]/15 pt-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
          <RegionFact label="势力与威胁" value={`${getWorldFaction(selectedRegion.factionId)?.name ?? '无主之地'} · ${combatZones.find(zone => zone.id === selectedRegion.combatZoneId)?.enemy ?? '未知敌手'}`} />
          <RegionFact label="当地特产" value={selectedRegion.resourceItemIds.map(itemId => getItem(itemId)?.name ?? itemId).join(' · ')} />
          <RegionFact label="高价需求" value={selectedRegion.demandItemIds.map(itemId => getItem(itemId)?.name ?? itemId).join(' · ')} />
          <RegionFact label="功法机缘" value={selectedRegion.techniqueClue} />
        </div>

        {selectedRegion.id === currentRegion.id ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy || currentProgress.exploration >= 100 || gameState.age + 1 >= gameState.lifespan}
              onClick={exploreCurrentRegion}
              className="min-h-[42px] rounded border border-[#355d58]/35 bg-[#355d58] px-3 text-sm font-bold text-[#fff9e8] disabled:border-[#738275]/15 disabled:bg-[#eee8d4] disabled:text-[#8d947f]"
            >
              {currentProgress.exploration >= 100 ? '探索已完成' : '探索一年'}
            </button>
            <button
              type="button"
              disabled={busy || currentProgress.exploration < 100 || currentProgress.bossDefeated}
              onClick={challengeWorldBoss}
              className="min-h-[42px] rounded border border-[#9a5b2f]/35 bg-[#f0dfad]/70 px-3 text-sm font-bold text-[#7a5426] disabled:border-[#738275]/15 disabled:bg-[#eee8d4] disabled:text-[#8d947f]"
            >
              {currentProgress.bossDefeated ? '首领已平定' : currentProgress.exploration < 100 ? '探索满后讨伐' : '讨伐区域首领'}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-2">
              {travelApproaches.map(approach => (
                <button
                  key={approach.id}
                  type="button"
                  disabled={!connectedIds.has(selectedRegion.id) || !selectedUnlocked}
                  onClick={() => setApproachId(approach.id)}
                  className={`min-h-[58px] rounded border px-2 py-2 text-xs ${approachId === approach.id
                    ? 'border-[#355d58]/40 bg-[#355d58] text-[#fff9e8]'
                    : 'border-[#738275]/20 bg-[#fff9e8]/70 text-[#45564f] disabled:bg-[#eee8d4]/55 disabled:text-[#8d947f]'
                  }`}
                >
                  <span className="block font-bold">{approach.name}</span>
                  <span className="mt-0.5 block">{approach.description}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!canTravel}
              onClick={() => travelWorld(selectedRegion.id, approachId)}
              className="mt-2 min-h-[42px] w-full rounded border border-[#355d58]/35 bg-[#355d58] px-3 text-sm font-bold text-[#fff9e8] disabled:border-[#738275]/15 disabled:bg-[#eee8d4] disabled:text-[#8d947f]"
            >
              {!selectedUnlocked
                ? `${getRealmName(selectedRegion.minRealmLevel)}解锁`
                : !connectedIds.has(selectedRegion.id)
                  ? '需先前往相邻区域'
                  : travelPlan
                    ? `启程 · ${travelPlan.years} 年 · 灵粮 ${travelPlan.supplies}`
                    : '无可用路线'}
            </button>
          </div>
        )}
      </section>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-[#45564f]">当地委托</span>
          <span className="text-xs text-[#66766e]">已完成 {currentProgress.commissionsCompleted}</span>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {gameState.worldMap.commissions.length > 0 ? gameState.worldMap.commissions.map(commission => {
            const progress = getCommissionProgress(gameState, commission);
            const complete = progress >= commission.targetQuantity;
            const spiritStoneReward = Math.round(commission.spiritStoneReward * getWorldCommissionRewardMultiplier(gameState.worldMap, commission.regionId));
            return (
              <div key={commission.id} className="flex min-h-[150px] flex-col rounded-md border border-[#738275]/20 bg-[#fff9e8]/60 p-3">
                <div className="font-bold text-[#355d58]">{commission.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-[#66766e]">{commission.description}</p>
                <div className="mt-2 text-xs font-semibold text-[#7a5426]">进度 {Math.min(progress, commission.targetQuantity)}/{commission.targetQuantity} · 灵石 {spiritStoneReward} · 声望 {commission.reputationReward}</div>
                <button
                  type="button"
                  disabled={busy || !complete}
                  onClick={() => claimWorldCommission(commission.id)}
                  className="mt-auto min-h-[34px] rounded border border-[#9a5b2f]/30 bg-[#f0dfad]/60 px-2 text-xs font-bold text-[#7a5426] disabled:border-[#738275]/15 disabled:bg-[#eee8d4]/55 disabled:text-[#8d947f]"
                >
                  {complete ? '交付委托' : `至 ${commission.expiresAtAge} 岁`}
                </button>
              </div>
            );
          }) : (
            <div className="md:col-span-3 rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 p-4 text-sm text-[#66766e]">本轮当地委托已完成，新委托将在时间推进后补充。</div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 text-sm font-bold text-[#45564f]">势力声望</div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {worldFactions.map(faction => {
            const reputation = getWorldFactionReputation(gameState.worldMap, faction.id);
            const tier = getWorldFactionTier(reputation);
            return (
              <div key={faction.id} className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 px-3 py-3 text-xs">
                <div className="font-bold text-[#45564f]">{faction.name}</div>
                <div className="mt-1 text-[#66766e]">{tier.name} · {reputation}{tier.next ? `/${tier.next}` : ''}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#c8c2a9]"><div className="h-full bg-[#718b70]" style={{ width: `${Math.min(100, tier.next ? reputation / tier.next * 100 : 100)}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function WorldMapNode({
  region,
  current,
  selected,
  unlocked,
  progress,
  onSelect
}: {
  region: (typeof worldRegions)[number];
  current: boolean;
  selected: boolean;
  unlocked: boolean;
  progress: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`absolute w-[112px] -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-2 text-left text-xs shadow-sm ${selected
        ? 'z-10 border-[#355d58]/55 bg-[#355d58] text-[#fff9e8]'
        : unlocked
          ? 'border-[#738275]/35 bg-[#fffdf2]/95 text-[#45564f]'
          : 'border-[#738275]/20 bg-[#e4dfce]/90 text-[#8d947f]'
      }`}
      style={{ left: `${region.mapPosition.x}%`, top: `${region.mapPosition.y}%` }}
    >
      <span className="block font-bold">{region.name}</span>
      <span className="mt-0.5 block">{current ? '当前所在' : unlocked ? `${region.kind} · ${progress}%` : `${getRealmName(region.minRealmLevel)}解锁`}</span>
    </button>
  );
}

function RegionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/60 px-3 py-2 leading-relaxed text-[#66766e]">
      <div className="mb-1 font-bold text-[#45564f]">{label}</div>
      {value}
    </div>
  );
}

function getCommissionProgress(
  gameState: ReturnType<typeof useGameStore.getState>['gameState'],
  commission: WorldCommission
): number {
  if (commission.kind === 'delivery') {
    return gameState.inventory.find(entry => entry.itemId === commission.itemId)?.quantity ?? 0;
  }
  if (commission.kind === 'survey') {
    return getWorldRegionProgress(gameState.worldMap, commission.regionId).exploration;
  }
  const kills = commission.combatZoneId
    ? getCombatZoneProgress(gameState.combatZoneProgress, commission.combatZoneId).kills
    : 0;
  return Math.max(0, kills - commission.baseline);
}

function getRealmName(level: number): string {
  return realms.find(realm => realm.level === level)?.name ?? `${level}境`;
}
