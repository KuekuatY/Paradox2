import { lazy, Suspense, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { lifeSkills, type LifeSkillId } from '@/data/lifeSkills';
import { getIdleCyclesPerHour } from '@/data/idleActivities';
import { getIdleProjection } from '@/data/idleProjection';
import { getItem } from '@/data/items';
import { exportSavedGame, getSavedGameSlots } from '@/utils/storage';
import Background from '@/components/layout/Background';
import {
  AchievementPanel,
  AttributePanel,
  BreakthroughRequirements,
  BuildFeaturePanel,
  CombatStatsPanel,
  CultivationProgress,
  CultivationPathPanel,
  CurrentRealmSummary,
  FateSummary,
  InventoryPanel,
  LifeGoalPanel,
  RecentEvents,
  ReincarnationPanel,
  SectPanel,
  StageGoalPanel,
  TechniquePanel
} from '@/components/game/StatusPanel';
import EventDisplay, { PreparationPanel } from '@/components/game/EventDisplay';
import TalentDraw from '@/components/game/TalentDraw';
import GameOverModal from '@/components/game/GameOverModal';
import TribulationQte from '@/components/game/TribulationQte';
import { getPendingUnlockGuide } from '@/data/unlockGuides';
import type { SaveSlotIndex } from '@/types';

const CombatActivityPanel = lazy(() => import('@/components/game/CombatActivityPanel'));
const CavePanel = lazy(() => import('@/components/game/CavePanel'));
const WorldMapPanel = lazy(() => import('@/components/game/WorldMapPanel'));
const SectManagementPanel = lazy(() => import('@/components/game/SectManagementPanel'));
const EndgamePanel = lazy(() => import('@/components/game/EndgamePanel'));
const JourneyInsightsPanel = lazy(() => import('@/components/game/JourneyInsightsPanel'));
const MarketPanel = lazy(() => import('@/components/game/ProgressionPanels').then(module => ({ default: module.MarketPanel })));
const PathQuestPanel = lazy(() => import('@/components/game/ProgressionPanels').then(module => ({ default: module.PathQuestPanel })));
const BalanceReportPanel = lazy(() => import('@/components/game/ProgressionPanels').then(module => ({ default: module.BalanceReportPanel })));
const SpiritStoneEconomyReportPanel = lazy(() => import('@/components/game/ProgressionPanels').then(module => ({ default: module.SpiritStoneEconomyReportPanel })));
const CodexPanel = lazy(() => import('@/components/game/ProgressionPanels').then(module => ({ default: module.CodexPanel })));

type MobileTab = 'event' | 'map' | 'sect' | 'status' | 'goal' | 'technique' | 'skills' | 'cave' | 'combat' | 'market' | 'inventory' | 'breakthrough' | 'records';
type SaveFeedback = { message: string; error: boolean } | null;

const gameTabs: Array<{ id: MobileTab; label: string }> = [
  { id: 'event', label: '修行' },
  { id: 'map', label: '地图' },
  { id: 'sect', label: '宗门' },
  { id: 'status', label: '状态' },
  { id: 'goal', label: '道途' },
  { id: 'technique', label: '功法' },
  { id: 'skills', label: '百艺' },
  { id: 'cave', label: '洞府' },
  { id: 'combat', label: '战斗' },
  { id: 'market', label: '坊市' },
  { id: 'inventory', label: '储物' },
  { id: 'breakthrough', label: '突破' },
  { id: 'records', label: '成就' }
];

function isGameStateBusy(gameState: ReturnType<typeof useGameStore.getState>['gameState']): boolean {
  return !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
}

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedSaveSlot = (location.state as { loadSlot?: SaveSlotIndex } | null)?.loadSlot;
  const {
    gameState,
    resetGame,
    canBreakthrough,
    breakthroughRealm,
    resolveTribulationStrike,
    saveCurrentGame,
    loadSavedGame,
    settleIdleActivity,
    endGame,
    useBreakthroughPreparation,
    practiceLifeSkill
  } = useGameStore();
  const [showGameOver, setShowGameOver] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('event');
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>(null);
  const [loadingRequestedSave, setLoadingRequestedSave] = useState(requestedSaveSlot !== undefined);
  const canBreak = canBreakthrough();
  const pendingUnlockGuide = gameState.status === 'playing' ? getPendingUnlockGuide(gameState) : null;
  const navigationLocked = !!gameState.pendingTribulation;
  const handleSelectTab = (tab: MobileTab) => {
    if (navigationLocked && tab !== 'event') return;
    setMobileTab(tab);
  };

  useEffect(() => {
    if (requestedSaveSlot === undefined) {
      setLoadingRequestedSave(false);
      return;
    }
    loadSavedGame(requestedSaveSlot);
    navigate('/game', { replace: true, state: null });
    setLoadingRequestedSave(false);
  }, [loadSavedGame, navigate, requestedSaveSlot]);

  useEffect(() => {
    if (gameState.status === 'ended') {
      setShowGameOver(true);
    }
  }, [gameState.status]);

  useEffect(() => {
    const eventId = gameState.pendingEvent?.id;
    const combatId = gameState.pendingCombat?.id;
    const tribulationTarget = gameState.pendingTribulation?.targetRealmName;
    if (gameState.status !== 'idle' && !eventId && !combatId && !tribulationTarget) return undefined;

    setMobileTab('event');
    if (window.innerWidth >= 1024) return undefined;

    const targetId = combatId
      ? 'active-combat-panel'
      : tribulationTarget
        ? 'active-tribulation-panel'
        : eventId
          ? 'active-event-panel'
          : null;
    const frame = window.requestAnimationFrame(() => {
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'auto' });
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    gameState.status,
    gameState.pendingEvent?.id,
    gameState.pendingCombat?.id,
    gameState.pendingTribulation?.targetRealmName
  ]);

  useEffect(() => {
    if (gameState.status !== 'playing') return undefined;

    const timer = window.setTimeout(() => {
      saveCurrentGame();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [gameState, saveCurrentGame]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentGame();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveCurrentGame]);

  useEffect(() => {
    if (gameState.status !== 'playing' || !gameState.idleActivity.running) return undefined;

    const settle = () => settleIdleActivity(Date.now(), 'idle');
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') settle();
    };
    settle();
    const timer = window.setInterval(settle, 1000);
    window.addEventListener('focus', settle);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', settle);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [gameState.status, gameState.idleActivity.running, settleIdleActivity]);

  const handleContinue = () => {
    const { advanceCultivation } = useGameStore.getState();
    advanceCultivation();
  };

  const handleRestart = () => {
    setShowGameOver(false);
    resetGame();
  };

  const handleBreakthrough = () => {
    breakthroughRealm();
  };

  const handleMeditationEnd = () => {
    endGame('died', 'meditation');
  };

  const handleSaveGame = (slot?: SaveSlotIndex) => {
    const saved = saveCurrentGame(slot);
    setSaveFeedback(saved
      ? {
        message: `已保存 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
        error: false
      }
      : { message: '保存失败，请检查浏览器存储空间', error: true }
    );
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loadingRequestedSave) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <Background />
        <div className="ink-panel z-10 rounded-lg px-6 py-4 text-sm font-semibold text-[#66766e]">正在载入存档...</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <Background />
      
      <div className="container z-10 mx-auto flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="hidden lg:block">
            <AnimatePresence mode="wait">
              {gameState.status === 'idle' ? (
                <motion.div
                  key="desktop-talent-draw"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="mx-auto max-w-3xl"
                >
                  <TalentDraw />
                </motion.div>
              ) : (
                <motion.div
                  key="desktop-game"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="grid grid-cols-[190px_minmax(520px,1fr)_360px] items-start gap-5 xl:grid-cols-[210px_minmax(620px,1fr)_390px]"
                >
                  <DesktopGameNav activeTab={mobileTab} locked={navigationLocked} onSelect={handleSelectTab} />
                  <div className="min-w-0">
                    <GameTabContent
                      activeTab={mobileTab}
                      canBreakthrough={canBreak}
                      saveFeedback={saveFeedback}
                      onBreakthrough={handleBreakthrough}
                      onContinue={handleContinue}
                      onMeditationEnd={handleMeditationEnd}
                      onPrepare={useBreakthroughPreparation}
                      onPracticeLifeSkill={practiceLifeSkill}
                      onResolveTribulationStrike={resolveTribulationStrike}
                      onSave={handleSaveGame}
                      onSelectTab={handleSelectTab}
                      showCultivationPanel={false}
                    />
                  </div>
                  <DesktopFixedStatusPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              {gameState.status === 'idle' ? (
                <motion.div
                  key="mobile-talent-draw"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                >
                  <TalentDraw />
                </motion.div>
              ) : (
                <motion.div
                  key="mobile-game"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="space-y-3 pt-28"
                >
                  <MobileGameNav activeTab={mobileTab} locked={navigationLocked} onSelect={handleSelectTab} />

                  <GameTabContent
                    activeTab={mobileTab}
                    canBreakthrough={canBreak}
                    saveFeedback={saveFeedback}
                    onBreakthrough={handleBreakthrough}
                    onContinue={handleContinue}
                    onMeditationEnd={handleMeditationEnd}
                    onPrepare={useBreakthroughPreparation}
                    onPracticeLifeSkill={practiceLifeSkill}
                    onResolveTribulationStrike={resolveTribulationStrike}
                    onSave={handleSaveGame}
                    onSelectTab={handleSelectTab}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pendingUnlockGuide && (
          <UnlockGuideBanner
            guide={pendingUnlockGuide}
            onDismiss={() => useGameStore.getState().dismissUnlockGuide(pendingUnlockGuide.id)}
            onOpen={() => {
              handleSelectTab(getUnlockGuideTab(pendingUnlockGuide.id));
              useGameStore.getState().dismissUnlockGuide(pendingUnlockGuide.id);
            }}
          />
        )}
        {showGameOver && (
          <GameOverModal
            onRestart={handleRestart}
            onGoHome={handleGoHome}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UnlockGuideBanner({
  guide,
  onDismiss,
  onOpen
}: {
  guide: NonNullable<ReturnType<typeof getPendingUnlockGuide>>;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-4 left-3 right-3 z-40 rounded-md border border-[#355d58]/35 bg-[#fffdf2]/95 p-4 shadow-lg backdrop-blur sm:left-auto sm:right-5 sm:w-[360px]"
    >
      <div className="font-bold text-[#355d58]">{guide.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-[#66766e]">{guide.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onDismiss} className="rounded border border-[#738275]/20 bg-[#eee8d4]/55 px-2 py-2 text-xs font-bold text-[#66766e]">知道了</button>
        <button type="button" onClick={onOpen} className="rounded border border-[#355d58]/35 bg-[#355d58] px-2 py-2 text-xs font-bold text-[#fff9e8]">{guide.tabLabel}</button>
      </div>
    </motion.div>
  );
}

function getUnlockGuideTab(guideId: string): MobileTab {
  if (guideId === 'guide-path' || guideId === 'guide-sect') return 'status';
  if (guideId === 'guide-life-skills') return 'skills';
  if (guideId === 'guide-combat' || guideId === 'guide-dungeon') return 'combat';
  if (guideId === 'guide-market') return 'market';
  if (guideId === 'guide-tribulation') return 'breakthrough';
  return 'event';
}

function SaveGamePanel({
  characterName,
  saveFeedback,
  onSave
}: {
  characterName: string;
  saveFeedback: SaveFeedback;
  onSave: (slot?: SaveSlotIndex) => void;
}) {
  const { activeSaveSlot, gameState, importSaveData, loadSavedGame, setActiveSaveSlot } = useGameStore();
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);
  const slots = getSavedGameSlots();
  const handleExport = () => {
    const serialized = exportSavedGame(activeSaveSlot);
    if (!serialized) {
      setLocalFeedback('当前槽位没有可导出的存档');
      return;
    }
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `问道轮回-存档${activeSaveSlot}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setLocalFeedback(`已导出槽位 ${activeSaveSlot}`);
  };
  const handleImport = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const success = typeof reader.result === 'string' && importSaveData(reader.result, activeSaveSlot);
      setLocalFeedback(success ? `已导入并载入槽位 ${activeSaveSlot}` : '导入失败：文件不是有效存档');
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-[#45564f]">存档</span>
        <span className="text-xs text-[#66766e]">当前 · {gameState.characterName || characterName || '无名'}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map(({ slot, save, hasBackup }) => (
          <button
            key={slot}
            type="button"
            onClick={() => setActiveSaveSlot(slot)}
            className={`min-h-[70px] rounded border px-2 py-2 text-left text-xs ${activeSaveSlot === slot
              ? 'border-[#355d58]/45 bg-[#e7eddd] text-[#355d58]'
              : 'border-[#738275]/20 bg-[#fffdf2]/65 text-[#66766e]'
            }`}
          >
            <span className="block font-bold">槽位 {slot}{hasBackup ? ' · 有备份' : ''}</span>
            <span className="mt-1 block truncate">{save ? `${save.gameState.characterName || '无名'} · ${save.gameState.currentRealm.name}` : '空槽位'}</span>
            <span className="mt-0.5 block">{save ? new Date(save.savedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={() => onSave(activeSaveSlot)} className="rounded-md border border-[#738275]/30 bg-[#eef3df] px-2 py-2 text-xs font-bold text-[#355d58]">保存</button>
        <button type="button" disabled={!slots.find(entry => entry.slot === activeSaveSlot)?.save} onClick={() => { const loaded = loadSavedGame(activeSaveSlot); setLocalFeedback(loaded ? `已载入槽位 ${activeSaveSlot}` : '载入失败'); }} className="rounded-md border border-[#738275]/30 bg-[#fffdf2] px-2 py-2 text-xs font-bold text-[#45564f] disabled:opacity-40">载入</button>
        <button type="button" onClick={handleExport} className="rounded-md border border-[#9a5b2f]/25 bg-[#f0dfad]/45 px-2 py-2 text-xs font-bold text-[#7a5426]">导出</button>
        <label className="cursor-pointer rounded-md border border-[#9a5b2f]/25 bg-[#f0dfad]/45 px-2 py-2 text-center text-xs font-bold text-[#7a5426]">
          导入
          <input type="file" accept="application/json,.json" className="hidden" onChange={event => handleImport(event.target.files?.[0])} />
        </label>
      </div>
      <div className={`mt-2 min-h-[18px] text-right text-xs ${saveFeedback?.error ? 'text-[#9d3d2f]' : 'text-[#66766e]'}`}>
        {localFeedback ?? saveFeedback?.message ?? '覆盖存档前会自动保留一份备份'}
      </div>
    </div>
  );
}

function DesktopGameNav({
  activeTab,
  locked,
  onSelect
}: {
  activeTab: MobileTab;
  locked: boolean;
  onSelect: (tab: MobileTab) => void;
}) {
  return (
    <aside className="sticky top-8 h-[640px] rounded-lg border border-[#738275]/25 bg-[#fff9e8]/80 p-3 shadow-md backdrop-blur xl:h-[660px]">
      <div className="mb-3 px-2 text-xs font-semibold text-[#66766e]">问道轮回</div>
      <div className="space-y-1">
        {gameTabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isDisabled = locked && !isActive;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(tab.id)}
              className={`flex min-h-[39px] w-full items-center rounded-md px-3 text-left text-sm font-bold transition ${
                isActive
                  ? 'bg-[#355d58] text-[#fff9e8] shadow-sm'
                  : isDisabled
                    ? 'cursor-not-allowed text-[#9a9d8d] opacity-55'
                    : 'text-[#59645f] hover:bg-[#eef3df]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function DesktopFixedStatusPanel() {
  const { gameState } = useGameStore();
  const { age, lifespan } = gameState;
  const lifespanPercent = lifespan === Infinity ? 100 : Math.min(100, age / lifespan * 100);

  return (
    <aside className="sticky top-8 h-[640px] max-h-[calc(100vh-4rem)] xl:h-[660px]">
      <div className="ink-panel ink-scrollbar h-full overflow-y-auto rounded-lg p-4">
        <div className="space-y-3">
        <div className="text-center">
          <div className="mb-1 text-xs text-[#66766e]">{gameState.characterName || '无名'}</div>
          <div className="ink-title text-2xl font-bold">{gameState.currentRealm.name}</div>
        </div>

        <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3">
          <div className="mb-2 flex justify-between text-sm">
            <span className="ink-muted">年龄</span>
            <span className="font-semibold text-[#263832]">{age} 岁</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-[#c8c2a9]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${lifespanPercent}%` }}
              transition={{ duration: 0.5 }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#5f7c64] via-[#b49a4b] to-[#9b4b35]"
            />
          </div>
          <div className="mt-2 text-right text-xs text-[#66766e]">
            寿元: {lifespan === Infinity ? '无尽' : `${lifespan} 年`}
          </div>
        </div>

        <CultivationProgress
          currentRealmName={gameState.currentRealm.name}
          progress={gameState.cultivationProgress}
        />
        {gameState.sect && (
          <SectPanel gameState={gameState} />
        )}
        <AttributePanel attributes={gameState.attributes} cap={gameState.currentRealm.attributeCap} />
        <BreakthroughRequirements
          currentRealmName={gameState.currentRealm.name}
          attributes={gameState.attributes}
        />
        </div>
      </div>
    </aside>
  );
}

function GameTabContent({
  activeTab,
  canBreakthrough,
  saveFeedback,
  onBreakthrough,
  onContinue,
  onMeditationEnd,
  onPrepare,
  onPracticeLifeSkill,
  onResolveTribulationStrike,
  onSave,
  onSelectTab,
  showCultivationPanel = true
}: {
  activeTab: MobileTab;
  canBreakthrough: boolean;
  saveFeedback: SaveFeedback;
  onBreakthrough: () => void;
  onContinue: () => void;
  onMeditationEnd: () => void;
  onPrepare: (actionId: string) => void;
  onPracticeLifeSkill: (skillId: LifeSkillId) => void;
  onResolveTribulationStrike: (success: boolean) => void;
  onSave: (slot?: SaveSlotIndex) => void;
  onSelectTab: (tab: MobileTab) => void;
  showCultivationPanel?: boolean;
}) {
  const { gameState } = useGameStore();
  const desktopScrollClass = showCultivationPanel
    ? ''
    : 'ink-scrollbar h-[640px] overflow-y-auto pr-1 xl:h-[660px]';
  const desktopPanelFillClass = showCultivationPanel ? '' : 'min-h-full';
  const pageClassName = (baseClassName = '') =>
    [baseClassName, desktopScrollClass].filter(Boolean).join(' ');

  return (
    <Suspense fallback={<div className="ink-panel flex min-h-[220px] items-center justify-center rounded-lg text-sm font-semibold text-[#66766e]">正在载入...</div>}>
      <AnimatePresence mode="wait">
      {activeTab === 'event' && (
        <motion.div
          key="tab-event"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName('space-y-3')}
        >
          {showCultivationPanel && (
            <MobileCultivationPanel
              canBreakthrough={canBreakthrough}
              onGoBreakthrough={() => onSelectTab('breakthrough')}
            />
          )}
          {gameState.pendingTribulation ? (
            <div id="active-tribulation-panel" className="scroll-mt-[124px]">
              <TribulationQte
                tribulation={gameState.pendingTribulation}
                onResolveStrike={onResolveTribulationStrike}
              />
            </div>
          ) : (
            <EventDisplay
              canBreakthrough={canBreakthrough}
              onBreakthrough={onBreakthrough}
              onContinue={onContinue}
              onMeditationEnd={onMeditationEnd}
              panelClassName={showCultivationPanel ? '' : 'lg:h-[640px] xl:h-[660px]'}
              showBreakthroughControls={!showCultivationPanel}
            />
          )}
        </motion.div>
      )}

      {activeTab === 'status' && (
        <motion.div
          key="tab-status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName('space-y-3')}
        >
          <SaveGamePanel
            characterName={gameState.characterName}
            saveFeedback={saveFeedback}
            onSave={onSave}
          />
          <MobileStatusPanel showAttributes={showCultivationPanel} />
        </motion.div>
      )}

      {activeTab === 'map' && (
        <motion.div
          key="tab-map"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName()}
        >
          <WorldMapPanel className={desktopPanelFillClass} />
        </motion.div>
      )}

      {activeTab === 'sect' && (
        <motion.div
          key="tab-sect"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName()}
        >
          <SectManagementPanel className={desktopPanelFillClass} />
        </motion.div>
      )}

      {activeTab === 'goal' && (
        <motion.div
          key="tab-goal"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName('flex flex-col gap-3')}
        >
          <StageGoalPanel
            gameState={gameState}
            className={showCultivationPanel ? '' : 'shrink-0'}
          />
          <PathQuestPanel className={showCultivationPanel ? '' : 'shrink-0'} />
          <LifeGoalPanel
            activeGoal={gameState.activeGoal}
            completedCount={gameState.completedGoals.length}
            className={showCultivationPanel ? '' : 'shrink-0'}
          />
          <RecentEvents
            events={gameState.events}
            className={showCultivationPanel ? '' : 'min-h-0 flex-1'}
          />
        </motion.div>
      )}

      {activeTab === 'breakthrough' && (
        <motion.div
          key="tab-breakthrough"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName('space-y-3')}
        >
          <MobileBreakthroughPanel
            canBreakthrough={canBreakthrough}
            className={desktopPanelFillClass}
            onBreakthrough={onBreakthrough}
            onPrepare={onPrepare}
            showBreakthroughButton={showCultivationPanel}
          />
          <EndgamePanel />
        </motion.div>
      )}

      {activeTab === 'technique' && (
        <motion.div
          key="tab-technique"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName()}
        >
          <TechniquePanel gameState={gameState} className={desktopPanelFillClass} />
        </motion.div>
      )}

      {activeTab === 'skills' && (
        <motion.div
          key="tab-skills"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName()}
        >
          <LifeSkillPanel
            canUse={!isGameStateBusy(gameState)}
            onPractice={onPracticeLifeSkill}
          />
        </motion.div>
      )}

      {activeTab === 'cave' && (
        <motion.div
          key="tab-cave"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName()}
        >
          <CavePanel className={desktopPanelFillClass} />
        </motion.div>
      )}

      {activeTab === 'inventory' && (
        <motion.div
          key="tab-inventory"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName()}
        >
          <InventoryPanel
            inventory={gameState.inventory}
            canUse={!isGameStateBusy(gameState)}
            className={desktopPanelFillClass}
          />
        </motion.div>
      )}

      {activeTab === 'combat' && (
        <motion.div
          key="tab-combat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName()}
        >
          <CombatActivityPanel className={desktopPanelFillClass} />
        </motion.div>
      )}

      {activeTab === 'market' && (
        <motion.div
          key="tab-market"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName()}
        >
          <MarketPanel className={desktopPanelFillClass} />
        </motion.div>
      )}

      {activeTab === 'records' && (
        <motion.div
          key="tab-records"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={pageClassName('space-y-3')}
        >
          <JourneyInsightsPanel />
          <AchievementPanel achievements={gameState.achievements} />
          <ReincarnationPanel />
          <BalanceReportPanel />
          <SpiritStoneEconomyReportPanel />
          <CodexPanel />
        </motion.div>
      )}
      </AnimatePresence>
    </Suspense>
  );
}

function MobileGameNav({
  activeTab,
  locked,
  onSelect
}: {
  activeTab: MobileTab;
  locked: boolean;
  onSelect: (tab: MobileTab) => void;
}) {
  return (
    <div className="fixed left-3 right-3 top-3 z-30 rounded-md border border-[#738275]/25 bg-[#fff9e8]/90 p-1 shadow-md backdrop-blur">
      <div className="grid grid-cols-7 gap-1">
        {gameTabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isDisabled = locked && !isActive;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(tab.id)}
              className={`min-h-[40px] rounded px-1 text-xs font-semibold transition min-[390px]:text-sm ${
                isActive
                  ? 'bg-[#355d58] text-[#fff9e8] shadow-sm'
                  : isDisabled
                    ? 'cursor-not-allowed text-[#9a9d8d] opacity-55'
                    : 'text-[#59645f] hover:bg-[#eef3df]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LifeSkillPanel({
  compact = false,
  canUse,
  onPractice
}: {
  compact?: boolean;
  canUse: boolean;
  onPractice: (skillId: LifeSkillId) => void;
}) {
  const { gameState, applyAutomationPreset, saveAutomationPreset, selectLifeSkillActivity, setIdleAutomation, setAutoSellRule } = useGameStore();
  const productionItemIds = Array.from(new Set(lifeSkills.flatMap(skill => [
    ...skill.baseRewards.map(reward => reward.itemId),
    ...skill.recipes.flatMap(recipe => recipe.rewards.map(reward => reward.itemId))
  ])));
  const rawMaterialIds = Array.from(new Set(lifeSkills.flatMap(skill => skill.baseRewards.map(reward => reward.itemId))));
  const idleProjection = getIdleProjection(gameState);

  const getDisabledReason = (skill: (typeof lifeSkills)[number]) => {
    if (!canUse) return '需先处理当前事项';
    if (gameState.currentRealm.level < skill.minRealmLevel) return `需达${getRealmNameByLevel(skill.minRealmLevel)}`;
    if (gameState.spiritStones < skill.spiritStoneCost) return '灵石不足';
    if (gameState.age >= gameState.lifespan - skill.timeCost) return '寿元不足';
    if (gameState.lifeSkillActivity.skillId === skill.id && gameState.lifeSkillActivity.recipeId) {
      const recipe = skill.recipes.find(item => item.id === gameState.lifeSkillActivity.recipeId);
      if (recipe && !recipe.costs.every(cost => getInventoryQuantity(gameState.inventory, cost.itemId) >= cost.quantity)) {
        return '材料不足';
      }
    }
    return '';
  };

  return (
    <div className="ink-panel rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="ink-title text-xl font-bold">百艺</h2>
          <p className="mt-1 text-sm text-[#66766e]">炼器、炼丹、画符、阵法、钓鱼、灵田</p>
        </div>
        <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/55 px-3 py-2 text-right text-xs text-[#66766e]">
          <div>年龄 {gameState.age} 岁</div>
          <div>灵石 {gameState.spiritStones}</div>
        </div>
      </div>

      <section className="mb-4 rounded-md border border-[#738275]/25 bg-[#eef3df]/45 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold text-[#355d58]">百艺自动化</div>
            <div className="mt-0.5 text-xs font-semibold text-[#66766e]">
              已切换 {gameState.idleAutomation.switches} 次 · 已出售 {gameState.idleAutomation.soldItems} 件
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#45564f]">
            <input type="checkbox" checked={gameState.idleAutomation.enabled} onChange={event => setIdleAutomation({ enabled: event.target.checked })} className="h-4 w-4 accent-[#355d58]" />
            {gameState.idleAutomation.enabled ? '已开启' : '未开启'}
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_1fr]">
          <select
            value={gameState.idleAutomation.targetItemId ?? ''}
            onChange={event => setIdleAutomation({ targetItemId: event.target.value || null })}
            className="h-9 rounded border border-[#738275]/25 bg-[#fffdf2]/80 px-2 text-xs font-semibold text-[#45564f]"
            aria-label="自动生产目标"
          >
            <option value="">不设库存目标</option>
            {productionItemIds.map(itemId => <option key={itemId} value={itemId}>{getItem(itemId)?.name ?? itemId}</option>)}
          </select>
          <input
            type="number"
            min={1}
            max={9999}
            value={gameState.idleAutomation.targetQuantity}
            onChange={event => setIdleAutomation({ targetQuantity: Number(event.target.value) })}
            className="h-9 rounded border border-[#738275]/25 bg-[#fffdf2]/80 px-2 text-xs font-semibold text-[#45564f]"
            aria-label="目标库存"
          />
          <select
            value={gameState.idleAutomation.priority}
            onChange={event => setIdleAutomation({ priority: event.target.value as 'target-first' | 'highest-tier' | 'lowest-cost' })}
            className="h-9 rounded border border-[#738275]/25 bg-[#fffdf2]/80 px-2 text-xs font-semibold text-[#45564f]"
            aria-label="配方优先级"
          >
            <option value="target-first">优先打通目标链</option>
            <option value="lowest-cost">优先低耗配方</option>
            <option value="highest-tier">优先高阶配方</option>
          </select>
        </div>
        <div className="mt-3 rounded border border-[#738275]/15 bg-[#fffdf2]/70 px-3 py-2 text-xs leading-relaxed text-[#66766e]">
          <div><span className="font-bold text-[#45564f]">当前预测：</span>{idleProjection.summary}</div>
          {idleProjection.targetEtaMinutes !== null && <div className="mt-1">目标预计 {idleProjection.targetEtaMinutes === 0 ? '已达成' : `${idleProjection.targetEtaMinutes} 分钟`}</div>}
          {idleProjection.bottleneck && <div className="mt-1 font-semibold text-[#9a5b2f]">瓶颈：{idleProjection.bottleneck}</div>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#738275]/15 pt-3">
          {[0, 1, 2].map(index => {
            const id = `automation-preset-${index + 1}`;
            const preset = gameState.automationPresets.find(entry => entry.id === id);
            return (
              <div key={id} className="rounded border border-[#738275]/20 bg-[#fffdf2]/60 p-2 text-center">
                <div className="truncate text-xs font-bold text-[#45564f]">{preset?.name ?? `方案${index + 1}`}</div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => saveAutomationPreset(index)} className="rounded border border-[#738275]/25 bg-[#eef3df] px-1 py-1 text-[11px] font-bold text-[#355d58]">保存</button>
                  <button type="button" disabled={!preset} onClick={() => applyAutomationPreset(id)} className="rounded border border-[#9a5b2f]/25 bg-[#f0dfad]/45 px-1 py-1 text-[11px] font-bold text-[#7a5426] disabled:opacity-40">切换</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#738275]/15 pt-3 text-xs">
          <span className="font-bold text-[#66766e]">溢出自动出售 · 保留20</span>
          {rawMaterialIds.map(itemId => {
            const enabled = gameState.idleAutomation.autoSellRules.some(rule => rule.itemId === itemId);
            return (
              <label key={itemId} className={`flex cursor-pointer items-center gap-1 rounded border px-2 py-1 ${enabled ? 'border-[#355d58]/30 bg-[#e7eddd] text-[#355d58]' : 'border-[#738275]/20 bg-[#fffdf2]/65 text-[#66766e]'}`}>
                <input type="checkbox" checked={enabled} onChange={event => setAutoSellRule(itemId, event.target.checked, 20)} className="accent-[#355d58]" />
                {getItem(itemId)?.name ?? itemId}
              </label>
            );
          })}
        </div>
      </section>

      <div className={`grid grid-cols-1 gap-3 ${compact ? '' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {lifeSkills.map(skill => {
          const disabledReason = getDisabledReason(skill);
          const isDisabled = disabledReason !== '';
          const progress = gameState.lifeSkills.find(item => item.skillId === skill.id) ?? { level: 1, exp: 0 };
          const visibleRecipes = skill.recipes.filter(recipe => gameState.currentRealm.level >= recipe.minRealmLevel);
          const isFocused = gameState.selectedYearAction === 'life-skill'
            && gameState.lifeSkillActivity.skillId === skill.id;
          const activeRecipeId = gameState.lifeSkillActivity.skillId === skill.id
            ? gameState.lifeSkillActivity.recipeId
            : null;
          const cyclesPerHour = getIdleCyclesPerHour({
            ...gameState,
            selectedYearAction: 'life-skill',
            lifeSkillActivity: { skillId: skill.id, recipeId: activeRecipeId }
          });

          return (
            <div
              key={skill.id}
              className={`flex h-full flex-col rounded-md border p-4 shadow-sm ${isFocused
                ? 'border-[#355d58]/50 bg-[#eef3df]/65'
                : 'border-[#738275]/25 bg-[#fff9e8]/45'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[#263832]">{skill.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-[#7a5426]">{skill.focus}</p>
                  <p className="mt-1 text-xs text-[#66766e]">
                    {progress.level} 阶 · 熟练 {progress.exp % 100}/100 · {cyclesPerHour} 轮/时
                  </p>
                </div>
                <span className={`shrink-0 rounded border px-2 py-1 text-xs font-semibold ${isFocused
                  ? 'border-[#355d58]/35 bg-[#355d58] text-[#fff9e8]'
                  : 'border-[#738275]/25 bg-[#eef3df] text-[#45564f]'
                }`}>
                  {isFocused ? '当前专注' : `${getRealmNameByLevel(skill.minRealmLevel)}可习`}
                </span>
              </div>

              <p className="min-h-[44px] text-sm leading-relaxed text-[#59645f]">{skill.description}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-[#eee8d4] px-2 py-1 text-[#6d634d]">耗时 {skill.timeCost} 年</span>
                <span className="rounded bg-[#eee8d4] px-2 py-1 text-[#6d634d]">灵石 {skill.spiritStoneCost}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(skill.effects)
                  .filter(([, value]) => value !== undefined && value !== 0)
                  .map(([key, value]) => (
                    <span
                      key={key}
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        typeof value === 'number' && value < 0
                          ? 'bg-[#f2d9d2] text-[#9d3d2f]'
                          : 'bg-[#e7eddd] text-[#355d58]'
                      }`}
                    >
                      {key} {typeof value === 'number' && value > 0 ? '+' : ''}{value}
                    </span>
                  ))}
              </div>

              <div className="mt-3 space-y-1.5 border-t border-[#738275]/15 pt-3">
                <button
                  type="button"
                  disabled={!canUse || gameState.currentRealm.level < skill.minRealmLevel}
                  onClick={() => selectLifeSkillActivity(skill.id, null)}
                  className={`w-full rounded border px-2 py-2 text-left text-xs transition-colors ${isFocused && activeRecipeId === null
                    ? 'border-[#355d58]/40 bg-[#355d58] text-[#fff9e8]'
                    : 'border-[#738275]/20 bg-[#fffdf2]/65 text-[#45564f] hover:border-[#355d58]/35'
                  }`}
                >
                  <span className="block font-bold">基础研习</span>
                  <span className={`mt-0.5 block ${isFocused && activeRecipeId === null ? 'text-[#e7eddd]' : 'text-[#66766e]'}`}>
                    {formatRecipeRewards(skill.baseRewards)} · 5 阶后每项 +1
                  </span>
                </button>
                {visibleRecipes.length > 0 && (
                  <div className="ink-scrollbar max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
                  {visibleRecipes.map(recipe => {
                    const locked = progress.level < recipe.minSkillLevel;
                    const affordable = recipe.costs.every(cost => getInventoryQuantity(gameState.inventory, cost.itemId) >= cost.quantity);
                    const selected = isFocused && activeRecipeId === recipe.id;

                    return (
                      <button
                        key={recipe.id}
                        type="button"
                        disabled={!canUse || locked}
                        onClick={() => selectLifeSkillActivity(skill.id, recipe.id)}
                        className={`w-full rounded border px-2 py-2 text-left text-xs leading-relaxed transition-colors ${selected
                          ? 'border-[#355d58]/40 bg-[#355d58] text-[#fff9e8]'
                          : locked
                            ? 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
                            : affordable
                              ? 'border-[#738275]/20 bg-[#fffdf2]/65 text-[#355d58] hover:border-[#355d58]/35'
                              : 'border-[#a9823c]/25 bg-[#f0dfad]/35 text-[#9a5b2f]'
                        }`}
                      >
                        <span className="block font-bold">{recipe.name}</span>
                        <span className={`mt-0.5 block ${selected ? 'text-[#e7eddd]' : 'text-[#66766e]'}`}>
                          {locked
                            ? `${recipe.minSkillLevel} 阶解锁`
                            : `${formatRecipeCosts(recipe.costs)} → ${formatRecipeRewards(recipe.rewards)}`}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                )}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                <button
                  type="button"
                  disabled={!canUse || gameState.currentRealm.level < skill.minRealmLevel}
                  onClick={() => selectLifeSkillActivity(skill.id, activeRecipeId)}
                  className={`rounded-md border px-3 py-2 text-sm font-bold transition-colors ${isFocused
                    ? 'border-[#355d58]/35 bg-[#eef3df] text-[#355d58]'
                    : 'border-[#738275]/30 bg-[#fffdf2]/75 text-[#45564f] hover:border-[#355d58]/40'
                  }`}
                >
                  {isFocused ? '专注中' : '设为专注'}
                </button>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onPractice(skill.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                    isDisabled
                      ? 'border-[#738275]/20 bg-[#eee8d4]/55 text-[#8d947f]'
                      : 'border-[#738275]/35 bg-[#355d58] text-[#fff9e8] shadow-sm hover:bg-[#416f68]'
                  }`}
                >
                  {isDisabled ? disabledReason : '修习一次'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getInventoryQuantity(inventory: Array<{ itemId: string; quantity: number }>, itemId: string): number {
  return inventory.find(item => item.itemId === itemId)?.quantity ?? 0;
}

function formatRecipeCosts(costs: Array<{ itemId: string; quantity: number }>): string {
  if (costs.length === 0) return '无需材料';

  return costs
    .map(cost => `${getItem(cost.itemId)?.name ?? cost.itemId}x${cost.quantity}`)
    .join(' · ');
}

function formatRecipeRewards(rewards: Array<{ itemId: string; quantity: number }>): string {
  return rewards
    .map(reward => `${getItem(reward.itemId)?.name ?? reward.itemId}x${reward.quantity}`)
    .join(' · ');
}

function MobileCultivationPanel({
  canBreakthrough,
  onGoBreakthrough
}: {
  canBreakthrough: boolean;
  onGoBreakthrough: () => void;
}) {
  const { gameState } = useGameStore();
  const { age, lifespan } = gameState;
  const lifespanPercent = lifespan === Infinity ? 100 : Math.min(100, age / lifespan * 100);
  const showEndgameGuide = gameState.currentRealm.level >= 8;

  return (
    <div className="ink-panel rounded-lg p-4">
      <CurrentRealmSummary currentRealm={gameState.currentRealm} characterName={gameState.characterName} />
      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="ink-muted">年龄</span>
          <span className="font-semibold text-[#263832]">{age} 岁</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-[#c8c2a9]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${lifespanPercent}%` }}
            transition={{ duration: 0.5 }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#5f7c64] via-[#b49a4b] to-[#9b4b35]"
          />
        </div>
        <div className="ink-muted text-right text-xs">
          寿元: {lifespan === Infinity ? '无尽' : `${lifespan} 年`}
        </div>
      </div>
      <CultivationProgress
        currentRealmName={gameState.currentRealm.name}
        progress={gameState.cultivationProgress}
      />
      {(canBreakthrough || showEndgameGuide) && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={onGoBreakthrough}
          className="mt-3 w-full rounded-md border border-[#a9823c]/60 bg-[#f0dfad] px-4 py-3 text-sm font-bold text-[#7a5426] shadow-md transition hover:brightness-105"
        >
          {canBreakthrough ? '修为圆满，前往突破' : '查看飞升大愿'}
        </motion.button>
      )}
    </div>
  );
}

function getRealmNameByLevel(level: number): string {
  if (level <= 1) return '炼气';
  if (level === 2) return '筑基';
  if (level === 3) return '金丹';
  if (level === 4) return '元婴';
  if (level === 5) return '化神';
  if (level === 6) return '炼虚';
  if (level === 7) return '合体';
  if (level === 8) return '大乘';
  return '渡劫';
}

function MobileStatusPanel({ showAttributes = true }: { showAttributes?: boolean }) {
  const { gameState } = useGameStore();
  const { spiritRoot, talent, cultivationPath, attributes, currentRealm, sect } = gameState;

  return (
    <div className="ink-panel space-y-3 rounded-lg p-4">
      {(spiritRoot || talent || cultivationPath) && (
        <div className="grid grid-cols-1 gap-3">
          {spiritRoot && (
            <FateSummary
              label="灵根"
              name={spiritRoot.name}
              rarity={spiritRoot.rarity}
              description={spiritRoot.description}
            />
          )}
          {talent && (
            <FateSummary
              label="天赋"
              name={talent.name}
              rarity={talent.rarity}
              description={talent.description}
            />
          )}
          {cultivationPath && (
            <CultivationPathPanel pathId={cultivationPath} pathResource={gameState.pathResource} />
          )}
          {sect && (
            <SectPanel gameState={gameState} />
          )}
        </div>
      )}
      {currentRealm.name !== '幼年期' && (
        <CombatStatsPanel combatStats={gameState.combatStats} />
      )}
      {gameState.status === 'playing' && (
        <BuildFeaturePanel gameState={gameState} />
      )}
      {gameState.rival?.active && (
        <RivalPanel name={gameState.rival.name} enmity={gameState.rival.enmity} defeats={gameState.rival.defeats} />
      )}
      {showAttributes && (
        <AttributePanel attributes={attributes} cap={currentRealm.attributeCap} />
      )}
    </div>
  );
}

function RivalPanel({
  name,
  enmity,
  defeats
}: {
  name: string;
  enmity: number;
  defeats: number;
}) {
  return (
    <div className="rounded-md border border-[#9a5b2f]/25 bg-[#fff9e8]/45 px-3 py-3 sm:px-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#45564f]">宿敌</span>
        <span className="text-xs font-semibold text-[#9a5b2f]">仇怨 {enmity}</span>
      </div>
      <div className="text-sm font-bold text-[#263832]">{name}</div>
      <div className="mt-1 text-xs text-[#66766e]">已击退 {defeats} 次，历练时可能寻仇。</div>
    </div>
  );
}

function MobileBreakthroughPanel({
  canBreakthrough,
  className = '',
  onBreakthrough,
  onPrepare,
  showBreakthroughButton = true
}: {
  canBreakthrough: boolean;
  className?: string;
  onBreakthrough: () => void;
  onPrepare: (actionId: string) => void;
  showBreakthroughButton?: boolean;
}) {
  const { gameState, getBreakthroughSuccessChance } = useGameStore();
  const isBlockedByChoice = !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || gameState.pendingPathChoice
    || gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
  const breakthroughChance = getBreakthroughSuccessChance();

  return (
    <div className={`ink-panel space-y-3 rounded-lg p-4 ${className}`}>
      <BreakthroughRequirements
        currentRealmName={gameState.currentRealm.name}
        attributes={gameState.attributes}
      />
      <BreakthroughPrepSummary
        preparation={gameState.breakthroughPreparation}
        chance={breakthroughChance}
      />
      <PreparationPanel
        canUse={!isBlockedByChoice}
        spiritStones={gameState.spiritStones}
        inventory={gameState.inventory}
        realmLevel={gameState.currentRealm.level}
        shouldPrepare={gameState.cultivationProgress > 0 && !canBreakthrough}
        onPrepare={onPrepare}
      />
      <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 text-center">
        {showBreakthroughButton && (
          <>
            <div className="mb-3 text-sm font-semibold text-[#45564f]">突破瓶颈</div>
            <button
              type="button"
              disabled={!canBreakthrough}
              onClick={onBreakthrough}
              className={`w-full rounded-md px-6 py-3 text-lg font-bold transition ${
                canBreakthrough
                  ? 'border border-[#a9823c]/45 bg-[#f0dfad] text-[#7a5426] shadow-lg hover:brightness-105'
                  : 'border border-[#738275]/20 bg-[#eee8d4]/55 text-[#8d947f]'
              }`}
            >
              突破瓶颈
            </button>
          </>
        )}
        <p className="mt-3 text-xs leading-relaxed text-[#66766e]">
          {gameState.pendingPathChoice
            ? '需先在修行页立定流派，方可继续筹备突破。'
            : gameState.pendingTribulation
            ? '天雷正在临身，需先完成渡劫。'
            : isBlockedByChoice
            ? '需先处理当前抉择，方可闭关冲境。'
            : canBreakthrough
              ? '修为圆满，门槛已足，可以尝试突破。'
              : '修炼进度圆满且突破门槛满足后，便可在此突破。'}
        </p>
      </div>
    </div>
  );
}

function BreakthroughPrepSummary({
  preparation,
  chance
}: {
  preparation: { elixir: number; artifact: number; talisman: number; array: number };
  chance: number | null;
}) {
  const total = preparation.elixir + preparation.artifact + preparation.talisman + preparation.array;
  const chanceText = chance === null ? '--' : `${Math.round(chance * 100)}%`;

  return (
    <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 text-xs text-[#66766e]">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-[#45564f]">准备加成</span>
        <span>成功率约 {chanceText}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <span>丹 {preparation.elixir}</span>
        <span>器 {preparation.artifact}</span>
        <span>符 {preparation.talisman}</span>
        <span>阵 {preparation.array}</span>
      </div>
      <div className="mt-2 text-right">共 {total} 层，突破后清空</div>
    </div>
  );
}
