import {
  combatSupplyDefinitions,
  combatZones,
  getCombatZoneProgress,
  getCombatZoneMasteryLevel,
  getActiveEquipmentSets,
  getEquipmentAffix,
  getEquipmentAffixCandidates,
  getEquipmentEnhancementCost,
  getEquipmentDefinition,
  getEquipmentRating,
  getEquipmentReforgeCost,
  isCombatBossAvailable,
  isCombatZoneUnlocked
} from '@/data/combatZones';
import { simulateCombatForecast } from '@/data/combatBalance';
import { getItem } from '@/data/items';
import { realms } from '@/data/realms';
import { getDungeonDefinition, getDungeonRoom } from '@/data/dungeons';
import { dungeonRoutes, getActiveDungeonRelicSets, getDungeonRelic } from '@/data/dungeonRelics';
import { useGameStore } from '@/stores/gameStore';
import type { AutoCombatStrategy, BossMechanicId, CombatSkillId, CultivationPathId, EquipmentAffixId, EquipmentSlot } from '@/types';

const strategyOptions: Array<{ id: AutoCombatStrategy; label: string; note: string }> = [
  { id: 'cautious', label: '稳健', note: '半血转守' },
  { id: 'balanced', label: '均衡', note: '三成血转守' },
  { id: 'aggressive', label: '强攻', note: '持续进攻' }
];

const equipmentSlots: Array<{ id: EquipmentSlot; label: string }> = [
  { id: 'weapon', label: '武器' },
  { id: 'armor', label: '护甲' },
  { id: 'accessory', label: '配饰' }
];

export default function CombatActivityPanel({ className = '' }: { className?: string }) {
  const {
    gameState,
    abandonDungeonRun,
    challengeCombatBoss,
    applyCombatPreset,
    enhanceCombatEquipment,
    reforgeEquipment,
    renameCombatPreset,
    saveCombatPreset,
    selectCombatZone,
    setDungeonAutoRepeat,
    setAutoCombatConfig,
    startDungeonRun,
    runDungeonFloor,
    restDungeonRun,
    chooseDungeonRelic,
    resolveDungeonRoom,
    setDungeonRoute,
    toggleEquipmentAffixLock,
    unequipCombatItem
  } = useGameStore();
  const activeZone = combatZones.find(zone => zone.id === gameState.combatActivity.zoneId) ?? combatZones[0];
  const autoConfig = gameState.combatActivity.autoCombat;
  const healingSupplies = combatSupplyDefinitions.filter(supply => supply.kind === 'healing');
  const qiSupplies = combatSupplyDefinitions.filter(supply => supply.kind === 'qi');
  const lootTargetItemIds = Array.from(new Set([
    ...activeZone.loot.map(loot => loot.itemId),
    ...activeZone.firstClearRewards.map(reward => reward.itemId)
  ]));
  const essenceQuantity = gameState.inventory.find(entry => entry.itemId === 'artifact-essence')?.quantity ?? 0;
  const activeEquipmentSets = getActiveEquipmentSets(gameState.equipment);
  const normalForecast = simulateCombatForecast(gameState, activeZone, false);
  const bossForecast = simulateCombatForecast(gameState, activeZone, true);
  const activeDungeon = getDungeonDefinition(gameState.dungeonRun?.zoneId);
  const activeDungeonProgress = activeDungeon
    ? gameState.dungeonProgress.find(entry => entry.zoneId === activeDungeon.id)
    : undefined;
  const dungeonChoicePending = (gameState.dungeonRun?.pendingRelicIds.length ?? 0) > 0;
  const pendingDungeonRoom = getDungeonRoom(gameState.dungeonRun?.pendingRoom?.id);
  const dungeonDecisionPending = dungeonChoicePending || !!pendingDungeonRoom;
  const busy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
  const handleStartDungeonRun = (zoneId: typeof activeZone.id) => {
    startDungeonRun(zoneId);
    window.requestAnimationFrame(() => {
      const panel = document.getElementById('combat-activity-panel');
      const scrollParent = panel?.parentElement;
      if (scrollParent && scrollParent.scrollHeight > scrollParent.clientHeight) {
        scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        panel?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  };

  return (
    <div id="combat-activity-panel" className={`ink-panel scroll-mt-[124px] rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">战斗</h2>
          <p className="mt-1 text-sm font-semibold text-[#66766e]">
            当前区域 · {activeZone.name}{gameState.combatActivity.target === 'boss' ? ' · 首领战' : ''}
          </p>
        </div>
        <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/65 px-3 py-2 text-right text-xs text-[#66766e]">
          <div>胜 {gameState.combatStats.victories} · 败 {gameState.combatStats.defeats}</div>
          <div className={gameState.combatStats.injury >= 60 ? 'font-bold text-[#9d3d2f]' : ''}>
            伤势 {gameState.combatStats.injury}/100
          </div>
        </div>
      </div>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <CombatForecastCard label="普通战推演" forecast={normalForecast} />
        <CombatForecastCard label="首领战推演" forecast={bossForecast} />
      </section>

      {activeDungeon && gameState.dungeonRun && (
        <section className="mb-4 rounded-md border border-[#a9823c]/30 bg-[#f0dfad]/35 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-bold text-[#7a5426]">{activeDungeon.name}</div>
              <div className="mt-0.5 text-xs font-semibold text-[#66766e]">
                第 {gameState.dungeonRun.floor}/{activeDungeon.totalFloors} 层 · 通关 {activeDungeonProgress?.clears ?? 0} 次
              </div>
              <div className="mt-1 max-w-xl text-xs leading-relaxed text-[#7a5426]">首领异变：{activeDungeon.bossTwist}</div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#45564f]">
              <input
                type="checkbox"
                checked={gameState.combatActivity.dungeonAutoRepeat}
                disabled={busy}
                onChange={event => setDungeonAutoRepeat(event.target.checked)}
                className="h-4 w-4 accent-[#355d58]"
              />
              通关后重开
            </label>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {Array.from({ length: activeDungeon.totalFloors }, (_, index) => index + 1).map(floor => {
              const completed = floor < gameState.dungeonRun!.floor;
              const active = floor === gameState.dungeonRun!.floor;
              const kind = floor === activeDungeon.totalFloors ? '首领' : floor === activeDungeon.eliteFloor ? '精英' : `${floor}层`;
              return (
                <div
                  key={floor}
                  className={`flex min-h-[46px] items-center justify-center rounded border px-1 text-center text-xs font-bold ${active
                    ? 'border-[#a9823c]/50 bg-[#f0dfad] text-[#7a5426]'
                    : completed
                      ? 'border-[#355d58]/30 bg-[#e7eddd] text-[#355d58]'
                      : 'border-[#738275]/20 bg-[#fffdf2]/65 text-[#66766e]'
                  }`}
                >
                  {completed ? `已过${floor}` : kind}
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
            <div className="rounded border border-[#738275]/20 bg-[#fffdf2]/65 px-3 py-2">
              <div className="flex justify-between text-[#45564f]"><span>生命</span><span>{gameState.dungeonRun.currentHp}/{gameState.dungeonRun.maxHp}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#d3c9ad]"><div className="h-full bg-[#9d4d3d]" style={{ width: `${gameState.dungeonRun.currentHp / gameState.dungeonRun.maxHp * 100}%` }} /></div>
            </div>
            <div className="rounded border border-[#738275]/20 bg-[#fffdf2]/65 px-3 py-2">
              <div className="flex justify-between text-[#45564f]"><span>真气</span><span>{gameState.dungeonRun.currentQi}/{gameState.dungeonRun.maxQi}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#d3c9ad]"><div className="h-full bg-[#4f7770]" style={{ width: `${gameState.dungeonRun.currentQi / gameState.dungeonRun.maxQi * 100}%` }} /></div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {dungeonRoutes.map(route => (
              <button
                key={route.id}
                type="button"
                disabled={busy || dungeonDecisionPending}
                onClick={() => setDungeonRoute(route.id)}
                className={`rounded border px-2 py-2 text-xs font-bold ${gameState.dungeonRun?.route === route.id
                  ? 'border-[#355d58]/40 bg-[#355d58] text-[#fff9e8]'
                  : 'border-[#738275]/20 bg-[#fffdf2]/65 text-[#45564f]'
                }`}
                title={route.description}
              >
                {route.name} · {route.id === 'perilous' ? '高收益' : '标准'}
              </button>
            ))}
          </div>
          {gameState.dungeonRun.relicIds.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1.5">
                {gameState.dungeonRun.relicIds.map(relicId => {
                  const relic = getDungeonRelic(relicId);
                  return relic ? <span key={relicId} title={relic.description} className="rounded border border-[#a9823c]/25 bg-[#fff9e8]/70 px-2 py-1 text-xs font-bold text-[#7a5426]">{relic.name}</span> : null;
                })}
              </div>
              {getActiveDungeonRelicSets(gameState.dungeonRun.relicIds).map(set => (
                <div key={set.id} className="mt-2 rounded border border-[#355d58]/25 bg-[#e7eddd]/65 px-2 py-1 text-xs font-semibold text-[#355d58]">
                  套装 · {set.name}：{set.description}
                </div>
              ))}
            </div>
          )}
          {pendingDungeonRoom && gameState.dungeonRun.pendingRoom && (
            <div className="mt-3 rounded border border-[#355d58]/30 bg-[#eef3df]/70 p-3">
              <div className="text-sm font-bold text-[#355d58]">岔路 · {pendingDungeonRoom.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-[#66766e]">{pendingDungeonRoom.description}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {pendingDungeonRoom.options.map(option => {
                  const affordable = gameState.spiritStones + (option.spiritStones ?? 0) >= 0;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={busy || !affordable}
                      onClick={() => resolveDungeonRoom(option.id)}
                      className="rounded border border-[#355d58]/25 bg-[#fffdf2]/80 px-2 py-2 text-left text-xs text-[#45564f] disabled:opacity-45"
                    >
                      <span className="block font-bold text-[#355d58]">{option.name}</span>
                      <span className="mt-1 block leading-relaxed">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {dungeonChoicePending && (
            <div className="mt-3 rounded border border-[#a9823c]/30 bg-[#fff9e8]/70 p-3">
              <div className="mb-2 text-sm font-bold text-[#7a5426]">择取一件秘境遗物</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {gameState.dungeonRun.pendingRelicIds.map(relicId => {
                  const relic = getDungeonRelic(relicId);
                  return relic ? (
                    <button key={relicId} type="button" onClick={() => chooseDungeonRelic(relicId)} className="rounded border border-[#a9823c]/25 bg-[#f0dfad]/45 px-2 py-2 text-left text-xs text-[#45564f]">
                      <span className="block font-bold text-[#7a5426]">{relic.name}</span>
                      <span className="mt-1 block">{relic.description}</span>
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy || dungeonDecisionPending}
              onClick={runDungeonFloor}
              className="min-h-[40px] rounded border border-[#355d58]/35 bg-[#355d58] px-3 text-sm font-bold text-[#fff9e8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              挑战第 {gameState.dungeonRun.floor} 层
            </button>
            <button
              type="button"
              disabled={busy || dungeonDecisionPending || gameState.dungeonRun.restsRemaining <= 0 || (gameState.dungeonRun.currentHp >= gameState.dungeonRun.maxHp && gameState.dungeonRun.currentQi >= gameState.dungeonRun.maxQi)}
              onClick={restDungeonRun}
              className="min-h-[40px] rounded border border-[#9d3d2f]/25 bg-[#fff9e8]/75 px-3 text-sm font-bold text-[#9d3d2f] disabled:opacity-45"
            >
              休整 · 剩余 {gameState.dungeonRun.restsRemaining}
            </button>
          </div>
          <button type="button" disabled={busy} onClick={abandonDungeonRun} className="mt-2 w-full rounded border border-[#738275]/20 bg-[#eee8d4]/55 px-3 py-2 text-xs font-bold text-[#66766e] disabled:opacity-45">放弃秘境</button>
          <div className="mt-2 text-xs leading-relaxed text-[#66766e]">
            通关奖励：{formatItemCosts(activeDungeon.repeatRewards)}
            {(activeDungeonProgress?.clears ?? 0) === 0 && ` · 首通追加：${formatItemCosts(activeDungeon.firstClearRewards)}`}
          </div>
        </section>
      )}

      <section className="mb-4 rounded-md border border-[#738275]/25 bg-[#fff9e8]/55 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold text-[#355d58]">自动战斗</div>
            <div className="mt-0.5 text-xs font-semibold text-[#66766e]">
              {autoConfig.enabled ? '连续推演将自动结算' : '进入战斗后手动选择招式'}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#45564f]">
            <input
              type="checkbox"
              checked={autoConfig.enabled}
              disabled={busy}
              onChange={event => setAutoCombatConfig({ enabled: event.target.checked })}
              className="h-4 w-4 accent-[#355d58]"
            />
            {autoConfig.enabled ? '已开启' : '未开启'}
          </label>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {strategyOptions.map(strategy => {
            const selected = autoConfig.strategy === strategy.id;
            return (
              <button
                key={strategy.id}
                type="button"
                disabled={busy}
                onClick={() => setAutoCombatConfig({ strategy: strategy.id })}
                className={`min-h-[54px] rounded border px-2 py-1.5 text-xs transition-colors ${selected
                  ? 'border-[#355d58]/45 bg-[#355d58] text-[#fff9e8]'
                  : 'border-[#738275]/20 bg-[#fffdf2]/70 text-[#59645f] hover:border-[#355d58]/35'
                }`}
              >
                <span className="block font-bold">{strategy.label}</span>
                <span className={`mt-0.5 block ${selected ? 'text-[#e7eddd]' : 'text-[#66766e]'}`}>
                  {strategy.note}
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-between rounded border border-[#738275]/15 bg-[#eef3df]/45 px-3 py-2 text-xs font-semibold text-[#45564f]">
          <span>真气足够时使用功法</span>
          <input
            type="checkbox"
            checked={autoConfig.useTechnique}
            disabled={busy}
            onChange={event => setAutoCombatConfig({ useTechnique: event.target.checked })}
            className="h-4 w-4 accent-[#355d58]"
          />
        </label>

        <label className="mt-2 flex cursor-pointer items-center justify-between rounded border border-[#738275]/15 bg-[#f0dfad]/30 px-3 py-2 text-xs font-semibold text-[#6d634d]">
          <span>开战使用护身符、战符与战阵</span>
          <input
            type="checkbox"
            checked={autoConfig.useBattleConsumables}
            disabled={busy}
            onChange={event => setAutoCombatConfig({ useBattleConsumables: event.target.checked })}
            className="h-4 w-4 accent-[#355d58]"
          />
        </label>

        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[#738275]/15 pt-3 sm:grid-cols-2">
          <CombatSupplyControl
            label="疗伤丹"
            itemId={autoConfig.healingItemId}
            threshold={autoConfig.healAtHpPercent}
            supplies={healingSupplies}
            inventory={gameState.inventory}
            disabled={busy}
            onItemChange={healingItemId => setAutoCombatConfig({ healingItemId })}
            onThresholdChange={healAtHpPercent => setAutoCombatConfig({ healAtHpPercent })}
          />
          <CombatSupplyControl
            label="回气丹"
            itemId={autoConfig.qiItemId}
            threshold={autoConfig.qiAtPercent}
            supplies={qiSupplies}
            inventory={gameState.inventory}
            disabled={busy}
            onItemChange={qiItemId => setAutoCombatConfig({ qiItemId })}
            onThresholdChange={qiAtPercent => setAutoCombatConfig({ qiAtPercent })}
          />
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
          <label className="rounded border border-[#738275]/15 bg-[#fffdf2]/65 px-3 py-2 text-xs font-semibold text-[#45564f]">
            <span className="mb-1 block">掉落目标</span>
            <select
              value={autoConfig.lootTargetItemId ?? ''}
              disabled={busy}
              onChange={event => setAutoCombatConfig({ lootTargetItemId: event.target.value || null })}
              className="h-9 w-full rounded border border-[#738275]/25 bg-[#fffdf2] px-2 text-xs text-[#45564f]"
            >
              <option value="">不设置</option>
              {lootTargetItemIds.map(itemId => (
                <option key={itemId} value={itemId}>{getItem(itemId)?.name ?? itemId}</option>
              ))}
            </select>
          </label>
          <label className="rounded border border-[#738275]/15 bg-[#fffdf2]/65 px-3 py-2 text-xs font-semibold text-[#45564f]">
            <span className="mb-1 block">目标数量</span>
            <input
              type="number"
              min={1}
              max={999}
              disabled={busy || !autoConfig.lootTargetItemId}
              value={autoConfig.lootTargetQuantity}
              onChange={event => setAutoCombatConfig({ lootTargetQuantity: Math.max(1, Math.min(999, Number(event.target.value) || 1)) })}
              className="h-9 w-full rounded border border-[#738275]/25 bg-[#fffdf2] px-2 text-xs text-[#45564f] disabled:opacity-55"
            />
          </label>
        </div>

        <label className="mt-2 flex cursor-pointer items-center justify-between rounded border border-[#738275]/15 bg-[#f0dfad]/30 px-3 py-2 text-xs font-semibold text-[#6d634d]">
          <span>任一已配置补给耗尽时停止</span>
          <input
            type="checkbox"
            checked={autoConfig.stopWhenSuppliesEmpty}
            disabled={busy}
            onChange={event => setAutoCombatConfig({ stopWhenSuppliesEmpty: event.target.checked })}
            className="h-4 w-4 accent-[#355d58]"
          />
        </label>
      </section>

      <section className="mb-4">
        <div className="mb-2 text-sm font-bold text-[#45564f]">战斗熟练</div>
        <div className="grid grid-cols-3 gap-2">
          {gameState.combatSkills.map(skill => {
            const label = skill.skillId === 'attack' ? '攻法' : skill.skillId === 'defense' ? '守御' : '术式';
            const passive = getCombatSkillPassiveText(skill.skillId, skill.level);
            return (
              <div key={skill.skillId} className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-3 text-center">
                <div className="text-xs font-bold text-[#6d634d]">{label}</div>
                <div className="mt-1 font-bold text-[#355d58]">{skill.level} 级</div>
                <div className="mt-1 text-xs text-[#66766e]">{skill.level >= 20 ? '已圆满' : `${skill.exp % 50}/50`}</div>
                <div className="mt-1 min-h-[32px] text-xs leading-relaxed text-[#59645f]">{passive}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-[#45564f]">战斗预设</span>
          <span className="text-xs text-[#66766e]">切换区域时自动应用同区域预设</span>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
          {[0, 1, 2].map(index => {
            const id = `combat-preset-${index + 1}`;
            const preset = gameState.combatPresets.find(entry => entry.id === id);
            const active = gameState.combatActivity.activePresetId === id;
            return (
              <div key={id} className={`rounded-md border p-3 ${active ? 'border-[#355d58]/40 bg-[#e7eddd]/65' : 'border-[#738275]/20 bg-[#fffdf2]/75'}`}>
                {preset ? (
                  <input
                    defaultValue={preset.name}
                    maxLength={8}
                    onBlur={event => renameCombatPreset(id, event.target.value)}
                    className="h-7 w-full rounded border border-[#738275]/20 bg-[#fffdf2]/70 px-2 text-sm font-bold text-[#45564f]"
                    aria-label={`${preset.name}名称`}
                  />
                ) : (
                  <div className="text-sm font-bold text-[#45564f]">预设{index + 1}</div>
                )}
                <div className="mt-1 min-h-[32px] text-xs text-[#66766e]">
                  {preset ? `${preset.pathId ? getPathLabel(preset.pathId) : '未定流派'} · ${combatZones.find(zone => zone.id === preset.zoneId)?.name ?? '未知区域'} · ${preset.equippedSpellIds.length} 技能 · ${Object.values(preset.equipment).filter(Boolean).length} 装备` : '空预设'}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={busy || !preset}
                    onClick={() => applyCombatPreset(id)}
                    className="rounded border border-[#738275]/25 bg-[#eef3df] px-2 py-1 text-xs font-bold text-[#45564f] disabled:opacity-45"
                  >
                    应用
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => saveCombatPreset(index)}
                    className="rounded border border-[#9a5b2f]/30 bg-[#f0dfad]/55 px-2 py-1 text-xs font-bold text-[#7a5426] disabled:opacity-45"
                  >
                    {preset ? '覆盖' : '保存'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-[#45564f]">装备</span>
          <span className="text-xs text-[#66766e]">储物戒中装备法器</span>
        </div>
        {activeEquipmentSets.length > 0 && (
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {activeEquipmentSets.map(({ definition, pieces }) => (
              <div key={definition.id} className="rounded border border-[#738275]/20 bg-[#eef3df]/50 px-3 py-2 text-xs">
                <div className="font-bold text-[#355d58]">{definition.name} · {pieces}/{definition.itemIds.length}</div>
                <div className="mt-1 space-y-0.5">
                  {definition.thresholds.map(threshold => (
                    <div key={threshold.pieces} className={pieces >= threshold.pieces ? 'font-semibold text-[#45564f]' : 'text-[#8d947f]'}>
                      {threshold.pieces}件：{threshold.description}{pieces >= threshold.pieces ? ' · 已激活' : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
          {equipmentSlots.map(slot => {
            const itemId = gameState.equipment[slot.id];
            const item = getItem(itemId ?? '');
            const definition = getEquipmentDefinition(itemId);
            const enhancementLevel = itemId
              ? gameState.equipmentEnhancements.find(entry => entry.itemId === itemId)?.level ?? 0
              : 0;
            const enhancementCosts = itemId ? getEquipmentEnhancementCost(itemId, enhancementLevel) : [];
            const affix = itemId
              ? getEquipmentAffix(gameState.equipmentAffixes.find(entry => entry.itemId === itemId)?.affixId)
              : undefined;
            const reforgeCost = itemId ? getEquipmentReforgeCost(itemId) : 0;
            const quality = itemId
              ? gameState.equipmentQualities.find(entry => entry.itemId === itemId)?.quality ?? 100
              : 100;
            const affixLocked = !!itemId && gameState.lockedEquipmentAffixes.includes(itemId);
            const affixCandidates = itemId ? getEquipmentAffixCandidates(itemId).filter(candidate => candidate.id !== affix?.id) : [];
            const canEnhance = gameState.age < gameState.lifespan - 1
              && enhancementCosts.length > 0
              && enhancementCosts.every(cost => (
                gameState.inventory.find(entry => entry.itemId === cost.itemId)?.quantity ?? 0
              ) >= cost.quantity);
            return (
              <div key={slot.id} className="min-h-[150px] rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-3">
                <div className="text-xs font-bold text-[#6d634d]">{slot.label}</div>
                <div className={`mt-1 text-sm font-bold ${item ? 'text-[#355d58]' : 'text-[#8d947f]'}`}>
                  {item ? `${item.name} +${enhancementLevel}` : '未装备'}
                </div>
                {definition && (
                  <div className="mt-1 text-xs leading-relaxed text-[#66766e]">{definition.effectText}</div>
                )}
                {item && (
                  <div className="mt-1 text-xs font-semibold text-[#355d58]">
                    品质 {quality}% · 评级 {getEquipmentRating(item.id, enhancementLevel, affix?.id, quality)} · {affix ? `${affix.name}：${affix.description}` : '无词条'}
                  </div>
                )}
                {item && (
                  <>
                    <div className="mt-2 text-xs font-semibold leading-relaxed text-[#6d634d]">
                      {enhancementLevel >= 10
                        ? '强化已圆满'
                        : `强化：${formatItemCosts(enhancementCosts)}`}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => unequipCombatItem(slot.id)}
                        className="rounded border border-[#738275]/25 bg-[#eef3df] px-2 py-1 text-xs font-bold text-[#45564f] disabled:opacity-50"
                      >
                        卸下
                      </button>
                      <button
                        type="button"
                        disabled={busy || enhancementLevel >= 10 || !canEnhance}
                        onClick={() => enhanceCombatEquipment(item.id)}
                        className={`rounded border px-2 py-1 text-xs font-bold ${!busy && enhancementLevel < 10 && canEnhance
                          ? 'border-[#9a5b2f]/35 bg-[#f0dfad]/65 text-[#7a5426]'
                          : 'border-[#738275]/15 bg-[#eee8d4]/55 text-[#8d947f]'
                        }`}
                      >
                        强化
                      </button>
                      <button
                        type="button"
                        disabled={busy || affixLocked || essenceQuantity < reforgeCost}
                        onClick={() => reforgeEquipment(item.id)}
                        className={`rounded border px-1 py-1 text-xs font-bold ${!busy && !affixLocked && essenceQuantity >= reforgeCost
                          ? 'border-[#7a5426]/30 bg-[#eee8d4] text-[#7a5426]'
                          : 'border-[#738275]/15 bg-[#eee8d4]/55 text-[#8d947f]'
                        }`}
                        title={`消耗器魂 ${reforgeCost}`}
                      >
                        {affixLocked ? '已锁定' : '重铸'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleEquipmentAffixLock(item.id)}
                        className="rounded border border-[#738275]/25 bg-[#fff9e8] px-2 py-1 text-xs font-bold text-[#6d634d] disabled:opacity-45"
                      >
                        {affixLocked ? '解除锁定' : '锁定词条'}
                      </button>
                    </div>
                    <select
                      value=""
                      disabled={busy || affixLocked || essenceQuantity < reforgeCost * 3}
                      onChange={event => {
                        if (event.target.value) reforgeEquipment(item.id, event.target.value as EquipmentAffixId);
                      }}
                      className="mt-2 h-8 w-full rounded border border-[#9a5b2f]/25 bg-[#f0dfad]/35 px-2 text-xs font-semibold text-[#7a5426] disabled:opacity-45"
                    >
                      <option value="">定向重铸 · 器魂 {reforgeCost * 3}</option>
                      {affixCandidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.description}</option>)}
                    </select>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-[#45564f]">战斗区域</span>
          <span className="text-xs text-[#66766e]">每轮耗时随境界推进</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {combatZones.map(zone => {
            const unlocked = isCombatZoneUnlocked(zone.id, gameState.currentRealm.level, gameState.combatZoneProgress);
            const locked = !unlocked;
            const selected = gameState.selectedYearAction === 'combat' && activeZone.id === zone.id;
            const realmName = realms.find(realm => realm.level === zone.minRealmLevel)?.name ?? `${zone.minRealmLevel}境`;
            const lootNames = zone.loot.map(loot => getItem(loot.itemId)?.name ?? loot.itemId);
            const progress = getCombatZoneProgress(gameState.combatZoneProgress, zone.id);
            const masteryLevel = getCombatZoneMasteryLevel(progress);
            const bossAvailable = isCombatBossAvailable(zone.id, gameState.combatZoneProgress);
            const progressPercent = Math.min(100, progress.kills / zone.bossKillsRequired * 100);
            const realmLocked = gameState.currentRealm.level < zone.minRealmLevel;
            const firstClearNames = zone.firstClearRewards.map(reward => `${getItem(reward.itemId)?.name ?? reward.itemId}x${reward.quantity}`);
            const dungeon = getDungeonDefinition(zone.id);
            const dungeonProgress = gameState.dungeonProgress.find(entry => entry.zoneId === zone.id);
            const dungeonActive = gameState.dungeonRun?.zoneId === zone.id;
            const anotherDungeonActive = !!gameState.dungeonRun && !dungeonActive;

            return (
              <div
                key={zone.id}
                className={`min-h-[220px] rounded-md border p-3 text-left transition-colors ${selected
                  ? 'border-[#355d58]/50 bg-[#eef3df]/75'
                  : locked
                    ? 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
                    : 'border-[#738275]/25 bg-[#fff9e8]/55'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#263832]">{zone.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-[#9a5b2f]">{zone.stage} · {zone.enemy}</div>
                  </div>
                  <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-bold ${selected
                    ? 'border-[#355d58]/30 bg-[#355d58] text-[#fff9e8]'
                    : 'border-[#738275]/20 bg-[#fffdf2]/75 text-[#66766e]'
                  }`}>
                    {selected ? '当前区域' : locked ? realmLocked ? `${realmName}解锁` : '需通关前区' : '可前往'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#59645f]">{zone.description}</p>
                <div className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-[#6d634d]">
                  掉落：{lootNames.join(' · ')}
                </div>
                <div className="mt-3 border-t border-[#738275]/15 pt-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className="text-[#45564f]">{zone.bossName}</span>
                    <span className={progress.bossDefeated ? 'text-[#355d58]' : 'text-[#66766e]'}>
                      {progress.bossDefeated ? `已通关 · ${progress.bossWins}胜` : `${progress.kills}/${zone.bossKillsRequired}`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#c8c2a9]">
                    <div className="h-full rounded-full bg-[#718b70]" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-[#66766e]">
                    首通：{firstClearNames.join(' · ')}{progress.bestRounds ? ` · 最快 ${progress.bestRounds} 回合` : ''}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[#9a5b2f]">
                    首领机制：{getBossMechanicLabel(zone.bossMechanic)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[#355d58]">
                    区域精通 {masteryLevel}/10 · 攻势 +{Math.round(masteryLevel * 1.5)}% · 掉率 +{Math.round(masteryLevel * 1.5)}%
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy || locked}
                    onClick={() => selectCombatZone(zone.id)}
                    className="min-h-[36px] rounded border border-[#738275]/25 bg-[#fffdf2]/75 px-2 text-xs font-bold text-[#45564f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selected && gameState.combatActivity.target === 'normal' ? '历练中' : '前往历练'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || locked || !bossAvailable}
                    onClick={() => challengeCombatBoss(zone.id)}
                    className={`min-h-[36px] rounded border px-2 text-xs font-bold ${bossAvailable && !busy && !locked
                      ? 'border-[#9a5b2f]/40 bg-[#f0dfad]/70 text-[#7a5426]'
                      : 'border-[#738275]/15 bg-[#eee8d4]/55 text-[#8d947f]'
                    }`}
                  >
                    {selected && gameState.combatActivity.target === 'boss'
                      ? '首领待战'
                      : bossAvailable
                        ? progress.bossDefeated ? '再战首领' : '挑战首领'
                        : '尚未现身'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || locked || anotherDungeonActive || !dungeon}
                    onClick={() => handleStartDungeonRun(zone.id)}
                    className={`col-span-2 min-h-[36px] rounded border px-2 text-xs font-bold ${dungeonActive
                      ? 'border-[#a9823c]/40 bg-[#f0dfad]/70 text-[#7a5426]'
                      : !busy && !locked && !anotherDungeonActive
                        ? 'border-[#738275]/25 bg-[#eef3df]/75 text-[#355d58]'
                        : 'border-[#738275]/15 bg-[#eee8d4]/55 text-[#8d947f]'
                    }`}
                  >
                    {dungeonActive
                      ? `秘境进行中 · 第${gameState.dungeonRun?.floor}层`
                      : anotherDungeonActive
                        ? '已有秘境进行中'
                        : `开启五层秘境 · 通关${dungeonProgress?.clears ?? 0}次`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CombatForecastCard({
  label,
  forecast
}: {
  label: string;
  forecast: ReturnType<typeof simulateCombatForecast>;
}) {
  const tone = forecast.winRate >= 70
    ? 'text-[#355d58]'
    : forecast.winRate >= 40
      ? 'text-[#9a5b2f]'
      : 'text-[#9d3d2f]';
  return (
    <div className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 px-3 py-2">
      <div className="text-xs font-bold text-[#6d634d]">{label}</div>
      <div className={`mt-1 text-lg font-bold ${tone}`}>{forecast.winRate}%</div>
      <div className="text-xs leading-relaxed text-[#66766e]">
        平均 {forecast.averageRounds} 回合 · 余命 {forecast.averageHealthPercent}%
      </div>
    </div>
  );
}

function getPathLabel(pathId: CultivationPathId): string {
  return { sword: '剑修', body: '体修', spell: '法修', demonic: '邪修' }[pathId];
}

function formatItemCosts(costs: Array<{ itemId: string; quantity: number }>): string {
  if (costs.length === 0) return '无';
  return costs.map(cost => `${getItem(cost.itemId)?.name ?? cost.itemId}x${cost.quantity}`).join(' · ');
}

function getCombatSkillPassiveText(skillId: CombatSkillId, level: number): string {
  if (skillId === 'attack') return level >= 10 ? '暴击与攻势显著提高' : level >= 5 ? '解锁破势暴击加成' : '提高攻击与暴击';
  if (skillId === 'defense') return level >= 10 ? '大幅减轻伤势' : level >= 5 ? '解锁护体步法' : '提高生命、防御与闪避';
  return level >= 10 ? '功法威力与真气显著提高' : level >= 5 ? '解锁高效运气' : '提高真气与功法威力';
}

function getBossMechanicLabel(mechanicId: BossMechanicId): string {
  if (mechanicId === 'charge') return '蓄势重击';
  if (mechanicId === 'armor-break') return '破甲';
  if (mechanicId === 'seal') return '封灵';
  if (mechanicId === 'burn') return '劫火灼伤';
  return '逐层狂暴';
}

function CombatSupplyControl({
  label,
  itemId,
  threshold,
  supplies,
  inventory,
  disabled,
  onItemChange,
  onThresholdChange
}: {
  label: string;
  itemId: string | null;
  threshold: number;
  supplies: typeof combatSupplyDefinitions;
  inventory: Array<{ itemId: string; quantity: number }>;
  disabled: boolean;
  onItemChange: (itemId: string | null) => void;
  onThresholdChange: (threshold: number) => void;
}) {
  return (
    <div className="rounded border border-[#738275]/15 bg-[#fffdf2]/65 px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[#45564f]">
        <span>{label}</span>
        <span>{threshold}%</span>
      </div>
      <select
        value={itemId ?? ''}
        disabled={disabled}
        onChange={event => onItemChange(event.target.value || null)}
        className="h-9 w-full rounded border border-[#738275]/25 bg-[#fffdf2] px-2 text-xs text-[#45564f]"
      >
        <option value="">不使用</option>
        {supplies.map(supply => {
          const quantity = inventory.find(entry => entry.itemId === supply.itemId)?.quantity ?? 0;
          return (
            <option key={supply.itemId} value={supply.itemId}>
              {getItem(supply.itemId)?.name ?? supply.itemId} x{quantity} · {supply.effectText}
            </option>
          );
        })}
      </select>
      <input
        type="range"
        min={10}
        max={80}
        step={5}
        disabled={disabled || !itemId}
        value={threshold}
        onChange={event => onThresholdChange(Number(event.target.value))}
        className="mt-2 h-2 w-full accent-[#355d58] disabled:opacity-45"
        aria-label={`${label}使用阈值`}
      />
    </div>
  );
}
