import { useEffect, useMemo, useState } from 'react';
import { combatZones, getCombatZoneProgress } from '@/data/combatZones';
import inkLandscape from '@/assets/ink-landscape.png';
import { getItem } from '@/data/items';
import { realms } from '@/data/realms';
import { getCultivationSect } from '@/data/sects';
import { getSectsAtRegion } from '@/data/sectWorld';
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
  const {
    gameState,
    challengeWorldBoss,
    claimWorldCommission,
    configureAutoExpedition,
    exploreCurrentRegion,
    joinSectConflict,
    runAutoExpeditionStep,
    startAutoExpedition,
    stopAutoExpedition,
    travelWorld
  } = useGameStore();
  const [selectedRegionId, setSelectedRegionId] = useState<WorldRegionId>(gameState.worldMap.currentRegionId);
  const [approachId, setApproachId] = useState<TravelApproachId>('safe');
  const currentRegion = getWorldRegion(gameState.worldMap.currentRegionId) ?? worldRegions[0];
  const selectedRegion = getWorldRegion(selectedRegionId) ?? currentRegion;
  const selectedCombatZone = combatZones.find(zone => zone.id === selectedRegion.combatZoneId);
  const currentProgress = getWorldRegionProgress(gameState.worldMap, currentRegion.id);
  const selectedProgress = getWorldRegionProgress(gameState.worldMap, selectedRegion.id);
  const controllerSect = getCultivationSect(selectedProgress.controllerSectId);
  const localSects = getSectsAtRegion(selectedRegion.id)
    .map(sectId => getCultivationSect(sectId))
    .filter((sect): sect is NonNullable<typeof sect> => !!sect);
  const localConflict = gameState.worldMap.activeEvents.find(event => event.regionId === selectedRegion.id && event.kind === 'sect-war');
  const connectedIds = useMemo(
    () => new Set(getConnectedWorldRegions(currentRegion.id).map(region => region.id)),
    [currentRegion.id]
  );
  const travelPlan = selectedRegion.id !== currentRegion.id
    ? getTravelPlan(currentRegion.id, selectedRegion.id, approachId, gameState.worldMap)
    : null;
  const supplies = gameState.inventory.find(entry => entry.itemId === 'travel-supply')?.quantity ?? 0;
  const busy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
  const travelBusy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
  const selectedUnlocked = isWorldRegionUnlocked(selectedRegion.id, gameState.currentRealm.level);
  const canTravel = !!travelPlan
    && connectedIds.has(selectedRegion.id)
    && selectedUnlocked
    && supplies >= travelPlan.supplies
    && gameState.age + travelPlan.years < gameState.lifespan
    && !travelBusy;
  const danger = Math.round(getWorldDanger(gameState.worldMap, selectedRegion.id) * 100);
  const totalExploration = Math.round(
    gameState.worldMap.regionProgress.reduce((sum, progress) => sum + progress.exploration, 0) / worldRegions.length
  );
  const expeditionTargetValue = gameState.autoExpedition.targetRegionId === currentRegion.id
    ? ''
    : gameState.autoExpedition.targetRegionId ?? '';
  const expeditionNpcs = gameState.sectManagement.npcs.filter(npc => npc.active && npc.combatHp > 0 && npc.injury < 90);

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
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#738275]/15 pt-3 sm:grid-cols-4">
          <RegionMetric label="控制势力" value={controllerSect?.name ?? '无主之地'} tone="normal" />
          <RegionMetric label="稳定" value={`${selectedProgress.stability}`} tone={selectedProgress.stability <= 35 ? 'danger' : 'normal'} />
          <RegionMetric label="繁荣" value={`${selectedProgress.prosperity}`} tone={selectedProgress.prosperity >= 70 ? 'good' : 'normal'} />
          <RegionMetric label="威胁" value={`${selectedProgress.threat}${selectedProgress.blockaded ? ' · 封锁' : ''}`} tone={selectedProgress.threat >= 70 || selectedProgress.blockaded ? 'danger' : 'normal'} />
        </div>
        <div className="mt-3 grid gap-2 border-t border-[#738275]/15 pt-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
          <RegionFact label="势力与威胁" value={`${getWorldFaction(selectedRegion.factionId)?.name ?? '无主之地'} · ${combatZones.find(zone => zone.id === selectedRegion.combatZoneId)?.enemy ?? '未知敌手'}`} />
          <RegionFact label="当地特产" value={selectedRegion.resourceItemIds.map(itemId => getItem(itemId)?.name ?? itemId).join(' · ')} />
          <RegionFact label="高价需求" value={selectedRegion.demandItemIds.map(itemId => getItem(itemId)?.name ?? itemId).join(' · ')} />
          <RegionFact label="山门与机缘" value={`${localSects.length > 0 ? `${localSects.map(sect => sect.name).join('、')}驻地。` : ''}${selectedRegion.techniqueClue}`} />
        </div>

        {localConflict && selectedRegion.id === currentRegion.id && gameState.sect?.sectId && gameState.sect.sectId !== 'loose' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => joinSectConflict(selectedRegion.id)}
            className="mt-3 min-h-[42px] w-full rounded border border-[#9d3d2f]/35 bg-[#f2ddd4] px-3 text-sm font-bold text-[#9d3d2f] disabled:opacity-45"
          >
            {selectedProgress.controllerSectId === gameState.sect.sectId ? '参加辖境守卫战' : `为${getCultivationSect(gameState.sect.sectId)?.name ?? '宗门'}争夺此地`}
          </button>
        )}

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

      <section className="mb-4 border-t border-[#738275]/20 pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-[#45564f]">自动远行</div>
            <div className="mt-0.5 text-xs text-[#66766e]">离线与实时放置均按路线、补给和伤势阈值逐段结算</div>
          </div>
          <span className={`rounded border px-2 py-1 text-xs font-bold ${gameState.autoExpedition.running ? 'border-[#355d58]/30 bg-[#eef3df] text-[#355d58]' : 'border-[#738275]/20 bg-[#fffdf2]/70 text-[#66766e]'}`}>
            {gameState.autoExpedition.running ? '远行中' : '待命'}
          </span>
        </div>
        <div className="grid gap-2 rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 p-3 sm:grid-cols-2 xl:grid-cols-5">
          <select
            value={expeditionTargetValue}
            disabled={gameState.autoExpedition.running || busy}
            onChange={event => configureAutoExpedition({ targetRegionId: event.target.value as WorldRegionId })}
            className="h-10 rounded border border-[#738275]/25 bg-[#fffdf2] px-2 text-xs font-semibold text-[#45564f]"
            aria-label="自动远行目标"
          >
            <option value="">选择目的地</option>
            {worldRegions.filter(region => isWorldRegionUnlocked(region.id, gameState.currentRealm.level) && region.id !== currentRegion.id).map(region => (
              <option key={region.id} value={region.id}>{region.name}</option>
            ))}
          </select>
          <select
            value={gameState.autoExpedition.approachId}
            disabled={gameState.autoExpedition.running || busy}
            onChange={event => configureAutoExpedition({ approachId: event.target.value as TravelApproachId })}
            className="h-10 rounded border border-[#738275]/25 bg-[#fffdf2] px-2 text-xs font-semibold text-[#45564f]"
            aria-label="自动远行路线策略"
          >
            {travelApproaches.map(approach => <option key={approach.id} value={approach.id}>{approach.name}</option>)}
          </select>
          <label className="flex h-10 items-center justify-between gap-2 rounded border border-[#738275]/20 bg-[#fff9e8]/60 px-2 text-xs font-semibold text-[#45564f]">
            补给下限
            <input
              type="number"
              min={0}
              max={20}
              value={gameState.autoExpedition.minSupplies}
              disabled={gameState.autoExpedition.running || busy}
              onChange={event => configureAutoExpedition({ minSupplies: Number(event.target.value) })}
              className="w-12 bg-transparent text-right"
            />
          </label>
          <label className="flex h-10 items-center justify-between gap-2 rounded border border-[#738275]/20 bg-[#fff9e8]/60 px-2 text-xs font-semibold text-[#45564f]">
            伤势停止
            <input
              type="number"
              min={20}
              max={100}
              value={gameState.autoExpedition.stopInjury}
              disabled={gameState.autoExpedition.running || busy}
              onChange={event => configureAutoExpedition({ stopInjury: Number(event.target.value) })}
              className="w-12 bg-transparent text-right"
            />
          </label>
          <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-[#738275]/20 bg-[#fff9e8]/60 px-2 text-xs font-bold text-[#45564f]">
            <input
              type="checkbox"
              checked={gameState.autoExpedition.autoReturn}
              disabled={gameState.autoExpedition.running || busy}
              onChange={event => configureAutoExpedition({ autoReturn: event.target.checked })}
              className="accent-[#355d58]"
            />
            完成后返程
          </label>
        </div>
        {expeditionNpcs.length > 0 && (
          <div className="mt-2 rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#45564f]">远行编队</span>
              <span className="text-[#66766e]">最多三人 · 已选 {gameState.autoExpedition.memberNpcIds.length}/3</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {expeditionNpcs.map(npc => {
                const selected = gameState.autoExpedition.memberNpcIds.includes(npc.id);
                const selectionFull = !selected && gameState.autoExpedition.memberNpcIds.length >= 3;
                return (
                  <button
                    key={npc.id}
                    type="button"
                    disabled={busy || gameState.autoExpedition.running || selectionFull}
                    onClick={() => configureAutoExpedition({
                      memberNpcIds: selected
                        ? gameState.autoExpedition.memberNpcIds.filter(id => id !== npc.id)
                        : [...gameState.autoExpedition.memberNpcIds, npc.id]
                    })}
                    className={`min-h-[56px] rounded border px-3 py-2 text-left text-xs ${selected
                      ? 'border-[#355d58]/45 bg-[#eef3df] text-[#355d58]'
                      : 'border-[#738275]/20 bg-[#fff9e8]/65 text-[#66766e] disabled:opacity-40'
                    }`}
                  >
                    <span className="block font-bold">{npc.name} · {npc.realmLevel}境</span>
                    <span className="mt-1 block">生命 {npc.combatHp}/{npc.combatMaxHp} · 伤势 {npc.injury} · 情谊 {npc.affinity}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {!gameState.autoExpedition.running ? (
            <button
              type="button"
              disabled={
                busy
                || !gameState.autoExpedition.targetRegionId
                || gameState.autoExpedition.targetRegionId === currentRegion.id
                || supplies < gameState.autoExpedition.minSupplies
              }
              onClick={startAutoExpedition}
              className="min-h-[38px] rounded border border-[#355d58]/35 bg-[#355d58] px-3 text-xs font-bold text-[#fff9e8] disabled:border-[#738275]/15 disabled:bg-[#eee8d4] disabled:text-[#8d947f] sm:col-span-3"
            >
              开始自动远行
            </button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={runAutoExpeditionStep} className="min-h-[38px] rounded border border-[#355d58]/30 bg-[#eef3df] px-3 text-xs font-bold text-[#355d58] disabled:opacity-45 sm:col-span-2">执行下一程</button>
              <button type="button" onClick={stopAutoExpedition} className="min-h-[38px] rounded border border-[#9d3d2f]/25 bg-[#f2ddd4] px-3 text-xs font-bold text-[#9d3d2f]">停止远行</button>
            </>
          )}
        </div>
        {gameState.autoExpedition.report && (
          <div className="mt-3 rounded-md border border-[#738275]/20 bg-[#eef3df]/40 p-3 text-xs leading-relaxed text-[#66766e]">
            <div className="font-bold text-[#355d58]">最近远行报告</div>
            <div className="mt-1">{gameState.autoExpedition.report.summary}</div>
            <div className="mt-1 font-semibold text-[#7a5426]">
              {gameState.autoExpedition.report.startedAge}-{gameState.autoExpedition.report.endedAge} 岁 · {gameState.autoExpedition.report.cycles} 程 · 战斗 {gameState.autoExpedition.report.victories}/{gameState.autoExpedition.report.battles} · {gameState.autoExpedition.report.turns} 回合 · 灵石 {gameState.autoExpedition.report.spiritStonesChange >= 0 ? '+' : ''}{gameState.autoExpedition.report.spiritStonesChange}
            </div>
            {gameState.autoExpedition.report.memberNpcIds.length > 0 && (
              <div className="mt-1">同行：{gameState.autoExpedition.report.memberNpcIds.map(npcId => gameState.sectManagement.npcs.find(npc => npc.id === npcId)?.name ?? npcId).join(' · ')}</div>
            )}
            {gameState.autoExpedition.report.itemRewards.length > 0 && (
              <div className="mt-1">收获：{gameState.autoExpedition.report.itemRewards.map(reward => `${getItem(reward.itemId)?.name ?? reward.itemId}x${reward.quantity}`).join(' · ')}</div>
            )}
          </div>
        )}
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

function RegionMetric({ label, value, tone }: { label: string; value: string; tone: 'normal' | 'good' | 'danger' }) {
  const color = tone === 'good' ? 'text-[#355d58]' : tone === 'danger' ? 'text-[#9d3d2f]' : 'text-[#45564f]';
  return (
    <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/60 px-2 py-2 text-center text-xs">
      <div className="text-[#66766e]">{label}</div>
      <div className={`mt-0.5 font-bold ${color}`}>{value}</div>
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
