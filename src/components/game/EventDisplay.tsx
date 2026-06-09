import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { cultivationPaths } from '@/data/cultivationPaths';
import { cultivationSects } from '@/data/sects';
import { getItem } from '@/data/items';
import { getTechnique } from '@/data/techniques';
import { getFeat } from '@/data/dndFeatures';
import type { CombatActionId, CombatReport, CultivationPath, CultivationSect, D20CheckReport, EventChoice, InventoryEntry, InventoryReward, TurnCombatState, YearActionId } from '@/types';

interface EventDisplayProps {
  canBreakthrough: boolean;
  onBreakthrough: () => void;
  onContinue: () => void;
  onMeditationEnd: () => void;
  panelClassName?: string;
  showBreakthroughControls?: boolean;
}

export default function EventDisplay({
  canBreakthrough,
  onBreakthrough,
  onContinue,
  onMeditationEnd,
  panelClassName = '',
  showBreakthroughControls = true
}: EventDisplayProps) {
  const {
    gameState,
    chooseFeat,
    chooseCultivationPath,
    chooseCultivationSect,
    chooseEventOption,
    getCurrentEventChoices,
    resolveCombatAction,
    selectYearAction
  } = useGameStore();
  const [displayedText, setDisplayedText] = useState('');
  const [isConfirmingMeditationEnd, setIsConfirmingMeditationEnd] = useState(false);
  
  const currentEvent = gameState.pendingCombat?.event ?? gameState.pendingEvent ?? gameState.events[gameState.events.length - 1];
  const isPendingCombat = !!gameState.pendingCombat;
  const isPendingChoice = !!gameState.pendingEvent && !isPendingCombat;
  const shouldShowYearActions = gameState.currentRealm.name !== '幼年期' && gameState.age >= 10;
  const effectEntries = !isPendingChoice && currentEvent?.appliedEffects
    ? Object.entries(currentEvent.appliedEffects).filter(([, value]) => value !== undefined && value !== 0)
    : [];

  useEffect(() => {
    setIsConfirmingMeditationEnd(false);

    if (!currentEvent) {
      setDisplayedText('命途初定，修仙路即将展开。');
      return;
    }
    
    setDisplayedText('');
    
    const text = currentEvent.description;
    let index = 0;
    
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [currentEvent]);

  const handleContinue = () => {
    setIsConfirmingMeditationEnd(false);
    onContinue();
  };

  const handleMeditationEndClick = () => {
    if (!isConfirmingMeditationEnd) {
      setIsConfirmingMeditationEnd(true);
      return;
    }

    onMeditationEnd();
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, string> = {
      'childhood': '幼',
      'cultivation': '修',
      'combat': '战',
      'encounter': '缘',
      'social': '交',
      'disaster': '劫',
      'daily': '常',
      'resource': '财',
      'mind': '心',
      'sect': '宗'
    };
    return icons[type] || '道';
  };

  const getEventColor = (result: string) => {
    switch (result) {
      case 'great-success':
        return 'border-[#7f9a78]/35';
      case 'great-failure':
        return 'border-[#b98678]/35';
      default:
        return 'border-[#8d947f]/30';
    }
  };

  const getResultText = (result: string) => {
    if (isPendingChoice) {
      return '待抉择';
    }

    switch (result) {
      case 'great-success':
        return '大成功';
      case 'great-failure':
        return '大失败';
      default:
        return '普通';
    }
  };

  const formatEffect = (key: string, value: string | number) => {
    if (key === '境界') {
      return value === 'advance' ? '境界突破' : '境界跌落';
    }

    if (key === '时间' && typeof value === 'number') {
      return `耗时 ${value} 年`;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return `${key} 无尽`;
      }

      return `${key} ${value > 0 ? '+' : ''}${value}`;
    }

    return `${key} ${value}`;
  };

  const getEffectClass = (value: string | number) => {
    if (typeof value === 'number' && value < 0) {
      return 'bg-[#f2d9d2] text-[#9d3d2f]';
    }

    return 'bg-[#e7eddd] text-[#355d58]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`ink-panel ink-scrollbar overflow-y-auto rounded-lg p-4 sm:p-6 lg:p-8 ${panelClassName}`}
    >
      <div className="mb-4 text-center sm:mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#a94d37] text-2xl font-bold text-[#a94d37] sm:mb-4 sm:h-16 sm:w-16 sm:text-3xl"
        >
          {getEventIcon(currentEvent?.type || '')}
        </motion.div>
        
        <h2 className="ink-title mb-2 text-xl font-bold sm:text-2xl">
          第 {gameState.age} 年
        </h2>
        
        <motion.p
          key={currentEvent?.title}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold text-[#9a5b2f] sm:text-xl"
        >
          {currentEvent?.title || '初入仙途'}
        </motion.p>
      </div>

      <motion.div
        className={`scroll-container mb-4 rounded-lg border p-4 sm:mb-6 sm:p-6 ${getEventColor(currentEvent?.result || '')}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="min-h-[72px] text-base font-semibold leading-relaxed text-stone-950 sm:min-h-[80px] sm:text-lg">
          {displayedText}
          <span className="animate-pulse">|</span>
        </p>

        {!isPendingChoice && currentEvent?.combat && (
          <CombatReportPanel report={currentEvent.combat} />
        )}

        {!isPendingChoice && currentEvent?.check && (
          <CheckReportPanel check={currentEvent.check} />
        )}

        {!isPendingChoice && currentEvent?.itemRewards && currentEvent.itemRewards.length > 0 && (
          <ItemRewardPanel rewards={currentEvent.itemRewards} />
        )}

        {!isPendingChoice && currentEvent?.itemLosses && currentEvent.itemLosses.length > 0 && (
          <ItemLossPanel losses={currentEvent.itemLosses} />
        )}

        {!isPendingChoice && currentEvent?.techniqueRewards && currentEvent.techniqueRewards.length > 0 && (
          <TechniqueRewardPanel techniqueIds={currentEvent.techniqueRewards} />
        )}

        {!isPendingChoice && currentEvent?.pathResourceChange && (
          <PathResourceChangePanel change={currentEvent.pathResourceChange} />
        )}
        
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {effectEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#6d634d]">本年变化</span>
              {effectEntries.map(([key, value]) => (
                <span
                  key={key}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${getEffectClass(value)}`}
                >
                  {formatEffect(key, value)}
                </span>
              ))}
            </div>
          )}
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
            isPendingCombat ? 'bg-[#f0dfad] text-[#7a5426]' :
            isPendingChoice ? 'bg-[#eef2e7] text-[#45564f]' :
            currentEvent?.result === 'great-success' ? 'bg-[#e8d49a] text-[#7a5426]' :
            currentEvent?.result === 'great-failure' ? 'bg-[#e6b8ae] text-[#8f2f24]' :
            'bg-[#eee8d4] text-[#6d634d]'
          }`}>
            {isPendingCombat ? '交战中' : getResultText(currentEvent?.result || '')}
          </span>
        </div>
      </motion.div>

      {gameState.pendingCombat ? (
        <TurnCombatPanel combat={gameState.pendingCombat} onAction={resolveCombatAction} />
      ) : isPendingChoice ? (
        <EventChoices
          choices={getCurrentEventChoices()}
          onChoose={chooseEventOption}
        />
      ) : gameState.pendingFeatOptions.length > 0 ? (
        <FeatChoices featIds={gameState.pendingFeatOptions} onChoose={chooseFeat} />
      ) : gameState.pendingSectChoice ? (
        <SectChoices onChoose={chooseCultivationSect} />
      ) : gameState.pendingPathChoice ? (
        <PathChoices onChoose={chooseCultivationPath} />
      ) : (
        <>
          {showBreakthroughControls && canBreakthrough && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-md border border-[#a9823c]/45 bg-[#f0dfad]/70 px-4 py-3 text-center shadow-sm"
            >
              <div className="text-sm font-semibold text-[#7a5426] sm:text-base">
                修为已满，可以尝试突破
              </div>
            </motion.div>
          )}
          {shouldShowYearActions && (
            <YearActionPanel
              activeAction={gameState.selectedYearAction}
              onSelect={selectYearAction}
            />
          )}
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            {showBreakthroughControls && (
              <button
                type="button"
                disabled={!canBreakthrough}
                onClick={onBreakthrough}
                className={`w-full rounded-md border px-6 py-3 text-lg font-bold transition-colors sm:w-auto sm:px-8 sm:text-xl ${
                  canBreakthrough
                    ? 'border-[#a9823c]/70 bg-[#f0dfad] text-[#7a5426] shadow-md hover:bg-[#f4e6ba]'
                    : 'border-[#738275]/20 bg-[#eee8d4]/55 text-[#8d947f]'
                }`}
              >
                突破瓶颈
              </button>
            )}
          <button
            type="button"
            onClick={handleContinue}
            className="ink-button-primary w-full text-lg sm:w-auto sm:text-xl"
          >
            继续修仙
          </button>
          <button
            type="button"
            onClick={handleMeditationEndClick}
            className={`w-full text-lg sm:w-auto sm:text-xl ${
              isConfirmingMeditationEnd
                ? 'rounded-md border border-[#a94d37]/45 bg-[#f2d9d2] px-6 py-3 font-bold text-[#9d3d2f] shadow-md transition-all hover:brightness-105'
                : 'ink-button-secondary'
            }`}
          >
            {isConfirmingMeditationEnd ? '确认散功' : '散功坐化'}
          </button>
            {isConfirmingMeditationEnd && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsConfirmingMeditationEnd(false)}
                className="w-full rounded-md border border-[#738275]/35 bg-[#fff9e8]/70 px-6 py-3 text-lg font-bold text-[#45564f] transition-all hover:bg-[#fffdf2] sm:w-auto sm:text-xl"
              >
                取消
              </motion.button>
            )}
          </div>
          {isConfirmingMeditationEnd && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-center text-sm font-semibold text-[#9d3d2f]"
            >
              散去一身修为，此世将就此结束。
            </motion.p>
          )}
        </>
      )}
    </motion.div>
  );
}

function YearActionPanel({
  activeAction,
  onSelect
}: {
  activeAction: YearActionId;
  onSelect: (actionId: YearActionId) => void;
}) {
  const actions: Array<{ id: YearActionId; label: string }> = [
    { id: 'cultivate', label: '修炼' },
    { id: 'adventure', label: '历练' },
    { id: 'seclusion', label: '闭关' },
    { id: 'life-skill', label: '百艺' }
  ];

  return (
    <div className="mb-4 rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#45564f]">本年安排</span>
        <span className="text-xs text-[#66766e]">影响下一次继续修仙</span>
      </div>
      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
        {actions.map(action => {
          const isActive = activeAction === action.id;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelect(action.id)}
              className={`min-h-[48px] rounded border px-2 py-2 text-xs font-bold transition ${
                isActive
                  ? 'border-[#355d58]/45 bg-[#355d58] text-[#fff9e8]'
                  : 'border-[#738275]/25 bg-[#fffdf2]/65 text-[#59645f] hover:border-[#9a5b2f]/45'
              }`}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TechniqueRewardPanel({ techniqueIds }: { techniqueIds: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-[#738275]/25 bg-[#e7eddd]/55 px-3 py-2">
      <span className="text-xs font-semibold text-[#355d58]">功法</span>
      {techniqueIds.map(techniqueId => {
        const technique = getTechnique(techniqueId);
        if (!technique) return null;

        return (
          <span
            key={techniqueId}
            className="rounded-full bg-[#fffdf2]/75 px-3 py-1 text-xs font-bold text-[#355d58]"
          >
            《{technique.name}》 · {technique.grade}阶
          </span>
        );
      })}
    </div>
  );
}

function ItemRewardPanel({ rewards }: { rewards: InventoryReward[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-[#a9823c]/25 bg-[#f0dfad]/35 px-3 py-2">
      <span className="text-xs font-semibold text-[#7a5426]">储物戒</span>
      {rewards.map(reward => {
        const item = getItem(reward.itemId);
        if (!item) return null;

        return (
          <span
            key={reward.itemId}
            className="rounded-full bg-[#fffdf2]/75 px-3 py-1 text-xs font-bold text-[#355d58]"
          >
            {item.name} x{reward.quantity}
          </span>
        );
      })}
    </div>
  );
}

function ItemLossPanel({ losses }: { losses: InventoryReward[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-[#b98678]/25 bg-[#f2d9d2]/45 px-3 py-2">
      <span className="text-xs font-semibold text-[#9d3d2f]">储物戒遗失</span>
      {losses.map(loss => {
        const item = getItem(loss.itemId);
        if (!item) return null;

        return (
          <span
            key={loss.itemId}
            className="rounded-full bg-[#fffdf2]/75 px-3 py-1 text-xs font-bold text-[#9d3d2f]"
          >
            {item.name} x{loss.quantity}
          </span>
        );
      })}
    </div>
  );
}

function CheckReportPanel({ check }: { check: D20CheckReport }) {
  const tone = check.outcome === 'great-success'
    ? 'text-[#7a5426]'
    : check.outcome === 'great-failure'
      ? 'text-[#9d3d2f]'
      : 'text-[#355d58]';

  return (
    <div className="mt-3 rounded-md border border-[#738275]/20 bg-[#fffdf2]/65 px-3 py-2 text-xs">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 font-semibold">
        <span className="text-[#45564f]">{check.label} · {check.attribute}</span>
        <span className={tone}>{formatCheckOutcome(check.outcome)}</span>
      </div>
      <div className="flex flex-wrap gap-2 text-[#66766e]">
        <span>d20 {formatRolls(check)}</span>
        <span>调整 {formatSigned(check.attributeModifier)}</span>
        <span>熟练 {formatSigned(check.proficiencyBonus)}</span>
        {check.bonus !== 0 && <span>加值 {formatSigned(check.bonus)}</span>}
        <span className="font-semibold text-[#263832]">总计 {check.total} / DC {check.dc}</span>
        {check.mode !== 'normal' && <span>{check.mode === 'advantage' ? '优势' : '劣势'}</span>}
        {check.sourceText && <span>{check.sourceText}</span>}
      </div>
    </div>
  );
}

function TurnCombatPanel({
  combat,
  onAction
}: {
  combat: TurnCombatState;
  onAction: (actionId: CombatActionId) => void;
}) {
  const playerHpPercent = Math.round(combat.player.hp / combat.player.maxHp * 100);
  const enemyHpPercent = Math.round(combat.enemy.hp / combat.enemy.maxHp * 100);
  const playerQiPercent = Math.round(combat.player.qi / combat.player.maxQi * 100);
  const enemyQiPercent = Math.round(combat.enemy.qi / combat.enemy.maxQi * 100);
  const techniqueDisabled = combat.player.qi < 20;
  const actions: Array<{
    id: CombatActionId;
    label: string;
    hint: string;
    disabled?: boolean;
  }> = [
    { id: 'attack', label: '普攻', hint: '稳定造成伤害并回复真气' },
    { id: 'defend', label: '防御', hint: '降低本回合承伤并大量回复真气' },
    { id: 'technique', label: '功法', hint: '消耗 20 真气打出更高伤害', disabled: techniqueDisabled },
    { id: 'flee', label: '逃离', hint: '尝试脱身，失败会被追击' }
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[#738275]/25 bg-[#fffdf2]/70 px-3 py-3 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#66766e]">第 {combat.turn} / {combat.maxTurns} 回合</div>
            <div className="text-base font-bold text-[#355d58]">{combat.enemyName} · {combat.enemyRank}</div>
          </div>
          <div className="rounded-full bg-[#e7eddd] px-3 py-1 text-xs font-bold text-[#355d58]">
            {getCombatAssessment(combat.winRate)}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/65 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm font-bold text-[#355d58]">
              <span>{combat.player.name}</span>
              <span>我方</span>
            </div>
            <CombatHpBar label="生命" current={combat.player.hp} max={combat.player.maxHp} percent={playerHpPercent} tone="player" />
            <CombatResourceBar label="真气" current={combat.player.qi} max={combat.player.maxQi} percent={playerQiPercent} tone="qi" />
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs min-[420px]:grid-cols-4">
              <CombatStatChip label="攻击" value={combat.player.attack} />
              <CombatStatChip label="防御" value={combat.player.defense} />
              <CombatStatChip label="闪避" value={combat.player.dodge} />
              <CombatStatChip label="速度" value={combat.player.speed} />
            </div>
          </div>

          <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/65 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm font-bold text-[#9a5b2f]">
              <span>{combat.enemyName}</span>
              <span>{combat.enemy.rank ?? '敌手'}</span>
            </div>
            <CombatHpBar label="生命" current={combat.enemy.hp} max={combat.enemy.maxHp} percent={enemyHpPercent} tone="enemy" />
            <CombatResourceBar label="真气" current={combat.enemy.qi} max={combat.enemy.maxQi} percent={enemyQiPercent} tone="enemyQi" />
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs min-[420px]:grid-cols-4">
              <CombatStatChip label="攻击" value={combat.enemy.attack} />
              <CombatStatChip label="防御" value={combat.enemy.defense} />
              <CombatStatChip label="闪避" value={combat.enemy.dodge} />
              <CombatStatChip label="速度" value={combat.enemy.speed} />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-[#738275]/20 bg-[#eef3df]/60 px-3 py-2 text-xs text-[#45564f]">
          <div className="font-semibold text-[#355d58]">战况</div>
          {combat.log.map((line, index) => (
            <div key={`${line}-${index}`} className="mt-1">{line}</div>
          ))}
        </div>
      </div>

      {combat.rounds.length > 0 && (
        <div className="rounded-md border border-[#738275]/25 bg-[#fffdf2]/70 px-3 py-3">
          <div className="mb-2 text-sm font-bold text-[#45564f]">最近回合</div>
          <div className="space-y-2">
            {combat.rounds.slice(-3).reverse().map(round => (
              <div key={round.round} className="rounded border border-[#738275]/15 bg-[#fff9e8]/65 px-3 py-2 text-xs">
                <div className="mb-1 flex items-center justify-between font-semibold text-[#355d58]">
                  <span>第 {round.round} 回合</span>
                  <span>伤害 {round.playerDamage} / {round.enemyDamage}</span>
                </div>
                <div className="grid gap-1 text-[#45564f] sm:grid-cols-2">
                  <span>我方：{round.playerAction}</span>
                  <span>敌方：{round.enemyAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map(action => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            onClick={() => onAction(action.id)}
            title={action.hint}
            className={`min-h-[54px] rounded-md border px-3 py-2 text-sm font-bold transition-colors ${
              action.disabled
                ? 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
                : action.id === 'flee'
                  ? 'border-[#b98678]/30 bg-[#f2d9d2]/65 text-[#9d3d2f] hover:bg-[#efd0c8]'
                  : 'border-[#738275]/30 bg-[#fffdf2]/80 text-[#355d58] hover:border-[#9a5b2f]/45 hover:bg-[#eef3df]'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CombatReportPanel({ report }: { report: CombatReport }) {
  const playerHpPercent = Math.max(0, Math.round(report.playerHpAfter / report.playerMaxHp * 100));
  const enemyHpPercent = Math.max(0, Math.round(report.enemyHpAfter / report.enemyMaxHp * 100));
  const injuryTone = report.injuryAfter >= 70
    ? 'text-[#9d3d2f]'
    : report.injuryAfter >= 35
      ? 'text-[#9a5b2f]'
      : 'text-[#355d58]';

  return (
    <div className="mt-4 rounded-md border border-[#738275]/25 bg-[#fffdf2]/65 px-3 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[#66766e]">战斗</div>
          <div className="text-sm font-bold text-[#355d58]">
            {report.enemyName} · {report.enemyRank}
          </div>
        </div>
        <div className="rounded-full bg-[#e7eddd] px-3 py-1 text-xs font-bold text-[#355d58]">
          {getCombatAssessment(report.winRate)}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <CombatHpBar label="我方生命" current={report.playerHpAfter} max={report.playerMaxHp} percent={playerHpPercent} tone="player" />
        <CombatHpBar label="敌方生命" current={report.enemyHpAfter} max={report.enemyMaxHp} percent={enemyHpPercent} tone="enemy" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <CombatStatChip label="我方攻击" value={report.playerAttack} />
        <CombatStatChip label="我方防御" value={report.playerDefense} />
        <CombatStatChip label="我方闪避" value={report.playerDodge} />
        <CombatStatChip label="我方速度" value={report.playerSpeed} />
        <CombatStatChip label="敌方攻击" value={report.enemyAttack} />
        <CombatStatChip label="敌方防御" value={report.enemyDefense} />
        <CombatStatChip label="敌方闪避" value={report.enemyDodge} />
        <CombatStatChip label="敌方速度" value={report.enemySpeed} />
      </div>
      {report.initiative && (
        <div className="mt-3 rounded-md border border-[#738275]/20 bg-[#eef3df]/65 px-3 py-2 text-xs">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 font-semibold text-[#355d58]">
            <span>先攻检定</span>
            <span>敌方 {report.initiative.enemyTotal}</span>
          </div>
          <CheckReportPanel check={report.initiative.player} />
          <div className="mt-2 font-semibold text-[#45564f]">{report.initiative.resultText}</div>
        </div>
      )}
      {report.attackCheck && (
        <CheckReportPanel check={report.attackCheck} />
      )}
      {report.supportText && (
        <div className="mt-3 rounded-md border border-[#a9823c]/20 bg-[#f0dfad]/45 px-3 py-2 text-xs font-semibold text-[#7a5426]">
          {report.supportText}
        </div>
      )}
      {report.rounds && report.rounds.length > 0 && (
        <div className="mt-3 space-y-2">
          {report.rounds.map(round => (
            <div
              key={round.round}
              className="rounded-md border border-[#738275]/15 bg-[#fff9e8]/60 px-3 py-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between gap-2 font-semibold">
                <span className="text-[#355d58]">第 {round.round} 合</span>
                <span className="text-[#6d634d]">
                  伤害 {round.playerDamage} / {round.enemyDamage}
                </span>
              </div>
              <div className="grid gap-1 text-[#45564f] sm:grid-cols-2">
                <span>我方：{round.playerAction}</span>
                <span>敌方：{round.enemyAction}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <CombatMiniHp label="我方" current={round.playerHp} max={round.playerMaxHp} tone="player" />
                <CombatMiniHp label="敌方" current={round.enemyHp} max={round.enemyMaxHp} tone="enemy" />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-3">
        <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/60 px-2 py-2">
          <span className="block text-[#66766e]">战法</span>
          <span className="font-semibold text-[#45564f]">{report.styleText}</span>
        </div>
        <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/60 px-2 py-2">
          <span className="block text-[#66766e]">修为收益</span>
          <span className={report.cultivationPercent >= 0 ? 'font-semibold text-[#355d58]' : 'font-semibold text-[#9d3d2f]'}>
            {report.cultivationPercent > 0 ? '+' : ''}{report.cultivationPercent}%
          </span>
        </div>
        <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/60 px-2 py-2">
          <span className="block text-[#66766e]">伤势</span>
          <span className={`font-semibold ${injuryTone}`}>
            +{report.injuryChange} · {report.injuryAfter}/100
          </span>
        </div>
      </div>
    </div>
  );
}

function formatRolls(check: D20CheckReport): string {
  if (check.rolls.length <= 1) return String(check.selectedRoll);
  return `${check.rolls.join('/')} 取 ${check.selectedRoll}`;
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function formatCheckOutcome(outcome: D20CheckReport['outcome']): string {
  switch (outcome) {
    case 'great-success':
      return '大成功';
    case 'success':
      return '达成';
    case 'great-failure':
      return '大失败';
    case 'failure':
    default:
      return '未达成';
  }
}

function getCombatAssessment(winRate: number): string {
  if (winRate >= 72) return '战况评估：优势';
  if (winRate >= 55) return '战况评估：小优';
  if (winRate >= 45) return '战况评估：均势';
  if (winRate >= 28) return '战况评估：劣势';
  return '战况评估：险局';
}

function PathResourceChangePanel({ change }: { change: { name: string; value: number } }) {
  const isPositive = change.value > 0;

  return (
    <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 ${
      isPositive
        ? 'border-[#738275]/25 bg-[#e7eddd]/55'
        : 'border-[#b98678]/25 bg-[#f2d9d2]/45'
    }`}>
      <span className={`text-xs font-semibold ${isPositive ? 'text-[#355d58]' : 'text-[#9d3d2f]'}`}>
        流派构筑
      </span>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${
        isPositive ? 'bg-[#fffdf2]/75 text-[#355d58]' : 'bg-[#fffdf2]/75 text-[#9d3d2f]'
      }`}>
        {change.name} {change.value > 0 ? '+' : ''}{change.value}
      </span>
    </div>
  );
}

function CombatHpBar({
  label,
  current,
  max,
  percent,
  tone
}: {
  label: string;
  current: number;
  max: number;
  percent: number;
  tone: 'player' | 'enemy';
}) {
  return (
    <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/60 px-2 py-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[#66766e]">{label}</span>
        <span className="font-semibold text-[#263832]">{current}/{max}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[#c8c2a9]">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${
            tone === 'player' ? 'bg-[#5f7c64]' : 'bg-[#a94d37]'
          }`}
          style={{ width: `${Math.max(0, percent)}%` }}
        />
      </div>
    </div>
  );
}

function CombatResourceBar({
  label,
  current,
  max,
  percent,
  tone
}: {
  label: string;
  current: number;
  max: number;
  percent: number;
  tone: 'qi' | 'enemyQi';
}) {
  return (
    <div className="mt-2 rounded border border-[#738275]/15 bg-[#fff9e8]/60 px-2 py-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[#66766e]">{label}</span>
        <span className="font-semibold text-[#263832]">{current}/{max}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[#c8c2a9]">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${
            tone === 'qi' ? 'bg-[#587a8a]' : 'bg-[#9a5b2f]'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function CombatMiniHp({
  label,
  current,
  max,
  tone
}: {
  label: string;
  current: number;
  max: number;
  tone: 'player' | 'enemy';
}) {
  const percent = max > 0 ? Math.max(0, Math.round(current / max * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-[#66766e]">
        <span>{label}生命</span>
        <span>{current}/{max}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-[#c8c2a9]">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${
            tone === 'player' ? 'bg-[#5f7c64]' : 'bg-[#a94d37]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function CombatStatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[#738275]/15 bg-[#fff9e8]/60 px-2 py-2">
      <span className="block text-[#66766e]">{label}</span>
      <span className="font-semibold text-[#263832]">{value}</span>
    </div>
  );
}

function FeatChoices({ featIds, onChoose }: { featIds: string[]; onChoose: (featId: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {featIds.map(featId => {
        const feat = getFeat(featId);
        if (!feat) return null;

        return (
          <button
            key={feat.id}
            type="button"
            onClick={() => onChoose(feat.id)}
            className="rounded-md border border-[#738275]/30 bg-[#fff9e8]/70 px-4 py-3 text-left transition-colors hover:border-[#355d58]/55 hover:bg-[#eef3df]"
          >
            <div className="mb-2 text-base font-bold text-[#355d58]">{feat.name}</div>
            <p className="text-xs leading-relaxed text-[#66766e]">{feat.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {formatFeatBonuses(feat.bonuses).map(item => (
                <span
                  key={item}
                  className="rounded-full bg-[#e7eddd] px-2 py-0.5 text-xs font-semibold text-[#355d58]"
                >
                  {item}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SectChoices({ onChoose }: { onChoose: (sectId: CultivationSect['id']) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cultivationSects.map(sect => (
        <button
          type="button"
          key={sect.id}
          onClick={() => onChoose(sect.id)}
          className="rounded-md border border-[#738275]/30 bg-[#fff9e8]/70 px-4 py-3 text-left transition-colors hover:border-[#355d58]/55 hover:bg-[#eef3df] sm:py-4"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-lg font-bold text-[#355d58]">{sect.name}</span>
            <span className="rounded-full bg-[#e7eddd] px-2 py-1 text-xs font-semibold text-[#355d58]">
              {sect.tendency}
            </span>
          </div>
          <div className="mb-2 text-xs font-semibold text-[#6d634d]">{sect.grade}</div>
          <p className="text-sm leading-relaxed text-[#66766e]">{sect.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(sect.effect).map(([key, value]) => (
              <span
                key={key}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  (value ?? 0) >= 0
                    ? 'bg-[#e7eddd] text-[#355d58]'
                    : 'bg-[#f2d9d2] text-[#9d3d2f]'
                }`}
              >
                {key} {(value ?? 0) > 0 ? '+' : ''}{value}
              </span>
            ))}
            {sect.contributionGain > 0 && (
              <span className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/70 px-2.5 py-1 text-xs font-semibold text-[#6d634d]">
                初始贡献 +{sect.contributionGain}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function formatFeatBonuses(bonuses: NonNullable<ReturnType<typeof getFeat>>['bonuses']): string[] {
  const entries: string[] = [];
  if (bonuses.checkBonus) entries.push(`检定 +${bonuses.checkBonus}`);
  if (bonuses.initiativeBonus) entries.push(`先攻 +${bonuses.initiativeBonus}`);
  if (bonuses.offenseMultiplier) entries.push(`攻势 +${Math.round((bonuses.offenseMultiplier - 1) * 100)}%`);
  if (bonuses.breakthroughBonus) entries.push(`冲关 +${Math.round(bonuses.breakthroughBonus * 100)}%`);
  if (bonuses.injuryMultiplier) entries.push(`伤势 -${Math.round((1 - bonuses.injuryMultiplier) * 100)}%`);
  if (bonuses.greatSuccessOn19) entries.push('19 可大成功');
  if (bonuses.reduceGreatFailure) entries.push('压制大失败');
  return entries;
}

function PathChoices({ onChoose }: { onChoose: (pathId: CultivationPath['id']) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cultivationPaths.map(path => (
        <button
          type="button"
          key={path.id}
          onClick={() => onChoose(path.id)}
          className="rounded-md border border-[#738275]/30 bg-[#fff9e8]/70 px-4 py-3 text-left transition-colors hover:border-[#355d58]/55 hover:bg-[#eef3df] sm:py-4"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-lg font-bold text-[#355d58]">{path.name}</span>
            <span className="rounded-full bg-[#e7eddd] px-2 py-1 text-xs font-semibold text-[#355d58]">
              {path.focus}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[#66766e]">{path.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(path.effect).map(([key, value]) => (
              <span
                key={key}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  (value ?? 0) >= 0
                    ? 'bg-[#e7eddd] text-[#355d58]'
                    : 'bg-[#f2d9d2] text-[#9d3d2f]'
                }`}
              >
                {key} {(value ?? 0) > 0 ? '+' : ''}{value}
              </span>
            ))}
            {path.build.map(item => (
              <span
                key={item}
                className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/70 px-2.5 py-1 text-xs font-semibold text-[#6d634d]"
              >
                {item}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

function EventChoices({
  choices,
  onChoose
}: {
  choices: EventChoice[];
  onChoose: (choiceId: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {choices.map(choice => (
        <motion.button
          key={choice.id}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChoose(choice.id)}
          className="rounded-md border border-[#738275]/30 bg-[#fff9e8]/70 px-4 py-3 text-left transition-all hover:border-[#9a5b2f]/45 hover:bg-[#fffdf2] sm:py-4"
        >
          <div className="font-bold text-[#355d58]">{choice.label}</div>
          <div className="mt-1 text-sm text-[#66766e]">{choice.description}</div>
        </motion.button>
      ))}
    </div>
  );
}

export function PreparationPanel({
  canUse,
  familyWealth,
  inventory,
  realmLevel,
  shouldPrepare,
  onPrepare
}: {
  canUse: boolean;
  familyWealth: number;
  inventory: InventoryEntry[];
  realmLevel: number;
  shouldPrepare: boolean;
  onPrepare: (actionId: string) => void;
}) {
  const actions = [
    { id: 'stabilize', label: '稳固根基', cost: 6 },
    { id: 'elixir', label: '购置丹药', cost: 18 },
    { id: 'master', label: '请教高人', cost: 16 },
    { id: 'ward', label: '布置护阵', cost: 12 }
  ];

  return (
    <div className="mb-4 rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 sm:mb-5 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-[#45564f]">突破准备</span>
        <span className={shouldPrepare ? 'text-[#9a5b2f]' : 'text-[#66766e]'}>
          家境 {familyWealth} · 可补短板
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {actions.map(action => {
          const cost = getPreparationCost(action.cost, realmLevel);
          const itemCost = getPreparationItemLabel(action.id, inventory);
          const disabled = !canUse || (!itemCost && familyWealth < cost);
          return (
            <button
              key={action.id}
              disabled={disabled}
              onClick={() => onPrepare(action.id)}
              className={`min-h-[48px] rounded border px-2 py-2 text-xs font-semibold transition-all sm:px-3 sm:text-sm ${
                disabled
                  ? 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
                  : 'border-[#738275]/30 bg-[#fffdf2]/70 text-[#355d58] hover:border-[#9a5b2f]/45'
              }`}
            >
              {action.label}
              <span className="block text-xs font-normal">{itemCost ?? `家境 ${cost}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getPreparationItemLabel(actionId: string, inventory: InventoryEntry[]): string | null {
  const candidates: Record<string, string[]> = {
    stabilize: ['minor-array-plate', 'soul-settling-orb', 'old-manual-page'],
    elixir: ['tribulation-pill', 'dragon-blood-pill', 'bone-tempering-pill', 'qi-gathering-pill'],
    master: ['old-manual-page', 'mystic-manual-fragment', 'immortal-talisman-page'],
    ward: ['tribulation-ward', 'protection-talisman', 'minor-ward', 'minor-array-plate']
  };
  const itemId = candidates[actionId]?.find(candidateId => {
    const entry = inventory.find(item => item.itemId === candidateId);
    return (entry?.quantity ?? 0) > 0;
  });
  const item = itemId ? getItem(itemId) : undefined;

  return item ? `消耗 ${item.name}` : null;
}

function getPreparationCost(baseCost: number, realmLevel: number): number {
  if (realmLevel >= 7) return Math.ceil(baseCost * 4);
  if (realmLevel >= 5) return Math.ceil(baseCost * 2.5);
  if (realmLevel >= 3) return Math.ceil(baseCost * 1.5);
  return baseCost;
}
