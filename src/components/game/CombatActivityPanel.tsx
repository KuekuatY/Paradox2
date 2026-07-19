import { combatZones, getEquipmentDefinition } from '@/data/combatZones';
import { getItem } from '@/data/items';
import { realms } from '@/data/realms';
import { useGameStore } from '@/stores/gameStore';
import type { AutoCombatStrategy, EquipmentSlot } from '@/types';

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
    selectCombatZone,
    setAutoCombatConfig,
    unequipCombatItem
  } = useGameStore();
  const activeZone = combatZones.find(zone => zone.id === gameState.combatActivity.zoneId) ?? combatZones[0];
  const autoConfig = gameState.combatActivity.autoCombat;
  const busy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">战斗</h2>
          <p className="mt-1 text-sm font-semibold text-[#66766e]">
            当前区域 · {activeZone.name}
          </p>
        </div>
        <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/65 px-3 py-2 text-right text-xs text-[#66766e]">
          <div>胜 {gameState.combatStats.victories} · 败 {gameState.combatStats.defeats}</div>
          <div className={gameState.combatStats.injury >= 60 ? 'font-bold text-[#9d3d2f]' : ''}>
            伤势 {gameState.combatStats.injury}/100
          </div>
        </div>
      </div>

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
      </section>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-[#45564f]">装备</span>
          <span className="text-xs text-[#66766e]">储物戒中装备法器</span>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
          {equipmentSlots.map(slot => {
            const itemId = gameState.equipment[slot.id];
            const item = getItem(itemId ?? '');
            const definition = getEquipmentDefinition(itemId);
            return (
              <div key={slot.id} className="min-h-[106px] rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-3">
                <div className="text-xs font-bold text-[#6d634d]">{slot.label}</div>
                <div className={`mt-1 text-sm font-bold ${item ? 'text-[#355d58]' : 'text-[#8d947f]'}`}>
                  {item?.name ?? '未装备'}
                </div>
                {definition && (
                  <div className="mt-1 text-xs leading-relaxed text-[#66766e]">{definition.effectText}</div>
                )}
                {item && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => unequipCombatItem(slot.id)}
                    className="mt-2 rounded border border-[#738275]/25 bg-[#eef3df] px-2 py-1 text-xs font-bold text-[#45564f] disabled:opacity-50"
                  >
                    卸下
                  </button>
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
            const locked = gameState.currentRealm.level < zone.minRealmLevel;
            const selected = gameState.selectedYearAction === 'combat' && activeZone.id === zone.id;
            const realmName = realms.find(realm => realm.level === zone.minRealmLevel)?.name ?? `${zone.minRealmLevel}境`;
            const lootNames = zone.loot.map(loot => getItem(loot.itemId)?.name ?? loot.itemId);

            return (
              <button
                key={zone.id}
                type="button"
                disabled={busy || locked}
                onClick={() => selectCombatZone(zone.id)}
                className={`min-h-[154px] rounded-md border p-3 text-left transition-colors ${selected
                  ? 'border-[#355d58]/50 bg-[#eef3df]/75'
                  : locked
                    ? 'cursor-not-allowed border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
                    : 'border-[#738275]/25 bg-[#fff9e8]/55 hover:border-[#9a5b2f]/45 hover:bg-[#fffdf2]/80'
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
                    {selected ? '当前区域' : locked ? `${realmName}解锁` : '可前往'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#59645f]">{zone.description}</p>
                <div className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-[#6d634d]">
                  掉落：{lootNames.join(' · ')}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
