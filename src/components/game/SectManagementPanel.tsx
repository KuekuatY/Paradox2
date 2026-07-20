import { getCultivationSect } from '@/data/sects';
import {
  canPromoteSectRank,
  getNextSectRank,
  getSectFacilityBonuses,
  getSectFacilityLevel,
  getSectFacilityUpgradeCost,
  getSectRankIndex,
  getSectWorldProfile,
  isAtSectHeadquarters,
  sectFacilities
} from '@/data/sectWorld';
import { getWorldRegion, getWorldRegionProgress, worldRegions } from '@/data/worldMap';
import { getSectCampaignStage } from '@/data/sectCampaigns';
import { useGameStore } from '@/stores/gameStore';
import type { SectNpcState } from '@/types';

export default function SectManagementPanel({ className = '' }: { className?: string }) {
  const {
    gameState,
    donateSectTreasury,
    formDaoCompanion,
    interactSectNpc,
    promoteSectRank,
    recruitSectDisciple,
    returnToSectHeadquarters,
    startSectCampaign,
    advanceSectCampaign,
    upgradeSectFacility
  } = useGameStore();
  const sectState = gameState.sect;
  const sect = getCultivationSect(sectState?.sectId);
  const profile = getSectWorldProfile(sectState?.sectId);
  const headquarters = getWorldRegion(profile?.headquartersRegionId);
  const atHeadquarters = !!sectState && isAtSectHeadquarters(sectState.sectId, gameState.worldMap.currentRegionId);
  const busy = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;

  if (!sectState || !sect || !profile) {
    return (
      <div className={`ink-panel rounded-lg p-5 ${className}`}>
        <h2 className="ink-title text-xl font-bold">宗门</h2>
        <div className="mt-4 rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 p-5 text-center text-sm font-semibold text-[#66766e]">
          十五岁山门择路后，宗门事务将在此展开。
        </div>
      </div>
    );
  }

  if (sectState.sectId === 'loose') {
    return (
      <div className={`ink-panel rounded-lg p-5 ${className}`}>
        <h2 className="ink-title text-xl font-bold">散修盟约</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#66766e]">你不受山门辖制，四海散盟的声望、世界委托与洞府经营就是你的立身根基。</p>
        <div className="mt-4 rounded-md border border-[#738275]/20 bg-[#eef3df]/45 p-4 text-sm text-[#45564f]">
          散修没有职位与宗门设施，但可自由参与地区委托、首领讨伐和自动远行。
        </div>
      </div>
    );
  }

  const nextRank = getNextSectRank(sectState.rank);
  const canPromote = nextRank?.name !== '掌门' && canPromoteSectRank(
    sectState.rank,
    gameState.currentRealm.level,
    sectState.merit,
    sectState.reputation,
    gameState.sectManagement.influence
  );
  const bonuses = getSectFacilityBonuses(gameState.sectManagement);
  const territories = worldRegions.filter(region => (
    getWorldRegionProgress(gameState.worldMap, region.id).controllerSectId === sectState.sectId
  ));
  const activeNpcs = gameState.sectManagement.npcs.filter(npc => npc.active);
  const campaignStage = gameState.sectCampaign.active
    ? getSectCampaignStage(gameState.sectCampaign.stage)
    : undefined;
  const campaignCooldown = gameState.sectCampaign.lastCompletedAge === null
    ? 0
    : Math.max(0, 20 - (gameState.age - gameState.sectCampaign.lastCompletedAge));

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">{sect.name}</h2>
          <p className="mt-1 text-sm font-semibold text-[#66766e]">{sectState.rank} · 驻地 {headquarters?.name ?? '无固定山门'} · {profile.specialty}</p>
        </div>
        {atHeadquarters ? (
          <div className="rounded-md border border-[#355d58]/25 bg-[#eef3df] px-3 py-2 text-right text-xs font-bold text-[#355d58]">身在宗门驻地</div>
        ) : (
          <button
            type="button"
            disabled={busy || (gameState.inventory.find(entry => entry.itemId === 'travel-supply')?.quantity ?? 0) < 2}
            onClick={returnToSectHeadquarters}
            className="rounded-md border border-[#a9823c]/25 bg-[#f0dfad]/55 px-3 py-2 text-right text-xs font-bold text-[#7a5426] disabled:opacity-40"
          >
            返回驻地 · 2年 · 灵粮2
          </button>
        )}
      </div>

      <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="可用贡献" value={sectState.contribution} />
        <Metric label="累计功绩" value={sectState.merit} />
        <Metric label="宗门声望" value={sectState.reputation} />
        <Metric label="宗门影响" value={gameState.sectManagement.influence} />
      </section>

      <section className="mt-4 rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-bold text-[#45564f]">职位晋升</div>
            <div className="mt-1 text-xs text-[#66766e]">
              {nextRank
                ? `下一职位 ${nextRank.name} · ${nextRank.minRealmLevel}境 · 功绩 ${nextRank.merit} · 声望 ${nextRank.reputation} · 影响 ${nextRank.influence}`
                : '已执掌宗门最高职位'}
            </div>
          </div>
          <button
            type="button"
            disabled={busy || !atHeadquarters || !canPromote}
            onClick={promoteSectRank}
            className="min-h-[38px] rounded border border-[#355d58]/35 bg-[#355d58] px-4 text-xs font-bold text-[#fff9e8] disabled:border-[#738275]/15 disabled:bg-[#eee8d4] disabled:text-[#8d947f]"
          >
            {!atHeadquarters ? '需返回驻地' : nextRank?.name === '掌门' ? '需完成掌门议决' : canPromote ? `晋升${nextRank?.name}` : '条件未满足'}
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-md border border-[#738275]/20 bg-[#eef3df]/45 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-bold text-[#45564f]">宗门任务链</div>
            <div className="mt-1 text-xs leading-relaxed text-[#66766e]">
              {campaignStage
                ? `第 ${gameState.sectCampaign.stage + 1}/4 环 · ${campaignStage.name}：${campaignStage.description}`
                : gameState.sectCampaign.completedCount > 0
                  ? `已完成 ${gameState.sectCampaign.completedCount} 轮辖境事务${campaignCooldown > 0 ? ` · ${campaignCooldown} 年后可再领` : ''}`
                  : '晋升内门弟子后，可承接会持续改变同门关系与辖境状态的连续任务。'}
            </div>
          </div>
          {!campaignStage && (
            <button
              type="button"
              disabled={
                busy
                || !atHeadquarters
                || campaignCooldown > 0
                || getSectRankIndex(sectState.rank) < getSectRankIndex('内门弟子')
              }
              onClick={startSectCampaign}
              className="min-h-[38px] rounded border border-[#355d58]/35 bg-[#355d58] px-3 text-xs font-bold text-[#fff9e8] disabled:border-[#738275]/15 disabled:bg-[#eee8d4] disabled:text-[#8d947f]"
            >
              承接连环任务
            </button>
          )}
        </div>
        {gameState.sectCampaign.outcome && (
          <div className="mt-2 rounded border border-[#738275]/15 bg-[#fffdf2]/65 px-3 py-2 text-xs leading-relaxed text-[#66766e]">
            最近后果：{gameState.sectCampaign.outcome}
          </div>
        )}
        {campaignStage && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {campaignStage.choices.map(choice => {
              const affordable = gameState.spiritStones >= (choice.spiritStoneCost ?? 0)
                && gameState.age + choice.timeCost < gameState.lifespan;
              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={busy || !atHeadquarters || !affordable}
                  onClick={() => advanceSectCampaign(choice.id)}
                  className="min-h-[112px] rounded-md border border-[#738275]/25 bg-[#fffdf2]/75 p-3 text-left disabled:opacity-45"
                >
                  <span className="block font-bold text-[#355d58]">{choice.name} · {choice.kind === 'combat' ? `战斗 · ${choice.timeCost}年` : `${choice.timeCost}年`}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#66766e]">{choice.description}</span>
                  <span className="mt-2 block text-xs font-semibold text-[#7a5426]">
                    {choice.spiritStoneCost ? `灵石 ${choice.spiritStoneCost} · ` : ''}宗门影响 {(choice.sect.influence ?? 0) >= 0 ? '+' : ''}{choice.sect.influence ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-[#45564f]">宗门建设</div>
            <div className="mt-0.5 text-xs text-[#66766e]">财库 {gameState.sectManagement.treasury} · 每十年财库 +{bonuses.treasuryIncomePerTenYears}</div>
          </div>
          <div className="flex gap-1.5">
            {[10, 50, 100].map(amount => (
              <button
                key={amount}
                type="button"
                disabled={busy || !atHeadquarters || gameState.spiritStones < amount}
                onClick={() => donateSectTreasury(amount)}
                className="rounded border border-[#9a5b2f]/25 bg-[#f0dfad]/55 px-2 py-1.5 text-xs font-bold text-[#7a5426] disabled:opacity-40"
              >
                捐 {amount}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {sectFacilities.map(facility => {
            const level = getSectFacilityLevel(gameState.sectManagement, facility.id);
            const cost = getSectFacilityUpgradeCost(facility, level);
            const rankReady = getSectRankIndex(sectState.rank) >= getSectRankIndex(facility.minRank);
            const available = atHeadquarters && rankReady && level < facility.maxLevel && gameState.sectManagement.treasury >= cost && !busy;
            return (
              <div key={facility.id} className="flex min-h-[170px] flex-col rounded-md border border-[#738275]/20 bg-[#fff9e8]/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-[#355d58]">{facility.name}</div>
                  <span className="text-xs font-bold text-[#7a5426]">{level}/{facility.maxLevel}</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-[#9a5b2f]">{facility.focus}</div>
                <p className="mt-2 text-xs leading-relaxed text-[#66766e]">{facility.description}</p>
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => upgradeSectFacility(facility.id)}
                  className="mt-auto min-h-[34px] rounded border border-[#355d58]/30 bg-[#eef3df] px-2 text-xs font-bold text-[#355d58] disabled:border-[#738275]/15 disabled:bg-[#eee8d4]/55 disabled:text-[#8d947f]"
                >
                  {level >= facility.maxLevel ? '已满级' : !rankReady ? `需${facility.minRank}` : `扩建 · 财库 ${cost}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold text-[#45564f]">宗门人物</div>
            <div className="mt-0.5 text-xs text-[#66766e]">在世 {activeNpcs.length} · 道侣 {activeNpcs.filter(npc => npc.role === 'dao-companion').length} · 弟子 {activeNpcs.filter(npc => npc.role === 'disciple').length}</div>
          </div>
          <button
            type="button"
            disabled={busy || !atHeadquarters || getSectRankIndex(sectState.rank) < getSectRankIndex('长老') || gameState.sectManagement.influence < 10}
            onClick={recruitSectDisciple}
            className="rounded border border-[#9a5b2f]/25 bg-[#f0dfad]/50 px-3 py-2 text-xs font-bold text-[#7a5426] disabled:opacity-40"
          >
            收徒 · 影响 10
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {gameState.sectManagement.npcs.map(npc => (
            <NpcCard
              key={npc.id}
              npc={npc}
              canAct={!busy && atHeadquarters && npc.active && npc.lastInteractionAge !== gameState.age}
              canManageRelationship={!busy && atHeadquarters}
              hasDaoCompanion={activeNpcs.some(entry => entry.role === 'dao-companion')}
              onCompanion={() => formDaoCompanion(npc.id)}
              onInteract={interaction => interactSectNpc(npc.id, interaction)}
            />
          ))}
        </div>
      </section>

      <section className="mt-4 border-t border-[#738275]/20 pt-4">
        <div className="font-bold text-[#45564f]">宗门辖境</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {territories.length > 0 ? territories.map(region => {
            const progress = getWorldRegionProgress(gameState.worldMap, region.id);
            return (
              <span key={region.id} className="rounded border border-[#738275]/20 bg-[#eef3df]/60 px-3 py-2 text-xs font-semibold text-[#45564f]">
                {region.name} · 稳定 {progress.stability} · 繁荣 {progress.prosperity}
              </span>
            );
          }) : <span className="text-xs text-[#66766e]">宗门暂未控制地图区域。</span>}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#738275]/20 bg-[#fff9e8]/60 px-3 py-2 text-center">
      <div className="text-xs text-[#66766e]">{label}</div>
      <div className="mt-0.5 font-bold text-[#355d58]">{value}</div>
    </div>
  );
}

function NpcCard({
  npc,
  canAct,
  canManageRelationship,
  hasDaoCompanion,
  onCompanion,
  onInteract
}: {
  npc: SectNpcState;
  canAct: boolean;
  canManageRelationship: boolean;
  hasDaoCompanion: boolean;
  onCompanion: () => void;
  onInteract: (interaction: 'visit' | 'gift' | 'spar') => void;
}) {
  const canFormCompanion = !hasDaoCompanion && npc.active && npc.affinity >= 80 && ['peer', 'companion'].includes(npc.role);
  return (
    <div className={`rounded-md border p-3 ${npc.active ? 'border-[#738275]/20 bg-[#fffdf2]/70' : 'border-[#738275]/15 bg-[#eee8d4]/55 text-[#8d947f]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-[#45564f]">{npc.name}</div>
          <div className="mt-0.5 text-xs text-[#66766e]">{getNpcRoleLabel(npc.role)} · {npc.personality} · {npc.realmLevel}境</div>
        </div>
        <span className={`text-xs font-bold ${npc.affinity >= 60 ? 'text-[#355d58]' : npc.affinity < 0 ? 'text-[#9d3d2f]' : 'text-[#7a5426]'}`}>情谊 {npc.affinity}</span>
      </div>
      <div className="mt-2 text-xs text-[#66766e]">年龄 {npc.age}/{npc.lifespan}{npc.active ? '' : ' · 已坐化'} · 生命 {npc.combatHp}/{npc.combatMaxHp} · 伤势 {npc.injury}</div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <button type="button" disabled={!canAct} onClick={() => onInteract('visit')} className="rounded border border-[#738275]/20 bg-[#eef3df]/70 px-1 py-1.5 text-xs font-bold text-[#355d58] disabled:opacity-40">拜访</button>
        <button type="button" disabled={!canAct} onClick={() => onInteract('gift')} className="rounded border border-[#9a5b2f]/20 bg-[#f0dfad]/50 px-1 py-1.5 text-xs font-bold text-[#7a5426] disabled:opacity-40">赠礼</button>
        <button type="button" disabled={!canAct} onClick={() => onInteract('spar')} className="rounded border border-[#738275]/20 bg-[#fff9e8]/70 px-1 py-1.5 text-xs font-bold text-[#45564f] disabled:opacity-40">切磋</button>
      </div>
      {canFormCompanion && (
        <button
          type="button"
          disabled={!canManageRelationship}
          onClick={onCompanion}
          className="mt-2 min-h-[34px] w-full rounded border border-[#9a5b2f]/30 bg-[#f0dfad]/65 px-2 text-xs font-bold text-[#7a5426] disabled:opacity-40"
        >
          结为道侣
        </button>
      )}
    </div>
  );
}

function getNpcRoleLabel(role: SectNpcState['role']): string {
  return {
    master: '师父', peer: '同门', rival: '宿敌', companion: '知己',
    'dao-companion': '道侣', disciple: '弟子'
  }[role];
}
