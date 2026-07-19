import { create } from 'zustand';
import { talents } from '@/data/talents';
import { spiritRoots } from '@/data/spiritRoots';
import { realms } from '@/data/realms';
import { childhoodEvents, earlyEvents, lateEvents, midEvents } from '@/data/events';
import { getCultivationPath } from '@/data/cultivationPaths';
import { getCultivationSect, getSectExchange, getSectMission } from '@/data/sects';
import { lifeGoals, getLifeGoalDefinition } from '@/data/lifeGoals';
import { getSpecificEventChoices, hasSpecificEventChoices } from '@/data/eventChoices';
import { getItem } from '@/data/items';
import { getAvailableTechniqueRewards, getBaseTechnique, getTechnique, getTechniqueRewardsByGrade } from '@/data/techniques';
import { getLifeSkill, lifeSkills, type LifeSkillId, type LifeSkillRecipe } from '@/data/lifeSkills';
import { feats, getFeat, getSpell, spellbook } from '@/data/dndFeatures';
import type {
  ActiveLifeGoal,
  BreakthroughPreparationState,
  CombatActionId,
  CultivationPlan,
  CultivationSessionSource,
  CultivationSessionStopReason,
  EventChoice,
  GameState,
  Talent,
  GameEvent,
  Attributes,
  CultivationSectId,
  SpiritRoot,
  GrowthModifiers,
  CultivationPathId,
  LifeGoalDefinition,
  CombatReport,
  CombatRound,
  CombatStats,
  D20CheckReport,
  FeatDefinition,
  InventoryEntry,
  InventoryReward,
  LifeSkillProgress,
  PathResourceState,
  RivalState,
  SectState,
  LearnedTechnique,
  TechniqueDefinition,
  TurnCombatantState,
  TurnCombatState,
  TribulationState,
  YearActionId
} from '@/types';
import { clearSavedGame, getSavedGame, hasSavedGame, saveGameRecord, saveGameState } from '@/utils/storage';

interface GameStore {
  gameState: GameState;
  startNewGame: (selectedSpiritRoot?: SpiritRoot, selectedTalent?: Talent, characterName?: string) => void;
  drawSpiritRoot: () => SpiritRoot;
  drawTalent: () => Talent;
  drawTalentOptions: (count?: number) => Talent[];
  chooseCultivationPath: (pathId: CultivationPathId) => void;
  chooseCultivationSect: (sectId: CultivationSectId) => void;
  chooseFeat: (featId: string) => void;
  runSectMission: (missionId: string) => void;
  exchangeSectReward: (exchangeId: string) => void;
  equipSpell: (spellId: string) => void;
  getCurrentEventChoices: () => EventChoice[];
  chooseEventOption: (choiceId: string) => void;
  resolveCombatAction: (actionId: CombatActionId) => void;
  consumeInventoryItem: (itemId: string) => void;
  selectYearAction: (actionId: YearActionId) => void;
  setCultivationPlan: (plan: Partial<CultivationPlan>) => void;
  claimOfflineCultivation: () => void;
  practiceLifeSkill: (skillId: LifeSkillId) => void;
  trainTechnique: (techniqueId: string) => void;
  useBreakthroughPreparation: (actionId: string) => void;
  advanceAge: () => void;
  advanceCultivation: () => void;
  runCultivationSession: (rounds: number, source: CultivationSessionSource) => number;
  processEvent: () => void;
  checkRealmAdvancement: () => boolean;
  canBreakthrough: () => boolean;
  getBreakthroughSuccessChance: () => number | null;
  breakthroughRealm: () => void;
  resolveTribulationStrike: (success: boolean) => void;
  saveCurrentGame: () => boolean;
  loadSavedGame: () => boolean;
  hasSavedGame: () => boolean;
  checkGameEnd: () => void;
  endGame: (result: 'died' | 'ascended', reason?: GameState['endReason']) => void;
  resetGame: () => void;
}

const ATTRIBUTE_MAX = 9999;
const STARTING_AGE = 0;
const QI_CONDENSING_AGE = 10;
const SECT_CHOICE_AGE = 15;
const OFFLINE_ROUND_MINUTES = 30;
const OFFLINE_ROUND_CAP = 16;
const BASE_ATTRIBUTE_VALUE = 10;
const initialCombatStats: CombatStats = {
  victories: 0,
  defeats: 0,
  injury: 0,
  bestStreak: 0,
  currentStreak: 0
};
const initialBreakthroughPreparation: BreakthroughPreparationState = {
  elixir: 0,
  artifact: 0,
  talisman: 0,
  array: 0
};
const initialPathResource: PathResourceState = {
  value: 0
};
const initialCultivationPlan: CultivationPlan = {
  rounds: 1,
  stopAtBreakthrough: true
};
const initialSectState: SectState | null = null;
const initialLifeSkillProgress: LifeSkillProgress[] = lifeSkills.map(skill => ({
  skillId: skill.id,
  level: 1,
  exp: 0
}));

const initialState: GameState = {
  status: 'idle',
  characterName: '无名',
  age: STARTING_AGE,
  currentRealm: realms[0],
  attributes: {
    根骨: BASE_ATTRIBUTE_VALUE,
    神识: BASE_ATTRIBUTE_VALUE,
    悟性: BASE_ATTRIBUTE_VALUE,
    气运: BASE_ATTRIBUTE_VALUE,
    颜值: BASE_ATTRIBUTE_VALUE
  },
  familyWealth: BASE_ATTRIBUTE_VALUE,
  combatStats: initialCombatStats,
  inventory: [],
  techniques: [],
  lifeSkills: initialLifeSkillProgress,
  feats: [],
  pendingFeatOptions: [],
  equippedSpellIds: [],
  selectedYearAction: 'adventure',
  cultivationPlan: initialCultivationPlan,
  lastCultivationSession: null,
  offlineCultivation: null,
  rival: null,
  breakthroughPreparation: initialBreakthroughPreparation,
  sect: initialSectState,
  lastSectMissionAge: null,
  spiritRoot: null,
  talent: null,
  cultivationPath: null,
  pathResource: initialPathResource,
  lifespan: 100,
  cultivationProgress: 0,
  pendingEvent: null,
  pendingCombat: null,
  pendingPathChoice: false,
  pendingSectChoice: false,
  pendingTribulation: null,
  activeGoal: null,
  completedGoals: [],
  events: [],
  achievements: []
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initialState,

  startNewGame: (selectedSpiritRoot, selectedTalent, characterName) => {
    const spiritRoot = selectedSpiritRoot ?? get().drawSpiritRoot();
    const talent = selectedTalent ?? get().drawTalent();
    const normalizedCharacterName = normalizeCharacterName(characterName);
    const startingAttributeCap = getAttributeCap(realms[0]);
    const initialAttributes: Attributes = {
      根骨: clampAttribute(BASE_ATTRIBUTE_VALUE + (spiritRoot.effect.根骨 || 0) + (talent.effect.根骨 || 0), startingAttributeCap),
      神识: clampAttribute(BASE_ATTRIBUTE_VALUE + (spiritRoot.effect.神识 || 0) + (talent.effect.神识 || 0), startingAttributeCap),
      悟性: clampAttribute(BASE_ATTRIBUTE_VALUE + (spiritRoot.effect.悟性 || 0) + (talent.effect.悟性 || 0), startingAttributeCap),
      气运: clampAttribute(BASE_ATTRIBUTE_VALUE + (spiritRoot.effect.气运 || 0) + (talent.effect.气运 || 0), startingAttributeCap),
      颜值: clampAttribute(BASE_ATTRIBUTE_VALUE + (spiritRoot.effect.颜值 || 0) + (talent.effect.颜值 || 0), startingAttributeCap)
    };
    const initialFamilyWealth = Math.max(
      0,
      BASE_ATTRIBUTE_VALUE + (spiritRoot.effect.家境 || 0) + (talent.effect.家境 || 0)
    );

    const newGameState: GameState = {
      status: 'playing',
      characterName: normalizedCharacterName,
      age: STARTING_AGE,
      currentRealm: realms[0],
      attributes: initialAttributes,
      familyWealth: initialFamilyWealth,
      combatStats: initialCombatStats,
      inventory: [],
      techniques: [],
      lifeSkills: initialLifeSkillProgress,
      feats: [],
      pendingFeatOptions: [],
      equippedSpellIds: [],
      selectedYearAction: 'adventure',
      cultivationPlan: initialCultivationPlan,
      lastCultivationSession: null,
      offlineCultivation: null,
      rival: null,
      breakthroughPreparation: initialBreakthroughPreparation,
      sect: initialSectState,
      lastSectMissionAge: null,
      spiritRoot,
      talent,
      cultivationPath: null,
      pathResource: initialPathResource,
      lifespan: 100,
      cultivationProgress: 0,
      pendingEvent: null,
      pendingCombat: null,
      pendingPathChoice: false,
      pendingSectChoice: false,
      pendingTribulation: null,
      activeGoal: null,
      completedGoals: [],
      events: [],
      achievements: ['初入仙途']
    };

    set({
      gameState: {
        ...newGameState,
        activeGoal: createActiveLifeGoal(newGameState)
      }
    });

    get().processEvent();
  },

  drawSpiritRoot: () => {
    return pickByProbability(spiritRoots);
  },

  drawTalent: () => {
    return pickByProbability(talents);
  },

  drawTalentOptions: (count = 3) => {
    return pickManyByProbability(talents, count);
  },

  chooseCultivationPath: (pathId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || !gameState.pendingPathChoice) return;

    const path = getCultivationPath(pathId);
    if (!path) return;

    const baseTechnique = getBaseTechnique(path.id);
    const techniqueRewards = baseTechnique ? [baseTechnique.id] : [];
    const pathEvent: GameEvent = {
      id: `cultivation-path-${path.id}-${gameState.age}`,
      age: gameState.age,
      type: 'cultivation',
      title: `流派初定：${path.name}`,
      description: `引气入体之后，你立下${path.name}之路。${path.description}${baseTechnique ? `师长授你《${baseTechnique.name}》，作为最初修炼根本。` : ''}`,
      weight: 0,
      effects: path.effect,
      appliedEffects: path.effect,
      ...(techniqueRewards.length > 0 ? { techniqueRewards } : {}),
      pathResourceChange: {
        name: getPathResourceName(path.id),
        value: 12
      },
      result: 'neutral'
    };
    const stateAfterPath: GameState = {
      ...gameState,
      cultivationPath: path.id,
      pathResource: addPathResource(gameState, 12).pathResource,
      pendingPathChoice: false,
      equippedSpellIds: getDefaultEquippedSpells(path.id, gameState.currentRealm.level),
      techniques: addLearnedTechniques(gameState.techniques, techniqueRewards),
      attributes: applyAttributeEffects(gameState, path.effect),
      familyWealth: applyFamilyWealthEffects(gameState, path.effect),
      events: [...gameState.events, pathEvent]
    };

    set({
      gameState: unlockAchievements(applyLifeGoalProgress(stateAfterPath, pathEvent))
    });
  },

  chooseCultivationSect: (sectId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || !gameState.pendingSectChoice) return;

    const sect = getCultivationSect(sectId);
    if (!sect) return;

    const sectState: SectState = {
      sectId: sect.id,
      rank: sect.id === 'loose' ? '散修' : '外门弟子',
      contribution: sect.contributionGain,
      reputation: sect.reputationGain
    };
    const sectEvent: GameEvent = {
      id: `sect-choice-${sect.id}-${gameState.age}`,
      age: gameState.age,
      type: sect.id === 'loose' ? 'encounter' : 'sect',
      title: sect.id === 'loose' ? '散修入世' : `拜入${sect.name}`,
      description: sect.id === 'loose'
        ? `十五岁这一年，你没有拜入山门，而是以散修身份行走世间。${sect.description}`
        : `十五岁这一年，你正式拜入${sect.name}。${sect.description}`,
      weight: 0,
      effects: sect.effect,
      appliedEffects: sect.effect,
      result: 'neutral'
    };
    const stateAfterSect: GameState = {
      ...gameState,
      sect: sectState,
      pendingSectChoice: false,
      attributes: applyAttributeEffects(gameState, sect.effect),
      familyWealth: applyFamilyWealthEffects(gameState, sect.effect),
      events: [...gameState.events, sectEvent]
    };

    set({
      gameState: unlockAchievements(applyLifeGoalProgress(stateAfterSect, sectEvent))
    });
  },

  chooseFeat: (featId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || !gameState.pendingFeatOptions.includes(featId)) return;

    const feat = getFeat(featId);
    if (!feat) return;

    const featEvent: GameEvent = {
      id: `feat-${feat.id}-${Date.now()}`,
      age: gameState.age,
      type: 'mind',
      title: `专长领悟：${feat.name}`,
      description: `破境余韵尚未散去，你将此世所学收束成「${feat.name}」。${feat.description}`,
      weight: 0,
      effects: {},
      appliedEffects: {},
      result: 'neutral'
    };

    set({
      gameState: {
        ...gameState,
        feats: Array.from(new Set([...gameState.feats, feat.id])),
        pendingFeatOptions: [],
        events: [...gameState.events, featEvent]
      }
    });
  },

  runSectMission: (missionId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState)) return;

    const mission = getSectMission(missionId);
    if (!mission || !isSectMissionAvailable(gameState, mission)) return;

    const sect = gameState.sect ? getCultivationSect(gameState.sect.sectId) : undefined;
    const event: GameEvent = {
      id: `sect-mission-${mission.id}-${Date.now()}`,
      sectMissionId: mission.id,
      age: gameState.age,
      type: mission.eventType,
      title: mission.looseOnly ? `散修机缘：${mission.name}` : `${sect?.name ?? '宗门'}任务：${mission.name}`,
      description: mission.description,
      weight: 0,
      effects: mission.effects,
      ...(mission.itemRewards ? { itemRewards: mission.itemRewards } : {}),
      result: 'neutral'
    };
    const finalState = resolveGameEvent({
      ...gameState,
      lastSectMissionAge: gameState.age
    }, event);

    set({ gameState: unlockAchievements(finalState) });
    get().checkGameEnd();
  },

  exchangeSectReward: (exchangeId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState)) return;

    const exchange = getSectExchange(exchangeId);
    if (!exchange || !isSectExchangeAvailable(gameState, exchange)) return;

    const techniqueRewards = exchange.techniqueRewardGrade
      ? generateSectExchangeTechniqueRewards(gameState, exchange.techniqueRewardGrade)
      : [];
    const itemRewards = exchange.itemRewards ?? [];
    const effects = exchange.effects ?? {};
    const progressDelta = calculateCultivationProgressDelta(gameState, {
      id: `sect-exchange-${exchange.id}`,
      age: gameState.age,
      type: gameState.sect?.sectId === 'loose' ? 'resource' : 'sect',
      title: exchange.name,
      description: exchange.description,
      effects,
      result: 'neutral'
    }, effects);
    const lifespanDelta = calculateLifespanDelta(gameState, {
      id: `sect-exchange-${exchange.id}`,
      age: gameState.age,
      type: gameState.sect?.sectId === 'loose' ? 'resource' : 'sect',
      title: exchange.name,
      description: exchange.description,
      effects,
      result: 'neutral'
    }, effects);
    const exchangeEvent: GameEvent = {
      id: `sect-exchange-${exchange.id}-${Date.now()}`,
      age: gameState.age,
      type: gameState.sect?.sectId === 'loose' ? 'resource' : 'sect',
      title: exchange.name,
      description: exchange.description,
      effects,
      appliedEffects: buildAppliedEffects(effects, progressDelta, lifespanDelta),
      ...(itemRewards.length > 0 ? { itemRewards } : {}),
      ...(techniqueRewards.length > 0 ? { techniqueRewards } : {}),
      result: 'neutral'
    };
    const requiredProgress = getRequiredCultivationProgress(gameState);
    const stateAfterExchange: GameState = {
      ...gameState,
      sect: spendSectContribution(gameState.sect, exchange.cost),
      attributes: applyAttributeEffects(gameState, effects),
      familyWealth: applyFamilyWealthEffects(gameState, effects),
      lifespan: lifespanDelta ? Math.max(1, gameState.lifespan + lifespanDelta) : gameState.lifespan,
      cultivationProgress: clampProgress(gameState.cultivationProgress + progressDelta, requiredProgress),
      breakthroughPreparation: exchange.preparation
        ? addSectBreakthroughPreparation(gameState.breakthroughPreparation, exchange.preparation)
        : gameState.breakthroughPreparation,
      inventory: addInventoryRewards(gameState.inventory, itemRewards),
      techniques: addLearnedTechniques(gameState.techniques, techniqueRewards),
      events: [...gameState.events, exchangeEvent]
    };

    set({
      gameState: unlockAchievements(applyLifeGoalProgress(stateAfterExchange, exchangeEvent))
    });
    get().checkGameEnd();
  },

  equipSpell: (spellId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState) || !gameState.cultivationPath) return;

    const availableIds = getAvailableSpellIds(gameState);
    if (!availableIds.includes(spellId)) return;

    const alreadyEquipped = gameState.equippedSpellIds.includes(spellId);
    const equippedSpellIds = alreadyEquipped
      ? gameState.equippedSpellIds.filter(id => id !== spellId)
      : [...gameState.equippedSpellIds, spellId].slice(-3);

    set({
      gameState: {
        ...gameState,
        equippedSpellIds
      }
    });
  },

  getCurrentEventChoices: () => {
    const { gameState } = get();
    if (!gameState.pendingEvent) return [];

    return getEventChoices(gameState.pendingEvent);
  },

  chooseEventOption: (choiceId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || gameState.pendingCombat || !gameState.pendingEvent) return;

    const event = gameState.pendingEvent;
    const eventChoices = getEventChoices(event);
    const choice = eventChoices.find(item => item.id === choiceId) ?? eventChoices[1];

    set({
      gameState: resolveGameEvent(gameState, event, choice)
    });

    get().checkGameEnd();
  },

  resolveCombatAction: (actionId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || !gameState.pendingCombat) return;

    const resolvedState = resolveTurnCombatAction(gameState, actionId);
    set({ gameState: resolvedState });
    get().checkGameEnd();
  },

  consumeInventoryItem: (itemId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState)) return;

    const item = getItem(itemId);
    const inventoryEntry = gameState.inventory.find(entry => entry.itemId === itemId);
    if (!item || !item.usable || !item.effects || !inventoryEntry || inventoryEntry.quantity <= 0) return;

    const progressDelta = calculateCultivationProgressDelta(gameState, {
      id: `use-item-${item.id}`,
      age: gameState.age,
      type: 'resource',
      title: `使用${item.name}`,
      description: item.description,
      effects: item.effects,
      result: 'neutral'
    }, item.effects);
    const lifespanDelta = calculateLifespanDelta(gameState, {
      id: `use-item-${item.id}`,
      age: gameState.age,
      type: 'resource',
      title: `使用${item.name}`,
      description: item.description,
      effects: item.effects,
      result: 'neutral'
    }, item.effects);
    const itemEvent: GameEvent = {
      id: `use-item-${item.id}-${Date.now()}`,
      age: gameState.age,
      type: 'resource',
      title: `使用${item.name}`,
      description: `你从储物戒中取出${item.name}，${item.description}`,
      effects: item.effects,
      appliedEffects: buildAppliedEffects(item.effects, progressDelta, lifespanDelta),
      result: 'neutral'
    };
    const pathResourceDelta = getPathResourceDelta(gameState, itemEvent, 'neutral');
    const stateAfterPathResource = addPathResource(gameState, pathResourceDelta);
    const pathResourceChange = getPathResourceChange(gameState, stateAfterPathResource, pathResourceDelta);
    const resolvedItemEvent = {
      ...itemEvent,
      ...(pathResourceChange ? { pathResourceChange } : {})
    };
    const stateAfterUse: GameState = {
      ...gameState,
      pathResource: stateAfterPathResource.pathResource,
      attributes: applyAttributeEffects(gameState, item.effects),
      familyWealth: applyFamilyWealthEffects(gameState, item.effects),
      lifespan: lifespanDelta ? Math.max(1, gameState.lifespan + lifespanDelta) : gameState.lifespan,
      cultivationProgress: clampProgress(
        gameState.cultivationProgress + progressDelta,
        getRequiredCultivationProgress(gameState)
      ),
      inventory: removeInventoryItem(gameState.inventory, itemId, 1),
      events: [...gameState.events, resolvedItemEvent]
    };

    set({
      gameState: unlockAchievements(applyLifeGoalProgress(stateAfterUse, resolvedItemEvent))
    });

    get().checkGameEnd();
  },

  selectYearAction: (actionId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing') return;

    set({
      gameState: {
        ...gameState,
        selectedYearAction: actionId
      }
    });
  },

  setCultivationPlan: (plan) => {
    const { gameState } = get();
    if (gameState.status !== 'playing') return;

    set({
      gameState: {
        ...gameState,
        cultivationPlan: {
          rounds: normalizeCultivationRounds(plan.rounds ?? gameState.cultivationPlan.rounds),
          stopAtBreakthrough: plan.stopAtBreakthrough ?? gameState.cultivationPlan.stopAtBreakthrough
        }
      }
    });
  },

  claimOfflineCultivation: () => {
    const startingState = get().gameState;
    const offlineCultivation = startingState.offlineCultivation;
    if (!offlineCultivation || startingState.status !== 'playing' || hasPendingPlayerAction(startingState)) return;

    const completedRounds = get().runCultivationSession(offlineCultivation.remainingRounds, 'offline');
    const finalState = get().gameState;
    const remainingRounds = finalState.status === 'playing'
      ? Math.max(0, offlineCultivation.remainingRounds - completedRounds)
      : 0;

    set({
      gameState: {
        ...finalState,
        offlineCultivation: remainingRounds > 0 ? { remainingRounds } : null
      }
    });
  },

  practiceLifeSkill: (skillId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState)) return;

    const skill = getLifeSkill(skillId);
    if (!skill || gameState.currentRealm.level < skill.minRealmLevel) return;
    if (gameState.familyWealth < skill.familyWealthCost) return;
    if (gameState.age >= gameState.lifespan - skill.timeCost) return;

    const skillProgress = getLifeSkillProgress(gameState, skill.id);
    const recipe = selectLifeSkillRecipe(skill.recipes, skillProgress.level, gameState.currentRealm.level, gameState.inventory);
    const skillEffects = recipe ? mergeEffects(skill.effects, recipe.effects) : skill.effects;
    const itemCosts = recipe?.costs ?? [];
    const recipeRewards = recipe?.rewards ?? [];
    const stateAfterCost: GameState = {
      ...gameState,
      age: gameState.age + skill.timeCost,
      familyWealth: Math.max(0, gameState.familyWealth - skill.familyWealthCost),
      inventory: removeInventoryRewards(gameState.inventory, itemCosts)
    };
    const itemRewards = recipe
      ? recipeRewards
      : generateLifeSkillItemRewards(skill.id, gameState.currentRealm.level);
    const progressDelta = calculateCultivationProgressDelta(stateAfterCost, {
      id: `life-skill-${skill.id}`,
      age: stateAfterCost.age,
      type: skill.eventType,
      title: skill.name,
      description: skill.description,
      effects: skillEffects,
      result: 'neutral'
    }, skillEffects);
    const lifespanDelta = calculateLifespanDelta(stateAfterCost, {
      id: `life-skill-${skill.id}`,
      age: stateAfterCost.age,
      type: skill.eventType,
      title: skill.name,
      description: skill.description,
      effects: skillEffects,
      result: 'neutral'
    }, skillEffects);
    const familyWealthDelta = (skillEffects.家境 ?? 0) - skill.familyWealthCost;
    const expGain = Math.round((recipe?.exp ?? skill.expGain) * getPathLifeSkillExpMultiplier(gameState, skill.id));
    const appliedEffects = buildAppliedEffects(
      {
        ...skillEffects,
        修为: skillEffects.修为 ?? getDefaultProgressPercent(skill.eventType),
        ...(familyWealthDelta !== 0 ? { 家境: familyWealthDelta } : {}),
        时间: skill.timeCost
      },
      progressDelta,
      lifespanDelta
    );
    const skillEvent: GameEvent = {
      id: `life-skill-${skill.id}-${Date.now()}`,
      age: stateAfterCost.age,
      type: skill.eventType,
      title: skill.name,
      description: `${skill.description}你花费 ${skill.timeCost} 年钻研${skill.name}，${recipe ? `完成「${recipe.name}」` : formatLifeSkillResult(skill.id, itemRewards.length > 0)}，熟练度 +${expGain}。`,
      effects: skillEffects,
      appliedEffects,
      ...(itemRewards.length > 0 ? { itemRewards } : {}),
      result: 'neutral'
    };
    const pathResourceDelta = getPathResourceDelta(stateAfterCost, skillEvent, 'neutral');
    const stateAfterPathResource = addPathResource(stateAfterCost, pathResourceDelta);
    const pathResourceChange = getPathResourceChange(stateAfterCost, stateAfterPathResource, pathResourceDelta);
    const resolvedSkillEvent: GameEvent = {
      ...skillEvent,
      ...(pathResourceChange ? { pathResourceChange } : {})
    };
    const requiredProgress = getRequiredCultivationProgress(stateAfterCost);
    const stateAfterSkill: GameState = {
      ...stateAfterCost,
      pathResource: stateAfterPathResource.pathResource,
      attributes: applyAttributeEffects(stateAfterCost, skillEffects),
      familyWealth: applyFamilyWealthEffects(stateAfterCost, skillEffects),
      lifespan: lifespanDelta ? Math.max(1, stateAfterCost.lifespan + lifespanDelta) : stateAfterCost.lifespan,
      cultivationProgress: clampProgress(stateAfterCost.cultivationProgress + progressDelta, requiredProgress),
      inventory: addInventoryRewards(stateAfterCost.inventory, itemRewards),
      lifeSkills: addLifeSkillExp(stateAfterCost.lifeSkills, skill.id, expGain),
      events: [...stateAfterCost.events, resolvedSkillEvent]
    };

    set({
      gameState: unlockAchievements(applyLifeGoalProgress(stateAfterSkill, resolvedSkillEvent))
    });

    get().checkGameEnd();
  },

  trainTechnique: (techniqueId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState)) return;

    const learnedTechnique = gameState.techniques.find(technique => technique.techniqueId === techniqueId);
    const technique = getTechnique(techniqueId);
    if (!learnedTechnique || !technique || learnedTechnique.level >= technique.maxLevel) return;
    if (gameState.currentRealm.level < technique.minRealmLevel) return;

    const cost = getTechniqueTrainingCost(gameState, technique);
    if (gameState.cultivationProgress < cost.progressCost) return;
    if (gameState.age >= gameState.lifespan - cost.timeCost) return;

    const effect = technique.effectsPerLevel;
    const nextLevel = learnedTechnique.level + 1;
    const techniqueEvent: GameEvent = {
      id: `technique-training-${technique.id}-${Date.now()}`,
      age: gameState.age,
      type: 'cultivation',
      title: `修炼${technique.name}`,
      description: `你闭关参悟《${technique.name}》，以修为与时间换取功法精进，功法提升至第 ${nextLevel} 层。`,
      effects: {
        ...effect,
        修为: -technique.trainCost.修为
      },
      appliedEffects: {
        ...effect,
        修为: -cost.progressCost,
        时间: cost.timeCost
      },
      result: 'neutral'
    };
    const pathResourceDelta = getPathResourceDelta(gameState, techniqueEvent, 'neutral');
    const stateAfterPathResource = addPathResource(gameState, pathResourceDelta);
    const pathResourceChange = getPathResourceChange(gameState, stateAfterPathResource, pathResourceDelta);
    const resolvedTechniqueEvent = {
      ...techniqueEvent,
      ...(pathResourceChange ? { pathResourceChange } : {})
    };
    const stateAfterTraining: GameState = {
      ...gameState,
      pathResource: stateAfterPathResource.pathResource,
      age: gameState.age + cost.timeCost,
      attributes: applyAttributeEffects(gameState, effect),
      cultivationProgress: Math.max(0, gameState.cultivationProgress - cost.progressCost),
      techniques: gameState.techniques.map(techniqueState => techniqueState.techniqueId === technique.id
        ? { ...techniqueState, level: nextLevel }
        : techniqueState
      ),
      events: [...gameState.events, resolvedTechniqueEvent]
    };

    set({
      gameState: unlockAchievements(applyLifeGoalProgress(stateAfterTraining, resolvedTechniqueEvent))
    });

    get().checkGameEnd();
  },

  useBreakthroughPreparation: (actionId) => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState)) return;

    const action = getPreparationAction(actionId, gameState.currentRealm.level);
    if (!action) return;

    const itemCost = getPreparationItemCost(action.id, gameState.inventory);
    const usesItem = !!itemCost && hasInventoryRewards(gameState.inventory, [itemCost]);
    if (!usesItem && gameState.familyWealth < action.cost) return;

    const requiredProgress = getRequiredCultivationProgress(gameState);
    const effects = action.effects(gameState);
    const stateAfterCost: GameState = {
      ...gameState,
      familyWealth: usesItem ? gameState.familyWealth : Math.max(0, gameState.familyWealth - action.cost),
      inventory: usesItem ? removeInventoryRewards(gameState.inventory, [itemCost]) : gameState.inventory,
      breakthroughPreparation: addBreakthroughPreparation(gameState.breakthroughPreparation, action.id)
    };
    const newAttributes = applyAttributeEffects(stateAfterCost, effects);
    const newFamilyWealth = applyFamilyWealthEffects(stateAfterCost, effects);
    const progressDelta = calculateCultivationProgressDelta(gameState, {
      id: action.id,
      age: gameState.age,
      type: 'daily',
      title: action.name,
      description: action.description,
      effects,
      result: 'neutral'
    }, effects);
    const lifespanDelta = calculateLifespanDelta(gameState, {
      id: action.id,
      age: gameState.age,
      type: 'daily',
      title: action.name,
      description: action.description,
      effects,
      result: 'neutral'
    }, effects);
    const preparationEvent: GameEvent = {
      id: `preparation-${action.id}-${Date.now()}`,
      age: gameState.age,
      type: 'daily',
      title: action.name,
      description: `${action.description}${usesItem ? '你从储物戒中取出一件相合之物作为准备。' : '你以家境与人情补齐所需。'}`,
      effects,
      appliedEffects: buildAppliedEffects(
        {
          ...effects,
          ...(!usesItem && action.cost ? { 家境: -action.cost } : {})
        },
        progressDelta,
        lifespanDelta
      ),
      result: 'neutral'
    };
    const pathResourceDelta = getPathResourceDelta(stateAfterCost, preparationEvent, 'neutral');
    const stateAfterPathResource = addPathResource(stateAfterCost, pathResourceDelta);
    const pathResourceChange = getPathResourceChange(stateAfterCost, stateAfterPathResource, pathResourceDelta);
    const resolvedPreparationEvent: GameEvent = {
      ...preparationEvent,
      ...(pathResourceChange ? { pathResourceChange } : {})
    };

    const stateAfterPreparation: GameState = {
      ...stateAfterCost,
      pathResource: stateAfterPathResource.pathResource,
      attributes: newAttributes,
      familyWealth: newFamilyWealth,
      lifespan: lifespanDelta ? Math.max(1, gameState.lifespan + lifespanDelta) : gameState.lifespan,
      cultivationProgress: clampProgress(gameState.cultivationProgress + progressDelta, requiredProgress),
      events: [...gameState.events, resolvedPreparationEvent]
    };

    set({
      gameState: unlockAchievements(applyLifeGoalProgress(stateAfterPreparation, resolvedPreparationEvent))
    });

    get().checkGameEnd();
  },

  advanceAge: () => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState)) return;

    const newAge = gameState.age + getCultivationYearStep(gameState.currentRealm.level);
    const agedState: GameState = {
      ...gameState,
      age: newAge,
      combatStats: recoverCombatInjury(gameState.combatStats, gameState.currentRealm.level)
    };

    if (newAge >= gameState.lifespan) {
      set({ gameState: agedState });
      get().endGame('died', 'lifespan');
      return;
    }

    if (gameState.currentRealm.name === '幼年期' && newAge >= QI_CONDENSING_AGE) {
      set({ gameState: enterQiCondensingRealm(agedState) });
      return;
    }

    if (shouldOfferSectChoice(agedState)) {
      set({ gameState: enterSectChoice(agedState) });
      return;
    }

    set({ gameState: agedState });

    get().processEvent();
  },

  advanceCultivation: () => {
    const startingState = get().gameState;
    if (startingState.status !== 'playing' || hasPendingPlayerAction(startingState)) return;

    get().runCultivationSession(startingState.cultivationPlan.rounds, 'manual');
  },

  runCultivationSession: (requestedRounds, source) => {
    const startingState = get().gameState;
    if (startingState.status !== 'playing' || hasPendingPlayerAction(startingState)) return 0;

    const rounds = Math.max(1, Math.min(
      OFFLINE_ROUND_CAP,
      normalizeNonNegativeInteger(requestedRounds, 1)
    ));
    const { stopAtBreakthrough } = startingState.cultivationPlan;
    let completedRounds = 0;

    while (completedRounds < rounds) {
      const beforeRound = get().gameState;
      if (stopAtBreakthrough && canBreakthrough(beforeRound)) break;

      get().advanceAge();
      const afterRound = get().gameState;
      if (afterRound.age <= beforeRound.age) break;

      completedRounds += 1;
      if (getCultivationSessionStopReason(afterRound, stopAtBreakthrough) !== 'completed') break;
    }

    const finalState = get().gameState;
    set({
      gameState: {
        ...finalState,
        lastCultivationSession: createCultivationSessionSummary(
          startingState,
          finalState,
          rounds,
          completedRounds,
          stopAtBreakthrough,
          source
        )
      }
    });
    return completedRounds;
  },

  processEvent: () => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || hasPendingPlayerAction(gameState)) return;
    const actionEvent = createYearActionEvent(gameState);
    const event = {
      ...(actionEvent ?? selectAvailableEvent(gameState)),
      age: gameState.age
    };

    if (!shouldOfferEventChoice(gameState, event)) {
      set({
        gameState: resolveGameEvent(gameState, event)
      });

      get().checkGameEnd();
      return;
    }

    set({
      gameState: {
        ...gameState,
        pendingEvent: event
      }
    });
  },

  checkRealmAdvancement: () => {
    const { gameState } = get();
    return canAdvanceRealm(gameState);
  },

  canBreakthrough: () => {
    const { gameState } = get();
    return canBreakthrough(gameState);
  },

  getBreakthroughSuccessChance: () => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || isChildhood(gameState)) return null;

    const currentIndex = realms.findIndex(r => r.name === gameState.currentRealm.name);
    const nextRealm = realms[currentIndex + 1];
    if (!nextRealm) return null;

    return calculateBreakthroughSuccessRate(gameState, nextRealm);
  },

  breakthroughRealm: () => {
    const { gameState } = get();
    if (gameState.status !== 'playing' || gameState.pendingPathChoice || gameState.pendingSectChoice || gameState.pendingCombat || gameState.pendingTribulation || gameState.pendingFeatOptions.length > 0 || !canBreakthrough(gameState)) return;

    const currentIndex = realms.findIndex(r => r.name === gameState.currentRealm.name);
    const nextRealm = realms[currentIndex + 1];
    const breakthroughDeficit = calculateBreakthroughAverageDeficit(gameState, nextRealm);
    const breakthroughSuccessRate = calculateBreakthroughSuccessRate(gameState, nextRealm);

    if (Math.random() > breakthroughSuccessRate) {
      const failureEvent: GameEvent = {
        id: `breakthrough-failed-${Date.now()}`,
        age: gameState.age,
        type: 'disaster',
        title: '冲关失利',
        description: '你强行冲击瓶颈，灵机却在关口前散乱反噬，寿元与修为都折损了不少。',
        effects: {
          修为: -getBreakthroughFailureProgressPercent(gameState, breakthroughDeficit),
          寿命: -getBreakthroughFailureLifespanPercent(gameState, breakthroughDeficit)
        },
        result: 'great-failure'
      };
      const lifespanDelta = calculateLifespanDelta(gameState, failureEvent, failureEvent.effects);
      const progressDelta = calculateCultivationProgressDelta(gameState, failureEvent, failureEvent.effects);
      const stateAfterFailure: GameState = {
        ...gameState,
        breakthroughPreparation: initialBreakthroughPreparation,
        lifespan: lifespanDelta ? Math.max(1, gameState.lifespan + lifespanDelta) : gameState.lifespan,
        cultivationProgress: clampProgress(
          gameState.cultivationProgress + progressDelta,
          getRequiredCultivationProgress(gameState)
        ),
        events: [
          ...gameState.events,
          {
            ...failureEvent,
            appliedEffects: buildAppliedEffects(failureEvent.effects, progressDelta, lifespanDelta)
          }
        ]
      };

      set({
        gameState: unlockAchievements(applyLifeGoalProgress(stateAfterFailure, failureEvent))
      });

      get().checkGameEnd();
      return;
    }

    if (requiresTribulation(nextRealm)) {
      set({
        gameState: {
          ...gameState,
          pendingTribulation: createTribulationState(nextRealm)
        }
      });
      return;
    }

    set({
      gameState: completeBreakthrough(gameState, nextRealm, currentIndex)
    });

    get().checkGameEnd();
  },

  resolveTribulationStrike: (success) => {
    const { gameState } = get();
    const tribulation = gameState.pendingTribulation;
    if (gameState.status !== 'playing' || !tribulation) return;

    const focusedSuccess = success || (!success && Math.random() < getTribulationFocusChance(gameState));
    const resolvedTribulation: TribulationState = {
      ...tribulation,
      strikesResolved: tribulation.strikesResolved + 1,
      successes: tribulation.successes + (focusedSuccess ? 1 : 0),
      failures: tribulation.failures + (focusedSuccess ? 0 : 1)
    };

    if (resolvedTribulation.strikesResolved < resolvedTribulation.strikesRequired) {
      set({
        gameState: {
          ...gameState,
          pendingTribulation: resolvedTribulation
        }
      });
      return;
    }

    const currentIndex = realms.findIndex(r => r.name === gameState.currentRealm.name);
    const nextRealm = realms[currentIndex + 1];
    if (!nextRealm || nextRealm.name !== resolvedTribulation.targetRealmName) {
      set({
        gameState: {
          ...gameState,
          pendingTribulation: null
        }
      });
      return;
    }

    const passed = resolvedTribulation.successes >= getTribulationSuccessThreshold(resolvedTribulation.strikesRequired);
    const resolvedState = passed
      ? completeTribulationSuccess(gameState, nextRealm, currentIndex, resolvedTribulation)
      : completeTribulationFailure(gameState, resolvedTribulation);

    set({ gameState: resolvedState });
    get().checkGameEnd();
  },

  checkGameEnd: () => {
    const { gameState } = get();

    if (gameState.age >= gameState.lifespan) {
      get().endGame('died', 'lifespan');
      return;
    }

    if (canAscend(gameState)) {
      get().endGame('ascended', 'ascended');
    }
  },

  endGame: (result, reason) => {
    const { gameState } = get();
    if (gameState.status === 'ended') return;
    const endReason = reason ?? (result === 'ascended' ? 'ascended' : 'lifespan');

    set({
      gameState: {
        ...gameState,
        status: 'ended',
        pendingEvent: null,
        pendingCombat: null,
        pendingSectChoice: false,
        pendingTribulation: null,
        endReason
      }
    });
    clearSavedGame();

    saveGameRecord({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      characterName: gameState.characterName,
      finalRealm: gameState.currentRealm.name,
      age: gameState.age,
      spiritRoot: gameState.spiritRoot?.name || '',
      talent: gameState.talent?.name || '',
      result,
      stats: gameState.attributes,
      familyWealth: gameState.familyWealth,
      achievements: gameState.achievements
    });
  },

  resetGame: () => {
    set({ gameState: initialState });
  },

  saveCurrentGame: () => {
    const { gameState } = get();
    if (gameState.status !== 'playing') return false;

    return saveGameState(gameState);
  },

  loadSavedGame: () => {
    const saveSlot = getSavedGame();
    if (!saveSlot) return false;

    const loadedState = normalizeLoadedGameState(saveSlot.gameState);

    set({
      gameState: {
        ...loadedState,
        offlineCultivation: accrueOfflineCultivation(
          loadedState.offlineCultivation,
          saveSlot.savedAt
        )
      }
    });
    return true;
  },

  hasSavedGame: () => {
    return hasSavedGame();
  }
}));

function completeBreakthrough(
  gameState: GameState,
  nextRealm: GameState['currentRealm'],
  currentIndex: number
): GameState {
  const lifespanGain = getRealmLifespanGain(currentIndex);
  const stateAfterPathResource = reducePathResource(gameState, 35);
  const pathResourceChange = getPathResourceChange(gameState, stateAfterPathResource, -35);
  const breakthroughEvent: GameEvent = {
    id: `breakthrough-${Date.now()}`,
    age: gameState.age,
    type: 'cultivation',
    title: '突破瓶颈',
    description: `灵机圆满，瓶颈破开，你踏入了${nextRealm.name}。`,
    effects: { 境界: 'advance', 寿命: lifespanGain },
    appliedEffects: { 境界: 'advance', 寿命: lifespanGain },
    ...(pathResourceChange ? { pathResourceChange } : {}),
    result: 'neutral'
  };

  const stateAfterBreakthrough: GameState = {
    ...gameState,
    pathResource: stateAfterPathResource.pathResource,
    currentRealm: nextRealm,
    lifespan: addLifespan(gameState.lifespan, lifespanGain),
    cultivationProgress: 0,
    pendingTribulation: null,
    equippedSpellIds: gameState.cultivationPath ? getDefaultEquippedSpells(gameState.cultivationPath, nextRealm.level) : [],
    breakthroughPreparation: initialBreakthroughPreparation,
    events: [...gameState.events, breakthroughEvent]
  };

  return offerFeatOptions(unlockAchievements(applyLifeGoalProgress(stateAfterBreakthrough, breakthroughEvent)));
}

function requiresTribulation(nextRealm: GameState['currentRealm']): boolean {
  return nextRealm.level >= 5 && nextRealm.level <= 9;
}

function createTribulationState(nextRealm: GameState['currentRealm']): TribulationState {
  return {
    targetRealmName: nextRealm.name,
    targetRealmLevel: nextRealm.level,
    strikesRequired: getTribulationStrikeCount(nextRealm.level),
    strikesResolved: 0,
    successes: 0,
    failures: 0
  };
}

function getTribulationStrikeCount(targetRealmLevel: number): number {
  switch (targetRealmLevel) {
    case 5:
      return 1;
    case 6:
      return 3;
    case 7:
      return 5;
    case 8:
      return 7;
    case 9:
      return 9;
    default:
      return 0;
  }
}

function getTribulationSuccessThreshold(strikesRequired: number): number {
  return Math.ceil(strikesRequired * 0.6);
}

function getTribulationFocusChance(gameState: GameState): number {
  const focus = gameState.equippedSpellIds.reduce((sum, spellId) => sum + (getSpell(spellId)?.bonuses.tribulationFocus ?? 0), 0);
  if (focus <= 0) return 0;

  return Math.min(0.18, focus * 0.06);
}

function completeTribulationSuccess(
  gameState: GameState,
  nextRealm: GameState['currentRealm'],
  currentIndex: number,
  tribulation: TribulationState
): GameState {
  const lifespanGain = getRealmLifespanGain(currentIndex);
  const stateAfterPathResource = reducePathResource(gameState, 35);
  const pathResourceChange = getPathResourceChange(gameState, stateAfterPathResource, -35);
  const rootGain = getTribulationRootGain(tribulation);
  const progressPercent = getTribulationProgressBonusPercent(tribulation);
  const stateAtNewRealm: GameState = {
    ...gameState,
    pathResource: stateAfterPathResource.pathResource,
    currentRealm: nextRealm,
    lifespan: addLifespan(gameState.lifespan, lifespanGain),
    cultivationProgress: 0,
    pendingTribulation: null,
    equippedSpellIds: gameState.cultivationPath ? getDefaultEquippedSpells(gameState.cultivationPath, nextRealm.level) : [],
    breakthroughPreparation: initialBreakthroughPreparation
  };
  const requiredProgress = getRequiredCultivationProgress(stateAtNewRealm);
  const progressGain = Math.trunc(requiredProgress * progressPercent / 100);
  const effects: GameEvent['effects'] = {
    境界: 'advance',
    寿命: lifespanGain,
    根骨: rootGain,
    修为: progressPercent
  };
  const newAttributes = applyAttributeEffects(stateAtNewRealm, effects);
  const appliedEffects: GameEvent['effects'] = {
    境界: 'advance',
    寿命: lifespanGain,
    根骨: newAttributes.根骨 - gameState.attributes.根骨,
    ...(progressGain > 0 ? { 修为: progressGain } : {})
  };
  const tribulationEvent: GameEvent = {
    id: `tribulation-success-${Date.now()}`,
    age: gameState.age,
    type: 'cultivation',
    title: `渡劫功成：${nextRealm.name}`,
    description: `瓶颈破开后，天雷接踵而至。你接下 ${tribulation.successes}/${tribulation.strikesRequired} 道关键雷劫，雷意反炼筋骨，终成${nextRealm.name}。`,
    effects,
    appliedEffects,
    ...(pathResourceChange ? { pathResourceChange } : {}),
    result: 'great-success'
  };
  const stateAfterTribulation: GameState = {
    ...stateAtNewRealm,
    attributes: newAttributes,
    cultivationProgress: clampProgress(progressGain, requiredProgress),
    events: [...gameState.events, tribulationEvent]
  };

  return offerFeatOptions(unlockAchievements(applyLifeGoalProgress(stateAfterTribulation, tribulationEvent)));
}

function completeTribulationFailure(
  gameState: GameState,
  tribulation: TribulationState
): GameState {
  const stateAfterPathResource = reducePathResource(gameState, 20);
  const pathResourceChange = getPathResourceChange(gameState, stateAfterPathResource, -20);
  const rootLoss = getTribulationRootLoss(tribulation);
  const lifespanLossPercent = getTribulationLifespanLossPercent(tribulation);
  const effects: GameEvent['effects'] = {
    根骨: -rootLoss,
    寿命: -lifespanLossPercent
  };
  const tribulationEvent: GameEvent = {
    id: `tribulation-failed-${Date.now()}`,
    age: gameState.age,
    type: 'disaster',
    title: '渡劫失利',
    description: `瓶颈虽破，雷劫却来得更凶。你只稳住 ${tribulation.successes}/${tribulation.strikesRequired} 道关键雷劫，劫雷反噬，升境功败垂成。`,
    effects,
    result: 'great-failure'
  };
  const lifespanDelta = calculateLifespanDelta(gameState, tribulationEvent, effects);
  const newAttributes = applyAttributeEffects(gameState, effects);
  const resolvedEvent: GameEvent = {
    ...tribulationEvent,
    ...(pathResourceChange ? { pathResourceChange } : {}),
    appliedEffects: {
      根骨: newAttributes.根骨 - gameState.attributes.根骨,
      寿命: lifespanDelta
    }
  };
  const stateAfterTribulation: GameState = {
    ...gameState,
    pathResource: stateAfterPathResource.pathResource,
    pendingTribulation: null,
    breakthroughPreparation: initialBreakthroughPreparation,
    attributes: newAttributes,
    lifespan: lifespanDelta ? Math.max(1, gameState.lifespan + lifespanDelta) : gameState.lifespan,
    events: [...gameState.events, resolvedEvent]
  };

  return unlockAchievements(applyLifeGoalProgress(stateAfterTribulation, resolvedEvent));
}

function getTribulationRootGain(tribulation: TribulationState): number {
  return Math.max(2, Math.round(tribulation.strikesRequired * 1.2 + tribulation.successes * 0.8));
}

function getTribulationProgressBonusPercent(tribulation: TribulationState): number {
  return Math.min(18, 4 + tribulation.strikesRequired + tribulation.successes);
}

function getTribulationRootLoss(tribulation: TribulationState): number {
  return Math.max(3, Math.round(tribulation.strikesRequired * 1.2 + tribulation.failures));
}

function getTribulationLifespanLossPercent(tribulation: TribulationState): number {
  return Math.min(18, 4 + tribulation.strikesRequired + tribulation.failures);
}

interface PreparationAction {
  id: string;
  name: string;
  description: string;
  cost: number;
  effects: (gameState: GameState) => GameEvent['effects'];
}

function pickByProbability<T extends { probability: number }>(items: T[]): T {
  const totalProbability = items.reduce((sum, item) => sum + item.probability, 0);
  let random = Math.random() * totalProbability;

  for (const item of items) {
    random -= item.probability;
    if (random <= 0) {
      return item;
    }
  }

  return items[0];
}

function pickManyByProbability<T extends { probability: number }>(items: T[], count: number): T[] {
  const pool = [...items];
  const pickedItems: T[] = [];

  while (pickedItems.length < count && pool.length > 0) {
    const picked = pickByProbability(pool);
    pickedItems.push(picked);
    pool.splice(pool.indexOf(picked), 1);
  }

  return pickedItems;
}

function normalizeCharacterName(characterName: string | undefined): string {
  const trimmed = characterName?.trim() ?? '';
  return trimmed.length > 0 ? trimmed.slice(0, 12) : '无名';
}

function hasPendingPlayerAction(gameState: GameState): boolean {
  return !!gameState.pendingEvent
    || !!gameState.pendingCombat
    || !!gameState.pendingPathChoice
    || !!gameState.pendingSectChoice
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
}

function getCultivationSessionStopReason(
  gameState: GameState,
  stopAtBreakthrough: boolean
): CultivationSessionStopReason {
  if (gameState.status === 'ended') {
    return gameState.endReason === 'ascended' ? 'ascended' : 'lifespan';
  }
  if (gameState.pendingCombat) return 'combat';
  if (gameState.pendingEvent) return 'event-choice';
  if (gameState.pendingPathChoice) return 'path-choice';
  if (gameState.pendingSectChoice) return 'sect-choice';
  if (gameState.pendingFeatOptions.length > 0) return 'feat-choice';
  if (gameState.pendingTribulation) return 'tribulation';
  if (stopAtBreakthrough && canBreakthrough(gameState)) return 'breakthrough';
  return 'completed';
}

function createCultivationSessionSummary(
  startingState: GameState,
  finalState: GameState,
  requestedRounds: number,
  completedRounds: number,
  stopAtBreakthrough: boolean,
  source: CultivationSessionSource
): NonNullable<GameState['lastCultivationSession']> {
  const attributeChanges = (Object.keys(startingState.attributes) as Array<keyof Attributes>)
    .reduce<Partial<Attributes>>((changes, key) => {
      const change = finalState.attributes[key] - startingState.attributes[key];
      if (change !== 0) changes[key] = change;
      return changes;
    }, {});
  const newEvents = finalState.events.slice(startingState.events.length);

  return {
    source,
    startedAge: startingState.age,
    endedAge: finalState.age,
    requestedRounds,
    completedRounds,
    eventCount: Math.max(0, newEvents.length),
    cultivationChange: finalState.cultivationProgress - startingState.cultivationProgress,
    lifespanChange: finalState.lifespan - startingState.lifespan,
    familyWealthChange: finalState.familyWealth - startingState.familyWealth,
    attributeChanges,
    eventTitles: newEvents.slice(-4).map(event => event.title),
    stopReason: getCultivationSessionStopReason(finalState, stopAtBreakthrough)
  };
}

export function calculateOfflineCultivationRounds(savedAt: string, now = Date.now()): number {
  const savedAtTime = new Date(savedAt).getTime();
  if (!Number.isFinite(savedAtTime) || now <= savedAtTime) return 0;

  const elapsedMinutes = Math.floor((now - savedAtTime) / 60_000);
  return Math.min(OFFLINE_ROUND_CAP, Math.floor(elapsedMinutes / OFFLINE_ROUND_MINUTES));
}

function accrueOfflineCultivation(
  existing: GameState['offlineCultivation'],
  savedAt: string
): GameState['offlineCultivation'] {
  const accruedRounds = calculateOfflineCultivationRounds(savedAt);
  const remainingRounds = Math.min(
    OFFLINE_ROUND_CAP,
    (existing?.remainingRounds ?? 0) + accruedRounds
  );
  return remainingRounds > 0 ? { remainingRounds } : null;
}

export function normalizeLoadedGameState(gameState: unknown): GameState {
  const value = isRecord(gameState) ? gameState : {};
  const currentRealm = normalizeRealm(value.currentRealm);
  const cultivationPath = normalizeCultivationPath(value.cultivationPath);
  const events = normalizeLoadedEvents(value.events);
  const attributes = normalizeAttributes(value.attributes);
  const techniques = normalizeLearnedTechniques(value.techniques, cultivationPath);
  const feats = normalizeKnownFeatIds(value.feats);
  const pendingFeatOptions = normalizeKnownFeatIds(value.pendingFeatOptions)
    .filter(featId => !feats.includes(featId));
  const requiredProgress = getRequiredCultivationProgress({
    ...initialState,
    currentRealm
  });

  return {
    ...initialState,
    status: 'playing',
    characterName: normalizeCharacterName(typeof value.characterName === 'string' ? value.characterName : undefined),
    age: normalizeNonNegativeInteger(value.age, STARTING_AGE),
    currentRealm,
    attributes,
    familyWealth: normalizeNonNegativeInteger(value.familyWealth, initialState.familyWealth),
    combatStats: normalizeCombatStats(value.combatStats),
    inventory: normalizeInventory(value.inventory),
    techniques,
    lifeSkills: normalizeLifeSkillProgress(value.lifeSkills),
    feats,
    pendingFeatOptions,
    equippedSpellIds: normalizeEquippedSpells(value.equippedSpellIds, cultivationPath, currentRealm.level),
    selectedYearAction: normalizeYearAction(value.selectedYearAction),
    cultivationPlan: normalizeCultivationPlan(value.cultivationPlan),
    lastCultivationSession: normalizeCultivationSessionSummary(value.lastCultivationSession),
    offlineCultivation: normalizeOfflineCultivation(value.offlineCultivation),
    rival: normalizeRival(value.rival),
    breakthroughPreparation: normalizeBreakthroughPreparation(value.breakthroughPreparation),
    sect: normalizeSectState(value.sect, currentRealm.level),
    lastSectMissionAge: normalizeNullableAge(value.lastSectMissionAge),
    spiritRoot: normalizeSpiritRoot(value.spiritRoot),
    talent: normalizeTalent(value.talent),
    cultivationPath,
    pathResource: normalizePathResource(value.pathResource),
    lifespan: Math.max(1, normalizeFiniteNumber(value.lifespan, initialState.lifespan)),
    cultivationProgress: Math.max(0, Math.min(
      requiredProgress,
      normalizeFiniteNumber(value.cultivationProgress, 0)
    )),
    pendingEvent: normalizeGameEvent(value.pendingEvent),
    pendingCombat: normalizePendingCombat(value.pendingCombat, events),
    pendingPathChoice: value.pendingPathChoice === true,
    pendingSectChoice: value.pendingSectChoice === true,
    pendingTribulation: normalizePendingTribulation(value.pendingTribulation),
    activeGoal: normalizeActiveLifeGoal(value.activeGoal),
    completedGoals: normalizeStringArray(value.completedGoals),
    events,
    achievements: normalizeStringArray(value.achievements)
  };
}

function normalizeRealm(value: unknown): GameState['currentRealm'] {
  if (!isRecord(value)) return realms[0];

  const byName = typeof value.name === 'string'
    ? realms.find(realm => realm.name === value.name)
    : undefined;
  if (byName) return byName;

  return typeof value.level === 'number'
    ? realms.find(realm => realm.level === value.level) ?? realms[0]
    : realms[0];
}

function normalizeSpiritRoot(value: unknown): SpiritRoot | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  return spiritRoots.find(root => root.id === value.id) ?? null;
}

function normalizeTalent(value: unknown): Talent | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  return talents.find(talent => talent.id === value.id) ?? null;
}

function normalizeCultivationPath(value: unknown): CultivationPathId | null {
  if (typeof value !== 'string') return null;
  return getCultivationPath(value as CultivationPathId)?.id ?? null;
}

function normalizeAttributes(value: unknown): Attributes {
  const attributes = isRecord(value) ? value : {};
  return {
    根骨: clampAttribute(normalizeFiniteNumber(attributes.根骨, BASE_ATTRIBUTE_VALUE), ATTRIBUTE_MAX),
    神识: clampAttribute(normalizeFiniteNumber(attributes.神识, BASE_ATTRIBUTE_VALUE), ATTRIBUTE_MAX),
    悟性: clampAttribute(normalizeFiniteNumber(attributes.悟性, BASE_ATTRIBUTE_VALUE), ATTRIBUTE_MAX),
    气运: clampAttribute(normalizeFiniteNumber(attributes.气运, BASE_ATTRIBUTE_VALUE), ATTRIBUTE_MAX),
    颜值: clampAttribute(normalizeFiniteNumber(attributes.颜值, BASE_ATTRIBUTE_VALUE), ATTRIBUTE_MAX)
  };
}

function normalizeOfflineCultivation(value: unknown): GameState['offlineCultivation'] {
  if (!isRecord(value)) return null;
  const remainingRounds = Math.min(
    OFFLINE_ROUND_CAP,
    normalizeNonNegativeInteger(value.remainingRounds, 0)
  );
  return remainingRounds > 0 ? { remainingRounds } : null;
}

function normalizeCombatStats(value: unknown): CombatStats {
  const stats = isRecord(value) ? value : {};
  return {
    victories: normalizeNonNegativeInteger(stats.victories, 0),
    defeats: normalizeNonNegativeInteger(stats.defeats, 0),
    injury: Math.min(100, normalizeNonNegativeInteger(stats.injury, 0)),
    bestStreak: normalizeNonNegativeInteger(stats.bestStreak, 0),
    currentStreak: normalizeNonNegativeInteger(stats.currentStreak, 0)
  };
}

function normalizeInventory(value: unknown): InventoryEntry[] {
  if (!Array.isArray(value)) return [];

  const quantities = new Map<string, number>();
  value.forEach(entry => {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || !getItem(entry.itemId)) return;
    const quantity = normalizeNonNegativeInteger(entry.quantity, 0);
    if (quantity <= 0) return;
    quantities.set(entry.itemId, (quantities.get(entry.itemId) ?? 0) + quantity);
  });

  return Array.from(quantities, ([itemId, quantity]) => ({ itemId, quantity }));
}

function normalizeLearnedTechniques(value: unknown, pathId: CultivationPathId | null): LearnedTechnique[] {
  if (!Array.isArray(value) || !pathId) return [];

  const byGrade = new Map<string, LearnedTechnique>();
  value.forEach(entry => {
    if (!isRecord(entry) || typeof entry.techniqueId !== 'string') return;
    const definition = getTechnique(entry.techniqueId);
    if (!definition || definition.pathId !== pathId) return;

    const normalized = {
      techniqueId: definition.id,
      level: Math.max(1, Math.min(definition.maxLevel, normalizeNonNegativeInteger(entry.level, 1)))
    };
    const existing = byGrade.get(definition.grade);
    if (!existing || normalized.level > existing.level) byGrade.set(definition.grade, normalized);
  });

  return Array.from(byGrade.values());
}

function normalizeKnownFeatIds(value: unknown): string[] {
  return normalizeStringArray(value).filter(featId => !!getFeat(featId));
}

function normalizeRival(value: unknown): RivalState | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null;
  return {
    name: value.name.slice(0, 20),
    enmity: normalizeNonNegativeInteger(value.enmity, 0),
    defeats: normalizeNonNegativeInteger(value.defeats, 0),
    active: value.active === true
  };
}

function normalizeBreakthroughPreparation(value: unknown): BreakthroughPreparationState {
  const preparation = isRecord(value) ? value : {};
  return {
    elixir: normalizeNonNegativeInteger(preparation.elixir, 0),
    artifact: normalizeNonNegativeInteger(preparation.artifact, 0),
    talisman: normalizeNonNegativeInteger(preparation.talisman, 0),
    array: normalizeNonNegativeInteger(preparation.array, 0)
  };
}

function normalizePendingTribulation(value: unknown): TribulationState | null {
  if (!isRecord(value) || typeof value.targetRealmName !== 'string') return null;
  const targetRealm = realms.find(realm => realm.name === value.targetRealmName);
  if (!targetRealm || targetRealm.level < 5) return null;

  const strikesRequired = getTribulationStrikeCount(targetRealm.level);
  const strikesResolved = Math.min(strikesRequired, normalizeNonNegativeInteger(value.strikesResolved, 0));
  const successes = Math.min(strikesResolved, normalizeNonNegativeInteger(value.successes, 0));
  const failures = Math.min(strikesResolved - successes, normalizeNonNegativeInteger(value.failures, 0));
  return {
    targetRealmName: targetRealm.name,
    targetRealmLevel: targetRealm.level,
    strikesRequired,
    strikesResolved,
    successes,
    failures
  };
}

function normalizeActiveLifeGoal(value: unknown): ActiveLifeGoal | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !getLifeGoalDefinition(value.id)) return null;
  return {
    id: value.id,
    progress: normalizeNonNegativeInteger(value.progress, 0)
  };
}

function normalizeLoadedEvents(events: unknown): GameEvent[] {
  if (!Array.isArray(events)) return [];

  return events.flatMap(value => {
    const event = normalizeGameEvent(value);
    if (!event) return [];
    if (!event.combat || isCompatibleCombatReport(event.combat)) return event;

    return { ...event, combat: undefined };
  });
}

function normalizeGameEvent(value: unknown): GameEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.description !== 'string') return null;
  if (!isRecord(value.effects) || !isGameEventType(value.type) || !isGameEventResult(value.result)) return null;

  return value as unknown as GameEvent;
}

function isCompatibleCombatReport(report: CombatReport): boolean {
  return [
    report.playerMaxHp,
    report.enemyMaxHp,
    report.playerHpAfter,
    report.enemyHpAfter,
    report.playerAttack,
    report.playerDefense,
    report.playerDodge,
    report.enemyAttack,
    report.enemyDefense,
    report.enemyDodge
  ].every(value => Number.isFinite(value));
}

function normalizePathResource(pathResource: unknown): PathResourceState {
  const value = isRecord(pathResource) ? pathResource.value : 0;
  return {
    value: clampPathResource(normalizeFiniteNumber(value, 0))
  };
}

function normalizePendingCombat(
  pendingCombat: unknown,
  events: GameEvent[]
): TurnCombatState | null {
  if (!isRecord(pendingCombat)) return null;

  const event = normalizeGameEvent(pendingCombat.event);
  const player = normalizePendingCombatant(pendingCombat.player);
  const enemy = normalizePendingCombatant(pendingCombat.enemy);
  if (!event || !player || !enemy) return null;
  if (!isInitiativeReport(pendingCombat.initiative) || !isD20CheckReport(pendingCombat.attackCheck)) return null;

  const alreadyResolved = events.some(resolvedEvent => resolvedEvent.id === event.id && !!resolvedEvent.combat);

  if (alreadyResolved) return null;

  const combat = pendingCombat as unknown as TurnCombatState;
  return {
    ...combat,
    event,
    turn: Math.max(1, normalizeNonNegativeInteger(pendingCombat.turn, 1)),
    maxTurns: Math.max(1, normalizeNonNegativeInteger(pendingCombat.maxTurns, 12)),
    player,
    enemy,
    itemSupportConsumed: normalizeInventoryRewards(pendingCombat.itemSupportConsumed),
    itemSupportInjuryMultiplier: Math.max(0, normalizeFiniteNumber(pendingCombat.itemSupportInjuryMultiplier, 1)),
    rounds: Array.isArray(pendingCombat.rounds)
      ? pendingCombat.rounds.filter(isCombatRound)
      : [],
    log: normalizeStringArray(pendingCombat.log).slice(0, 5)
  };
}

function normalizePendingCombatant(combatant: unknown): TurnCombatantState | null {
  if (!isRecord(combatant) || typeof combatant.name !== 'string') return null;
  const maxHp = Math.max(1, normalizeFiniteNumber(combatant.maxHp, 1));
  const maxQi = Math.max(0, normalizeFiniteNumber(combatant.maxQi, 0));
  const speed = Math.max(0, normalizeFiniteNumber(combatant.speed, 0));
  return {
    name: combatant.name,
    ...(typeof combatant.rank === 'string' ? { rank: combatant.rank } : {}),
    hp: Math.max(0, Math.min(maxHp, normalizeFiniteNumber(combatant.hp, maxHp))),
    maxHp,
    qi: Math.max(0, Math.min(maxQi, normalizeFiniteNumber(combatant.qi, 0))),
    maxQi,
    attack: Math.max(0, normalizeFiniteNumber(combatant.attack, 0)),
    defense: Math.max(0, normalizeFiniteNumber(combatant.defense, 0)),
    dodge: Number.isFinite(combatant.dodge)
      ? Number(combatant.dodge)
      : Math.max(10, Math.round(10 + speed / 2)),
    speed
  };
}

function isInitiativeReport(value: unknown): value is NonNullable<CombatReport['initiative']> {
  return isRecord(value)
    && isD20CheckReport(value.player)
    && isFiniteNumber(value.enemyRoll)
    && isFiniteNumber(value.enemyBonus)
    && isFiniteNumber(value.enemyTotal)
    && isFiniteNumber(value.margin)
    && typeof value.resultText === 'string';
}

function isD20CheckReport(value: unknown): value is D20CheckReport {
  return isRecord(value)
    && typeof value.label === 'string'
    && typeof value.attribute === 'string'
    && isFiniteNumber(value.dc)
    && Array.isArray(value.rolls)
    && value.rolls.every(isFiniteNumber)
    && isFiniteNumber(value.selectedRoll)
    && isFiniteNumber(value.attributeModifier)
    && isFiniteNumber(value.proficiencyBonus)
    && isFiniteNumber(value.bonus)
    && isFiniteNumber(value.total)
    && (value.mode === 'normal' || value.mode === 'advantage' || value.mode === 'disadvantage')
    && isGameEventResult(value.outcome);
}

function isCombatRound(value: unknown): value is CombatRound {
  return isRecord(value)
    && isFiniteNumber(value.round)
    && typeof value.playerAction === 'string'
    && typeof value.enemyAction === 'string'
    && isFiniteNumber(value.playerHp)
    && isFiniteNumber(value.enemyHp);
}

function normalizeSectState(sect: unknown, realmLevel: number): SectState | null {
  if (!isRecord(sect) || typeof sect.sectId !== 'string') return null;
  const definition = getCultivationSect(sect.sectId as CultivationSectId);
  if (!definition) return null;
  const contribution = normalizeNonNegativeInteger(sect.contribution, 0);

  return {
    sectId: definition.id,
    rank: definition.id === 'loose' ? '散修' : getSectRank(realmLevel, contribution),
    contribution,
    reputation: normalizeNonNegativeInteger(sect.reputation, 0)
  };
}

function getAvailableSpellIds(gameState: GameState): string[] {
  if (!gameState.cultivationPath) return [];

  return spellbook
    .filter(spell => spell.pathId === gameState.cultivationPath && spell.minRealmLevel <= gameState.currentRealm.level)
    .sort((a, b) => a.minRealmLevel - b.minRealmLevel)
    .map(spell => spell.id);
}

function normalizeEquippedSpells(
  equippedSpellIds: unknown,
  pathId: CultivationPathId | null,
  realmLevel: number
): string[] {
  if (!pathId) return [];

  const availableIds = getAvailableSpellIdsForPath(pathId, realmLevel);
  const existingIds = Array.isArray(equippedSpellIds)
    ? equippedSpellIds.filter(spellId => availableIds.includes(spellId))
    : [];

  return existingIds.length > 0
    ? Array.from(new Set(existingIds)).slice(0, 3)
    : getDefaultEquippedSpells(pathId, realmLevel);
}

function getAvailableSpellIdsForPath(pathId: CultivationPathId, realmLevel: number): string[] {
  return spellbook
    .filter(spell => spell.pathId === pathId && spell.minRealmLevel <= realmLevel)
    .map(spell => spell.id);
}

function normalizeYearAction(actionId: unknown): YearActionId {
  return actionId === 'cultivate'
    || actionId === 'adventure'
    || actionId === 'seclusion'
    || actionId === 'life-skill'
    ? actionId
    : 'adventure';
}

function normalizeCultivationPlan(value: unknown): CultivationPlan {
  const plan = isRecord(value) ? value : {};
  return {
    rounds: normalizeCultivationRounds(plan.rounds),
    stopAtBreakthrough: plan.stopAtBreakthrough !== false
  };
}

function normalizeCultivationRounds(value: unknown): CultivationPlan['rounds'] {
  return value === 3 || value === 5 || value === 10 ? value : 1;
}

function normalizeCultivationSessionSummary(value: unknown): GameState['lastCultivationSession'] {
  if (!isRecord(value) || !isCultivationStopReason(value.stopReason)) return null;
  const rawAttributeChanges = isRecord(value.attributeChanges) ? value.attributeChanges : {};
  const attributeChanges = Object.keys(rawAttributeChanges).length > 0
    ? (Object.keys(initialState.attributes) as Array<keyof Attributes>).reduce<Partial<Attributes>>((changes, key) => {
      const change = normalizeFiniteNumber(rawAttributeChanges[key], 0);
      if (change !== 0) changes[key] = change;
      return changes;
    }, {})
    : {};

  return {
    source: value.source === 'offline' ? 'offline' : 'manual',
    startedAge: normalizeNonNegativeInteger(value.startedAge, 0),
    endedAge: normalizeNonNegativeInteger(value.endedAge, 0),
    requestedRounds: normalizeCultivationRounds(value.requestedRounds),
    completedRounds: normalizeNonNegativeInteger(value.completedRounds, 0),
    eventCount: normalizeNonNegativeInteger(value.eventCount, 0),
    cultivationChange: normalizeFiniteNumber(value.cultivationChange, 0),
    lifespanChange: normalizeFiniteNumber(value.lifespanChange, 0),
    familyWealthChange: normalizeFiniteNumber(value.familyWealthChange, 0),
    attributeChanges,
    eventTitles: Array.isArray(value.eventTitles)
      ? value.eventTitles.filter((title): title is string => typeof title === 'string').slice(-4)
      : [],
    stopReason: value.stopReason
  };
}

function isCultivationStopReason(value: unknown): value is CultivationSessionStopReason {
  return typeof value === 'string' && [
    'completed',
    'breakthrough',
    'event-choice',
    'combat',
    'path-choice',
    'sect-choice',
    'feat-choice',
    'tribulation',
    'lifespan',
    'ascended'
  ].includes(value);
}

function normalizeLifeSkillProgress(progressList: unknown): LifeSkillProgress[] {
  const existingProgress = Array.isArray(progressList) ? progressList : [];

  return lifeSkills.map(skill => {
    const progress = existingProgress.find(item => isRecord(item) && item.skillId === skill.id);
    return {
      skillId: skill.id,
      level: Math.max(1, Math.min(10, normalizeNonNegativeInteger(
        isRecord(progress) ? progress.level : undefined,
        1
      ))),
      exp: normalizeNonNegativeInteger(isRecord(progress) ? progress.exp : undefined, 0)
    };
  });
}

function normalizeInventoryRewards(value: unknown): InventoryReward[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(reward => {
    if (!isRecord(reward) || typeof reward.itemId !== 'string' || !getItem(reward.itemId)) return [];
    const quantity = normalizeNonNegativeInteger(reward.quantity, 0);
    return quantity > 0 ? [{ itemId: reward.itemId, quantity }] : [];
  });
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string')))
    : [];
}

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return Math.max(0, Math.round(normalizeFiniteNumber(value, fallback)));
}

function normalizeNullableAge(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isGameEventType(value: unknown): value is GameEvent['type'] {
  return typeof value === 'string' && [
    'childhood',
    'cultivation',
    'combat',
    'encounter',
    'social',
    'disaster',
    'daily',
    'resource',
    'mind',
    'sect'
  ].includes(value);
}

function isGameEventResult(value: unknown): value is GameEvent['result'] {
  return typeof value === 'string'
    && ['success', 'failure', 'neutral', 'great-success', 'great-failure'].includes(value);
}

function enterQiCondensingRealm(gameState: GameState): GameState {
  const qiRealm = realms.find(realm => realm.name === '炼气期') ?? realms[1];
  const transitionEvent: GameEvent = {
    id: `qi-condensing-${gameState.age}`,
    age: gameState.age,
    type: 'cultivation',
    title: '引气入体',
    description: '十岁这一年，你第一次清楚感到天地灵气入体流转，幼年蒙学至此化作修行根基。',
    weight: 0,
    effects: { 境界: 'advance' },
    appliedEffects: { 境界: 'advance' },
    result: 'neutral'
  };
  const stateAfterTransition: GameState = {
    ...gameState,
    currentRealm: qiRealm,
    cultivationProgress: 0,
    pendingPathChoice: true,
    events: [...gameState.events, transitionEvent]
  };

  return unlockAchievements(applyLifeGoalProgress(stateAfterTransition, transitionEvent));
}

function shouldOfferSectChoice(gameState: GameState): boolean {
  return !isChildhood(gameState)
    && gameState.age >= SECT_CHOICE_AGE
    && !gameState.sect
    && !gameState.pendingSectChoice;
}

function enterSectChoice(gameState: GameState): GameState {
  const sectChoiceEvent: GameEvent = {
    id: `sect-choice-open-${gameState.age}`,
    age: gameState.age,
    type: 'sect',
    title: '山门择路',
    description: '十五岁这一年，你已有数年炼气根基，诸宗山门向年轻修士开了一线门缝。是拜入宗门，还是继续做散修，都将影响此世修行。',
    weight: 0,
    effects: {},
    appliedEffects: {},
    result: 'neutral'
  };

  return {
    ...gameState,
    pendingSectChoice: true,
    events: [...gameState.events, sectChoiceEvent]
  };
}

function selectAvailableEvent(gameState: GameState): GameEvent {
  if (isChildhood(gameState)) {
    return pickWeightedEvent(childhoodEvents, gameState);
  }

  const rivalEvent = createRivalAmbushEvent(gameState);
  if (rivalEvent) return rivalEvent;

  const eventPool = getRealmEventPool(gameState);
  const availableEvents = eventPool.filter(event => {
    return event.effects.境界 !== 'advance' && matchesEventConditions(event, gameState);
  });

  return pickWeightedEvent(availableEvents.length > 0 ? availableEvents : eventPool, gameState);
}

function getRealmEventPool(gameState: GameState): GameEvent[] {
  if (gameState.currentRealm.level >= 7) return lateEvents;
  if (gameState.currentRealm.level >= 4) return midEvents;
  return earlyEvents;
}

function createYearActionEvent(gameState: GameState): GameEvent | null {
  if (isChildhood(gameState) || gameState.selectedYearAction === 'adventure') return null;

  const pathBonus = getPathYearActionBonus(gameState, gameState.selectedYearAction);
  const scale = (value: number) => Math.max(1, Math.round(value * pathBonus));

  switch (gameState.selectedYearAction) {
    case 'cultivate':
      return {
        id: `year-action-cultivate-${Date.now()}`,
        age: gameState.age,
        type: 'cultivation',
        title: '静心修炼',
        description: '你推掉杂务，整年打坐行功，灵气一遍遍洗过经脉。',
        weight: 0,
        effects: { 修为: scale(9), 根骨: 1 },
        result: 'neutral'
      };
    case 'seclusion':
      return {
        id: `year-action-seclusion-${Date.now()}`,
        age: gameState.age,
        type: 'mind',
        title: '闭关参悟',
        description: '你闭门整理功法脉络，将近日所见所闻化作自己的理解。',
        weight: 0,
        effects: { 悟性: scale(3), 神识: scale(2), 修为: 4 },
        result: 'neutral'
      };
    case 'life-skill': {
      const skill = pickYearActionLifeSkill(gameState);
      const itemRewards = generateYearActionLifeSkillRewards(skill.id, gameState.currentRealm.level);
      return {
        id: `year-action-life-skill-${skill.id}-${Date.now()}`,
        age: gameState.age,
        type: skill.eventType,
        title: `钻研${skill.name}`,
        description: `你把这一年投在${skill.name}上，手法渐熟，也积下几分可用材料。`,
        weight: 0,
        effects: mergeEffects(skill.effects, { 修为: 2 }),
        ...(itemRewards.length > 0 ? { itemRewards } : {}),
        result: 'neutral'
      };
    }
    default:
      return null;
  }
}

function createRivalAmbushEvent(gameState: GameState): GameEvent | null {
  if (gameState.selectedYearAction !== 'adventure' || !gameState.rival?.active) return null;
  const chance = Math.min(0.32, 0.08 + gameState.rival.enmity * 0.015);
  if (Math.random() > chance) return null;

  return {
    id: 'rival-ambush',
    age: gameState.age,
    type: 'combat',
    title: '宿敌寻仇',
    description: `${gameState.rival.name}循着你的踪迹追来，旧怨未消，此战难免。`,
    weight: 0,
    effects: { 修为: 8, 根骨: 2, 神识: 2 },
    result: 'success'
  };
}

function pickWeightedEvent(availableEvents: GameEvent[], gameState: GameState): GameEvent {
  const modifiers = getCombinedModifiers(gameState);
  const weightedEvents = availableEvents.map(event => ({
    event,
    weight: Math.max(0.05, (event.weight ?? 1) * (modifiers.事件权重?.[event.type] ?? 1))
  }));
  const totalWeight = weightedEvents.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of weightedEvents) {
    random -= item.weight;
    if (random <= 0) {
      return item.event;
    }
  }

  return weightedEvents[0].event;
}

function matchesEventConditions(event: GameEvent, gameState: GameState): boolean {
  const conditions = event.conditions;
  if (!conditions) return true;

  const realmLevel = gameState.currentRealm.level;
  if (conditions.minRealmLevel && realmLevel < conditions.minRealmLevel) return false;
  if (conditions.maxRealmLevel && realmLevel > conditions.maxRealmLevel) return false;
  if (conditions.minAge && gameState.age < conditions.minAge) return false;
  if (conditions.spiritRootIds && !conditions.spiritRootIds.includes(gameState.spiritRoot?.id ?? '')) return false;
  if (conditions.talentIds && !conditions.talentIds.includes(gameState.talent?.id ?? '')) return false;

  if (conditions.attributes && !meetsEventAttributeRequirements(gameState, conditions.attributes)) {
    return false;
  }

  return true;
}

function shouldOfferEventChoice(_gameState: GameState, event: GameEvent): boolean {
  if (event.type === 'childhood') return false;

  return hasSpecificEventChoices(event.id);
}

function resolveGameEvent(gameState: GameState, event: GameEvent, choice?: EventChoice): GameState {
  const eventForResolution = choice?.combat ? createChoiceCombatEvent(event, choice) : event;

  if (eventForResolution.type === 'combat') {
    return startTurnCombat(gameState, eventForResolution, choice);
  }

  const effectiveChoice = choice;
  const isNeutralEvent = eventForResolution.result === 'neutral';
  const checkItemSupport = getEventCheckItemSupport(gameState, eventForResolution);
  const check = eventForResolution.type === 'childhood'
    ? undefined
    : performEventCheck(gameState, eventForResolution, effectiveChoice, checkItemSupport);
  const result = eventForResolution.type === 'childhood'
    ? 'neutral'
    : getEventResultFromCheck(check, isNeutralEvent, getEventOutcomePhase(gameState), eventForResolution.type);
  const resolvedEffects = eventForResolution.type === 'childhood' ? eventForResolution.effects : resolveEventEffects(eventForResolution, result);
  const chosenEffects = effectiveChoice
    ? mergeEffects(
      scaleEventEffectsForChoice(resolvedEffects, effectiveChoice),
      resolveChoiceEffects(gameState, effectiveChoice)
    )
    : resolvedEffects;
  const adjustedEffects = applyAttributeModifiers(gameState, eventForResolution, chosenEffects);
  const progressDelta = calculateCultivationProgressDelta(gameState, eventForResolution, adjustedEffects);
  const lifespanDelta = calculateLifespanDelta(gameState, eventForResolution, chosenEffects);
  const appliedEffects = buildAppliedEffects(adjustedEffects, progressDelta, lifespanDelta);
  const stateForEffects = {
    ...gameState,
    pendingEvent: null,
    pendingCombat: null
  };
  const newAttributes = applyAttributeEffects(stateForEffects, adjustedEffects);
  const newFamilyWealth = applyFamilyWealthEffects(stateForEffects, adjustedEffects);
  const newLifespan = lifespanDelta
    ? Math.max(1, gameState.lifespan + lifespanDelta)
    : gameState.lifespan;
  const requiredProgress = getRequiredCultivationProgress(gameState);
  const itemRewards = [
    ...(eventForResolution.itemRewards ?? []),
    ...generateEventItemRewards(eventForResolution, result)
  ];
  const techniqueRewards = generateEventTechniqueRewards(gameState, eventForResolution, result);
  const pathResourceDelta = getPathResourceDelta(gameState, eventForResolution, result);
  const stateAfterPathResource = addPathResource(gameState, pathResourceDelta);
  const pathResourceChange = getPathResourceChange(gameState, stateAfterPathResource, pathResourceDelta);
  const sectMissionOutcomeText = getSectMissionOutcomeText(eventForResolution, result);
  const newEvent: GameEvent = {
    ...eventForResolution,
    title: choice ? `${eventForResolution.title}：${formatChoiceTitle(choice)}` : eventForResolution.title,
    description: `${choice ? `${eventForResolution.description}${formatChoiceOutcome(choice)}` : eventForResolution.description}${checkItemSupport.text ? checkItemSupport.text : ''}${sectMissionOutcomeText}`,
    appliedEffects,
    ...(check ? { check } : {}),
    ...(itemRewards.length > 0 ? { itemRewards } : {}),
    ...(checkItemSupport.consumed.length > 0 ? { itemLosses: checkItemSupport.consumed } : {}),
    ...(techniqueRewards.length > 0 ? { techniqueRewards } : {}),
    ...(pathResourceChange ? { pathResourceChange } : {}),
    result
  };
  const stateAfterEvent: GameState = {
    ...gameState,
    pathResource: stateAfterPathResource.pathResource,
    pendingEvent: null,
    pendingCombat: null,
    attributes: newAttributes,
    familyWealth: newFamilyWealth,
    sect: updateSectAfterEvent(gameState, eventForResolution, result),
    lifespan: newLifespan,
    cultivationProgress: clampProgress(gameState.cultivationProgress + progressDelta, requiredProgress),
    inventory: removeInventoryRewards(addInventoryRewards(gameState.inventory, itemRewards), checkItemSupport.consumed),
    techniques: addLearnedTechniques(gameState.techniques, techniqueRewards),
    events: [...gameState.events, newEvent]
  };

  return unlockAchievements(applyLifeGoalProgress(applyYearActionSideEffects(stateAfterEvent, eventForResolution), newEvent));
}

function createChoiceCombatEvent(event: GameEvent, choice: EventChoice): GameEvent {
  const combat = choice.combat;

  if (!combat) return event;

  return {
    ...event,
    id: combat.id,
    type: 'combat',
    title: combat.title ?? event.title,
    description: combat.description ?? event.description,
    effects: combat.effects,
    result: 'success'
  };
}

interface CombatEncounter {
  enemyName: string;
  enemyRank: string;
  difficulty: number;
  cultivationPercent: number;
  injury: number;
  primary: Array<keyof Attributes>;
  styleText: string;
}

interface CombatItemSupport {
  offenseMultiplier: number;
  injuryMultiplier: number;
  consumed: InventoryReward[];
  text?: string;
}

interface CheckItemSupport {
  bonus: number;
  consumed: InventoryReward[];
  text?: string;
}

interface CombatantStats {
  hp: number;
  attack: number;
  defense: number;
  dodge: number;
  speed: number;
}

interface TurnCombatStrikeResult {
  damage: number;
  hit: boolean;
  roll: number;
  total: number;
  targetDodge: number;
  critical: boolean;
}

interface CombatResolutionResult {
  result: GameEvent['result'];
  rawResult: GameEvent['result'];
  isWin: boolean;
  report: CombatReport;
  itemSupport: CombatItemSupport;
  escaped?: boolean;
}

interface CombatSetup {
  encounter: CombatEncounter;
  itemSupport: CombatItemSupport;
  initiative: NonNullable<CombatReport['initiative']>;
  attackCheck: D20CheckReport;
  player: CombatantStats;
  enemy: CombatantStats;
  winRate: number;
}

function finalizeCombatEvent(
  gameState: GameState,
  event: GameEvent,
  choice: EventChoice | undefined,
  combatResult: CombatResolutionResult
): GameState {
  const effectiveChoice = choice;
  const baseEffects = scaleCombatBaseEffects(event.effects, combatResult.rawResult);
  const choiceEffects = effectiveChoice
    ? mergeEffects(
      scaleEventEffectsForChoice(baseEffects, effectiveChoice),
      resolveChoiceEffects(gameState, effectiveChoice)
    )
    : baseEffects;
  const combatEffects = getCombatRewardEffects(gameState, combatResult.report, combatResult.rawResult, combatResult.isWin);
  const chosenEffects = mergeEffects(choiceEffects, combatEffects);
  const adjustedEffects = applyAttributeModifiers(gameState, event, chosenEffects);
  const progressDelta = calculateCultivationProgressDelta(gameState, event, adjustedEffects);
  const lifespanDelta = calculateLifespanDelta(gameState, event, adjustedEffects);
  const appliedEffects = buildAppliedEffects(adjustedEffects, progressDelta, lifespanDelta);
  const stateForEffects = {
    ...gameState,
    pendingEvent: null,
    pendingCombat: null
  };
  const newAttributes = applyAttributeEffects(stateForEffects, adjustedEffects);
  const newFamilyWealth = applyFamilyWealthEffects(stateForEffects, adjustedEffects);
  const newLifespan = lifespanDelta
    ? Math.max(1, gameState.lifespan + lifespanDelta)
    : gameState.lifespan;
  const requiredProgress = getRequiredCultivationProgress(gameState);
  const fixedItemRewards = combatResult.isWin ? event.itemRewards ?? [] : [];
  const itemRewards = [
    ...fixedItemRewards,
    ...generateCombatItemRewards(gameState, event, combatResult.rawResult, combatResult.isWin)
  ];
  const itemLosses = combatResult.escaped ? [] : generateCombatItemLosses(gameState, combatResult.rawResult, combatResult.isWin);
  const consumedSupportItems = combatResult.itemSupport.consumed;
  const techniqueRewards = combatResult.isWin
    ? generateEventTechniqueRewards(gameState, event, combatResult.rawResult)
    : [];
  const pathResourceDelta = getPathResourceDelta(gameState, event, combatResult.rawResult);
  const stateAfterPathResource = addPathResource(gameState, pathResourceDelta);
  const pathResourceChange = getPathResourceChange(gameState, stateAfterPathResource, pathResourceDelta);
  const choiceText = choice ? formatChoiceOutcome(choice) : '';
  const sectMissionOutcomeText = getSectMissionOutcomeText(event, combatResult.rawResult);
  const newEvent: GameEvent = {
    ...event,
    title: choice ? `${event.title}：${formatChoiceTitle(choice)}` : event.title,
    description: `${event.description}${choiceText}${combatResult.report.resultText}${sectMissionOutcomeText}`,
    appliedEffects,
    combat: combatResult.report,
    itemRewards: itemRewards.length > 0 ? itemRewards : undefined,
    ...(itemLosses.length + consumedSupportItems.length > 0 ? { itemLosses: [...itemLosses, ...consumedSupportItems] } : {}),
    ...(techniqueRewards.length > 0 ? { techniqueRewards } : {}),
    ...(pathResourceChange ? { pathResourceChange } : {}),
    result: combatResult.result
  };
  const stateAfterEvent: GameState = {
    ...gameState,
    pathResource: stateAfterPathResource.pathResource,
    pendingEvent: null,
    pendingCombat: null,
    attributes: newAttributes,
    familyWealth: newFamilyWealth,
    sect: updateSectAfterEvent(gameState, event, combatResult.rawResult),
    combatStats: updateCombatStats(gameState.combatStats, combatResult.report, combatResult.isWin),
    lifespan: newLifespan,
    cultivationProgress: clampProgress(gameState.cultivationProgress + progressDelta, requiredProgress),
    inventory: removeInventoryRewards(
      removeInventoryRewards(addInventoryRewards(gameState.inventory, itemRewards), itemLosses),
      consumedSupportItems
    ),
    techniques: addLearnedTechniques(gameState.techniques, techniqueRewards),
    events: [...gameState.events, newEvent]
  };

  const stateAfterRival = updateRivalAfterCombat(stateAfterEvent, event, combatResult.isWin);
  const resolvedEvent = stateAfterRival.events[stateAfterRival.events.length - 1] ?? newEvent;

  return unlockAchievements(applyLifeGoalProgress(stateAfterRival, resolvedEvent));
}

function startTurnCombat(gameState: GameState, event: GameEvent, choice?: EventChoice): GameState {
  const setup = createCombatSetup(gameState, event);
  const playerQi = getPlayerCombatMaxQi(gameState);
  const enemyQi = getEnemyCombatMaxQi(gameState, setup.encounter);
  const pendingCombat: TurnCombatState = {
    id: `combat-${event.id}-${Date.now()}`,
    event,
    ...(choice ? { choice } : {}),
    turn: 1,
    maxTurns: 12,
    enemyName: setup.encounter.enemyName,
    enemyRank: setup.encounter.enemyRank,
    styleText: `${getCombatPathStyle(gameState)} · ${setup.encounter.styleText}`,
    cultivationPercent: setup.encounter.cultivationPercent,
    baseInjury: setup.encounter.injury,
    player: {
      name: gameState.characterName || '我方',
      hp: setup.player.hp,
      maxHp: setup.player.hp,
      qi: Math.round(playerQi * 0.45),
      maxQi: playerQi,
      attack: setup.player.attack,
      defense: setup.player.defense,
      dodge: setup.player.dodge,
      speed: setup.player.speed
    },
    enemy: {
      name: setup.encounter.enemyName,
      rank: setup.encounter.enemyRank,
      hp: setup.enemy.hp,
      maxHp: setup.enemy.hp,
      qi: Math.round(enemyQi * 0.35),
      maxQi: enemyQi,
      attack: setup.enemy.attack,
      defense: setup.enemy.defense,
      dodge: setup.enemy.dodge,
      speed: setup.enemy.speed
    },
    initiative: setup.initiative,
    attackCheck: setup.attackCheck,
    winRate: Math.round(setup.winRate * 100),
    itemSupportConsumed: setup.itemSupport.consumed,
    itemSupportInjuryMultiplier: setup.itemSupport.injuryMultiplier,
    ...(setup.itemSupport.text ? { itemSupportText: setup.itemSupport.text } : {}),
    rounds: [],
    log: [setup.initiative.resultText]
  };

  return {
    ...gameState,
    pendingEvent: null,
    pendingCombat
  };
}

function resolveTurnCombatAction(gameState: GameState, actionId: CombatActionId): GameState {
  const combat = gameState.pendingCombat;
  if (!combat) return gameState;
  if (actionId === 'technique' && combat.player.qi < getTurnCombatTechniqueCost(gameState)) return gameState;

  if (actionId === 'flee') {
    return resolveTurnCombatFlee(gameState, combat);
  }

  const enemyAction = chooseEnemyCombatAction(combat);
  const playerFirst = combat.player.speed + combat.initiative.margin >= combat.enemy.speed;
  const playerGuarded = actionId === 'defend';
  const enemyGuarded = enemyAction === 'defend';
  const playerStrike = resolveTurnCombatStrike(
    combat.player,
    combat.enemy,
    combat.turn,
    actionId,
    Math.random() < getCombatCriticalChance(gameState) + (actionId === 'technique' ? 0.05 : 0),
    enemyGuarded,
    combat.attackCheck
  );
  const enemyStrike = resolveTurnCombatStrike(
    combat.enemy,
    combat.player,
    combat.turn,
    enemyAction,
    Math.random() < getEnemyTurnCriticalChance(combat),
    playerGuarded
  );
  const playerDamage = playerStrike.damage;
  const enemyDamage = enemyStrike.damage;
  let playerHp = combat.player.hp;
  let enemyHp = combat.enemy.hp;
  let resolvedPlayerStrike = playerStrike;
  let resolvedEnemyStrike = enemyStrike;
  let playerActed = true;
  let enemyActed = true;

  if (playerFirst) {
    enemyHp = applyPlayerDamageToEnemy(enemyHp, playerDamage);
    if (enemyHp > 0) {
      playerHp = Math.max(0, playerHp - enemyDamage);
    } else {
      resolvedEnemyStrike = createEmptyTurnCombatStrike(combat.player.dodge);
      enemyActed = false;
    }
  } else {
    playerHp = Math.max(0, playerHp - enemyDamage);
    if (playerHp > 0) {
      enemyHp = applyPlayerDamageToEnemy(enemyHp, playerDamage);
    } else {
      resolvedPlayerStrike = createEmptyTurnCombatStrike(combat.enemy.dodge);
      playerActed = false;
    }
  }

  const playerQi = playerActed
    ? getNextCombatQi(combat.player.qi, combat.player.maxQi, actionId, resolvedPlayerStrike.damage)
    : combat.player.qi;
  const enemyQi = enemyActed
    ? getNextCombatQi(combat.enemy.qi, combat.enemy.maxQi, enemyAction, resolvedEnemyStrike.damage)
    : combat.enemy.qi;
  const round: CombatRound = {
    round: combat.turn,
    playerAction: playerActed
      ? getTurnPlayerActionText(gameState, actionId, resolvedPlayerStrike, playerGuarded)
      : '未及出手，气机已被压断',
    enemyAction: enemyActed
      ? getTurnEnemyActionText(combat, enemyAction, resolvedEnemyStrike, enemyGuarded)
      : `${combat.enemyName}未及反击，已被斩落`,
    playerRating: getCombatantRoundRating({ ...combat.player, hp: playerHp }),
    enemyRating: getCombatantRoundRating({ ...combat.enemy, hp: enemyHp }),
    playerHp,
    enemyHp,
    playerDamage: resolvedPlayerStrike.damage,
    enemyDamage: resolvedEnemyStrike.damage,
    playerMaxHp: combat.player.maxHp,
    enemyMaxHp: combat.enemy.maxHp,
    playerHit: resolvedPlayerStrike.hit,
    enemyHit: resolvedEnemyStrike.hit,
    playerAttackRoll: resolvedPlayerStrike.roll,
    enemyAttackRoll: resolvedEnemyStrike.roll,
    playerAttackTotal: resolvedPlayerStrike.total,
    enemyAttackTotal: resolvedEnemyStrike.total,
    playerTargetDodge: resolvedPlayerStrike.targetDodge,
    enemyTargetDodge: resolvedEnemyStrike.targetDodge,
    ...(resolvedPlayerStrike.critical ? { playerCritical: true } : {}),
    ...(resolvedEnemyStrike.critical ? { enemyCritical: true } : {}),
    ...(playerGuarded ? { playerGuarded } : {}),
    ...(enemyGuarded ? { enemyGuarded } : {}),
    ...(combat.turn === 1 ? { check: combat.attackCheck } : {})
  };
  const nextCombat: TurnCombatState = {
    ...combat,
    turn: combat.turn + 1,
    player: {
      ...combat.player,
      hp: playerHp,
      qi: playerQi
    },
    enemy: {
      ...combat.enemy,
      hp: enemyHp,
      qi: enemyQi
    },
    rounds: [...combat.rounds, round],
    log: [
      `${combat.player.name}${getTurnCombatActionSummary(actionId)}，${combat.enemyName}${getTurnCombatActionSummary(enemyAction)}。`,
      ...combat.log
    ].slice(0, 5)
  };

  if (shouldFinishTurnCombat(nextCombat)) {
    return finalizeTurnCombat(gameState, nextCombat, false);
  }

  return {
    ...gameState,
    pendingCombat: nextCombat
  };
}

function resolveTurnCombatFlee(gameState: GameState, combat: TurnCombatState): GameState {
  const playerRating = getCombatantRoundRating(combat.player);
  const enemyRating = getCombatantRoundRating(combat.enemy);
  const dc = Math.max(10, Math.round(12 + gameState.currentRealm.level + (enemyRating - playerRating) / Math.max(80, playerRating) * 6));
  const check = performD20Check(gameState, {
    label: '脱身检定',
    attribute: '气运',
    dc,
    mode: combat.player.hp <= combat.player.maxHp * 0.35 ? 'disadvantage' : 'normal',
    bonus: Math.floor(getAttributeModifier(gameState.attributes.神识) / 2) + getFeatCheckBonus(gameState, combat.event) + getSpellCheckBonus(gameState, combat.event),
    sourceText: '气运、神识、专长与术式',
    greatSuccessOn19: hasGreatSuccessOn19(gameState),
    reduceGreatFailure: hasGreatFailureReduction(gameState)
  });
  const escaped = check.total >= check.dc;
  const enemyStrike = escaped
    ? createEmptyTurnCombatStrike(combat.player.dodge)
    : resolveTurnCombatStrike(combat.enemy, combat.player, combat.turn, 'attack', Math.random() < getEnemyTurnCriticalChance(combat), false);
  const enemyDamage = enemyStrike.damage;
  const playerHp = escaped ? combat.player.hp : Math.max(0, combat.player.hp - enemyDamage);
  const round: CombatRound = {
    round: combat.turn,
    playerAction: escaped ? '寻得空隙抽身退走' : '试图脱身，却被对手截住',
    enemyAction: escaped ? `${combat.enemyName}追击落空` : getTurnEnemyActionText(combat, 'attack', enemyStrike, false),
    playerRating: getCombatantRoundRating({ ...combat.player, hp: playerHp }),
    enemyRating: getCombatantRoundRating(combat.enemy),
    playerHp,
    enemyHp: combat.enemy.hp,
    playerDamage: 0,
    enemyDamage,
    playerMaxHp: combat.player.maxHp,
    enemyMaxHp: combat.enemy.maxHp,
    enemyHit: enemyStrike.hit,
    enemyAttackRoll: enemyStrike.roll,
    enemyAttackTotal: enemyStrike.total,
    enemyTargetDodge: enemyStrike.targetDodge,
    ...(enemyStrike.critical ? { enemyCritical: true } : {}),
    check
  };
  const nextCombat: TurnCombatState = {
    ...combat,
    turn: combat.turn + 1,
    player: {
      ...combat.player,
      hp: playerHp
    },
    rounds: [...combat.rounds, round],
    log: [
      escaped ? '你没有恋战，保住大半元气抽身。' : '脱身失败，敌手趁机压上。',
      ...combat.log
    ].slice(0, 5)
  };

  if (escaped || playerHp <= 0) {
    return finalizeTurnCombat(gameState, nextCombat, escaped);
  }

  return {
    ...gameState,
    pendingCombat: nextCombat
  };
}

function finalizeTurnCombat(gameState: GameState, combat: TurnCombatState, escaped: boolean): GameState {
  const isWin = !escaped && (combat.enemy.hp <= 0 || combat.player.hp > 0 && getHpRatio(combat.player) >= getHpRatio(combat.enemy));
  const rawResult = getTurnCombatRawResult(combat, isWin, escaped);
  const report = buildTurnCombatReport(gameState, combat, rawResult, isWin, escaped);
  const result = rawResult === 'great-success' || rawResult === 'great-failure' ? rawResult : 'neutral';

  return finalizeCombatEvent(gameState, combat.event, combat.choice, {
    result,
    rawResult,
    isWin,
    report,
    itemSupport: {
      offenseMultiplier: 1,
      injuryMultiplier: combat.itemSupportInjuryMultiplier,
      consumed: escaped ? [] : combat.itemSupportConsumed,
      text: combat.itemSupportText
    },
    escaped
  });
}

function createCombatSetup(gameState: GameState, event: GameEvent): CombatSetup {
  const encounter = getCombatEncounter(gameState, event);
  const itemSupport = getCombatItemSupport(gameState);
  const initiative = calculateInitiativeReport(gameState, encounter, itemSupport);
  const attackCheck = performCombatAttackCheck(gameState, encounter, itemSupport, initiative);
  const initiativePlayerMultiplier = initiative.margin >= 10
    ? 1.1
    : initiative.margin > 0
      ? 1.06
      : initiative.margin <= -10
        ? 0.92
        : initiative.margin < 0
          ? 0.96
          : 1;
  const initiativeEnemyMultiplier = initiative.margin <= -10
    ? 1.08
    : initiative.margin < 0
      ? 1.04
      : 1;
  const player = calculatePlayerCombatStats(gameState, encounter, itemSupport, attackCheck, initiativePlayerMultiplier);
  const enemy = calculateEnemyCombatStats(gameState, encounter, initiativeEnemyMultiplier);
  const playerRating = getCombatantRoundRating(player);
  const enemyRating = getCombatantRoundRating(enemy);
  const winRate = clampRate(
    0.5
      + ((playerRating - enemyRating) / Math.max(1, enemyRating * 2.1))
      + ((attackCheck.total - attackCheck.dc) * 0.018)
      + (initiative.margin * 0.006)
  );

  return {
    encounter,
    itemSupport,
    initiative,
    attackCheck,
    player,
    enemy,
    winRate
  };
}

function getPlayerCombatMaxQi(gameState: GameState): number {
  return Math.max(45, Math.round(48 + gameState.currentRealm.level * 7 + getAttributeModifier(gameState.attributes.神识) * 8 + gameState.pathResource.value * 0.18));
}

function getEnemyCombatMaxQi(gameState: GameState, encounter: CombatEncounter): number {
  return Math.max(35, Math.round(38 + gameState.currentRealm.level * 6 + encounter.difficulty * 16));
}

function getTurnCombatTechniqueCost(gameState: GameState): number {
  void gameState;
  return 20;
}

function chooseEnemyCombatAction(combat: TurnCombatState): CombatActionId {
  const hpRatio = getHpRatio(combat.enemy);
  if (combat.enemy.qi >= 20 && (hpRatio <= 0.55 || Math.random() < 0.22)) return 'technique';
  if (hpRatio <= 0.35 && Math.random() < 0.25) return 'defend';
  return 'attack';
}

function applyPlayerDamageToEnemy(enemyHp: number, playerDamage: number): number {
  if (playerDamage <= 0) return enemyHp;
  return playerDamage >= enemyHp ? 0 : enemyHp - playerDamage;
}

function resolveTurnCombatStrike(
  attacker: TurnCombatState['player'],
  target: TurnCombatState['player'],
  turn: number,
  actionId: CombatActionId,
  criticalCandidate: boolean,
  guarded: boolean,
  check?: D20CheckReport
): TurnCombatStrikeResult {
  if (actionId === 'defend' || actionId === 'flee') {
    return createEmptyTurnCombatStrike(target.dodge);
  }

  const roll = rollD20();
  const total = roll + getTurnCombatHitBonus(attacker, actionId, check);
  const hit = roll === 20 || (roll !== 1 && total >= target.dodge);
  const critical = hit && (roll === 20 || criticalCandidate);
  const damage = hit
    ? calculateTurnCombatDamage(attacker.attack, target.defense, turn, actionId, critical, guarded, check)
    : 0;

  return {
    damage,
    hit,
    roll,
    total,
    targetDodge: target.dodge,
    critical
  };
}

function createEmptyTurnCombatStrike(targetDodge: number): TurnCombatStrikeResult {
  return {
    damage: 0,
    hit: false,
    roll: 0,
    total: 0,
    targetDodge,
    critical: false
  };
}

function getTurnCombatHitBonus(
  attacker: TurnCombatState['player'],
  actionId: CombatActionId,
  check?: D20CheckReport
): number {
  const actionBonus = actionId === 'technique' ? 2 : 0;
  const checkBonus = check?.outcome === 'great-success'
    ? 2
    : check?.outcome === 'great-failure'
      ? -2
      : check?.outcome === 'success'
        ? 1
        : 0;

  return Math.max(1, Math.round(Math.sqrt(attacker.attack) + attacker.speed / 5 + actionBonus + checkBonus));
}

function calculateTurnCombatDamage(
  attack: number,
  defense: number,
  turn: number,
  actionId: CombatActionId,
  critical: boolean,
  guarded: boolean,
  check?: D20CheckReport
): number {
  if (actionId === 'defend' || actionId === 'flee') return 0;

  const actionFactor = actionId === 'technique' ? 1.55 : 1;
  const criticalFactor = critical ? 1.42 : 1;
  const guardFactor = guarded ? 0.58 : 1;
  const checkFactor = check?.outcome === 'great-success'
    ? 1.18
    : check?.outcome === 'great-failure'
      ? 0.78
      : check?.outcome === 'success'
        ? 1.06
        : 0.92;
  const turnPressure = Math.min(1.18, 0.95 + turn * 0.025);
  const variance = 0.9 + Math.random() * 0.2;
  const rawDamage = (attack * actionFactor * criticalFactor * checkFactor * turnPressure * variance) - defense * 0.5;

  return Math.max(1, Math.round(rawDamage * guardFactor));
}

function getNextCombatQi(currentQi: number, maxQi: number, actionId: CombatActionId, damage: number): number {
  const delta = actionId === 'technique'
    ? -20
    : actionId === 'defend'
      ? 16
      : actionId === 'flee'
        ? 4
        : 9 + Math.min(8, Math.floor(damage / 14));

  return Math.max(0, Math.min(maxQi, currentQi + delta));
}

function getEnemyTurnCriticalChance(combat: TurnCombatState): number {
  return Math.min(0.16, 0.05 + getCombatantRoundRating(combat.enemy) / Math.max(1, getCombatantRoundRating(combat.player)) * 0.035);
}

function shouldFinishTurnCombat(combat: TurnCombatState): boolean {
  return combat.player.hp <= 0 || combat.enemy.hp <= 0 || combat.turn > combat.maxTurns;
}

function getHpRatio(combatant: TurnCombatState['player']): number {
  return combatant.maxHp > 0 ? combatant.hp / combatant.maxHp : 0;
}

function getTurnCombatRawResult(combat: TurnCombatState, isWin: boolean, escaped: boolean): GameEvent['result'] {
  if (escaped) return 'failure';
  if (isWin) {
    if (combat.enemy.hp <= 0 && getHpRatio(combat.player) >= 0.48) return 'great-success';
    return 'success';
  }

  if (combat.player.hp <= 0 || getHpRatio(combat.player) <= 0.18) return 'great-failure';
  return 'failure';
}

function buildTurnCombatReport(
  gameState: GameState,
  combat: TurnCombatState,
  rawResult: GameEvent['result'],
  isWin: boolean,
  escaped: boolean
): CombatReport {
  const playerHpLossRatio = 1 - getHpRatio(combat.player);
  const baseInjury = escaped
    ? Math.ceil(combat.baseInjury * 0.35 + playerHpLossRatio * 10)
    : isWin
      ? Math.ceil(combat.baseInjury * 0.45 + playerHpLossRatio * 12)
      : Math.ceil(combat.baseInjury + playerHpLossRatio * 22);
  const injuryScale = rawResult === 'great-failure'
    ? 1.35
    : rawResult === 'great-success'
      ? 0.65
      : 1;
  const injuryChange = Math.max(0, Math.round(baseInjury * injuryScale * combat.itemSupportInjuryMultiplier * getFeatInjuryMultiplier(gameState) * getSpellInjuryMultiplier(gameState)));
  const injuryAfter = Math.max(0, Math.min(100, gameState.combatStats.injury + injuryChange));
  const cultivationPercent = escaped
    ? -Math.max(1, Math.ceil(combat.cultivationPercent * 0.18))
    : isWin
      ? Math.round(combat.cultivationPercent * (rawResult === 'great-success' ? 1.45 : 1))
      : -Math.max(3, Math.ceil(combat.cultivationPercent * (rawResult === 'great-failure' ? 0.65 : 0.35)));
  const resultText = escaped
    ? `你判断局势不利，从${combat.enemyName}手中脱身，保住了大半状态。`
    : getCombatResultText(rawResult, combat.enemyName);

  return {
    enemyName: combat.enemyName,
    enemyRank: combat.enemyRank,
    playerRating: getCombatantRoundRating(combat.player),
    enemyRating: getCombatantRoundRating(combat.enemy),
    winRate: combat.winRate,
    injuryChange,
    injuryAfter,
    cultivationPercent,
    resultText,
    styleText: combat.styleText,
    playerMaxHp: combat.player.maxHp,
    enemyMaxHp: combat.enemy.maxHp,
    playerHpAfter: combat.player.hp,
    enemyHpAfter: combat.enemy.hp,
    playerAttack: combat.player.attack,
    playerDefense: combat.player.defense,
    playerDodge: combat.player.dodge,
    playerSpeed: combat.player.speed,
    enemyAttack: combat.enemy.attack,
    enemyDefense: combat.enemy.defense,
    enemyDodge: combat.enemy.dodge,
    enemySpeed: combat.enemy.speed,
    initiative: combat.initiative,
    attackCheck: combat.attackCheck,
    ...(combat.itemSupportText && !escaped ? { supportText: combat.itemSupportText } : {}),
    rounds: combat.rounds
  };
}

function getTurnPlayerActionText(
  gameState: GameState,
  actionId: CombatActionId,
  strike: TurnCombatStrikeResult,
  guarded: boolean
): string {
  const criticalText = strike.critical ? '，破势暴击' : '';
  if (actionId === 'defend') return '沉气守御，化开来势';
  if (!strike.hit) return `${getCombatPathRoundAction(gameState)}，命中 ${strike.total}/${strike.targetDodge}，被敌手闪避`;
  if (actionId === 'technique') return `${getCombatPathRoundAction(gameState)}，催动功法造成 ${strike.damage} 伤害${criticalText}`;
  if (guarded) return `稳中求进，造成 ${strike.damage} 伤害`;
  return `正面出手，造成 ${strike.damage} 伤害${criticalText}`;
}

function getTurnEnemyActionText(
  combat: TurnCombatState,
  actionId: CombatActionId,
  strike: TurnCombatStrikeResult,
  guarded: boolean
): string {
  const criticalText = strike.critical ? '，凶势暴起' : '';
  if (actionId === 'defend') return `${combat.enemyName}收势护身`;
  if (!strike.hit) return `${combat.enemyName}命中 ${strike.total}/${strike.targetDodge}，被你闪避`;
  if (actionId === 'technique') return `${combat.enemyName}催动杀招，造成 ${strike.damage} 伤害${criticalText}`;
  if (guarded) return `${combat.enemyName}架势沉稳，造成 ${strike.damage} 伤害`;
  return `${combat.enemyName}攻来，造成 ${strike.damage} 伤害${criticalText}`;
}

function getTurnCombatActionSummary(actionId: CombatActionId): string {
  switch (actionId) {
    case 'defend':
      return '转入守势';
    case 'technique':
      return '催动功法';
    case 'flee':
      return '尝试脱身';
    case 'attack':
    default:
      return '正面进攻';
  }
}

function getCombatItemSupport(gameState: GameState): CombatItemSupport {
  const support: CombatItemSupport = {
    offenseMultiplier: 1,
    injuryMultiplier: 1,
    consumed: []
  };
  const hasItem = (itemId: string) => (gameState.inventory.find(item => item.itemId === itemId)?.quantity ?? 0) > 0;

  if (hasItem('spirit-blade')) {
    support.offenseMultiplier *= 1.08;
    support.consumed.push({ itemId: 'spirit-blade', quantity: 1 });
  }

  if (hasItem('protection-talisman')) {
    support.injuryMultiplier *= 0.82;
    support.consumed.push({ itemId: 'protection-talisman', quantity: 1 });
  } else if (hasItem('minor-ward')) {
    support.injuryMultiplier *= 0.88;
    support.consumed.push({ itemId: 'minor-ward', quantity: 1 });
  }

  if (support.consumed.length > 0) {
    support.text = `消耗${support.consumed.map(cost => getItem(cost.itemId)?.name ?? cost.itemId).join('、')}助战`;
  }

  return support;
}

function calculateInitiativeReport(
  gameState: GameState,
  encounter: CombatEncounter,
  itemSupport: CombatItemSupport
): NonNullable<CombatReport['initiative']> {
  const pathBonus = gameState.cultivationPath === 'sword'
    ? 2
    : gameState.cultivationPath === 'spell' || gameState.cultivationPath === 'demonic'
      ? 1
      : 0;
  const injuryPenalty = gameState.combatStats.injury >= 70
    ? -3
    : gameState.combatStats.injury >= 40
      ? -1
      : 0;
  const itemBonus = itemSupport.consumed.some(item => item.itemId === 'spirit-blade') ? 1 : 0;
  const bonus = Math.floor(getAttributeModifier(gameState.attributes.气运) / 2)
    + pathBonus
    + injuryPenalty
    + itemBonus
    + getFeatInitiativeBonus(gameState)
    + getSpellInitiativeBonus(gameState);
  const player = performD20Check(gameState, {
    label: '先攻检定',
    attribute: '神识',
    dc: 12 + gameState.currentRealm.level,
    mode: gameState.combatStats.injury >= 70 ? 'disadvantage' : 'normal',
    bonus,
    sourceText: '气运、流派、专长与术式',
    greatSuccessOn19: hasGreatSuccessOn19(gameState),
    reduceGreatFailure: hasGreatFailureReduction(gameState)
  });
  const enemyRoll = rollD20();
  const enemyBonus = Math.max(1, Math.round(gameState.currentRealm.level + encounter.difficulty * 2));
  const enemyTotal = enemyRoll + enemyBonus;
  const margin = player.total - enemyTotal;
  const resultText = margin >= 10
    ? '你抢占先机，第一合几乎压住敌势。'
    : margin > 0
      ? '你略快一步，先手展开道法。'
      : margin <= -10
        ? '敌手抢得先机，你第一合被迫转守。'
        : margin < 0
          ? '敌手略先出手，你仓促接招。'
          : '双方同时起势，第一合正面相撞。';

  return {
    player,
    enemyRoll,
    enemyBonus,
    enemyTotal,
    margin,
    resultText
  };
}

function performCombatAttackCheck(
  gameState: GameState,
  encounter: CombatEncounter,
  itemSupport: CombatItemSupport,
  initiative: NonNullable<CombatReport['initiative']>
): D20CheckReport {
  const attribute = encounter.primary[0] ?? '根骨';
  const dc = Math.round(12 + gameState.currentRealm.level + encounter.difficulty * 3);
  const initiativeBonus = initiative.margin >= 10
    ? 2
    : initiative.margin > 0
      ? 1
      : initiative.margin <= -10
        ? -2
        : initiative.margin < 0
          ? -1
          : 0;
  const itemBonus = itemSupport.offenseMultiplier > 1 ? 1 : 0;

  return performD20Check(gameState, {
    label: '攻势检定',
    attribute,
    dc,
    mode: initiative.margin >= 10 ? 'advantage' : initiative.margin <= -10 ? 'disadvantage' : 'normal',
    bonus: initiativeBonus + itemBonus + getFeatCheckBonus(gameState, { id: 'combat-check', type: 'combat' } as GameEvent) + getSpellCheckBonus(gameState, { id: 'combat-check', type: 'combat' } as GameEvent),
    sourceText: '先攻、专长、术式与助战物品',
    greatSuccessOn19: hasGreatSuccessOn19(gameState),
    reduceGreatFailure: hasGreatFailureReduction(gameState)
  });
}

function calculatePlayerCombatStats(
  gameState: GameState,
  encounter: CombatEncounter,
  itemSupport: CombatItemSupport,
  attackCheck: D20CheckReport,
  initiativeMultiplier: number
): CombatantStats {
  const { attributes } = gameState;
  const level = gameState.currentRealm.level;
  const pathHpBonus = gameState.cultivationPath === 'body' ? 1.18 : gameState.cultivationPath === 'spell' ? 0.94 : 1;
  const pathAttackBonus = gameState.cultivationPath === 'sword' ? 1.12 : gameState.cultivationPath === 'demonic' ? 1.1 : 1;
  const pathDefenseBonus = gameState.cultivationPath === 'body' ? 1.14 : gameState.cultivationPath === 'spell' ? 1.06 : 1;
  const injuryPenalty = Math.max(0.72, 1 - gameState.combatStats.injury / 180);
  const primaryBonus = encounter.primary.reduce((sum, key) => sum + attributes[key] * 0.08, 0);
  const offenseMultiplier = getSpiritRootOffenseBonus(gameState.spiritRoot?.id)
    * getCombatPathOffenseMultiplier(gameState, encounter)
    * getTechniqueOffenseMultiplier(gameState)
    * getPathResourceOffenseMultiplier(gameState)
    * getFeatOffenseMultiplier(gameState)
    * getSpellOffenseMultiplier(gameState)
    * itemSupport.offenseMultiplier
    * initiativeMultiplier;
  const hp = (90 + level * 28 + attributes.根骨 * 1.35 + attributes.神识 * 0.42) * pathHpBonus * injuryPenalty;
  const attack = (18 + level * 8 + attributes.根骨 * 0.34 + attributes.神识 * 0.18 + attributes.悟性 * 0.16 + primaryBonus) * pathAttackBonus * offenseMultiplier * injuryPenalty;
  const defense = (10 + level * 5 + attributes.根骨 * 0.2 + attributes.神识 * 0.16 + attributes.气运 * 0.08) * pathDefenseBonus * Math.sqrt(offenseMultiplier);
  const speed = 10 + getAttributeModifier(attributes.神识) * 2 + getAttributeModifier(attributes.气运) + attackCheck.bonus;
  const dodge = 10
    + getRealmProficiencyBonus(level)
    + getAttributeModifier(attributes.神识)
    + Math.floor(getAttributeModifier(attributes.气运) / 2)
    + getCombatPathDodgeBonus(gameState)
    + getCombatInjuryDodgePenalty(gameState);

  return {
    hp: Math.max(60, Math.round(hp)),
    attack: Math.max(8, Math.round(attack)),
    defense: Math.max(4, Math.round(defense)),
    dodge: Math.max(8, Math.round(dodge)),
    speed: Math.max(1, Math.round(speed))
  };
}

function calculateEnemyCombatStats(
  gameState: GameState,
  encounter: CombatEncounter,
  initiativeMultiplier: number
): CombatantStats {
  const level = gameState.currentRealm.level;
  const pressureMultiplier = getSpellEnemyOffenseMultiplier(gameState) * initiativeMultiplier;
  const difficulty = encounter.difficulty * pressureMultiplier;

  return {
    hp: Math.max(70, Math.round((105 + level * 35) * difficulty)),
    attack: Math.max(10, Math.round((22 + level * 11) * difficulty)),
    defense: Math.max(5, Math.round((12 + level * 6) * Math.sqrt(difficulty))),
    dodge: Math.max(9, Math.round(10 + getRealmProficiencyBonus(level) + encounter.difficulty * 3 + Math.floor(level / 3))),
    speed: Math.max(1, Math.round(9 + level + difficulty * 4))
  };
}

function getCombatantRoundRating(combatant: CombatantStats | TurnCombatState['player']): number {
  const hpRatio = 'maxHp' in combatant && combatant.maxHp > 0 ? combatant.hp / combatant.maxHp : 1;
  return Math.max(1, Math.round((combatant.attack * 2.2 + combatant.defense * 1.6 + combatant.dodge * 2.2 + combatant.hp * 0.28 + combatant.speed * 2) * hpRatio));
}

function getCombatPathDodgeBonus(gameState: GameState): number {
  switch (gameState.cultivationPath) {
    case 'sword':
      return 1;
    case 'spell':
      return gameState.pathResource.value >= 60 ? 2 : 1;
    case 'demonic':
      return 1;
    case 'body':
    default:
      return 0;
  }
}

function getCombatInjuryDodgePenalty(gameState: GameState): number {
  if (gameState.combatStats.injury >= 70) return -4;
  if (gameState.combatStats.injury >= 40) return -2;
  return 0;
}

function getCombatCriticalChance(gameState: GameState): number {
  const base = gameState.cultivationPath === 'sword'
    ? 0.11
    : gameState.cultivationPath === 'demonic'
      ? 0.1
      : 0.06;
  return Math.min(0.18, base + gameState.pathResource.value / 1000);
}

function getCombatPathRoundAction(gameState: GameState): string {
  switch (gameState.cultivationPath) {
    case 'sword':
      return '以剑意抢先破势';
    case 'body':
      return '鼓动气血正面硬撼';
    case 'spell':
      return '铺开术式封锁退路';
    case 'demonic':
      return '催动魔念夺其气机';
    default:
      return '凝神应敌';
  }
}

function applyYearActionSideEffects(gameState: GameState, event: GameEvent): GameState {
  if (event.id.startsWith('year-action-life-skill-')) {
    const skillId = event.id.replace('year-action-life-skill-', '').split('-').slice(0, -1).join('-') as LifeSkillId;
    const expGain = Math.round(10 * getPathLifeSkillExpMultiplier(gameState, skillId));
    return {
      ...gameState,
      lifeSkills: addLifeSkillExp(gameState.lifeSkills, skillId, expGain)
    };
  }

  return gameState;
}

function updateRivalAfterCombat(gameState: GameState, event: GameEvent, isWin: boolean): GameState {
  const isRivalFight = event.id.includes('rival');
  const currentRival = gameState.rival;

  if (isRivalFight && currentRival?.active) {
    const nextEnmity = isWin
      ? Math.max(0, currentRival.enmity - 4)
      : Math.min(20, currentRival.enmity + 3);
    const nextRival = {
      ...currentRival,
      enmity: nextEnmity,
      defeats: currentRival.defeats + (isWin ? 1 : 0),
      active: nextEnmity > 0
    };
    return appendLastEventDescription({
      ...gameState,
      rival: nextRival
    }, formatRivalAftermath(currentRival, nextRival, isWin));
  }

  const rivalFormationChance = gameState.cultivationPath === 'demonic'
    ? 0.34
    : gameState.cultivationPath === 'sword'
      ? 0.18
      : 0.22;
  if (!isWin && event.type === 'combat' && Math.random() < rivalFormationChance) {
    const nextRival = strengthenRival(currentRival);
    return {
      ...gameState,
      rival: nextRival,
      events: appendEventDescription(
        gameState.events,
        currentRival
          ? `此败让${nextRival.name}声势更盛，仇怨升至 ${nextRival.enmity}。`
          : `${nextRival.name}记下你的破绽，自此成了绕不开的宿敌。`
      )
    };
  }

  if (isWin && currentRival?.active && Math.random() < 0.08) {
    const nextRival = {
      ...currentRival,
      enmity: Math.min(20, currentRival.enmity + 1)
    };
    return appendLastEventDescription({
      ...gameState,
      rival: nextRival
    }, `${currentRival.name}虽未现身，却借此战再添怨气，仇怨升至 ${nextRival.enmity}。`);
  }

  return gameState;
}

function appendLastEventDescription(gameState: GameState, extraText: string): GameState {
  return {
    ...gameState,
    events: appendEventDescription(gameState.events, extraText)
  };
}

function appendEventDescription(events: GameEvent[], extraText: string): GameEvent[] {
  if (events.length === 0) return events;

  return events.map((event, index) => index === events.length - 1
    ? { ...event, description: `${event.description}${extraText}` }
    : event
  );
}

function formatRivalAftermath(before: RivalState, after: RivalState, isWin: boolean): string {
  if (!after.active) {
    return `${before.name}被你彻底压服，这段宿怨暂告了结。`;
  }

  if (isWin) {
    return `你挫了${before.name}的锋芒，仇怨降至 ${after.enmity}。`;
  }

  return `${before.name}乘胜逼迫，仇怨升至 ${after.enmity}。`;
}

function strengthenRival(rival: RivalState | null): RivalState {
  if (!rival) {
    return {
      name: pickRivalName(),
      enmity: 5,
      defeats: 0,
      active: true
    };
  }

  return {
    ...rival,
    enmity: Math.min(20, rival.enmity + 3),
    active: true
  };
}

function pickRivalName(): string {
  const names = ['沈无咎', '陆青崖', '顾寒舟', '萧问锋', '林照影', '秦玄策'];
  return names[Math.floor(Math.random() * names.length)];
}

function getCombatEncounter(gameState: GameState, event: GameEvent): CombatEncounter {
  const encounters: Record<string, CombatEncounter> = {
    'combat-beast-hunt': {
      enemyName: '山魈妖兽',
      enemyRank: '同阶下位',
      difficulty: 0.88,
      cultivationPercent: 7,
      injury: 5,
      primary: ['根骨', '神识'],
      styleText: '林中缠斗'
    },
    'combat-caravan-escort': {
      enemyName: '劫道散修',
      enemyRank: '同阶',
      difficulty: 0.95,
      cultivationPercent: 7,
      injury: 6,
      primary: ['根骨', '气运'],
      styleText: '护阵反击'
    },
    'combat-arena-duel': {
      enemyName: '同门劲敌',
      enemyRank: '同阶',
      difficulty: 1,
      cultivationPercent: 8,
      injury: 4,
      primary: ['根骨', '神识', '悟性'],
      styleText: '擂台斗法'
    },
    'combat-demonic-cultivator': {
      enemyName: '血法邪修',
      enemyRank: '同阶上位',
      difficulty: 1.12,
      cultivationPercent: 9,
      injury: 8,
      primary: ['根骨', '神识', '气运'],
      styleText: '破阵斩邪'
    },
    'combat-sword-contest': {
      enemyName: '试剑修士',
      enemyRank: '同阶上位',
      difficulty: 1.08,
      cultivationPercent: 10,
      injury: 7,
      primary: ['根骨', '神识'],
      styleText: '剑意对撞'
    },
    'combat-ancient-beast': {
      enemyName: '古兽遗种',
      enemyRank: '越阶强敌',
      difficulty: 1.32,
      cultivationPercent: 12,
      injury: 12,
      primary: ['根骨', '神识', '气运'],
      styleText: '险死搏杀'
    },
    'combat-ambush': {
      enemyName: '伏杀散修',
      enemyRank: '同阶上位',
      difficulty: 1.08,
      cultivationPercent: 8,
      injury: 9,
      primary: ['神识', '气运'],
      styleText: '仓促突围'
    },
    'combat-heart-devil': {
      enemyName: '识海心魔',
      enemyRank: '心劫',
      difficulty: 1.18,
      cultivationPercent: 9,
      injury: 10,
      primary: ['神识', '悟性', '气运'],
      styleText: '心神交锋'
    },
    'combat-bandit-camp': {
      enemyName: '山寨匪首',
      enemyRank: '同阶下位',
      difficulty: 0.9,
      cultivationPercent: 6,
      injury: 5,
      primary: ['根骨', '气运'],
      styleText: '夜袭破寨'
    },
    'combat-mine-fiend': {
      enemyName: '矿洞妖影',
      enemyRank: '同阶',
      difficulty: 1,
      cultivationPercent: 8,
      injury: 7,
      primary: ['根骨', '神识'],
      styleText: '狭洞缠斗'
    },
    'combat-ghost-market-raid': {
      enemyName: '夺宝遁修',
      enemyRank: '同阶上位',
      difficulty: 1.1,
      cultivationPercent: 9,
      injury: 8,
      primary: ['神识', '气运', '悟性'],
      styleText: '长街追袭'
    },
    'combat-tribulation-beast': {
      enemyName: '劫纹异兽',
      enemyRank: '越阶强敌',
      difficulty: 1.28,
      cultivationPercent: 12,
      injury: 12,
      primary: ['根骨', '神识', '气运'],
      styleText: '雷痕鏖战'
    },
    'choice-combat-resource-thief': {
      enemyName: '黑市窃修',
      enemyRank: '同阶',
      difficulty: 1.02,
      cultivationPercent: 8,
      injury: 7,
      primary: ['神识', '气运'],
      styleText: '追赃缠斗'
    },
    'choice-combat-rival-duel': {
      enemyName: '结怨修士',
      enemyRank: '同阶',
      difficulty: 1.05,
      cultivationPercent: 8,
      injury: 6,
      primary: ['根骨', '神识'],
      styleText: '斗法台决'
    },
    'rival-ambush': {
      enemyName: gameState.rival?.name ?? '宿敌',
      enemyRank: '同阶劲敌',
      difficulty: 1.16 + Math.min(0.18, (gameState.rival?.enmity ?? 0) * 0.01),
      cultivationPercent: 12,
      injury: 10,
      primary: ['根骨', '神识', '悟性'],
      styleText: '宿怨追杀'
    },
    'mid-combat-infant-fire-demon': {
      enemyName: '地火妖王',
      enemyRank: '同阶上位',
      difficulty: 1.1,
      cultivationPercent: 11,
      injury: 8,
      primary: ['根骨', '神识'],
      styleText: '婴火熔甲'
    },
    'mid-combat-break-demon-array': {
      enemyName: '阵中魔念',
      enemyRank: '诡阵心劫',
      difficulty: 1.05,
      cultivationPercent: 9,
      injury: 6,
      primary: ['神识', '悟性'],
      styleText: '拆阵伏魔'
    },
    'mid-combat-night-demon-king': {
      enemyName: '夜行妖王',
      enemyRank: '同阶上位',
      difficulty: 1.14,
      cultivationPercent: 12,
      injury: 9,
      primary: ['根骨', '气运'],
      styleText: '长街速斩'
    },
    'mid-combat-spirit-boat-raid': {
      enemyName: '劫舟散修',
      enemyRank: '同阶',
      difficulty: 0.98,
      cultivationPercent: 9,
      injury: 6,
      primary: ['气运', '根骨'],
      styleText: '云海护舟'
    },
    'mid-combat-secret-realm-guardian': {
      enemyName: '秘境守灵',
      enemyRank: '同阶上位',
      difficulty: 1.08,
      cultivationPercent: 11,
      injury: 7,
      primary: ['神识', '气运'],
      styleText: '禁制护法'
    },
    'mid-combat-canyon-rival': {
      enemyName: '峡谷旧敌',
      enemyRank: '同阶',
      difficulty: 1.02,
      cultivationPercent: 10,
      injury: 7,
      primary: ['根骨', '悟性'],
      styleText: '借势斗修'
    },
    'mid-combat-capture-banner': {
      enemyName: '演武魁首',
      enemyRank: '同阶',
      difficulty: 0.92,
      cultivationPercent: 8,
      injury: 4,
      primary: ['神识', '悟性', '气运'],
      styleText: '夺旗演武'
    },
    'mid-combat-thunder-marsh-breakout': {
      enemyName: '雷泽泥蛟',
      enemyRank: '越阶险境',
      difficulty: 1.22,
      cultivationPercent: 13,
      injury: 11,
      primary: ['根骨', '气运'],
      styleText: '雷泽突围'
    },
    'mid-combat-demon-cave-purge': {
      enemyName: '炼魂邪修',
      enemyRank: '同阶上位',
      difficulty: 1.16,
      cultivationPercent: 12,
      injury: 10,
      primary: ['神识', '根骨'],
      styleText: '断祭清窟'
    },
    'mid-combat-ruined-city-watch': {
      enemyName: '荒城阴兵',
      enemyRank: '群敌围困',
      difficulty: 1.04,
      cultivationPercent: 10,
      injury: 7,
      primary: ['神识', '气运', '悟性'],
      styleText: '守井破阴'
    },
    'late-combat-law-domain-duel': {
      enemyName: '法域大修',
      enemyRank: '同阶上位',
      difficulty: 1.12,
      cultivationPercent: 12,
      injury: 8,
      primary: ['神识', '悟性'],
      styleText: '法域对轰'
    },
    'late-combat-heavenly-demon-gate': {
      enemyName: '叩关天魔',
      enemyRank: '心劫强敌',
      difficulty: 1.2,
      cultivationPercent: 11,
      injury: 10,
      primary: ['神识', '气运', '悟性'],
      styleText: '心关拒魔'
    },
    'late-combat-great-demon-siege': {
      enemyName: '围山大妖',
      enemyRank: '群敌压境',
      difficulty: 1.15,
      cultivationPercent: 13,
      injury: 10,
      primary: ['根骨', '神识'],
      styleText: '护山斩妖'
    },
    'late-combat-star-sea-array': {
      enemyName: '星阵敌修',
      enemyRank: '阵道强敌',
      difficulty: 1.08,
      cultivationPercent: 12,
      injury: 7,
      primary: ['悟性', '神识'],
      styleText: '星位斗阵'
    },
    'late-combat-king-court-lord': {
      enemyName: '王庭之主',
      enemyRank: '越阶强敌',
      difficulty: 1.32,
      cultivationPercent: 15,
      injury: 13,
      primary: ['根骨', '气运', '神识'],
      styleText: '血脉决战'
    },
    'late-combat-tribulation-guardian': {
      enemyName: '劫前袭杀者',
      enemyRank: '同阶上位',
      difficulty: 1.06,
      cultivationPercent: 11,
      injury: 7,
      primary: ['神识', '气运'],
      styleText: '洞府护道'
    },
    'late-combat-cloud-sea-decisive': {
      enemyName: '云海宿敌',
      enemyRank: '同阶上位',
      difficulty: 1.18,
      cultivationPercent: 14,
      injury: 11,
      primary: ['根骨', '神识', '气运'],
      styleText: '云海死斗'
    },
    'late-combat-boundary-pursuit': {
      enemyName: '破界遁修',
      enemyRank: '乱流险敌',
      difficulty: 1.24,
      cultivationPercent: 15,
      injury: 12,
      primary: ['神识', '气运'],
      styleText: '界缝追袭'
    },
    'late-combat-thunder-prison-brawl': {
      enemyName: '雷狱凶影',
      enemyRank: '越阶险境',
      difficulty: 1.38,
      cultivationPercent: 16,
      injury: 15,
      primary: ['根骨', '神识'],
      styleText: '雷狱搏杀'
    }
  };

  return encounters[event.id] ?? {
    enemyName: event.title,
    enemyRank: '同阶',
    difficulty: 1,
    cultivationPercent: 8,
    injury: 6,
    primary: ['根骨', '神识'],
    styleText: '正面交锋'
  };
}

function getSpiritRootOffenseBonus(spiritRootId: string | undefined): number {
  switch (spiritRootId) {
    case 'sword-root':
      return 1.1;
    case 'thunder-root':
      return 1.08;
    case 'fire-root':
    case 'dual-wood-fire-root':
    case 'dual-fire-earth-root':
      return 1.05;
    case 'tiandao-root':
      return 1.08;
    case 'chaos-root':
      return 1.12;
    default:
      return 1;
  }
}

function getCombatPathOffenseMultiplier(gameState: GameState, encounter: CombatEncounter): number {
  switch (gameState.cultivationPath) {
    case 'sword':
      return encounter.primary.includes('根骨') ? 1.16 : 1.1;
    case 'body':
      return 1.12;
    case 'spell':
      return encounter.primary.includes('神识') || encounter.primary.includes('悟性') ? 1.14 : 1.06;
    case 'demonic':
      return 1.08;
    default:
      return 1;
  }
}

function getFeatOffenseMultiplier(gameState: GameState): number {
  return gameState.feats.reduce((multiplier, featId) => {
    const feat = getFeat(featId);
    return multiplier * (feat?.bonuses.offenseMultiplier ?? 1);
  }, 1);
}

function getSpellOffenseMultiplier(gameState: GameState): number {
  return gameState.equippedSpellIds.reduce((multiplier, spellId) => {
    const spell = getSpell(spellId);
    return multiplier * (spell?.bonuses.offenseMultiplier ?? 1);
  }, 1);
}

function getSpellEnemyOffenseMultiplier(gameState: GameState): number {
  return gameState.equippedSpellIds.reduce((multiplier, spellId) => {
    const spell = getSpell(spellId);
    return multiplier * (spell?.bonuses.enemyOffenseMultiplier ?? 1);
  }, 1);
}

function getFeatInitiativeBonus(gameState: GameState): number {
  return gameState.feats.reduce((sum, featId) => sum + (getFeat(featId)?.bonuses.initiativeBonus ?? 0), 0);
}

function getSpellInitiativeBonus(gameState: GameState): number {
  return gameState.equippedSpellIds.reduce((sum, spellId) => sum + (getSpell(spellId)?.bonuses.initiativeBonus ?? 0), 0);
}

function getFeatInjuryMultiplier(gameState: GameState): number {
  return gameState.feats.reduce((multiplier, featId) => {
    const feat = getFeat(featId);
    return multiplier * (feat?.bonuses.injuryMultiplier ?? 1);
  }, 1);
}

function getSpellInjuryMultiplier(gameState: GameState): number {
  return gameState.equippedSpellIds.reduce((multiplier, spellId) => {
    const spell = getSpell(spellId);
    return multiplier * (spell?.bonuses.injuryMultiplier ?? 1);
  }, 1);
}

function getTechniqueOffenseMultiplier(gameState: GameState): number {
  const bonus = gameState.techniques.reduce((sum, learnedTechnique) => {
    const technique = getTechnique(learnedTechnique.techniqueId);
    if (!technique) return sum;

    return sum + learnedTechnique.level * technique.offensePerLevel;
  }, 0);
  const buildSynergy = getTechniqueBuildSynergy(gameState);

  return Math.min(1.65, 1 + bonus + buildSynergy);
}

function getTechniqueBuildSynergy(gameState: GameState): number {
  const ownedTechniques = gameState.techniques
    .map(learnedTechnique => getTechnique(learnedTechnique.techniqueId))
    .filter((technique): technique is TechniqueDefinition => !!technique);
  const ownPathTechniques = ownedTechniques.filter(technique => technique.pathId === gameState.cultivationPath);
  const gradeCount = new Set(ownPathTechniques.map(technique => technique.grade)).size;
  const totalLevel = gameState.techniques.reduce((sum, learnedTechnique) => sum + learnedTechnique.level, 0);
  const gradeChainBonus = Math.max(0, gradeCount - 1) * 0.025;
  const masteryBonus = totalLevel >= 18 ? 0.04 : totalLevel >= 10 ? 0.025 : totalLevel >= 5 ? 0.012 : 0;

  return Math.min(0.14, gradeChainBonus + masteryBonus);
}

function getCombatPathStyle(gameState: GameState): string {
  switch (gameState.cultivationPath) {
    case 'sword':
      return '剑意抢攻';
    case 'body':
      return '肉身硬撼';
    case 'spell':
      return '术法控场';
    case 'demonic':
      return '夺势掠杀';
    default:
      return '临阵应敌';
  }
}

function scaleCombatBaseEffects(
  effects: GameEvent['effects'],
  result: GameEvent['result']
): GameEvent['effects'] {
  const positiveScale = result === 'great-success'
    ? 1.75
    : result === 'success'
      ? 1
      : result === 'great-failure'
        ? 0.35
        : 1;
  const negativeScale = result === 'great-success'
    ? 0.35
    : result === 'success'
      ? 1
      : result === 'great-failure'
        ? 1.75
        : 1;
  const scaledEffects: GameEvent['effects'] = {};

  Object.entries(effects).forEach(([key, value]) => {
    if (typeof value !== 'number') {
      (scaledEffects as Record<string, typeof value>)[key] = value;
      return;
    }

    const scale = value >= 0 ? positiveScale : negativeScale;
    const scaledValue = value >= 0 ? Math.floor(value * scale) : Math.ceil(value * scale);

    if (scaledValue !== 0) {
      (scaledEffects as Record<string, number>)[key] = scaledValue;
    }
  });

  return scaledEffects;
}

function getCombatRewardEffects(
  gameState: GameState,
  report: CombatReport,
  result: GameEvent['result'],
  isWin: boolean
): GameEvent['effects'] {
  const injuryLifespanLoss = Math.max(0, Math.ceil(report.injuryChange / 4));
  const focusGain = result === 'great-success' ? 3 : isWin ? 1 : 0;

  return mergeEffects({
    修为: report.cultivationPercent,
    ...(!isWin && injuryLifespanLoss > 0 ? { 寿命: -injuryLifespanLoss } : {}),
    ...(focusGain > 0 ? { 根骨: focusGain, 神识: Math.max(1, focusGain - 1) } : {})
  }, getCombatPathRewardEffects(gameState, isWin, result));
}

function getCombatPathRewardEffects(
  gameState: GameState,
  isWin: boolean,
  result: GameEvent['result']
): GameEvent['effects'] {
  if (!isWin) {
    if (gameState.cultivationPath === 'body') return { 根骨: 1 };
    if (gameState.cultivationPath === 'demonic') return { 气运: -1 };
    return {};
  }

  const greatBonus = result === 'great-success' ? 2 : 1;
  switch (gameState.cultivationPath) {
    case 'sword':
      return { 修为: 2 * greatBonus, 根骨: greatBonus };
    case 'body':
      return { 根骨: greatBonus, 寿命: result === 'great-success' ? 1 : 0 };
    case 'spell':
      return { 神识: greatBonus, 悟性: greatBonus };
    case 'demonic':
      return { 修为: 3 * greatBonus, 气运: -1 };
    default:
      return {};
  }
}

function updateCombatStats(
  combatStats: CombatStats,
  report: CombatReport,
  isWin: boolean
): CombatStats {
  const currentStreak = isWin ? combatStats.currentStreak + 1 : 0;

  return {
    victories: combatStats.victories + (isWin ? 1 : 0),
    defeats: combatStats.defeats + (isWin ? 0 : 1),
    injury: report.injuryAfter,
    currentStreak,
    bestStreak: Math.max(combatStats.bestStreak, currentStreak)
  };
}

function recoverCombatInjury(combatStats: CombatStats, realmLevel: number): CombatStats {
  if (combatStats.injury <= 0) return combatStats;

  const recovery = Math.max(2, Math.min(8, 2 + Math.floor(realmLevel / 2)));
  return {
    ...combatStats,
    injury: Math.max(0, combatStats.injury - recovery)
  };
}

function getCombatResultText(result: GameEvent['result'], enemyName: string): string {
  switch (result) {
    case 'great-success':
      return `你几乎没有给${enemyName}喘息之机，破绽一现便定下胜局。`;
    case 'success':
      return `你与${enemyName}鏖战一场，最终稳住阵脚，赢下这次交锋。`;
    case 'great-failure':
      return `${enemyName}凶势太盛，你判断失误，受创后才勉强脱身。`;
    case 'failure':
      return `这一战未能取胜，你付出代价后退走，伤势也压在经脉里。`;
    default:
      return '这场交锋平平收束。';
  }
}

function formatChoiceTitle(choice: EventChoice): string {
  return choice.label;
}

function formatChoiceOutcome(choice: EventChoice): string {
  return `你选择${choice.label}，${choice.outcome}`;
}

type EventOutcomePhase = 'early' | 'mid' | 'late';

function getEventOutcomePhase(gameState: GameState): EventOutcomePhase {
  if (gameState.currentRealm.level >= 7) return 'late';
  if (gameState.currentRealm.level >= 4) return 'mid';
  return 'early';
}

function performEventCheck(
  gameState: GameState,
  event: GameEvent,
  choice: EventChoice | undefined,
  itemSupport: CheckItemSupport
): D20CheckReport {
  const attribute = getEventCheckAttribute(event);
  const dc = getEventCheckDc(gameState, event);
  const choiceBonus = choice?.successModifier ? Math.round(choice.successModifier * 10) : 0;
  const featBonus = getFeatCheckBonus(gameState, event);
  const spellBonus = getSpellCheckBonus(gameState, event);
  const sectBonus = getSectCheckBonus(gameState, event);
  const bonus = choiceBonus + featBonus + spellBonus + sectBonus + itemSupport.bonus;
  const mode = getCheckMode(gameState, event);
  const sourceText = [
    choiceBonus ? '抉择' : '',
    featBonus ? '专长' : '',
    spellBonus ? '术式' : '',
    sectBonus ? '宗门' : '',
    itemSupport.bonus ? '储物戒' : ''
  ].filter(Boolean).join('、');

  return performD20Check(gameState, {
    label: getEventCheckLabel(event),
    attribute,
    dc,
    mode,
    bonus,
    sourceText: sourceText ? `${sourceText}加持` : undefined,
    greatSuccessOn19: hasGreatSuccessOn19(gameState),
    reduceGreatFailure: hasGreatFailureReduction(gameState)
  });
}

function getEventResultFromCheck(
  check: D20CheckReport | undefined,
  isNeutralEvent: boolean,
  phase: EventOutcomePhase,
  eventType: GameEvent['type']
): GameEvent['result'] {
  if (!check) return 'neutral';
  if (check.outcome === 'great-success') return 'great-success';
  if (check.outcome !== 'great-failure') return 'neutral';

  const canGreatFail = phase === 'late'
    ? eventType === 'disaster'
    : phase === 'mid'
      ? eventType === 'disaster' || eventType === 'combat' || Math.random() < 0.35
      : true;

  if (!canGreatFail || isNeutralEvent && Math.random() < 0.55) return 'neutral';
  return 'great-failure';
}

function performD20Check(
  gameState: GameState,
  config: {
    label: string;
    attribute: keyof Attributes;
    dc: number;
    mode?: D20CheckReport['mode'];
    bonus?: number;
    sourceText?: string;
    greatSuccessOn19?: boolean;
    reduceGreatFailure?: boolean;
  }
): D20CheckReport {
  const mode = config.mode ?? 'normal';
  const rolls = mode === 'normal'
    ? [rollD20()]
    : [rollD20(), rollD20()];
  const selectedRoll = mode === 'disadvantage'
    ? Math.min(...rolls)
    : Math.max(...rolls);
  const attributeModifier = getAttributeModifier(gameState.attributes[config.attribute]);
  const proficiencyBonus = getRealmProficiencyBonus(gameState.currentRealm.level);
  const bonus = config.bonus ?? 0;
  const total = selectedRoll + attributeModifier + proficiencyBonus + bonus;
  const naturalGreatSuccess = selectedRoll === 20 || (config.greatSuccessOn19 && selectedRoll >= 19);
  const naturalGreatFailure = selectedRoll === 1 && !config.reduceGreatFailure;
  const outcome = naturalGreatSuccess || total >= config.dc + 10
    ? 'great-success'
    : naturalGreatFailure || total <= config.dc - 10
      ? 'great-failure'
      : total >= config.dc
        ? 'success'
        : 'failure';

  return {
    label: config.label,
    attribute: config.attribute,
    dc: config.dc,
    mode,
    rolls,
    selectedRoll,
    attributeModifier,
    proficiencyBonus,
    bonus,
    total,
    outcome,
    ...(config.sourceText ? { sourceText: config.sourceText } : {})
  };
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

function getAttributeModifier(value: number): number {
  if (value < 10) return -1;
  return Math.max(0, Math.floor(Math.log2(Math.max(10, value) / 10)));
}

function getRealmProficiencyBonus(realmLevel: number): number {
  if (realmLevel <= 2) return 2;
  if (realmLevel <= 4) return 3;
  if (realmLevel <= 6) return 4;
  if (realmLevel <= 8) return 5;
  return 6;
}

function getEventCheckAttribute(event: GameEvent): keyof Attributes {
  switch (event.type) {
    case 'cultivation':
      return event.id.includes('seclusion') || event.id.includes('technique') ? '悟性' : '根骨';
    case 'combat':
      return '根骨';
    case 'encounter':
    case 'resource':
      return '气运';
    case 'social':
    case 'sect':
      return '颜值';
    case 'disaster':
      return event.id.includes('mind') ? '神识' : '根骨';
    case 'mind':
      return '神识';
    case 'daily':
      return '悟性';
    case 'childhood':
    default:
      return '气运';
  }
}

function getEventCheckLabel(event: GameEvent): string {
  const labels: Record<GameEvent['type'], string> = {
    childhood: '幼年',
    cultivation: '修炼',
    combat: '战斗',
    encounter: '机缘',
    social: '交际',
    disaster: '灾劫',
    daily: '日常',
    resource: '资源',
    mind: '心境',
    sect: '宗门'
  };

  return `${labels[event.type]}检定`;
}

function getEventCheckDc(gameState: GameState, event: GameEvent): number {
  const realmPressure = Math.max(0, gameState.currentRealm.level - 1);
  const typePressure = event.type === 'disaster'
    ? 3
    : event.type === 'combat'
      ? 2
      : event.type === 'daily'
        ? -1
        : 0;

  return Math.max(10, 12 + realmPressure + typePressure);
}

function getCheckMode(gameState: GameState, event: GameEvent): D20CheckReport['mode'] {
  const advantage = hasCheckAdvantage(gameState, event);
  const disadvantage = hasCheckDisadvantage(gameState, event);

  if (advantage && !disadvantage) return 'advantage';
  if (disadvantage && !advantage) return 'disadvantage';
  return 'normal';
}

function hasCheckAdvantage(gameState: GameState, event: GameEvent): boolean {
  const fortuneRequirement = gameState.currentRealm.requirements.attributes.气运 ?? 40;
  if (gameState.attributes.气运 >= fortuneRequirement * 1.25) return true;

  switch (gameState.cultivationPath) {
    case 'sword':
      return event.type === 'combat' || event.type === 'cultivation';
    case 'body':
      return event.type === 'combat' || event.type === 'disaster';
    case 'spell':
      return event.type === 'mind' || event.type === 'sect' || event.type === 'daily';
    case 'demonic':
      return event.type === 'encounter' || event.type === 'resource';
    default:
      return false;
  }
}

function hasCheckDisadvantage(gameState: GameState, event: GameEvent): boolean {
  if (gameState.combatStats.injury >= 70 && event.type !== 'social') return true;
  if (event.type === 'disaster' && gameState.attributes.气运 < 30) return true;
  return false;
}

function getFeatCheckBonus(gameState: GameState, event: GameEvent): number {
  return gameState.feats.reduce((sum, featId) => {
    const feat = getFeat(featId);
    if (!feat) return sum;
    if (feat.id === 'fortune-sense' && !['encounter', 'resource', 'sect'].includes(event.type)) return sum;
    if (feat.id === 'hundred-arts-hands' && !['daily', 'resource', 'mind', 'cultivation'].includes(event.type)) return sum;
    return sum + (feat.bonuses.checkBonus ?? 0);
  }, 0);
}

function getSpellCheckBonus(gameState: GameState, event: GameEvent): number {
  return gameState.equippedSpellIds.reduce((sum, spellId) => {
    const spell = getSpell(spellId);
    if (!spell) return sum;
    if (spell.id === 'spell-misty-array' && !['mind', 'sect', 'daily', 'combat'].includes(event.type)) return sum;
    return sum + (spell.bonuses.checkBonus ?? 0);
  }, 0);
}

function getSectCheckBonus(gameState: GameState, event: GameEvent): number {
  if (!gameState.sect) return 0;

  switch (gameState.sect.sectId) {
    case 'loose':
      return event.type === 'encounter' || event.type === 'resource' ? 1 : 0;
    case 'sword-pavilion':
      return event.type === 'combat' || event.type === 'sect' ? 1 : 0;
    case 'alchemy-valley':
      return event.type === 'resource' || event.type === 'daily' ? 1 : 0;
    case 'artifact-hall':
      return event.type === 'resource' || event.type === 'combat' ? 1 : 0;
    case 'talisman-court':
      return event.type === 'disaster' || event.type === 'mind' || event.type === 'sect' ? 1 : 0;
    case 'array-gate':
      return event.type === 'mind' || event.type === 'daily' || event.type === 'sect' ? 1 : 0;
    case 'hehuan-sect':
      return event.type === 'social' || event.type === 'sect' || event.type === 'encounter' ? 2 : 0;
    case 'demonic-sect':
      return event.type === 'combat' || event.type === 'resource' ? 2 : event.type === 'disaster' ? -1 : 0;
    default:
      return 0;
  }
}

function getEventCheckItemSupport(gameState: GameState, event: GameEvent): CheckItemSupport {
  const hasItem = (itemId: string) => (gameState.inventory.find(item => item.itemId === itemId)?.quantity ?? 0) > 0;

  if (['encounter', 'resource', 'social', 'sect'].includes(event.type) && hasItem('fortune-talisman')) {
    return {
      bonus: 2,
      consumed: [{ itemId: 'fortune-talisman', quantity: 1 }],
      text: '你燃起转运符，替这次检定添了一线转机。'
    };
  }

  if (['disaster', 'mind'].includes(event.type) && hasItem('protection-talisman')) {
    return {
      bonus: 2,
      consumed: [{ itemId: 'protection-talisman', quantity: 1 }],
      text: '护身符自行化光，替你挡下一层凶险。'
    };
  }

  return {
    bonus: 0,
    consumed: []
  };
}

function hasGreatSuccessOn19(gameState: GameState): boolean {
  return gameState.feats.some(featId => getFeat(featId)?.bonuses.greatSuccessOn19);
}

function hasGreatFailureReduction(gameState: GameState): boolean {
  return gameState.feats.some(featId => getFeat(featId)?.bonuses.reduceGreatFailure);
}

function getEventChoices(event: GameEvent): EventChoice[] {
  const specificChoices = getSpecificEventChoices(event.id);
  return specificChoices ?? [];
}

function resolveChoiceEffects(gameState: GameState, choice: EventChoice): GameEvent['effects'] {
  const cap = getAttributeCap(gameState.currentRealm);
  const effects = choice.effects ?? {};
  const adjustedEffects: GameEvent['effects'] = {};

  Object.entries(effects).forEach(([key, value]) => {
    if (typeof value !== 'number') return;

    if (key in gameState.attributes && value > 0) {
      const attrKey = key as keyof Attributes;
      const remaining = cap - gameState.attributes[attrKey];
      if (remaining <= 0) return;
      (adjustedEffects as Record<string, number>)[key] = Math.min(value, remaining);
      return;
    }

    (adjustedEffects as Record<string, number>)[key] = value;
  });

  return adjustedEffects;
}

function scaleEventEffectsForChoice(effects: GameEvent['effects'], choice: EventChoice): GameEvent['effects'] {
  const scaledEffects: GameEvent['effects'] = {};

  Object.entries(effects).forEach(([key, value]) => {
    if (typeof value !== 'number') {
      (scaledEffects as Record<string, typeof value>)[key] = value;
      return;
    }

    const scale = value >= 0
      ? choice.positiveScale ?? 1
      : choice.negativeScale ?? 1;
    const scaledValue = value >= 0
      ? Math.floor(value * scale)
      : Math.ceil(value * scale);

    if (scaledValue !== 0) {
      (scaledEffects as Record<string, number>)[key] = scaledValue;
    }
  });

  return scaledEffects;
}

function mergeEffects(...effectsList: GameEvent['effects'][]): GameEvent['effects'] {
  return effectsList.reduce<GameEvent['effects']>((merged, effects) => {
    Object.entries(effects).forEach(([key, value]) => {
      if (typeof value !== 'number') {
        (merged as Record<string, typeof value>)[key] = value;
        return;
      }

      (merged as Record<string, number>)[key] = ((merged as Record<string, number | undefined>)[key] ?? 0) + value;
    });

    return merged;
  }, {});
}

function addLearnedTechniques(
  currentTechniques: LearnedTechnique[],
  techniqueIds: string[]
): LearnedTechnique[] {
  if (techniqueIds.length === 0) return currentTechniques;

  const knownTechniqueIds = new Set(currentTechniques.map(technique => technique.techniqueId));
  const newTechniques = techniqueIds
    .filter(techniqueId => getTechnique(techniqueId) && !knownTechniqueIds.has(techniqueId))
    .map(techniqueId => ({ techniqueId, level: 0 }));

  return [...currentTechniques, ...newTechniques];
}

function getTechniqueTrainingCost(gameState: GameState, technique: TechniqueDefinition): {
  progressCost: number;
  timeCost: number;
} {
  const progressBase = getTechniqueProgressBase(gameState);
  return {
    progressCost: Math.max(1, Math.floor(progressBase * technique.trainCost.修为 / 100)),
    timeCost: Math.max(1, technique.trainCost.时间)
  };
}

function getTechniqueProgressBase(gameState: GameState): number {
  const requiredProgress = getRequiredCultivationProgress(gameState);
  if (requiredProgress > 0) return requiredProgress;

  return Math.max(100, gameState.currentRealm.cultivationRequired);
}

function addInventoryRewards(
  inventory: InventoryEntry[],
  rewards: InventoryReward[]
): InventoryEntry[] {
  if (rewards.length === 0) return inventory;

  const inventoryMap = new Map(inventory.map(entry => [entry.itemId, entry.quantity]));
  rewards.forEach(reward => {
    if (reward.quantity <= 0 || !getItem(reward.itemId)) return;
    inventoryMap.set(reward.itemId, (inventoryMap.get(reward.itemId) ?? 0) + reward.quantity);
  });

  return Array.from(inventoryMap.entries())
    .map(([itemId, quantity]) => ({ itemId, quantity }))
    .filter(entry => entry.quantity > 0);
}

function removeInventoryItem(
  inventory: InventoryEntry[],
  itemId: string,
  quantity: number
): InventoryEntry[] {
  return inventory
    .map(entry => entry.itemId === itemId
      ? { ...entry, quantity: entry.quantity - quantity }
      : entry
    )
    .filter(entry => entry.quantity > 0);
}

function removeInventoryRewards(
  inventory: InventoryEntry[],
  losses: InventoryReward[]
): InventoryEntry[] {
  if (losses.length === 0) return inventory;

  return losses.reduce((currentInventory, loss) => {
    return removeInventoryItem(currentInventory, loss.itemId, loss.quantity);
  }, inventory);
}

function hasInventoryRewards(inventory: InventoryEntry[], costs: InventoryReward[]): boolean {
  return costs.every(cost => {
    const entry = inventory.find(item => item.itemId === cost.itemId);
    return (entry?.quantity ?? 0) >= cost.quantity;
  });
}

function getLifeSkillProgress(gameState: GameState, skillId: LifeSkillId): LifeSkillProgress {
  return gameState.lifeSkills.find(skill => skill.skillId === skillId) ?? {
    skillId,
    level: 1,
    exp: 0
  };
}

function addLifeSkillExp(
  progressList: LifeSkillProgress[],
  skillId: LifeSkillId,
  expGain: number
): LifeSkillProgress[] {
  const existing = progressList.find(progress => progress.skillId === skillId);
  const normalized = existing
    ? progressList
    : [...progressList, { skillId, level: 1, exp: 0 }];

  return normalized.map(progress => {
    if (progress.skillId !== skillId) return progress;

    const nextExp = progress.exp + expGain;
    const nextLevel = Math.min(10, Math.max(progress.level, Math.floor(nextExp / 100) + 1));
    return {
      ...progress,
      exp: nextExp,
      level: nextLevel
    };
  });
}

function selectLifeSkillRecipe(
  recipes: LifeSkillRecipe[],
  skillLevel: number,
  realmLevel: number,
  inventory: InventoryEntry[]
): LifeSkillRecipe | undefined {
  return recipes
    .filter(recipe => skillLevel >= recipe.minSkillLevel
      && realmLevel >= recipe.minRealmLevel
      && hasInventoryRewards(inventory, recipe.costs))
    .sort((a, b) => b.minSkillLevel - a.minSkillLevel || b.minRealmLevel - a.minRealmLevel)[0];
}

function pickYearActionLifeSkill(gameState: GameState) {
  const unlockedSkills = lifeSkills.filter(skill => gameState.currentRealm.level >= skill.minRealmLevel);
  const candidates = unlockedSkills.length > 0 ? unlockedSkills : lifeSkills;
  return candidates
    .map(skill => ({ skill, progress: getLifeSkillProgress(gameState, skill.id) }))
    .sort((a, b) => a.progress.exp - b.progress.exp)[0].skill;
}

function getPathLifeSkillExpMultiplier(gameState: GameState, skillId: LifeSkillId): number {
  switch (gameState.cultivationPath) {
    case 'sword':
      return skillId === 'crafting' ? 1.35 : skillId === 'alchemy' ? 1.12 : 1;
    case 'body':
      return skillId === 'alchemy' || skillId === 'spirit-field' ? 1.25 : 1;
    case 'spell':
      return skillId === 'array' || skillId === 'talisman' ? 1.35 : 1;
    case 'demonic':
      return skillId === 'fishing' || skillId === 'talisman' ? 1.22 : 1.08;
    default:
      return 1;
  }
}

function getPathYearActionBonus(gameState: GameState, actionId: YearActionId): number {
  switch (gameState.cultivationPath) {
    case 'sword':
      return actionId === 'adventure' ? 1.18 : actionId === 'cultivate' ? 1.08 : 1;
    case 'body':
      return actionId === 'cultivate' ? 1.12 : 1;
    case 'spell':
      return actionId === 'seclusion' ? 1.22 : actionId === 'life-skill' ? 1.08 : 1;
    case 'demonic':
      return actionId === 'adventure' || actionId === 'cultivate' ? 1.15 : 1;
    default:
      return 1;
  }
}

function generateYearActionLifeSkillRewards(skillId: LifeSkillId, realmLevel: number): InventoryReward[] {
  const chance = realmLevel >= 4 ? 0.72 : 0.58;
  if (Math.random() > chance) return [];

  switch (skillId) {
    case 'alchemy':
      return rollOneReward([['spirit-herb', 0.62], ['spirit-seed', 0.26], ['spirit-bait', 0.12]]);
    case 'crafting':
      return rollOneReward([['spirit-ore', 0.58], ['beast-core', 0.28], ['array-stone', 0.14]]);
    case 'talisman':
      return rollOneReward([['talisman-paper', 0.7], ['beast-core', 0.18], ['spirit-stone-pouch', 0.12]]);
    case 'array':
      return rollOneReward([['array-stone', 0.62], ['spirit-ore', 0.24], ['talisman-paper', 0.14]]);
    case 'fishing':
      return rollOneReward([['spirit-fish', 0.58], ['spirit-bait', 0.26], ['jade-scale-fish', 0.16]]);
    case 'spirit-field':
      return rollOneReward([['spirit-seed', 0.5], ['spirit-herb', 0.36], ['talisman-paper', 0.14]]);
    default:
      return [];
  }
}

function generateEventItemRewards(event: GameEvent, result: GameEvent['result']): InventoryReward[] {
  if (event.type === 'childhood' || result === 'great-failure' || result === 'failure') return [];

  const chance = result === 'great-success'
    ? 0.85
    : result === 'success'
      ? 0.65
      : 0.22;
  if (Math.random() > chance) return [];

  switch (event.type) {
    case 'encounter':
      return rollOneReward([
        ['old-manual-page', 0.38],
        ['fortune-talisman', 0.22],
        ['spirit-stone-pouch', 0.4]
      ]);
    case 'resource':
      return rollOneReward([
        ['spirit-herb', 0.45],
        ['qi-gathering-pill', 0.2],
        ['spirit-stone-pouch', 0.35]
      ], result === 'great-success' ? 2 : 1);
    case 'sect':
      return rollOneReward([
        ['qi-gathering-pill', 0.4],
        ['bone-tempering-pill', 0.22],
        ['spirit-stone-pouch', 0.38]
      ]);
    default:
      return [];
  }
}

function generateLifeSkillItemRewards(skillId: LifeSkillId, realmLevel: number): InventoryReward[] {
  const rewardChance = realmLevel >= 7 ? 0.72 : realmLevel >= 4 ? 0.62 : 0.48;
  if (Math.random() > rewardChance) return [];

  const quantity = realmLevel >= 7 ? 2 : 1;
  switch (skillId) {
    case 'alchemy':
      return rollOneReward(realmLevel >= 7
        ? [['tribulation-pill', 0.36], ['heaven-soul-jade', 0.24], ['mystic-spirit-pill', 0.4]]
        : realmLevel >= 4
          ? [['mystic-spirit-pill', 0.45], ['dragon-blood-pill', 0.25], ['soul-nourishing-pill', 0.3]]
          : [['qi-gathering-pill', 0.5], ['bone-tempering-pill', 0.25], ['spirit-herb', 0.25]], quantity);
    case 'crafting':
      return rollOneReward(realmLevel >= 7
        ? [['tribulation-ward', 0.34], ['outer-star-sand', 0.28], ['ancient-immortal-scale', 0.18], ['heaven-soul-jade', 0.2]]
        : realmLevel >= 4
          ? [['soul-settling-orb', 0.35], ['star-spirit-stone', 0.32], ['purple-crystal-marrow', 0.33]]
          : [['fortune-talisman', 0.35], ['spirit-stone-pouch', 0.35], ['beast-core', 0.3]], quantity);
    case 'talisman':
      return rollOneReward(realmLevel >= 7
        ? [['tribulation-ward', 0.46], ['immortal-talisman-page', 0.28], ['heaven-soul-jade', 0.26]]
        : realmLevel >= 4
          ? [['fortune-talisman', 0.35], ['soul-settling-orb', 0.3], ['mystic-manual-fragment', 0.35]]
          : [['fortune-talisman', 0.55], ['old-manual-page', 0.25], ['spirit-stone-pouch', 0.2]], quantity);
    case 'array':
      return rollOneReward(realmLevel >= 7
        ? [['xuanhuang-marrow', 0.28], ['tribulation-crystal', 0.34], ['tribulation-ward', 0.38]]
        : realmLevel >= 4
          ? [['mystic-manual-fragment', 0.32], ['soul-settling-orb', 0.3], ['purple-crystal-marrow', 0.38]]
          : [['old-manual-page', 0.36], ['fortune-talisman', 0.32], ['spirit-stone-pouch', 0.32]], quantity);
    case 'fishing':
      return rollOneReward(realmLevel >= 7
        ? [['outer-star-sand', 0.28], ['tribulation-crystal', 0.22], ['xuanhuang-marrow', 0.18], ['heaven-soul-jade', 0.32]]
        : realmLevel >= 4
          ? [['purple-crystal-marrow', 0.3], ['thunder-beast-core', 0.24], ['star-spirit-stone', 0.46]]
          : [['spirit-herb', 0.45], ['beast-core', 0.2], ['spirit-stone-pouch', 0.35]], quantity);
    case 'spirit-field':
      return rollOneReward(realmLevel >= 7
        ? [['tribulation-pill', 0.28], ['outer-star-sand', 0.22], ['xuanhuang-marrow', 0.18], ['tribulation-ward', 0.32]]
        : realmLevel >= 4
          ? [['mystic-spirit-pill', 0.35], ['purple-crystal-marrow', 0.35], ['dragon-blood-pill', 0.3]]
          : [['spirit-herb', 0.5], ['qi-gathering-pill', 0.28], ['spirit-stone-pouch', 0.22]], quantity);
    default:
      return [];
  }
}

function formatLifeSkillResult(skillId: LifeSkillId, hasReward: boolean): string {
  if (!hasReward) {
    return '虽未得奇物，手法却比从前更稳';
  }

  switch (skillId) {
    case 'alchemy':
      return '炉火收束时凝出一批可用丹药';
    case 'crafting':
      return '器胚成形，还留下几件能收入储物戒的材料';
    case 'talisman':
      return '符成一瞬灵光跃纸，可留作后用';
    case 'array':
      return '阵纹推演有成，额外整理出一件阵材';
    case 'fishing':
      return '水面忽起涟漪，竟钓得一件灵物';
    case 'spirit-field':
      return '灵田收获颇丰，药香绕了洞府半日';
    default:
      return '额外得了一件可用之物';
  }
}

function generateCombatItemRewards(
  gameState: GameState,
  event: GameEvent,
  result: GameEvent['result'],
  isWin: boolean
): InventoryReward[] {
  if (!isWin) return [];

  const pathLootBonus = gameState.cultivationPath === 'demonic'
    ? 0.1
    : gameState.cultivationPath === 'sword'
      ? 0.04
      : 0;
  const rewardChance = (result === 'great-success' ? 0.82 : 0.48) + pathLootBonus;
  if (Math.random() > rewardChance) return [];

  const quantity = result === 'great-success' || (gameState.cultivationPath === 'demonic' && Math.random() < 0.18) ? 2 : 1;
  switch (event.id) {
    case 'combat-beast-hunt':
      return rollOneReward([
        ['beast-core', 0.55],
        ['spirit-herb', 0.3],
        ['bone-tempering-pill', 0.15]
      ], quantity);
    case 'combat-demonic-cultivator':
    case 'combat-heart-devil':
    case 'combat-ghost-market-raid':
      return rollOneReward([
        ['blood-jade', 0.45],
        ['fortune-talisman', 0.25],
        ['soul-nourishing-pill', 0.3]
      ], quantity);
    case 'combat-ancient-beast':
    case 'combat-tribulation-beast':
      return rollOneReward([
        ['ancient-scale', 0.55],
        ['blood-jade', 0.25],
        ['bone-tempering-pill', 0.2]
      ], quantity);
    case 'combat-caravan-escort':
    case 'combat-bandit-camp':
    case 'choice-combat-resource-thief':
      return rollOneReward([
        ['spirit-stone-pouch', 0.55],
        ['qi-gathering-pill', 0.3],
        ['spirit-herb', 0.15]
      ], quantity);
    case 'combat-mine-fiend':
      return rollOneReward([
        ['beast-core', 0.35],
        ['spirit-stone-pouch', 0.35],
        ['spirit-herb', 0.3]
      ], quantity);
    case 'combat-sword-contest':
    case 'combat-arena-duel':
    case 'choice-combat-rival-duel':
      return rollOneReward([
        ['old-manual-page', 0.35],
        ['bone-tempering-pill', 0.28],
        ['spirit-stone-pouch', 0.37]
      ], quantity);
    case 'mid-combat-spirit-boat-raid':
    case 'mid-combat-capture-banner':
      return rollOneReward([
        ['star-spirit-stone', 0.42],
        ['mystic-spirit-pill', 0.36],
        ['purple-crystal-marrow', 0.22]
      ], quantity);
    case 'mid-combat-break-demon-array':
    case 'mid-combat-canyon-rival':
      return rollOneReward([
        ['mystic-manual-fragment', 0.38],
        ['soul-settling-orb', 0.28],
        ['star-spirit-stone', 0.34]
      ], quantity);
    case 'mid-combat-infant-fire-demon':
    case 'mid-combat-night-demon-king':
    case 'mid-combat-secret-realm-guardian':
    case 'mid-combat-thunder-marsh-breakout':
      return rollOneReward([
        ['thunder-beast-core', 0.34],
        ['purple-crystal-marrow', 0.26],
        ['dragon-blood-pill', 0.24],
        ['mystic-spirit-pill', 0.16]
      ], quantity);
    case 'mid-combat-demon-cave-purge':
    case 'mid-combat-ruined-city-watch':
      return rollOneReward([
        ['nether-bone', 0.34],
        ['soul-settling-orb', 0.28],
        ['mystic-spirit-pill', 0.22],
        ['star-spirit-stone', 0.16]
      ], quantity);
    case 'late-combat-law-domain-duel':
    case 'late-combat-star-sea-array':
      return rollOneReward([
        ['immortal-talisman-page', 0.34],
        ['heaven-soul-jade', 0.28],
        ['outer-star-sand', 0.38]
      ], quantity);
    case 'late-combat-heavenly-demon-gate':
      return rollOneReward([
        ['heaven-soul-jade', 0.32],
        ['tribulation-ward', 0.3],
        ['xuanhuang-marrow', 0.18],
        ['immortal-talisman-page', 0.2]
      ], quantity);
    case 'late-combat-great-demon-siege':
    case 'late-combat-king-court-lord':
    case 'late-combat-cloud-sea-decisive':
    case 'late-combat-thunder-prison-brawl':
      return rollOneReward([
        ['ancient-immortal-scale', 0.28],
        ['tribulation-crystal', 0.3],
        ['tribulation-pill', 0.24],
        ['outer-star-sand', 0.18]
      ], quantity);
    case 'late-combat-tribulation-guardian':
    case 'late-combat-boundary-pursuit':
      return rollOneReward([
        ['tribulation-ward', 0.34],
        ['heaven-soul-jade', 0.24],
        ['immortal-talisman-page', 0.22],
        ['tribulation-crystal', 0.2]
      ], quantity);
    default:
      return rollOneReward([
        ['beast-core', 0.4],
        ['spirit-stone-pouch', 0.35],
        ['qi-gathering-pill', 0.25]
      ], quantity);
  }
}

function generateCombatItemLosses(
  gameState: GameState,
  result: GameEvent['result'],
  isWin: boolean
): InventoryReward[] {
  const isLoss = !isWin || result === 'great-failure';
  if (!isLoss || gameState.inventory.length === 0) return [];

  const availableItems = gameState.inventory.filter(entry => entry.quantity > 0);
  if (availableItems.length === 0) return [];

  const pickedItem = availableItems[Math.floor(Math.random() * availableItems.length)];
  return [{ itemId: pickedItem.itemId, quantity: 1 }];
}

function generateEventTechniqueRewards(
  gameState: GameState,
  event: GameEvent,
  result: GameEvent['result']
): string[] {
  if (!gameState.cultivationPath || event.type === 'childhood') return [];
  if (result === 'failure' || result === 'great-failure') return [];

  const candidates = getAvailableTechniqueRewards(
    gameState.cultivationPath,
    gameState.currentRealm.level,
    gameState.techniques.map(technique => technique.techniqueId)
  );
  if (candidates.length === 0) return [];

  const chance = getTechniqueRewardChance(gameState, event, result);
  if (Math.random() > chance) return [];

  return [pickTechniqueReward(candidates).id];
}

function getTechniqueRewardChance(gameState: GameState, event: GameEvent, result: GameEvent['result']): number {
  const resultChance = result === 'great-success'
    ? 0.24
    : result === 'success'
      ? 0.1
      : 0.018;
  const pathBonus = gameState.cultivationPath === 'spell'
    ? 0.04
    : gameState.cultivationPath === 'sword' && event.type === 'combat'
      ? 0.02
      : 0;

  switch (event.type) {
    case 'encounter':
    case 'mind':
      return resultChance + 0.05 + pathBonus;
    case 'sect':
    case 'resource':
      return resultChance + 0.035 + pathBonus;
    case 'combat':
      return resultChance + 0.03 + pathBonus;
    case 'cultivation':
      return resultChance + 0.015 + pathBonus;
    default:
      return resultChance + pathBonus;
  }
}

function pickTechniqueReward(candidates: TechniqueDefinition[]): TechniqueDefinition {
  const weightedCandidates = candidates.map(technique => ({
    technique,
    weight: 1 + technique.minRealmLevel * 0.12
  }));
  const totalWeight = weightedCandidates.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of weightedCandidates) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.technique;
    }
  }

  return weightedCandidates[0].technique;
}

function rollOneReward(
  candidates: Array<[string, number]>,
  quantity = 1
): InventoryReward[] {
  const totalWeight = candidates.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * totalWeight;

  for (const [itemId, weight] of candidates) {
    roll -= weight;
    if (roll <= 0) {
      return [{ itemId, quantity }];
    }
  }

  return [{ itemId: candidates[0][0], quantity }];
}

function getPreparationAction(actionId: string, realmLevel: number): PreparationAction | undefined {
  const actions: PreparationAction[] = [
    {
      id: 'stabilize',
      name: '稳固根基',
      description: '你暂缓冲境，回头打磨根基与悟法。修为略退，但突破门槛更容易补齐。',
      cost: 6,
      effects: () => ({ 根骨: 6, 神识: 4, 悟性: 4, 修为: -8 })
    },
    {
      id: 'elixir',
      name: '购置丹药',
      description: '你以灵石换来上好丹药，淬炼筋骨并稍延寿元。',
      cost: 18,
      effects: () => ({ 根骨: 10, 寿命: 1 })
    },
    {
      id: 'master',
      name: '请教高人',
      description: '你奉上厚礼，请高人为自己点破修行关窍。',
      cost: 16,
      effects: () => ({ 神识: 8, 悟性: 10, 修为: 4 })
    },
    {
      id: 'ward',
      name: '布置护阵',
      description: '你修缮洞府阵法，凝聚气运，也让心神更安定。',
      cost: 12,
      effects: () => ({ 神识: 3, 气运: 10, 颜值: 3 })
    }
  ];

  const action = actions.find(item => item.id === actionId);
  if (!action) return undefined;

  return {
    ...action,
    cost: getPreparationCost(action.cost, realmLevel)
  };
}

function getPreparationCost(baseCost: number, realmLevel: number): number {
  if (realmLevel >= 7) return Math.ceil(baseCost * 4);
  if (realmLevel >= 5) return Math.ceil(baseCost * 2.5);
  if (realmLevel >= 3) return Math.ceil(baseCost * 1.5);
  return baseCost;
}

function getPreparationItemCost(actionId: string, inventory: InventoryEntry[]): InventoryReward | undefined {
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

  return itemId ? { itemId, quantity: 1 } : undefined;
}

function addBreakthroughPreparation(
  preparation: BreakthroughPreparationState,
  actionId: string
): BreakthroughPreparationState {
  switch (actionId) {
    case 'elixir':
      return { ...preparation, elixir: preparation.elixir + 1 };
    case 'master':
      return { ...preparation, talisman: preparation.talisman + 1 };
    case 'ward':
      return { ...preparation, array: preparation.array + 1 };
    case 'stabilize':
    default:
      return { ...preparation, artifact: preparation.artifact + 1 };
  }
}

function createActiveLifeGoal(gameState: GameState): ActiveLifeGoal | null {
  const availableGoals = getAvailableLifeGoals(gameState, false);
  const candidates = availableGoals.length > 0 ? availableGoals : getAvailableLifeGoals(gameState, true);
  if (candidates.length === 0) return null;

  const selected = selectWeightedLifeGoal(candidates);
  return {
    id: selected.id,
    progress: 0
  };
}

function selectWeightedLifeGoal(candidates: LifeGoalDefinition[]): LifeGoalDefinition {
  const totalWeight = candidates.reduce((sum, goal) => sum + (goal.priority ?? 1), 0);
  let roll = Math.random() * totalWeight;

  for (const goal of candidates) {
    roll -= goal.priority ?? 1;
    if (roll <= 0) return goal;
  }

  return candidates[candidates.length - 1];
}

function getAvailableLifeGoals(gameState: GameState, allowCompleted: boolean): LifeGoalDefinition[] {
  return lifeGoals.filter(goal => {
    if (!allowCompleted && gameState.completedGoals.includes(goal.id)) return false;
    if (goal.minRealmLevel && gameState.currentRealm.level < goal.minRealmLevel) return false;
    if (goal.maxRealmLevel && gameState.currentRealm.level > goal.maxRealmLevel) return false;
    if (goal.pathIds && (!gameState.cultivationPath || !goal.pathIds.includes(gameState.cultivationPath))) return false;
    return true;
  });
}

function offerFeatOptions(gameState: GameState): GameState {
  if (gameState.pendingFeatOptions.length > 0 || gameState.status !== 'playing' || isChildhood(gameState)) return gameState;

  const candidates = feats.filter(feat => {
    if (gameState.feats.includes(feat.id)) return false;
    if (feat.minRealmLevel && gameState.currentRealm.level < feat.minRealmLevel) return false;
    if (feat.pathIds && (!gameState.cultivationPath || !feat.pathIds.includes(gameState.cultivationPath))) return false;
    if (feat.sectIds && (!gameState.sect || !feat.sectIds.includes(gameState.sect.sectId))) return false;
    return true;
  });
  if (candidates.length === 0) return gameState;

  return {
    ...gameState,
    pendingFeatOptions: pickFeatOptions(candidates, 3).map(feat => feat.id)
  };
}

function pickFeatOptions(candidates: FeatDefinition[], count: number): FeatDefinition[] {
  const pool = [...candidates];
  const options: FeatDefinition[] = [];

  while (options.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const [selected] = pool.splice(index, 1);
    options.push(selected);
  }

  return options;
}

function applyLifeGoalProgress(gameState: GameState, triggeringEvent: GameEvent): GameState {
  if (!gameState.activeGoal) {
    return {
      ...gameState,
      activeGoal: createActiveLifeGoal(gameState)
    };
  }

  const definition = getLifeGoalDefinition(gameState.activeGoal.id);
  if (!definition) {
    return {
      ...gameState,
      activeGoal: createActiveLifeGoal(gameState)
    };
  }

  const progressGain = calculateLifeGoalProgress(definition, triggeringEvent);
  if (progressGain <= 0) return gameState;

  const activeGoal = {
    ...gameState.activeGoal,
    progress: Math.min(definition.target, gameState.activeGoal.progress + progressGain)
  };

  if (activeGoal.progress < definition.target) {
    return {
      ...gameState,
      activeGoal
    };
  }

  return completeLifeGoal(
    {
      ...gameState,
      activeGoal
    },
    definition,
    triggeringEvent
  );
}

function calculateLifeGoalProgress(definition: LifeGoalDefinition, event: GameEvent): number {
  if (event.type === 'childhood') return 0;

  if (definition.progressKind === 'breakthrough') {
    return event.appliedEffects?.境界 === 'advance' || event.effects.境界 === 'advance' ? 1 : 0;
  }

  if (definition.progressKind === 'eventCount') {
    return definition.eventTypes?.includes(event.type) ? 1 : 0;
  }

  if (definition.progressKind === 'pathResource') {
    return Math.max(0, event.pathResourceChange?.value ?? 0);
  }

  const appliedEffects = event.appliedEffects ?? event.effects;
  return (definition.effectKeys ?? []).reduce((sum, key) => {
    const value = appliedEffects[key];
    return typeof value === 'number' && value > 0 ? sum + value : sum;
  }, 0);
}

function completeLifeGoal(
  gameState: GameState,
  definition: LifeGoalDefinition,
  triggeringEvent: GameEvent
): GameState {
  const completedGoals = Array.from(new Set([...gameState.completedGoals, definition.id]));
  const rewardEvent: GameEvent = {
    id: `life-goal-${definition.id}-${Date.now()}`,
    age: gameState.age,
    type: 'daily',
    title: `道途目标：${definition.name}`,
    description: definition.completionText,
    effects: definition.reward,
    result: 'neutral'
  };
  const progressDelta = calculateCultivationProgressDelta(gameState, rewardEvent, definition.reward);
  const lifespanDelta = calculateLifespanDelta(gameState, rewardEvent, definition.reward);
  const rewardEffects = buildAppliedEffects(definition.reward, progressDelta, lifespanDelta);
  const newAttributes = applyAttributeEffects(gameState, definition.reward);
  const newFamilyWealth = applyFamilyWealthEffects(gameState, definition.reward);
  const requiredProgress = getRequiredCultivationProgress(gameState);
  const events = mergeLifeGoalRewardIntoEvents(
    gameState.events,
    triggeringEvent,
    definition,
    rewardEffects
  );
  const stateAfterReward: GameState = {
    ...gameState,
    attributes: newAttributes,
    familyWealth: newFamilyWealth,
    lifespan: lifespanDelta ? Math.max(1, gameState.lifespan + lifespanDelta) : gameState.lifespan,
    cultivationProgress: clampProgress(gameState.cultivationProgress + progressDelta, requiredProgress),
    events,
    completedGoals
  };

  return offerFeatOptions({
    ...stateAfterReward,
    activeGoal: createActiveLifeGoal(stateAfterReward)
  });
}

function mergeLifeGoalRewardIntoEvents(
  events: GameEvent[],
  triggeringEvent: GameEvent,
  definition: LifeGoalDefinition,
  rewardEffects: GameEvent['effects']
): GameEvent[] {
  if (events.length === 0) return events;

  const updatedEvents = [...events];
  const eventIndex = updatedEvents.findIndex(event => event.id === triggeringEvent.id);
  const targetIndex = eventIndex >= 0 ? eventIndex : updatedEvents.length - 1;
  const event = updatedEvents[targetIndex];

  updatedEvents[targetIndex] = {
    ...event,
    description: `${event.description}道途目标「${definition.name}」完成，${definition.completionText}`,
    appliedEffects: mergeEffects(event.appliedEffects ?? {}, rewardEffects)
  };

  return updatedEvents;
}

function clampAttribute(value: number, cap = ATTRIBUTE_MAX): number {
  return Math.max(0, Math.min(cap, Math.round(value)));
}

function applyAttributeEffects(gameState: GameState, effects: GameEvent['effects']): Attributes {
  const attributeCap = getAttributeCap(gameState.currentRealm);
  const { attributes } = gameState;
  const newAttributes = { ...attributes };
  const effectsRecord = effects as Record<string, number | undefined>;

  Object.keys(effects).forEach((key) => {
    const attrKey = key as keyof Attributes;
    const effectValue = effectsRecord[key];
    if (
      attrKey in newAttributes
      && key !== '境界'
      && key !== '寿命'
      && key !== '修为'
      && effectValue !== undefined
    ) {
      newAttributes[attrKey] = clampAttribute(newAttributes[attrKey] + effectValue, attributeCap);
    }
  });

  return newAttributes;
}

function applyFamilyWealthEffects(gameState: GameState, effects: GameEvent['effects']): number {
  if (typeof effects.家境 !== 'number') return gameState.familyWealth;

  return Math.max(0, Math.round(gameState.familyWealth + effects.家境));
}

function updateSectAfterEvent(
  gameState: GameState,
  event: GameEvent,
  result: GameEvent['result']
): SectState | null {
  if (!gameState.sect || gameState.sect.sectId === 'loose') return gameState.sect;
  if (event.sectMissionId) {
    const mission = getSectMission(event.sectMissionId);
    return mission
      ? applySectMissionReward(gameState.sect, mission, result, gameState.currentRealm.level)
      : gameState.sect;
  }
  if (event.id.startsWith('sect-mission-')) return gameState.sect;

  const sect = getCultivationSect(gameState.sect.sectId);
  if (!sect) return gameState.sect;

  const baseContribution = event.type === 'sect'
    ? sect.contributionGain
    : event.type === 'combat' && gameState.selectedYearAction === 'adventure'
      ? Math.ceil(sect.contributionGain * 0.45)
      : 0;
  if (baseContribution <= 0) return gameState.sect;

  const resultMultiplier = result === 'great-success'
    ? 1.6
    : result === 'great-failure'
      ? 0.35
      : 1;
  const contributionGain = Math.max(1, Math.round(baseContribution * resultMultiplier));
  const reputationGain = Math.max(0, Math.round(contributionGain * 0.35));

  return {
    ...gameState.sect,
    contribution: gameState.sect.contribution + contributionGain,
    reputation: gameState.sect.reputation + reputationGain,
    rank: getSectRank(gameState.currentRealm.level, gameState.sect.contribution + contributionGain)
  };
}

function getSectRank(realmLevel: number, contribution: number): string {
  if (realmLevel >= 8 && contribution >= 1600) return '太上长老';
  if (realmLevel >= 6 && contribution >= 800) return '长老';
  if (realmLevel >= 4 && contribution >= 320) return '执事';
  if (realmLevel >= 3 && contribution >= 120) return '真传弟子';
  if (contribution >= 40) return '内门弟子';
  return '外门弟子';
}

function isSectMissionAvailable(gameState: GameState, mission: ReturnType<typeof getSectMission> extends infer T ? NonNullable<T> : never): boolean {
  const sectId = gameState.sect?.sectId;
  if (!sectId) return false;
  if (gameState.lastSectMissionAge === gameState.age) return false;
  if (mission.minRealmLevel && gameState.currentRealm.level < mission.minRealmLevel) return false;
  if (mission.looseOnly) return sectId === 'loose';
  if (sectId === 'loose') return false;
  if (mission.sectIds && !mission.sectIds.includes(sectId)) return false;
  return true;
}

function isSectExchangeAvailable(gameState: GameState, exchange: ReturnType<typeof getSectExchange> extends infer T ? NonNullable<T> : never): boolean {
  const sectId = gameState.sect?.sectId;
  if (!sectId) return false;
  if (exchange.looseOnly) return sectId === 'loose' && canPayLooseExchange(gameState, exchange);
  if (sectId === 'loose') return false;
  if (exchange.sectIds && !exchange.sectIds.includes(sectId)) return false;
  if (exchange.minRank && !hasSectRank(gameState.sect?.rank ?? '', exchange.minRank)) return false;
  if (exchange.techniqueRewardGrade && generateSectExchangeTechniqueRewards(gameState, exchange.techniqueRewardGrade).length === 0) return false;
  return (gameState.sect?.contribution ?? 0) >= exchange.cost;
}

function canPayLooseExchange(gameState: GameState, exchange: ReturnType<typeof getSectExchange> extends infer T ? NonNullable<T> : never): boolean {
  const familyCost = Math.abs(exchange.effects?.家境 ?? 0);
  return gameState.familyWealth >= familyCost;
}

function hasSectRank(currentRank: string, requiredRank: string): boolean {
  return getSectRankValue(currentRank) >= getSectRankValue(requiredRank);
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
    case '散修':
    default:
      return 0;
  }
}

function applySectMissionReward(
  sect: SectState | null,
  mission: ReturnType<typeof getSectMission> extends infer T ? NonNullable<T> : never,
  result: GameEvent['result'],
  realmLevel: number
): SectState | null {
  if (!sect || sect.sectId === 'loose') return sect;

  const { contributionGain, reputationGain } = calculateSectMissionReward(
    mission.contribution,
    mission.reputation,
    result
  );
  const contribution = sect.contribution + contributionGain;

  return {
    ...sect,
    contribution,
    reputation: sect.reputation + reputationGain,
    rank: getSectRankByContribution(realmLevel, contribution, sect.rank)
  };
}

export function calculateSectMissionReward(
  contribution: number,
  reputation: number,
  result: GameEvent['result']
): { contributionGain: number; reputationGain: number } {
  const multiplier = result === 'great-success'
    ? 1.5
    : result === 'great-failure'
      ? 0.4
      : 1;

  return {
    contributionGain: Math.max(1, Math.round(contribution * multiplier)),
    reputationGain: Math.max(0, Math.round(reputation * multiplier))
  };
}

function getSectMissionOutcomeText(event: GameEvent, result: GameEvent['result']): string {
  if (!event.sectMissionId) return '';

  const mission = getSectMission(event.sectMissionId);
  if (!mission) return '';
  if (mission.looseOnly) return '散修路数不记贡献，但这份经历会在往后的机缘里留下回响。';

  const { contributionGain, reputationGain } = calculateSectMissionReward(
    mission.contribution,
    mission.reputation,
    result
  );
  return `宗门记下此事，贡献 +${contributionGain}，声望 +${reputationGain}。`;
}

function getSectRankByContribution(realmLevel: number, contribution: number, currentRank: string): string {
  const nextRank = getSectRank(realmLevel, contribution);
  return getSectRankValue(nextRank) > getSectRankValue(currentRank) ? nextRank : currentRank;
}

function spendSectContribution(sect: SectState | null, cost: number): SectState | null {
  if (!sect || sect.sectId === 'loose') return sect;

  return {
    ...sect,
    contribution: Math.max(0, sect.contribution - cost)
  };
}

function addSectBreakthroughPreparation(
  preparation: BreakthroughPreparationState,
  key: keyof BreakthroughPreparationState
): BreakthroughPreparationState {
  return {
    ...preparation,
    [key]: preparation[key] + 1
  };
}

function generateSectExchangeTechniqueRewards(
  gameState: GameState,
  grade: NonNullable<ReturnType<typeof getSectExchange>>['techniqueRewardGrade']
): string[] {
  if (!grade || !gameState.cultivationPath) return [];

  return getTechniqueRewardsByGrade(
    gameState.cultivationPath,
    grade,
    gameState.currentRealm.level,
    gameState.techniques.map(technique => technique.techniqueId)
  )
    .slice(0, 1)
    .map(technique => technique.id);
}

function getPathResourceName(pathId: CultivationPathId | null | undefined): string {
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

function getDefaultEquippedSpells(pathId: CultivationPathId, realmLevel: number): string[] {
  return spellbook
    .filter(spell => spell.pathId === pathId && spell.minRealmLevel <= realmLevel)
    .sort((a, b) => b.minRealmLevel - a.minRealmLevel)
    .slice(0, 3)
    .map(spell => spell.id);
}

function getPathResourceDelta(
  gameState: GameState,
  event: GameEvent,
  result: GameEvent['result']
): number {
  if (!gameState.cultivationPath || isChildhood(gameState)) return 0;

  let base = 0;

  switch (gameState.cultivationPath) {
    case 'sword':
      base = event.type === 'combat'
        ? 8
        : event.type === 'cultivation'
          ? 5
          : event.id.startsWith('technique-training')
            ? 7
            : 1;
      break;
    case 'body':
      base = event.type === 'combat'
        ? 6
        : event.type === 'cultivation' || event.type === 'daily'
          ? 5
          : event.type === 'resource'
            ? 3
            : 1;
      break;
    case 'spell':
      base = event.id.startsWith('technique-training')
        ? 8
        : event.type === 'mind'
          ? 7
          : event.type === 'sect' || event.type === 'cultivation'
            ? 4
            : event.id.startsWith('use-item') && event.title.includes('残')
              ? 6
              : 1;
      break;
    case 'demonic':
      base = event.type === 'combat'
        ? 8
        : event.type === 'encounter' || event.type === 'resource'
          ? 5
          : event.type === 'disaster'
            ? 3
            : 1;
      break;
  }

  if (result === 'great-success') base = Math.ceil(base * 1.5);
  if (result === 'great-failure') base = Math.max(1, Math.floor(base * 0.5));

  return base;
}

function addPathResource(gameState: GameState, delta: number): Pick<GameState, 'pathResource'> {
  return {
    pathResource: {
      value: clampPathResource(gameState.pathResource.value + delta)
    }
  };
}

function getPathResourceChange(
  before: GameState,
  after: Pick<GameState, 'pathResource'>,
  expectedDelta: number
): GameEvent['pathResourceChange'] | null {
  if (!before.cultivationPath || expectedDelta === 0) return null;

  const actualDelta = after.pathResource.value - before.pathResource.value;
  if (actualDelta === 0) return null;

  return {
    name: getPathResourceName(before.cultivationPath),
    value: actualDelta
  };
}

function clampPathResource(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPathResourceOffenseMultiplier(gameState: GameState): number {
  if (!gameState.cultivationPath) return 1;

  const techniqueLevel = gameState.techniques.reduce((sum, technique) => sum + technique.level, 0);
  const synergy = Math.min(0.04, techniqueLevel * 0.002);
  return 1 + gameState.pathResource.value / 100 * (0.08 + synergy);
}

function getPathResourceBreakthroughBonus(gameState: GameState): number {
  if (!gameState.cultivationPath) return 0;

  return gameState.pathResource.value / 100 * 0.08;
}

function reducePathResource(gameState: GameState, amount: number): Pick<GameState, 'pathResource'> {
  return {
    pathResource: {
      value: clampPathResource(gameState.pathResource.value - amount)
    }
  };
}

function calculateCultivationProgressDelta(
  gameState: GameState,
  event: GameEvent,
  effects: GameEvent['effects']
): number {
  if (isChildhood(gameState) || event.type === 'childhood') {
    return 0;
  }

  const requiredProgress = getRequiredCultivationProgress(gameState);
  const toProgressDelta = (percent: number) => {
    return Math.trunc(requiredProgress * percent / 100);
  };
  const modifiers = getCombinedModifiers(gameState);
  const cultivationMultiplier = modifiers.修为倍率 ?? 1;
  const realmProgressMultiplier = getRealmProgressMultiplier(gameState);
  const realmProgressPace = getRealmProgressPace(gameState);
  const disasterResistance = getDisasterResistance(gameState);
  let percentDelta = typeof effects.修为 === 'number'
    ? effects.修为
    : getDefaultProgressPercent(event.type);

  Object.entries(effects).forEach(([key, value]) => {
    if (key === '寿命' || key === '时间' || key === '境界' || key === '修为' || key === '家境' || typeof value !== 'number') return;
    percentDelta += value > 0 ? 0.25 : -1.2;
  });

  if (event.type === 'disaster' && percentDelta < 0) {
    percentDelta *= Math.max(0.25, 1 - disasterResistance);
  }

  if (percentDelta > 0) {
    percentDelta *= cultivationMultiplier * realmProgressMultiplier * realmProgressPace;
  }

  const negativeProgressCap = event.id.startsWith('breakthrough-failed') ? -45 : -35;
  return toProgressDelta(Math.max(negativeProgressCap, Math.min(getProgressPercentCap(gameState), percentDelta)));
}

function getProgressPercentCap(gameState: GameState): number {
  switch (gameState.currentRealm.level) {
    case 4:
      return 24;
    case 5:
      return 20;
    case 6:
      return 17;
    case 7:
      return 14;
    case 8:
      return 12;
    default:
      return 40;
  }
}

function getRealmProgressMultiplier(gameState: GameState): number {
  switch (gameState.currentRealm.level) {
    case 1:
      return 1;
    case 2:
      return 1.08;
    case 3:
      return 1.16;
    case 4:
      return 1.2;
    case 5:
      return 1.28;
    case 6:
      return 1.36;
    case 7:
      return 1.44;
    case 8:
      return 1.52;
    default:
      return 1;
  }
}

function getRealmProgressPace(gameState: GameState): number {
  if (gameState.currentRealm.level < 4) {
    return 1;
  }

  switch (gameState.currentRealm.level) {
    case 4:
      return 0.66;
    case 5:
      return 0.62;
    case 6:
      return 0.58;
    case 7:
      return 0.54;
    case 8:
      return 0.5;
    default:
      return 1;
  }
}

function getDefaultProgressPercent(type: GameEvent['type']): number {
  switch (type) {
    case 'childhood':
      return 0;
    case 'cultivation':
      return 8;
    case 'combat':
      return 9;
    case 'encounter':
      return 5;
    case 'daily':
      return 4;
    case 'social':
      return 2;
    case 'disaster':
      return -8;
    case 'resource':
      return 5;
    case 'mind':
      return 6;
    case 'sect':
      return 6;
    default:
      return 0;
  }
}

function calculateLifespanDelta(
  gameState: GameState,
  event: GameEvent,
  effects: GameEvent['effects']
): number {
  if (typeof effects.寿命 !== 'number' || gameState.lifespan === Infinity) {
    return 0;
  }

  const modifiers = getCombinedModifiers(gameState);
  const lifespanMultiplier = modifiers.寿命倍率 ?? 1;
  const resistance = event.type === 'disaster' ? getDisasterResistance(gameState) : 0;
  const percent = effects.寿命 > 0
    ? effects.寿命 * lifespanMultiplier
    : effects.寿命 * Math.max(0.25, 1 - resistance);
  const lifespanDelta = Math.trunc(gameState.lifespan * percent / 100);

  if (effects.寿命 > 0) {
    return Math.min(lifespanDelta, getPositiveLifespanGainCap(gameState));
  }

  return lifespanDelta;
}

function getPositiveLifespanGainCap(gameState: GameState): number {
  switch (gameState.currentRealm.level) {
    case 1:
      return 2;
    case 2:
      return 3;
    case 3:
      return 4;
    case 4:
      return 6;
    case 5:
      return 8;
    case 6:
      return 10;
    case 7:
      return 12;
    case 8:
      return 16;
    case 9:
      return 20;
    default:
      return 1;
  }
}

function addLifespan(lifespan: number, lifespanGain: number): number {
  if (lifespan === Infinity || lifespanGain === Infinity) {
    return Infinity;
  }

  return Math.max(1, lifespan + lifespanGain);
}

function buildAppliedEffects(
  effects: GameEvent['effects'],
  progressDelta: number,
  lifespanDelta: number
): GameEvent['effects'] {
  return {
    ...effects,
    ...(typeof effects.修为 === 'number' ? { 修为: progressDelta } : {}),
    ...(typeof effects.寿命 === 'number' ? { 寿命: lifespanDelta } : {})
  };
}

function clampProgress(progress: number, requiredProgress: number): number {
  return Math.max(0, Math.min(requiredProgress, progress));
}

function getAttributePower(value: number): number {
  return Math.sqrt(Math.max(0, value));
}

function applyAttributeModifiers(
  gameState: GameState,
  event: GameEvent,
  effects: GameEvent['effects']
): GameEvent['effects'] {
  const modifiers = getCombinedModifiers(gameState);
  const attributeMultiplier = modifiers.属性倍率 ?? 1;
  const disasterResistance = event.type === 'disaster' ? getDisasterResistance(gameState) : 0;
  const adjustedEffects: GameEvent['effects'] = {};

  Object.entries(effects).forEach(([key, value]) => {
    if (typeof value !== 'number') {
      (adjustedEffects as Record<string, typeof value>)[key] = value;
      return;
    }

    if (key === '寿命' || key === '时间' || key === '修为' || key === '家境') {
      (adjustedEffects as Record<string, number>)[key] = value;
      return;
    }

    const rawValue = value > 0
      ? value * attributeMultiplier
      : value * Math.max(0.35, 1 - disasterResistance);
    const roundedValue = rawValue > 0 ? Math.ceil(rawValue) : Math.floor(rawValue);

    if (roundedValue !== 0) {
      (adjustedEffects as Record<string, number>)[key] = roundedValue;
    }
  });

  return adjustedEffects;
}

function resolveEventEffects(event: GameEvent, result: GameEvent['result']): GameEvent['effects'] {
  const resolvedEffects: GameEvent['effects'] = {};

  Object.entries(event.effects).forEach(([key, value]) => {
    if (typeof value !== 'number') {
      (resolvedEffects as Record<string, typeof value>)[key] = value;
      return;
    }

    const resolvedValue = scaleEffectByOutcome(value, result);

    if (resolvedValue !== 0) {
      (resolvedEffects as Record<string, number>)[key] = resolvedValue;
    }
  });

  return resolvedEffects;
}

function scaleEffectByOutcome(value: number, result: GameEvent['result']): number {
  switch (result) {
    case 'great-success':
      return scaleNumericValue(value, value > 0 ? 1.75 : 0.35);
    case 'great-failure':
      return scaleNumericValue(value, value > 0 ? 0.35 : 1.75);
    case 'success':
    case 'failure':
    case 'neutral':
    default:
      return value;
  }
}

function scaleNumericValue(value: number, factor: number): number {
  const scaledValue = value > 0
    ? Math.floor(value * factor)
    : Math.ceil(value * factor);

  if (scaledValue === 0 && value !== 0 && factor > 0) {
    return value > 0 ? 1 : -1;
  }

  return scaledValue;
}

function canBreakthrough(gameState: GameState): boolean {
  const realmIndex = realms.findIndex(realm => realm.name === gameState.currentRealm.name);
  const hasNextRealm = realmIndex >= 0 && realmIndex < realms.length - 1;

  return !isChildhood(gameState)
    && hasNextRealm
    && !gameState.pendingPathChoice
    && !gameState.pendingSectChoice
    && !gameState.pendingEvent
    && !gameState.pendingCombat
    && !gameState.pendingTribulation
    && gameState.pendingFeatOptions.length === 0
    && gameState.cultivationProgress >= getRequiredCultivationProgress(gameState);
}

function canAscend(gameState: GameState): boolean {
  const realmIndex = realms.findIndex(realm => realm.name === gameState.currentRealm.name);
  const isFinalRealm = realmIndex === realms.length - 1;

  return isFinalRealm
    && gameState.currentRealm.name === '渡劫期'
    && gameState.cultivationProgress >= getRequiredCultivationProgress(gameState);
}

function canAdvanceRealm(gameState: GameState): boolean {
  const { currentRealm, attributes } = gameState;

  if (isChildhood(gameState)) return false;

  const realmIndex = realms.findIndex(r => r.name === currentRealm.name);
  if (realmIndex >= realms.length - 1) return false;

  const requirements = realms[realmIndex + 1].requirements;

  if (!meetsAttributeRequirements(attributes, requirements.attributes)) return false;

  return true;
}

function calculateBreakthroughSuccessRate(
  gameState: GameState,
  nextRealm: GameState['currentRealm']
): number {
  const requirements = Object.entries(nextRealm.requirements.attributes);
  const averageSurplus = requirements.length > 0
    ? requirements.reduce((sum, [key, required]) => {
      const requiredValue = required ?? 1;
      const current = gameState.attributes[key as keyof Attributes];
      return sum + Math.min(0.35, Math.max(0, (current - requiredValue) / requiredValue));
    }, 0) / requirements.length
    : 0;
  const averageDeficit = calculateBreakthroughAverageDeficit(gameState, nextRealm);
  const fortuneBonus = getAttributePower(gameState.attributes.气运) * 0.006;
  const preparationBonus = getBreakthroughPreparationBonus(gameState.breakthroughPreparation);
  const pathResourceBonus = getPathResourceBreakthroughBonus(gameState);
  const techniqueBuildBonus = getTechniqueBuildSynergy(gameState) * 0.35;
  const featBreakthroughBonus = getFeatBreakthroughBonus(gameState);
  const spellBreakthroughBonus = getSpellBreakthroughBonus(gameState);
  const realmPressure = Math.max(0, gameState.currentRealm.level - 3) * 0.02;
  const minimumRate = averageDeficit >= 0.5 ? 0.05 : averageDeficit >= 0.3 ? 0.07 : 0.1;

  return Math.max(
    minimumRate,
    Math.min(0.94, 0.74 + averageSurplus * 0.45 + fortuneBonus + preparationBonus + pathResourceBonus + techniqueBuildBonus + featBreakthroughBonus + spellBreakthroughBonus - realmPressure - averageDeficit * 0.75)
  );
}

function getFeatBreakthroughBonus(gameState: GameState): number {
  return gameState.feats.reduce((sum, featId) => sum + (getFeat(featId)?.bonuses.breakthroughBonus ?? 0), 0);
}

function getSpellBreakthroughBonus(gameState: GameState): number {
  return gameState.equippedSpellIds.reduce((sum, spellId) => sum + (getSpell(spellId)?.bonuses.breakthroughBonus ?? 0), 0);
}

function getBreakthroughPreparationBonus(preparation: BreakthroughPreparationState): number {
  return Math.min(
    0.18,
    preparation.elixir * 0.025
      + preparation.artifact * 0.02
      + preparation.talisman * 0.018
      + preparation.array * 0.025
  );
}

function calculateBreakthroughAverageDeficit(
  gameState: GameState,
  nextRealm: GameState['currentRealm']
): number {
  const requirements = Object.entries(nextRealm.requirements.attributes);

  if (requirements.length === 0) return 0;

  return requirements.reduce((sum, [key, required]) => {
    const requiredValue = required ?? 1;
    const current = gameState.attributes[key as keyof Attributes];
    return sum + Math.min(0.85, Math.max(0, (requiredValue - current) / requiredValue));
  }, 0) / requirements.length;
}

function getBreakthroughFailureProgressPercent(gameState: GameState, averageDeficit: number): number {
  const basePercent = gameState.currentRealm.level >= 6 ? 35 : gameState.currentRealm.level >= 4 ? 30 : 25;
  if (averageDeficit >= 0.5) return Math.min(45, basePercent + 10);
  if (averageDeficit >= 0.3) return Math.min(42, basePercent + 6);
  return basePercent;
}

function getBreakthroughFailureLifespanPercent(gameState: GameState, averageDeficit: number): number {
  const basePercent = Math.min(8, Math.max(1, gameState.currentRealm.level));
  if (averageDeficit >= 0.5) return Math.min(12, basePercent + 4);
  if (averageDeficit >= 0.3) return Math.min(10, basePercent + 2);
  return basePercent;
}

function meetsAttributeRequirements(
  attributes: Attributes,
  requirements: Partial<Attributes>
): boolean {
  return Object.entries(requirements).every(([key, required]) => {
    if (!required) return true;

    return attributes[key as keyof Attributes] >= required;
  });
}

function meetsEventAttributeRequirements(
  gameState: GameState,
  requirements: Partial<Attributes> & { 家境?: number }
): boolean {
  return Object.entries(requirements).every(([key, required]) => {
    if (!required) return true;
    if (key === '家境') return gameState.familyWealth >= required;

    return gameState.attributes[key as keyof Attributes] >= required;
  });
}

function getRequiredCultivationProgress(gameState: GameState): number {
  const realmIndex = realms.findIndex(r => r.name === gameState.currentRealm.name);
  const nextRealm = realmIndex >= 0 ? realms[realmIndex + 1] : undefined;

  return nextRealm?.cultivationRequired ?? gameState.currentRealm.cultivationRequired;
}

function getCultivationYearStep(realmLevel: number): number {
  switch (realmLevel) {
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 5;
    case 5:
      return 10;
    case 6:
      return 20;
    case 7:
      return 40;
    case 8:
      return 80;
    case 9:
      return 100;
    default:
      return 1;
  }
}

function getRealmLifespanGain(currentIndex: number): number {
  const currentRealm = realms[currentIndex];
  const nextRealm = realms[currentIndex + 1];

  if (!currentRealm || !nextRealm) {
    return 0;
  }

  if (nextRealm.maxAge === Infinity) {
    return Infinity;
  }

  if (currentRealm.maxAge === Infinity) {
    return 0;
  }

  return Math.max(0, nextRealm.maxAge - currentRealm.maxAge);
}

function getAttributeCap(realm: GameState['currentRealm']): number {
  return Math.min(ATTRIBUTE_MAX, realm.attributeCap);
}

function isChildhood(gameState: GameState): boolean {
  return gameState.currentRealm.name === '幼年期' || gameState.age < QI_CONDENSING_AGE;
}

function getCombinedModifiers(gameState: GameState): GrowthModifiers {
  return mergeModifiers(
    gameState.spiritRoot?.modifiers,
    gameState.talent?.modifiers,
    getCultivationPath(gameState.cultivationPath)?.modifiers,
    getCultivationSect(gameState.sect?.sectId)?.modifiers
  );
}

function mergeModifiers(...modifiersList: Array<GrowthModifiers | undefined>): GrowthModifiers {
  return modifiersList.reduce<GrowthModifiers>((merged, modifiers) => {
    if (!modifiers) return merged;

    return {
      修为倍率: multiplyOptional(merged.修为倍率, modifiers.修为倍率),
      属性倍率: multiplyOptional(merged.属性倍率, modifiers.属性倍率),
      寿命倍率: multiplyOptional(merged.寿命倍率, modifiers.寿命倍率),
      灾劫抗性: (merged.灾劫抗性 ?? 0) + (modifiers.灾劫抗性 ?? 0),
      事件权重: mergeEventWeights(merged.事件权重, modifiers.事件权重)
    };
  }, {});
}

function multiplyOptional(current: number | undefined, next: number | undefined): number | undefined {
  if (next === undefined) return current;
  return (current ?? 1) * next;
}

function mergeEventWeights(
  current: GrowthModifiers['事件权重'],
  next: GrowthModifiers['事件权重']
): GrowthModifiers['事件权重'] {
  if (!next) return current;

  return Object.entries(next).reduce<NonNullable<GrowthModifiers['事件权重']>>((merged, [type, weight]) => {
    merged[type as keyof NonNullable<GrowthModifiers['事件权重']>] =
      (merged[type as keyof NonNullable<GrowthModifiers['事件权重']>] ?? 1) * (weight ?? 1);
    return merged;
  }, { ...current });
}

function getDisasterResistance(gameState: GameState): number {
  return Math.max(-0.25, Math.min(0.5, getCombinedModifiers(gameState).灾劫抗性 ?? 0));
}

function clampRate(value: number): number {
  return Math.max(0.05, Math.min(0.98, value));
}

function unlockAchievements(gameState: GameState): GameState {
  const achievements = new Set(gameState.achievements);

  if (gameState.events.length >= 1) achievements.add('初历世事');
  if (gameState.events.length >= 30) achievements.add('三十年风雨');
  if (gameState.completedGoals.length >= 1) achievements.add('道途初成');
  if (gameState.completedGoals.length >= 5) achievements.add('百炼成途');
  if (gameState.currentRealm.level >= 2) achievements.add('筑基有成');
  if (gameState.currentRealm.level >= 3) achievements.add('金丹大道');
  if (gameState.currentRealm.level >= 4) achievements.add('元婴出窍');
  if (gameState.currentRealm.level >= 5) achievements.add('化神问道');
  if (gameState.currentRealm.level >= 8) achievements.add('大乘在望');
  if (gameState.currentRealm.name === '渡劫期') achievements.add('渡劫之身');
  if (Object.values(gameState.attributes).some(value => value >= 300)) achievements.add('一项通玄');
  if (Object.values(gameState.attributes).every(value => value >= 120)) achievements.add('五维均衡');
  if (gameState.familyWealth >= 200) achievements.add('富甲仙门');
  if (gameState.talent?.rarity === '传说') achievements.add('传说命格');
  if (gameState.spiritRoot?.rarity === '神话') achievements.add('神话灵根');

  return {
    ...gameState,
    achievements: Array.from(achievements)
  };
}
