import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { realms } from '@/data/realms';
import { getCultivationPath } from '@/data/cultivationPaths';
import { getCultivationSect, sectExchanges, sectMissions } from '@/data/sects';
import { achievementCatalog, getAchievementInfo } from '@/data/achievements';
import { getLifeGoalDefinition } from '@/data/lifeGoals';
import { getItem } from '@/data/items';
import { getTechnique, getTechniqueRewardsByGrade } from '@/data/techniques';
import { getFeat, getSpell, innatePassiveFeatures, spellbook } from '@/data/dndFeatures';
import { getEquipmentDefinition } from '@/data/combatZones';
import type {
  ActiveLifeGoal,
  Attributes,
  CombatStats,
  CultivationPathId,
  GameEvent,
  GameState,
  InventoryEntry,
  LearnedTechnique,
  PathResourceState,
  PassiveFeature,
  Realm,
  SectExchangeDefinition,
  SectMissionDefinition,
  SpellDefinition,
  TechniqueDefinition
} from '@/types';

interface StatusPanelProps {
  showLifeGoal?: boolean;
}

function isGameBusy(gameState: GameState): boolean {
  return !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || !!gameState.pendingPathChoice
    || !!gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
}

export default function StatusPanel({
  showLifeGoal = true
}: StatusPanelProps = {}) {
  const { gameState } = useGameStore();
  const { currentRealm, age, lifespan, attributes, spiritRoot, talent, cultivationPath, cultivationProgress, combatStats, sect } = gameState;
  
  const lifespanPercent = lifespan === Infinity ? 100 : (age / lifespan) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ink-panel rounded-lg p-3 sm:p-5"
    >
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div>
          <CurrentRealmSummary currentRealm={currentRealm} characterName={gameState.characterName} />

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
              寿命: {lifespan === Infinity ? '无尽' : `${lifespan} 年`}
            </div>
          </div>

          <CultivationProgress
            currentRealmName={currentRealm.name}
            progress={cultivationProgress}
          />

          <BreakthroughRequirements
            currentRealmName={currentRealm.name}
            attributes={attributes}
          />

          <div className="mt-3 sm:mt-4">
            <AttributePanel attributes={attributes} cap={currentRealm.attributeCap} />
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
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

          {showLifeGoal && gameState.status === 'playing' && (
            <LifeGoalPanel
              activeGoal={gameState.activeGoal}
              completedCount={gameState.completedGoals.length}
            />
          )}

          {gameState.status === 'playing' && (
            <BuildFeaturePanel gameState={gameState} />
          )}

          {gameState.status === 'playing' && (
            <TechniquePanel gameState={gameState} />
          )}

          {gameState.status === 'playing' && currentRealm.name !== '幼年期' && (
            <CombatStatsPanel combatStats={combatStats} />
          )}

          {gameState.status === 'playing' && (
            <InventoryPanel
              inventory={gameState.inventory}
              canUse={!isGameBusy(gameState)}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function CurrentRealmSummary({
  currentRealm,
  characterName
}: {
  currentRealm: Realm;
  characterName?: string;
}) {
  return (
    <div className="mb-4 text-center sm:mb-5">
      <div className="mb-2 text-sm text-[#66766e]">{characterName || '无名'}</div>
      <motion.div
        key={currentRealm.name}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="ink-title text-2xl font-bold sm:text-3xl"
      >
        {currentRealm.name}
      </motion.div>
      <p className="ink-muted mt-1 text-xs">{currentRealm.description}</p>
    </div>
  );
}

export function FateSummary({
  label,
  name,
  rarity,
  description
}: {
  label: string;
  name: string;
  rarity: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-[#738275]/20 bg-[#fff9e8]/45 px-3 py-2 text-center">
      <div className="ink-muted text-xs">{label}</div>
      <div className="text-sm font-semibold sm:text-base" style={{ color: getRarityColor(rarity) }}>
        {name}
      </div>
      <p className="ink-muted mt-1 text-xs leading-relaxed">{description}</p>
    </div>
  );
}

export function CultivationPathPanel({
  pathId,
  pathResource
}: {
  pathId: CultivationPathId | null;
  pathResource?: PathResourceState;
}) {
  const path = getCultivationPath(pathId);
  if (!path) return null;

  const resourceName = getPathResourceName(pathId);
  const resourceValue = pathResource?.value ?? 0;

  return (
    <div className="rounded-md border border-[#738275]/20 bg-[#fff9e8]/45 px-3 py-2 text-center">
      <div className="ink-muted text-xs">流派</div>
      <div className="text-sm font-semibold text-[#355d58] sm:text-base">{path.name}</div>
      <div className="mt-1 text-xs font-semibold text-[#6d634d]">{path.focus}</div>
      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[#66766e]">
          <span>{resourceName}</span>
          <span className="text-[#355d58]">{resourceValue}/100</span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-[#c8c2a9]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${resourceValue}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-[#5f7c64]"
          />
        </div>
      </div>
      <p className="ink-muted mt-1 text-xs leading-relaxed">{path.description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {path.build.map(item => (
          <span
            key={item}
            className="rounded-full bg-[#e7eddd] px-2 py-0.5 text-xs font-semibold text-[#355d58]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SectPanel({ gameState }: { gameState: GameState }) {
  const { runSectMission, exchangeSectReward } = useGameStore();
  const sectState = gameState.sect;
  const sect = getCultivationSect(sectState?.sectId);
  if (!sect || !sectState) return null;
  const missions = getVisibleSectMissions(gameState).slice(0, 3);
  const exchanges = getVisibleSectExchanges(gameState).slice(0, 4);
  const canAct = gameState.status === 'playing'
    && !isGameBusy(gameState);
  const missionCompletedThisYear = gameState.lastSectMissionAge === gameState.age;

  return (
    <div className="rounded-md border border-[#738275]/20 bg-[#fff9e8]/45 px-3 py-2">
      <div className="ink-muted text-xs">宗门</div>
      <div className="text-center text-sm font-semibold text-[#355d58] sm:text-base">{sect.name}</div>
      <div className="mt-1 text-center text-xs font-semibold text-[#6d634d]">
        {sectState.rank} · {sect.tendency}
      </div>
      <p className="ink-muted mt-1 text-xs leading-relaxed">{sect.description}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-[#738275]/15 bg-[#fffdf2]/60 px-2 py-1.5">
          <span className="block text-[#66766e]">贡献</span>
          <span className="font-bold text-[#355d58]">{sectState.contribution}</span>
        </div>
        <div className="rounded border border-[#738275]/15 bg-[#fffdf2]/60 px-2 py-1.5">
          <span className="block text-[#66766e]">声望</span>
          <span className="font-bold text-[#355d58]">{sectState.reputation}</span>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold text-[#45564f]">
          {sectState.sectId === 'loose' ? '散修机缘' : '宗门任务'}
        </div>
        <div className="grid gap-2">
          {missions.map(mission => (
            <button
              key={mission.id}
              type="button"
              disabled={!canAct || missionCompletedThisYear}
              onClick={() => runSectMission(mission.id)}
              className={`rounded border px-3 py-2 text-left text-xs font-semibold transition ${
                canAct && !missionCompletedThisYear
                  ? 'border-[#738275]/25 bg-[#fffdf2]/75 text-[#45564f] hover:border-[#355d58]/45'
                  : 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
              }`}
            >
              <span className="block text-[#355d58]">
                {mission.name}{missionCompletedThisYear ? ' · 本年已完成' : ''}
              </span>
              <span className="block font-normal text-[#66766e]">
                {mission.looseOnly ? '机缘' : `贡献 +${mission.contribution}`} · {mission.description}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold text-[#45564f]">
          {sectState.sectId === 'loose' ? '黑市换宝' : '贡献兑换'}
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          {exchanges.map(exchange => {
            const available = canAct && isExchangeUsable(gameState, exchange);

            return (
              <button
                key={exchange.id}
                type="button"
                disabled={!available}
                onClick={() => exchangeSectReward(exchange.id)}
                className={`rounded border px-3 py-2 text-left text-xs font-semibold transition ${
                  available
                    ? 'border-[#738275]/25 bg-[#eef3df]/70 text-[#45564f] hover:border-[#355d58]/45'
                    : 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
                }`}
              >
                <span className="block text-[#355d58]">{exchange.name}</span>
                <span className="block font-normal text-[#66766e]">
                  {exchange.looseOnly ? '散修限定' : `贡献 ${exchange.cost}`} · {exchange.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getVisibleSectMissions(gameState: GameState): SectMissionDefinition[] {
  const sectId = gameState.sect?.sectId;
  if (!sectId) return [];

  return sectMissions.filter(mission => {
    if (mission.minRealmLevel && gameState.currentRealm.level < mission.minRealmLevel) return false;
    if (mission.looseOnly) return sectId === 'loose';
    if (sectId === 'loose') return false;
    if (mission.sectIds && !mission.sectIds.includes(sectId)) return false;
    return true;
  });
}

function getVisibleSectExchanges(gameState: GameState): SectExchangeDefinition[] {
  const sectId = gameState.sect?.sectId;
  if (!sectId) return [];

  return sectExchanges.filter(exchange => {
    if (exchange.looseOnly) return sectId === 'loose';
    if (sectId === 'loose') return false;
    if (exchange.sectIds && !exchange.sectIds.includes(sectId)) return false;
    return true;
  });
}

function isExchangeUsable(gameState: GameState, exchange: SectExchangeDefinition): boolean {
  if (exchange.looseOnly) {
    const familyCost = Math.abs(exchange.effects?.家境 ?? 0);
    return gameState.familyWealth >= familyCost;
  }

  if (!gameState.sect || gameState.sect.contribution < exchange.cost) return false;
  if (exchange.minRank && getSectRankValue(gameState.sect.rank) < getSectRankValue(exchange.minRank)) return false;
  if (exchange.techniqueRewardGrade) {
    if (!gameState.cultivationPath) return false;
    const rewards = getTechniqueRewardsByGrade(
      gameState.cultivationPath,
      exchange.techniqueRewardGrade,
      gameState.currentRealm.level,
      gameState.techniques.map(technique => technique.techniqueId)
    );
    if (rewards.length === 0) return false;
  }
  return true;
}

function getSectRankValue(rank: string): number {
  switch (rank) {
    case '太上长老':
      return 6;
    case '长老':
      return 5;
    case '执事':
      return 4;
    case '真传弟子':
      return 3;
    case '内门弟子':
      return 2;
    case '外门弟子':
      return 1;
    default:
      return 0;
  }
}

function getPathResourceName(pathId: CultivationPathId | null): string {
  switch (pathId) {
    case 'sword':
      return '剑意';
    case 'body':
      return '气血';
    case 'spell':
      return '术式';
    case 'demonic':
      return '魔念';
    default:
      return '道势';
  }
}

export function CultivationProgress({
  currentRealmName,
  progress
}: {
  currentRealmName: string;
  progress: number;
}) {
  if (currentRealmName === '幼年期') {
    return (
      <div className="mb-3 rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 sm:px-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="ink-muted">修炼进度</span>
          <span className="font-semibold text-[#263832]">未启蒙</span>
        </div>
        <div className="relative h-2 rounded-full bg-[#c8c2a9]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '0%' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#355d58] to-[#9a8a54]"
          />
        </div>
        <div className="mt-1 text-right text-xs text-[#66766e]">
          10 岁引气入体后开始修炼
        </div>
      </div>
    );
  }

  const realmIndex = realms.findIndex(realm => realm.name === currentRealmName);
  const currentRealm = realmIndex >= 0 ? realms[realmIndex] : undefined;
  const nextRealm = realmIndex >= 0 ? realms[realmIndex + 1] : undefined;
  const requiredProgress = nextRealm?.cultivationRequired ?? currentRealm?.cultivationRequired ?? 0;
  const progressTarget = nextRealm ? `距 ${nextRealm.name}` : '距飞升';
  const progressPercent = requiredProgress > 0
    ? Math.round(Math.min(100, progress / requiredProgress * 100))
    : 100;

  return (
    <div className="mb-3 rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 sm:px-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="ink-muted">修炼进度</span>
        <span className="font-semibold text-[#263832]">
          {requiredProgress > 0 ? `${progress}/${requiredProgress}` : '圆满'}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-[#c8c2a9]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#355d58] to-[#9a8a54]"
        />
      </div>
      <div className="mt-1 text-right text-xs text-[#66766e]">
        {requiredProgress > 0 ? `${progressTarget} ${progressPercent}%` : '大道圆满'}
      </div>
    </div>
  );
}

export function BreakthroughRequirements({
  currentRealmName,
  attributes
}: {
  currentRealmName: string;
  attributes: Attributes;
}) {
  if (currentRealmName === '幼年期') {
    return (
      <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 text-center sm:px-4">
        <div className="text-xs text-[#66766e]">突破门槛</div>
        <div className="mt-1 font-bold text-[#355d58]">10 岁引气入体</div>
        <p className="mt-1 text-xs leading-relaxed text-[#66766e]">
          幼年期只积累五维根基，不增加修为。
        </p>
      </div>
    );
  }

  const realmIndex = realms.findIndex(realm => realm.name === currentRealmName);
  const nextRealm = realmIndex >= 0 ? realms[realmIndex + 1] : undefined;

  if (!nextRealm) {
    return (
      <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 text-center sm:px-4">
        <div className="text-xs text-[#66766e]">突破门槛</div>
        <div className="mt-1 font-bold text-[#9a5b2f]">大道圆满</div>
      </div>
    );
  }

  const requirementItems = getRequirementItems(nextRealm, attributes);

  return (
    <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 sm:px-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="ink-muted">突破门槛</span>
        <span className="font-semibold text-[#263832]">{nextRealm.name}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {requirementItems.map(item => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded border border-[#738275]/20 bg-[#fffdf2]/50 px-2 py-1 text-xs"
          >
            <span className="ink-muted">{item.name}</span>
            <span className={item.met ? 'font-semibold text-[#355d58]' : 'font-semibold text-[#9a5b2f]'}>
              {item.current}/{item.required}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TechniquePanel({
  gameState,
  className = ''
}: {
  gameState: GameState;
  className?: string;
}) {
  const { trainTechnique } = useGameStore();
  const learnedTechniques = gameState.techniques
    .map(learnedTechnique => ({ learnedTechnique, technique: getTechnique(learnedTechnique.techniqueId) }))
    .filter((entry): entry is { learnedTechnique: LearnedTechnique; technique: TechniqueDefinition } => !!entry.technique);
  const buildSynergy = getVisibleTechniqueBuildSynergy(gameState, learnedTechniques.map(entry => entry.technique));

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="ink-title text-xl font-bold">功法</span>
        <span className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/80 px-3 py-1 text-xs font-semibold text-[#66766e]">
          {learnedTechniques.length} 本
        </span>
      </div>
      {learnedTechniques.length > 0 && (
        <div className="mb-3 rounded-md border border-[#738275]/20 bg-[#e7eddd]/50 px-3 py-2 text-xs font-semibold text-[#355d58]">
          构筑联动：攻势 +{buildSynergy.combatBonus}% · 冲关 +{buildSynergy.breakthroughBonus}%
        </div>
      )}
      {learnedTechniques.length === 0 ? (
        <div className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/80 px-3 py-3 text-sm font-semibold text-[#66766e]">
          立定流派后，基础功法会收入道途。
        </div>
      ) : (
        <div className="space-y-3">
          {learnedTechniques.map(({ learnedTechnique, technique }) => (
            <TechniqueCard
              key={technique.id}
              gameState={gameState}
              learnedTechnique={learnedTechnique}
              technique={technique}
              onTrain={trainTechnique}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BuildFeaturePanel({
  gameState,
  className = ''
}: {
  gameState: GameState;
  className?: string;
}) {
  const { equipSpell } = useGameStore();
  const feats = gameState.feats
    .map(featId => getFeat(featId))
    .filter((feat): feat is NonNullable<ReturnType<typeof getFeat>> => !!feat);
  const spells = gameState.equippedSpellIds
    .map(spellId => getSpell(spellId))
    .filter((spell): spell is NonNullable<ReturnType<typeof getSpell>> => !!spell);
  const passives = getVisiblePassiveFeatures(gameState);
  const availableSpells = getVisibleSpellOptions(gameState);

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="ink-title text-xl font-bold">构筑</span>
        <span className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/80 px-3 py-1 text-xs font-semibold text-[#66766e]">
          d20
        </span>
      </div>
      <FeatureGroup title="专长" emptyText="突破或完成道途目标后可领悟专长。">
        {feats.map(feat => (
          <FeaturePill key={feat.id} name={feat.name} description={feat.description} />
        ))}
      </FeatureGroup>
      <FeatureGroup title={spells[0]?.bookName ?? '技能书'} emptyText="选择流派后可装备本流派术式。">
        {availableSpells.map(spell => {
          const equipped = gameState.equippedSpellIds.includes(spell.id);
          const canEquip = !isGameBusy(gameState) && (equipped || gameState.equippedSpellIds.length < 3);

          return (
            <button
              key={spell.id}
              type="button"
              disabled={!canEquip}
              onClick={() => equipSpell(spell.id)}
              className={`w-full rounded-md border px-3 py-2 text-left transition ${
                equipped
                  ? 'border-[#355d58]/35 bg-[#e7eddd]/70'
                  : canEquip
                    ? 'border-[#738275]/20 bg-[#fffdf2]/70 hover:border-[#355d58]/35'
                    : 'border-[#738275]/15 bg-[#eee8d4]/40 text-[#8d947f]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#355d58]">{spell.name}</span>
                <span className="text-xs font-semibold text-[#6d634d]">{equipped ? '已装备' : '装备'}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#66766e]">{spell.description}</p>
            </button>
          );
        })}
      </FeatureGroup>
      <FeatureGroup title="被动" emptyText="">
        {passives.map(passive => (
          <FeaturePill key={passive.id} name={passive.name} description={`${passive.source}：${passive.description}`} />
        ))}
      </FeatureGroup>
    </div>
  );
}

function FeatureGroup({
  title,
  emptyText,
  children
}: {
  title: string;
  emptyText: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasItems = Array.isArray(items) ? items.length > 0 : !!items;

  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-xs font-semibold text-[#45564f]">{title}</div>
      {hasItems ? (
        <div className="space-y-2">{items}</div>
      ) : (
        <div className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/60 px-3 py-2 text-xs font-semibold text-[#66766e]">
          {emptyText || '暂无'}
        </div>
      )}
    </div>
  );
}

function FeaturePill({ name, description }: { name: string; description: string }) {
  return (
    <div className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 px-3 py-2">
      <div className="text-sm font-bold text-[#355d58]">{name}</div>
      <p className="mt-1 text-xs leading-relaxed text-[#66766e]">{description}</p>
    </div>
  );
}

function getVisiblePassiveFeatures(gameState: GameState): PassiveFeature[] {
  const passives: PassiveFeature[] = [...innatePassiveFeatures];

  if (gameState.spiritRoot) {
    passives.push({
      id: `spirit-root-${gameState.spiritRoot.id}`,
      name: gameState.spiritRoot.name,
      source: '灵根',
      description: gameState.spiritRoot.description
    });
  }

  if (gameState.talent) {
    passives.push({
      id: `talent-${gameState.talent.id}`,
      name: gameState.talent.name,
      source: '天赋',
      description: gameState.talent.description
    });
  }

  return passives;
}

function getVisibleSpellOptions(gameState: GameState): SpellDefinition[] {
  if (!gameState.cultivationPath) return [];

  return spellbook.filter(spell => (
    spell.pathId === gameState.cultivationPath
    && spell.minRealmLevel <= gameState.currentRealm.level
  ));
}

function getVisibleTechniqueBuildSynergy(
  gameState: GameState,
  techniques: TechniqueDefinition[]
): {
  combatBonus: number;
  breakthroughBonus: number;
} {
  const ownPathTechniques = techniques.filter(technique => technique.pathId === gameState.cultivationPath);
  const gradeCount = new Set(ownPathTechniques.map(technique => technique.grade)).size;
  const totalLevel = gameState.techniques.reduce((sum, learnedTechnique) => sum + learnedTechnique.level, 0);
  const gradeChainBonus = Math.max(0, gradeCount - 1) * 0.025;
  const masteryBonus = totalLevel >= 18 ? 0.04 : totalLevel >= 10 ? 0.025 : totalLevel >= 5 ? 0.012 : 0;
  const combatBonus = Math.min(0.14, gradeChainBonus + masteryBonus);

  return {
    combatBonus: Math.round(combatBonus * 100),
    breakthroughBonus: Math.round(combatBonus * 35)
  };
}

function TechniqueCard({
  gameState,
  learnedTechnique,
  technique,
  onTrain
}: {
  gameState: GameState;
  learnedTechnique: LearnedTechnique;
  technique: TechniqueDefinition;
  onTrain: (techniqueId: string) => void;
}) {
  const cost = getVisibleTechniqueTrainingCost(gameState, technique);
  const isMaxLevel = learnedTechnique.level >= technique.maxLevel;
  const canTrain = !isGameBusy(gameState)
    && gameState.currentRealm.level >= technique.minRealmLevel
    && !isMaxLevel
    && gameState.cultivationProgress >= cost.progressCost
    && gameState.age < gameState.lifespan - cost.timeCost;
  const combatBonus = Math.round(learnedTechnique.level * technique.offensePerLevel * 100);

  return (
    <div className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/80 px-3 py-3 shadow-sm">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-bold text-[#355d58]">
            《{technique.name}》
          </div>
          <div className="text-xs font-semibold text-[#6d634d]">
            {technique.grade}阶 · {learnedTechnique.level}/{technique.maxLevel} 层
          </div>
        </div>
        <span className="rounded-full bg-[#e7eddd] px-2 py-0.5 text-xs font-bold text-[#355d58]">
          攻势 +{combatBonus}%
        </span>
      </div>
      <p className="text-xs leading-relaxed text-[#66766e]">{technique.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Object.entries(technique.effectsPerLevel).map(([key, value]) => (
          <span
            key={key}
            className="rounded-full bg-[#e7eddd] px-2 py-0.5 text-xs font-semibold text-[#355d58]"
          >
            每层 {key} +{value}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <div className="text-xs font-semibold text-[#6d634d]">
          消耗 修为 {cost.progressCost} · 时间 {cost.timeCost} 年
        </div>
        <button
          type="button"
          disabled={!canTrain}
          onClick={() => onTrain(technique.id)}
          className={`rounded border px-3 py-1.5 text-xs font-bold transition ${
            canTrain
              ? 'border-[#738275]/30 bg-[#eef3df] text-[#355d58] hover:border-[#9a5b2f]/45'
              : 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
          }`}
        >
          {isMaxLevel ? '已圆满' : '修炼功法'}
        </button>
      </div>
    </div>
  );
}

function getVisibleTechniqueTrainingCost(gameState: GameState, technique: TechniqueDefinition): {
  progressCost: number;
  timeCost: number;
} {
  const realmIndex = realms.findIndex(realm => realm.name === gameState.currentRealm.name);
  const nextRealm = realmIndex >= 0 ? realms[realmIndex + 1] : undefined;
  const progressBase = nextRealm?.cultivationRequired || Math.max(100, gameState.currentRealm.cultivationRequired);

  return {
    progressCost: Math.max(1, Math.floor(progressBase * technique.trainCost.修为 / 100)),
    timeCost: Math.max(1, technique.trainCost.时间)
  };
}

export function InventoryPanel({
  inventory,
  canUse,
  className = ''
}: {
  inventory: InventoryEntry[];
  canUse: boolean;
  className?: string;
}) {
  const { gameState, consumeInventoryItem, equipCombatItem, unequipCombatItem } = useGameStore();
  const entries = inventory
    .map(entry => ({ ...entry, item: getItem(entry.itemId) }))
    .filter((entry): entry is InventoryEntry & { item: NonNullable<ReturnType<typeof getItem>> } => !!entry.item);

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="ink-title text-xl font-bold">储物戒</span>
        <span className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/80 px-3 py-1 text-xs font-semibold text-[#66766e]">
          {entries.length} 类
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/80 px-3 py-3 text-sm font-semibold text-[#66766e]">
          戒中尚无可用之物。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          {entries.map(({ itemId, quantity, item }) => {
            const usable = canUse && item.usable;
            const equipmentDefinition = getEquipmentDefinition(itemId);
            const isEquipped = equipmentDefinition
              ? gameState.equipment[equipmentDefinition.slot] === itemId
              : false;

            return (
              <div
                key={itemId}
                className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/80 px-3 py-3 shadow-sm"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold" style={{ color: getRarityColor(item.rarity) }}>
                      {item.name}
                    </div>
                    <div className="text-xs font-semibold text-[#6d634d]">
                      {item.type}{item.resourceType ? `/${item.resourceType}` : ''} · {item.rarity}
                    </div>
                  </div>
                  <span className="rounded-full bg-[#e7eddd] px-2 py-0.5 text-xs font-bold text-[#355d58]">
                    x{quantity}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-[#66766e]">
                  {item.description}
                </p>
                {item.effects && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(item.effects).map(([key, value]) => (
                      <span
                        key={key}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          typeof value === 'number' && value < 0
                            ? 'bg-[#f2d9d2] text-[#9d3d2f]'
                            : 'bg-[#e7eddd] text-[#355d58]'
                        }`}
                      >
                        {key} {typeof value === 'number' && value > 0 ? '+' : ''}{String(value)}
                      </span>
                    ))}
                  </div>
                )}
                {equipmentDefinition && (
                  <div className="mt-2 rounded border border-[#355d58]/20 bg-[#e7eddd]/65 px-2 py-1 text-xs font-semibold leading-relaxed text-[#355d58]">
                    {equipmentDefinition.effectText}
                  </div>
                )}
                <div className="mt-2 rounded border border-[#738275]/15 bg-[#eef3df]/50 px-2 py-1 text-xs font-semibold text-[#45564f]">
                  {getItemCheckHint(item.id, item.type)}
                </div>
                {equipmentDefinition && (
                  <button
                    type="button"
                    disabled={!canUse}
                    onClick={() => isEquipped
                      ? unequipCombatItem(equipmentDefinition.slot)
                      : equipCombatItem(itemId)}
                    className={`mt-2 w-full rounded border px-3 py-1.5 text-xs font-bold transition-colors ${canUse
                      ? isEquipped
                        ? 'border-[#9a5b2f]/30 bg-[#fff9e8] text-[#7a5426]'
                        : 'border-[#355d58]/35 bg-[#355d58] text-[#fff9e8] hover:bg-[#416f68]'
                      : 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
                    }`}
                  >
                    {isEquipped ? '卸下' : `装备至${getEquipmentSlotLabel(equipmentDefinition.slot)}`}
                  </button>
                )}
                {item.usable && (
                  <button
                    type="button"
                    disabled={!usable}
                    onClick={() => consumeInventoryItem(itemId)}
                    className={`mt-2 w-full rounded border px-3 py-1.5 text-xs font-bold transition ${
                      usable
                        ? 'border-[#738275]/30 bg-[#eef3df] text-[#355d58] hover:border-[#9a5b2f]/45'
                        : 'border-[#738275]/15 bg-[#eee8d4]/45 text-[#8d947f]'
                    }`}
                  >
                    使用
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getItemCheckHint(itemId: string, itemType: string): string {
  switch (itemId) {
    case 'fortune-talisman':
      return '机缘、资源、宗门检定时可自动消耗，检定 +2';
    case 'protection-talisman':
      return '灾劫、心境检定时可自动消耗，检定 +2';
    case 'spirit-blade':
      return '武器法器，可在战斗页或储物戒中装备';
    case 'minor-ward':
      return '护甲法器，可在战斗页或储物戒中装备';
    case 'soul-settling-orb':
    case 'heaven-soul-jade':
      return '配饰法器，可在战斗页或储物戒中装备';
    default:
      if (itemType === '法器') return '战斗或突破准备中可能提供构筑助力';
      if (itemType === '符箓') return '可用于检定、突破或渡劫前准备';
      if (itemType === '丹药') return '可直接使用，也可辅助突破准备';
      return '可用于百艺、事件或储备资源';
  }
}

function getEquipmentSlotLabel(slot: 'weapon' | 'armor' | 'accessory'): string {
  if (slot === 'weapon') return '武器';
  if (slot === 'armor') return '护甲';
  return '配饰';
}

export function CombatStatsPanel({ combatStats }: { combatStats: CombatStats }) {
  const totalBattles = combatStats.victories + combatStats.defeats;
  const winRate = totalBattles > 0 ? Math.round(combatStats.victories / totalBattles * 100) : 0;
  const injuryPercent = Math.min(100, combatStats.injury);
  const injuryColor = injuryPercent >= 70
    ? 'from-[#9d3d2f] to-[#b98678]'
    : injuryPercent >= 35
      ? 'from-[#9a5b2f] to-[#b49a4b]'
      : 'from-[#355d58] to-[#88a876]';

  return (
    <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#45564f]">战斗历练</span>
        <span className="text-xs text-[#66766e]">
          胜率 {winRate}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs min-[420px]:grid-cols-4">
        <CombatStatItem label="胜场" value={combatStats.victories} />
        <CombatStatItem label="败场" value={combatStats.defeats} />
        <CombatStatItem label="连胜" value={combatStats.currentStreak} />
        <CombatStatItem label="最佳" value={combatStats.bestStreak} />
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="ink-muted">伤势</span>
          <span className="font-semibold text-[#263832]">{combatStats.injury}/100</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-[#c8c2a9]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${injuryPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${injuryColor}`}
          />
        </div>
      </div>
    </div>
  );
}

function CombatStatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[#738275]/15 bg-[#fffdf2]/55 px-2 py-2 text-center">
      <div className="text-[#66766e]">{label}</div>
      <div className="font-bold text-[#355d58]">{value}</div>
    </div>
  );
}

export function LifeGoalPanel({
  activeGoal,
  completedCount,
  className = ''
}: {
  activeGoal: ActiveLifeGoal | null;
  completedCount: number;
  className?: string;
}) {
  const definition = activeGoal ? getLifeGoalDefinition(activeGoal.id) : undefined;

  if (!activeGoal || !definition) {
    return (
      <div className={`ink-panel rounded-lg p-4 text-sm font-semibold text-[#66766e] sm:p-5 ${className}`}>
        道途目标将在入世后显现。
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round(activeGoal.progress / definition.target * 100));
  const rewardEntries = Object.entries(definition.reward).filter(([, value]) => value !== undefined);

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="ink-title text-xl font-bold">道途目标</span>
        <span className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/80 px-3 py-1 text-xs font-semibold text-[#66766e]">
          已成 {completedCount}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
        <div>
          <div className="font-bold text-[#355d58]">{definition.name}</div>
          <p className="mt-1 text-xs leading-relaxed text-[#66766e]">{definition.description}</p>
        </div>
        <div className="shrink-0 rounded-md border border-[#738275]/20 bg-[#fffdf2]/80 px-3 py-1.5 text-xs font-semibold text-[#6d634d]">
          {definition.targetLabel}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="ink-muted">进度</span>
          <span className="font-semibold text-[#263832]">
            {activeGoal.progress}/{definition.target}
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-[#c8c2a9]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#355d58] to-[#9a8a54]"
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {rewardEntries.map(([key, value]) => (
          <span
            key={key}
            className="rounded-full bg-[#e7eddd] px-2 py-1 text-xs font-semibold text-[#355d58]"
          >
            {key} {typeof value === 'number' && value > 0 ? '+' : ''}{String(value)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StageGoalPanel({
  gameState,
  className = ''
}: {
  gameState: GameState;
  className?: string;
}) {
  const goals = getStageGoals(gameState);

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="ink-title text-xl font-bold">阶段主线</span>
        <span className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/80 px-3 py-1 text-xs font-semibold text-[#66766e]">
          {getStageName(gameState.currentRealm.level)}
        </span>
      </div>
      <div className="space-y-2">
        {goals.map(goal => (
          <div
            key={goal.label}
            className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 px-3 py-2"
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="text-[#45564f]">{goal.label}</span>
              <span className={goal.done ? 'text-[#355d58]' : 'text-[#9a5b2f]'}>
                {goal.current}/{goal.target}
              </span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-[#c8c2a9]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, goal.current / goal.target * 100)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 rounded-full bg-[#5f7c64]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStageName(realmLevel: number): string {
  if (realmLevel <= 2) return '立足';
  if (realmLevel <= 4) return '构筑';
  if (realmLevel <= 6) return '渡劫';
  return '飞升';
}

function getStageGoals(gameState: GameState): Array<{ label: string; current: number; target: number; done: boolean }> {
  const techniqueLevels = gameState.techniques.reduce((sum, technique) => sum + technique.level, 0);
  const sectContribution = gameState.sect?.contribution ?? 0;
  const lifeSkillTotal = gameState.lifeSkills.reduce((sum, skill) => sum + skill.level, 0);

  if (gameState.currentRealm.level <= 2) {
    return [
      makeStageGoal('完成入宗或散修择路', gameState.sect ? 1 : 0, 1),
      makeStageGoal('取得 1 场战斗历练', gameState.combatStats.victories, 1),
      makeStageGoal('拥有 1 本功法', gameState.techniques.length, 1)
    ];
  }

  if (gameState.currentRealm.level <= 4) {
    return [
      makeStageGoal('功法总层数达到 10', techniqueLevels, 10),
      makeStageGoal('宗门贡献或散修机缘达到 120', gameState.sect?.sectId === 'loose' ? gameState.attributes.气运 : sectContribution, 120),
      makeStageGoal('完成 3 个道途目标', gameState.completedGoals.length, 3)
    ];
  }

  if (gameState.currentRealm.level <= 6) {
    return [
      makeStageGoal('准备至少 3 项突破护持', getPreparationTotal(gameState), 3),
      makeStageGoal('百艺总等级达到 18', lifeSkillTotal, 18),
      makeStageGoal('战斗胜场达到 8', gameState.combatStats.victories, 8)
    ];
  }

  return [
    makeStageGoal('功法总层数达到 30', techniqueLevels, 30),
    makeStageGoal('完成 6 个道途目标', gameState.completedGoals.length, 6),
    makeStageGoal('储备 5 项突破护持', getPreparationTotal(gameState), 5)
  ];
}

function makeStageGoal(label: string, current: number, target: number) {
  return {
    label,
    current: Math.min(target, Math.max(0, Math.round(current))),
    target,
    done: current >= target
  };
}

function getPreparationTotal(gameState: GameState): number {
  return gameState.breakthroughPreparation.elixir
    + gameState.breakthroughPreparation.artifact
    + gameState.breakthroughPreparation.talisman
    + gameState.breakthroughPreparation.array;
}

export function AchievementPanel({
  achievements,
  className = ''
}: {
  achievements: string[];
  className?: string;
}) {
  const unlocked = new Set(achievements);
  const visibleAchievements = achievementCatalog.slice(0, 8);

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="ink-title text-xl font-bold">成就</span>
        <span className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/80 px-3 py-1 text-xs font-semibold text-[#66766e]">
          {achievements.length}/{achievementCatalog.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {visibleAchievements.map(achievement => {
          const isUnlocked = unlocked.has(achievement.id);

          return (
            <div
              key={achievement.id}
              title={achievement.description}
              className={`min-h-[64px] rounded-md border px-3 py-3 text-xs shadow-sm ${
                isUnlocked
                  ? 'border-[#a9823c]/40 bg-[#f4e6ba]/85 text-[#6f4d24]'
                  : 'border-[#738275]/20 bg-[#fffdf2]/75 text-[#7b8378]'
              }`}
            >
              <span className={`block truncate font-bold ${isUnlocked ? 'text-[#6f4d24]' : 'text-[#59645f]'}`}>
                {isUnlocked ? achievement.name : '未解锁'}
              </span>
              <span className="mt-1 block truncate text-[#66766e]">
                {isUnlocked ? achievement.description : achievement.name}
              </span>
            </div>
          );
        })}
      </div>
      {achievements.length > visibleAchievements.length && (
        <div className="mt-3 text-right text-xs font-semibold text-[#66766e]">
          另有 {achievements.length - visibleAchievements.length} 项已解锁
        </div>
      )}
      {achievements.length > 0 && (
        <div className="mt-3 rounded-md border border-[#738275]/20 bg-[#fffdf2]/75 px-3 py-2 text-xs font-semibold text-[#66766e]">
          最近：{getAchievementInfo(achievements[achievements.length - 1]).name}
        </div>
      )}
    </div>
  );
}

export function RecentEvents({
  events,
  className = ''
}: {
  events: GameEvent[];
  className?: string;
}) {
  const recentEvents = events.slice(-4).reverse();

  return (
    <div className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="ink-title text-xl font-bold">最近年表</span>
        <span className="rounded-full border border-[#738275]/25 bg-[#fffdf2]/80 px-3 py-1 text-xs font-semibold text-[#66766e]">
          {events.length} 事
        </span>
      </div>
      {recentEvents.length === 0 ? (
        <div className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/80 px-3 py-3 text-sm font-semibold text-[#66766e]">
          此世年表尚未落笔。
        </div>
      ) : (
        <div className="space-y-3">
          {recentEvents.map(event => (
            <div
              key={`${event.id}-${event.age}`}
              className="rounded-md border border-[#738275]/20 bg-[#fffdf2]/80 px-3 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#355d58]">第 {event.age} 年</span>
                <span className={getEventResultClass(event.result)}>{getEventResultText(event.result)}</span>
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-[#45564f]">{event.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getEventResultText(result: GameEvent['result']): string {
  if (result === 'great-success') return '大成';
  if (result === 'great-failure') return '大折';
  return '平';
}

function getEventResultClass(result: GameEvent['result']): string {
  if (result === 'great-success') return 'font-semibold text-[#7a5426]';
  if (result === 'great-failure') return 'font-semibold text-[#8f2f24]';
  return 'font-semibold text-[#6d634d]';
}

function getRequirementItems(
  nextRealm: (typeof realms)[number],
  attributes: Attributes
) {
  return Object.entries(nextRealm.requirements.attributes).map(([name, required]) => {
    const attrName = name as keyof Attributes;
    const current = attributes[attrName];
    const requiredValue = required ?? 1;

    return {
      name,
      current,
      required: requiredValue,
      met: current >= requiredValue
    };
  });
}

export function AttributePanel({ attributes, cap }: { attributes: Attributes; cap: number }) {
  return (
    <div className="rounded-md border border-[#738275]/25 bg-[#fff9e8]/45 px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#45564f]">五维属性</span>
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {Object.entries(attributes).map(([key, value]) => (
          <AttributeBar key={key} name={key} value={value} cap={cap} />
        ))}
      </div>
    </div>
  );
}

function AttributeBar({ name, value, cap }: { name: string; value: number; cap: number }) {
  const percent = Math.min(100, value / cap * 100);
  const modifier = getVisibleAttributeModifier(value);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="ink-muted">{name}</span>
        <span className="font-semibold text-[#263832]">
          {value} <span className="text-[#66766e]">({modifier >= 0 ? '+' : ''}{modifier})</span>
        </span>
      </div>
      <div className="relative h-1.5 bg-[#c8c2a9] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#355d58] to-[#88a876]"
        />
      </div>
    </div>
  );
}

function getVisibleAttributeModifier(value: number): number {
  if (value < 10) return -1;
  return Math.max(0, Math.floor(Math.log2(Math.max(10, value) / 10)));
}

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    '凡品': '#6f746d',
    '下品': '#59645f',
    '中品': '#5f7c64',
    '上品': '#355d58',
    '变异': '#4f6f8f',
    '极品': '#7f6a3e',
    '神话': '#9a5b2f',
    '传说': '#a94d37'
  };
  return colors[rarity] || '#9CA3AF';
}
