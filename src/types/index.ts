export type EventType = 'childhood' | 'cultivation' | 'combat' | 'encounter' | 'social' | 'disaster' | 'daily' | 'resource' | 'mind' | 'sect';

export type Rarity = '凡品' | '下品' | '中品' | '上品' | '变异' | '极品' | '神话' | '传说';

export type ItemType = '丹药' | '灵材' | '法器' | '符箓' | '阵材' | '功法' | '杂物';

export type ResourceType = '灵草' | '矿材' | '兽材' | '符材' | '阵材' | '灵鱼' | '灵石' | '成品';

export type TechniqueGrade = '黄' | '玄' | '地' | '天' | '仙';

export type CheckMode = 'normal' | 'advantage' | 'disadvantage';

export type CheckOutcome = 'great-success' | 'success' | 'failure' | 'great-failure';

export type AttributeEffect = Partial<Attributes> & {
  灵石?: number;
};

export type CultivationPathId = 'sword' | 'body' | 'spell' | 'demonic';

export type CultivationSectId = 'loose' | 'sword-pavilion' | 'alchemy-valley' | 'artifact-hall' | 'talisman-court' | 'array-gate' | 'hehuan-sect' | 'demonic-sect';

export type LifeSkillId = 'alchemy' | 'crafting' | 'talisman' | 'array' | 'fishing' | 'spirit-field';

export type YearActionId = 'cultivate' | 'adventure' | 'seclusion' | 'life-skill' | 'combat';

export type CultivationSessionStopReason = 'completed' | 'breakthrough' | 'event-choice' | 'combat' | 'combat-defeat' | 'boss-cleared' | 'dungeon-cleared' | 'dungeon-room' | 'loot-target' | 'path-choice' | 'sect-choice' | 'feat-choice' | 'tribulation' | 'resource-shortage' | 'activity-locked' | 'lifespan' | 'ascended';

export type CultivationSessionSource = 'manual' | 'offline' | 'idle';

export type CombatActionId = 'attack' | 'defend' | 'technique' | 'flee';

export type CombatStatusId = 'bleed' | 'burn' | 'poison' | 'stun' | 'armor-break' | 'shield' | 'seal';

export type CombatSpellBranchId = 'power' | 'control';

export type EnemyIntentId = 'attack' | 'technique' | 'defend' | 'charge';

export type CombatZoneId = 'greenmist-outskirts' | 'blackstone-mine' | 'ghost-market' | 'falling-star-ferry' | 'thunder-marsh' | 'ruined-city' | 'star-sea' | 'heavenly-demon-gate' | 'tribulation-boundary';

export type AutoCombatStrategy = 'cautious' | 'balanced' | 'aggressive';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

export type EquipmentAffixId = 'keen' | 'stalwart' | 'nimble' | 'spirit-bound' | 'sword-heart' | 'body-forged' | 'spell-channel' | 'blood-mark';

export type CombatSkillId = 'attack' | 'defense' | 'technique';

export type BossMechanicId = 'charge' | 'armor-break' | 'seal' | 'burn' | 'enrage';

export type ReincarnationUpgradeId = 'foundation' | 'longevity' | 'insight' | 'fortune';

export type DungeonRouteId = 'steady' | 'perilous';

export type DungeonRoomId = 'spirit-spring' | 'wandering-merchant' | 'ancient-trial' | 'hidden-treasure';

export type SaveSlotIndex = 1 | 2 | 3;

export type AutomationPriority = 'target-first' | 'highest-tier' | 'lowest-cost';

export interface CultivationPath {
  id: CultivationPathId;
  name: string;
  description: string;
  focus: string;
  effect: AttributeEffect;
  modifiers: GrowthModifiers;
  build: string[];
}

export interface CultivationSect {
  id: CultivationSectId;
  name: string;
  grade: string;
  tendency: string;
  description: string;
  effect: AttributeEffect;
  modifiers: GrowthModifiers;
  contributionGain: number;
  reputationGain: number;
}

export interface SectMissionDefinition {
  id: string;
  name: string;
  description: string;
  eventType: EventType;
  minRealmLevel?: number;
  sectIds?: CultivationSectId[];
  looseOnly?: boolean;
  effects: GameEvent['effects'];
  contribution: number;
  reputation: number;
  itemRewards?: InventoryReward[];
}

export interface SectExchangeDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  minRank?: string;
  sectIds?: CultivationSectId[];
  looseOnly?: boolean;
  effects?: GameEvent['effects'];
  itemRewards?: InventoryReward[];
  techniqueRewardGrade?: TechniqueGrade;
  preparation?: keyof BreakthroughPreparationState;
}

export type LifeGoalProgressKind = 'effectGain' | 'eventCount' | 'breakthrough' | 'pathResource';

export interface LifeGoalDefinition {
  id: string;
  name: string;
  description: string;
  progressKind: LifeGoalProgressKind;
  target: number;
  targetLabel: string;
  effectKeys?: Array<keyof Attributes | '灵石' | '修为' | '寿命'>;
  eventTypes?: EventType[];
  minRealmLevel?: number;
  maxRealmLevel?: number;
  pathIds?: CultivationPathId[];
  priority?: number;
  reward: GameEvent['effects'];
  completionText: string;
}

export interface ActiveLifeGoal {
  id: string;
  progress: number;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  outcome: string;
  successModifier?: number;
  positiveScale?: number;
  negativeScale?: number;
  effects?: GameEvent['effects'];
  combat?: {
    id: string;
    title?: string;
    description?: string;
    effects: GameEvent['effects'];
  };
}

export interface GrowthModifiers {
  修为倍率?: number;
  属性倍率?: number;
  寿命倍率?: number;
  灾劫抗性?: number;
  事件权重?: Partial<Record<EventType, number>>;
}

export interface Talent {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  effect: AttributeEffect;
  modifiers?: GrowthModifiers;
  probability: number;
}

export interface SpiritRoot {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  effect: AttributeEffect;
  modifiers: GrowthModifiers;
  probability: number;
}

export interface Realm {
  name: string;
  level: number;
  maxAge: number;
  attributeCap: number;
  cultivationRequired: number;
  description: string;
  requirements: {
    minAge: number;
    attributes: {
      根骨?: number;
      神识?: number;
      悟性?: number;
      气运?: number;
    };
  };
}

export interface Attributes {
  根骨: number;
  神识: number;
  悟性: number;
  气运: number;
  颜值: number;
}

export interface GameState {
  status: 'idle' | 'creating' | 'playing' | 'ended';
  characterName: string;
  age: number;
  currentRealm: Realm;
  attributes: Attributes;
  spiritStones: number;
  spiritStoneLedger: SpiritStoneTransaction[];
  combatStats: CombatStats;
  inventory: InventoryEntry[];
  techniques: LearnedTechnique[];
  lifeSkills: LifeSkillProgress[];
  feats: string[];
  selectedBuildId: string | null;
  pendingFeatOptions: string[];
  equippedSpellIds: string[];
  selectedYearAction: YearActionId;
  lifeSkillActivity: LifeSkillActivity;
  combatActivity: CombatActivity;
  combatZoneProgress: CombatZoneProgress[];
  idleActivity: IdleActivityState;
  dungeonRun: DungeonRunState | null;
  dungeonProgress: DungeonProgress[];
  discoveredRelicIds: string[];
  craftedRecipeIds: string[];
  reincarnation: ReincarnationState;
  idleAutomation: IdleAutomationState;
  automationPresets: AutomationPreset[];
  seenUnlockIds: string[];
  claimedStageRewards: string[];
  equipment: EquipmentState;
  equipmentEnhancements: EquipmentEnhancement[];
  equipmentAffixes: EquipmentAffixState[];
  equipmentQualities: EquipmentQualityState[];
  lockedEquipmentAffixes: string[];
  combatSkills: CombatSkillProgress[];
  combatSpellProgress: CombatSpellProgress[];
  combatPresets: CombatPreset[];
  market: MarketState;
  claimedCodexMilestones: string[];
  activityQueue: ActivityQueueEntry[];
  lastQueueReport: QueueReportEntry[];
  claimedPathQuests: string[];
  cultivationPlan: CultivationPlan;
  lastCultivationSession: CultivationSessionSummary | null;
  offlineCultivation: OfflineCultivationState | null;
  rival: RivalState | null;
  breakthroughPreparation: BreakthroughPreparationState;
  sect: SectState | null;
  lastSectMissionAge: number | null;
  spiritRoot: SpiritRoot | null;
  talent: Talent | null;
  cultivationPath: CultivationPathId | null;
  pathResource: PathResourceState;
  lifespan: number;
  cultivationProgress: number;
  pendingEvent: GameEvent | null;
  pendingCombat: TurnCombatState | null;
  pendingPathChoice: boolean;
  pendingSectChoice: boolean;
  pendingTribulation: TribulationState | null;
  activeGoal: ActiveLifeGoal | null;
  completedGoals: string[];
  events: GameEvent[];
  achievements: string[];
  endReason?: 'lifespan' | 'meditation' | 'ascended';
}

export interface CultivationPlan {
  rounds: 1 | 3 | 5 | 10;
  stopAtBreakthrough: boolean;
}

export interface LifeSkillActivity {
  skillId: LifeSkillId;
  recipeId: string | null;
}

export interface AutoCombatConfig {
  enabled: boolean;
  strategy: AutoCombatStrategy;
  useTechnique: boolean;
  useBattleConsumables: boolean;
  healingItemId: string | null;
  healAtHpPercent: number;
  qiItemId: string | null;
  qiAtPercent: number;
  stopWhenSuppliesEmpty: boolean;
  lootTargetItemId: string | null;
  lootTargetQuantity: number;
}

export interface ActivityQueueEntry {
  id: string;
  actionId: YearActionId;
  rounds: number;
  lifeSkillActivity?: LifeSkillActivity;
  combatActivity?: CombatActivity;
}

export interface QueueReportEntry {
  id: string;
  label: string;
  requestedRounds: number;
  completedRounds: number;
  stopReason: CultivationSessionStopReason;
}

export interface CombatActivity {
  zoneId: CombatZoneId;
  target: 'normal' | 'boss';
  activePresetId: string | null;
  dungeonAutoRepeat: boolean;
  autoCombat: AutoCombatConfig;
}

export interface IdleActivityState {
  running: boolean;
  accumulatedMs: number;
  startedAt: number | null;
  completedCycles: number;
  stopReason: CultivationSessionStopReason | null;
}

export interface DungeonRunState {
  zoneId: CombatZoneId;
  floor: number;
  totalFloors: number;
  currentHp: number;
  maxHp: number;
  baseMaxHp: number;
  currentQi: number;
  maxQi: number;
  baseMaxQi: number;
  relicIds: string[];
  pendingRelicIds: string[];
  pendingRoom: DungeonRoomState | null;
  roomHistory: DungeonRoomId[];
  rewardBonus: number;
  route: DungeonRouteId;
  restsRemaining: number;
}

export interface DungeonProgress {
  zoneId: CombatZoneId;
  clears: number;
  bestFloor: number;
}

export interface ReincarnationState {
  points: number;
  totalEarned: number;
  lives: number;
  ascensions: number;
  lastGain: number;
  upgrades: Record<ReincarnationUpgradeId, number>;
}

export interface AutoSellRule {
  itemId: string;
  keepQuantity: number;
}

export interface IdleAutomationState {
  enabled: boolean;
  targetItemId: string | null;
  targetQuantity: number;
  fallbackSkillId: LifeSkillId;
  priority: AutomationPriority;
  autoSellRules: AutoSellRule[];
  switches: number;
  soldItems: number;
}

export interface AutomationPreset {
  id: string;
  name: string;
  config: Omit<IdleAutomationState, 'switches' | 'soldItems'>;
}

export interface DungeonRoomState {
  id: DungeonRoomId;
  floor: number;
  optionIds: string[];
}

export interface CombatZoneProgress {
  zoneId: CombatZoneId;
  kills: number;
  bossDefeated: boolean;
  bossWins: number;
  bestRounds: number | null;
}

export interface EquipmentState {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
}

export interface EquipmentEnhancement {
  itemId: string;
  level: number;
}

export interface EquipmentAffixState {
  itemId: string;
  affixId: EquipmentAffixId;
}

export interface EquipmentQualityState {
  itemId: string;
  quality: number;
}

export interface CombatSkillProgress {
  skillId: CombatSkillId;
  level: number;
  exp: number;
}

export interface CombatSpellProgress {
  spellId: string;
  level: number;
  branchId: CombatSpellBranchId | null;
}

export interface CombatPreset {
  id: string;
  name: string;
  pathId: CultivationPathId | null;
  zoneId: CombatZoneId;
  equipment: EquipmentState;
  equippedSpellIds: string[];
  autoCombat: AutoCombatConfig;
}

export interface MarketOffer {
  id: string;
  itemId: string;
  price: number;
  quantity: number;
}

export interface MarketState {
  offers: MarketOffer[];
  auction: MarketOffer | null;
  priceTrend: number;
  lastRefreshAge: number | null;
}

export type SpiritStoneTransactionCategory =
  | 'event'
  | 'combat'
  | 'market'
  | 'life-skill'
  | 'breakthrough'
  | 'sect'
  | 'maintenance'
  | 'technique'
  | 'equipment'
  | 'item';

export interface SpiritStoneTransaction {
  id: string;
  age: number;
  amount: number;
  balance: number;
  reason: string;
  category: SpiritStoneTransactionCategory;
}

export interface CultivationSessionSummary {
  source: CultivationSessionSource;
  startedAge: number;
  endedAge: number;
  requestedRounds: number;
  completedRounds: number;
  eventCount: number;
  cultivationChange: number;
  lifespanChange: number;
  spiritStonesChange: number;
  attributeChanges: Partial<Attributes>;
  eventTitles: string[];
  stopReason: CultivationSessionStopReason;
  combat?: CombatSessionSummary;
}

export interface CombatSessionSummary {
  battles: number;
  victories: number;
  defeats: number;
  suppliesConsumed: InventoryReward[];
  itemRewards: InventoryReward[];
}

export interface OfflineCultivationState {
  remainingRounds: number;
}

export interface TribulationState {
  targetRealmName: string;
  targetRealmLevel: number;
  strikesRequired: number;
  strikesResolved: number;
  successes: number;
  failures: number;
}

export interface GameEvent {
  id: string;
  combatZoneId?: CombatZoneId;
  combatEncounterId?: string;
  combatBoss?: boolean;
  combatEnemyId?: string;
  combatElite?: boolean;
  combatDifficultyMultiplier?: number;
  combatDungeonFloor?: number;
  combatDungeonTotalFloors?: number;
  sectMissionId?: string;
  lifeSkillId?: LifeSkillId;
  lifeSkillRecipeId?: string;
  age: number;
  type: EventType;
  title: string;
  description: string;
  weight?: number;
  conditions?: {
    minRealmLevel?: number;
    maxRealmLevel?: number;
    minAge?: number;
    attributes?: Partial<Attributes> & { 灵石?: number };
    spiritRootIds?: string[];
    talentIds?: string[];
  };
  effects: {
    根骨?: number;
    神识?: number;
    悟性?: number;
    气运?: number;
    颜值?: number;
    灵石?: number;
    寿命?: number;
    时间?: number;
    境界?: 'advance' | 'regress';
    修为?: number;
  };
  appliedEffects?: GameEvent['effects'];
  check?: D20CheckReport;
  combat?: CombatReport;
  itemRewards?: InventoryReward[];
  itemLosses?: InventoryReward[];
  techniqueRewards?: string[];
  pathResourceChange?: {
    name: string;
    value: number;
  };
  result: 'success' | 'failure' | 'neutral' | 'great-success' | 'great-failure';
  isEnding?: boolean;
  endingType?: 'died' | 'ascended';
}

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  resourceType?: ResourceType;
  rarity: Rarity;
  description: string;
  usable: boolean;
  effects?: GameEvent['effects'];
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export interface InventoryReward {
  itemId: string;
  quantity: number;
}

export interface TechniqueDefinition {
  id: string;
  pathId: CultivationPathId;
  name: string;
  grade: TechniqueGrade;
  description: string;
  minRealmLevel: number;
  maxLevel: number;
  trainCost: {
    修为: number;
    时间: number;
  };
  effectsPerLevel: Partial<Attributes>;
  offensePerLevel: number;
}

export interface LearnedTechnique {
  techniqueId: string;
  level: number;
}

export interface LifeSkillProgress {
  skillId: LifeSkillId;
  level: number;
  exp: number;
}

export interface RivalState {
  name: string;
  enmity: number;
  defeats: number;
  active: boolean;
}

export interface SectState {
  sectId: CultivationSectId;
  rank: string;
  contribution: number;
  reputation: number;
}

export interface BreakthroughPreparationState {
  elixir: number;
  artifact: number;
  talisman: number;
  array: number;
}

export interface CombatStats {
  victories: number;
  defeats: number;
  injury: number;
  bestStreak: number;
  currentStreak: number;
}

export interface PathResourceState {
  value: number;
}

export interface CombatRound {
  round: number;
  playerAction: string;
  enemyAction: string;
  playerRating: number;
  enemyRating: number;
  playerHp: number;
  enemyHp: number;
  playerDamage: number;
  enemyDamage: number;
  playerMaxHp: number;
  enemyMaxHp: number;
  playerHit?: boolean;
  enemyHit?: boolean;
  playerAttackRoll?: number;
  enemyAttackRoll?: number;
  playerAttackTotal?: number;
  enemyAttackTotal?: number;
  playerTargetDodge?: number;
  enemyTargetDodge?: number;
  playerCritical?: boolean;
  enemyCritical?: boolean;
  playerGuarded?: boolean;
  enemyGuarded?: boolean;
  bossMechanicText?: string;
  statusText?: string;
  playerSpellId?: string;
  check?: D20CheckReport;
}

export interface CombatReport {
  victory?: boolean;
  enemyName: string;
  enemyRank: string;
  playerRating: number;
  enemyRating: number;
  winRate: number;
  injuryChange: number;
  injuryAfter: number;
  cultivationPercent: number;
  resultText: string;
  styleText: string;
  playerMaxHp: number;
  enemyMaxHp: number;
  playerHpAfter: number;
  enemyHpAfter: number;
  playerAttack: number;
  playerDefense: number;
  playerDodge: number;
  playerSpeed: number;
  enemyAttack: number;
  enemyDefense: number;
  enemyDodge: number;
  enemySpeed: number;
  initiative?: InitiativeReport;
  attackCheck?: D20CheckReport;
  supportText?: string;
  supplyConsumed?: InventoryReward[];
  rounds?: CombatRound[];
}

export interface TurnCombatantState {
  name: string;
  rank?: string;
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  attack: number;
  defense: number;
  dodge: number;
  speed: number;
}

export interface CombatStatusState {
  id: CombatStatusId;
  stacks: number;
  remainingTurns: number;
}

export interface CombatCooldownState {
  spellId: string;
  remainingTurns: number;
}

export interface TurnCombatState {
  id: string;
  event: GameEvent;
  choice?: EventChoice;
  turn: number;
  maxTurns: number;
  enemyName: string;
  enemyRank: string;
  styleText: string;
  cultivationPercent: number;
  baseInjury: number;
  player: TurnCombatantState;
  enemy: TurnCombatantState;
  initiative: InitiativeReport;
  attackCheck: D20CheckReport;
  winRate: number;
  itemSupportConsumed: InventoryReward[];
  autoSupplyConsumed: InventoryReward[];
  itemSupportInjuryMultiplier: number;
  itemSupportText?: string;
  bossMechanicId?: BossMechanicId;
  bossMechanicText?: string;
  enemyResistances: CombatStatusId[];
  enemyTraitText: string;
  enemyIntentBias: EnemyIntentId;
  bossPhase: 1 | 2;
  playerStatuses: CombatStatusState[];
  enemyStatuses: CombatStatusState[];
  spellCooldowns: CombatCooldownState[];
  enemyIntent: EnemyIntentId;
  enemyIntentText: string;
  rounds: CombatRound[];
  log: string[];
}

export interface D20CheckReport {
  label: string;
  attribute: keyof Attributes;
  dc: number;
  mode: CheckMode;
  rolls: number[];
  selectedRoll: number;
  attributeModifier: number;
  proficiencyBonus: number;
  bonus: number;
  total: number;
  outcome: CheckOutcome;
  sourceText?: string;
}

export interface InitiativeReport {
  player: D20CheckReport;
  enemyRoll: number;
  enemyBonus: number;
  enemyTotal: number;
  margin: number;
  resultText: string;
}

export interface FeatDefinition {
  id: string;
  name: string;
  description: string;
  minRealmLevel?: number;
  pathIds?: CultivationPathId[];
  sectIds?: CultivationSectId[];
  bonuses: {
    checkBonus?: number;
    initiativeBonus?: number;
    offenseMultiplier?: number;
    breakthroughBonus?: number;
    injuryMultiplier?: number;
    greatSuccessOn19?: boolean;
    reduceGreatFailure?: boolean;
  };
}

export interface SpellDefinition {
  id: string;
  pathId: CultivationPathId;
  name: string;
  bookName: string;
  description: string;
  minRealmLevel: number;
  combat: {
    qiCost: number;
    cooldown: number;
    damageMultiplier: number;
    description: string;
    enemyStatus?: {
      id: CombatStatusId;
      chance: number;
      stacks: number;
      duration: number;
    };
    selfStatus?: {
      id: CombatStatusId;
      stacks: number;
      duration: number;
    };
    healPercent?: number;
    lifestealPercent?: number;
    interrupt?: boolean;
  };
  bonuses: {
    checkBonus?: number;
    initiativeBonus?: number;
    offenseMultiplier?: number;
    enemyOffenseMultiplier?: number;
    breakthroughBonus?: number;
    injuryMultiplier?: number;
    tribulationFocus?: number;
  };
}

export interface PassiveFeature {
  id: string;
  name: string;
  source: string;
  description: string;
}

export interface GameRecord {
  id: string;
  date: string;
  characterName: string;
  finalRealm: string;
  age: number;
  spiritRoot?: string;
  talent: string;
  result: 'died' | 'ascended';
  stats: Attributes;
  spiritStones: number;
  achievements: string[];
}

export interface SavedGameSlot {
  version: 5;
  savedAt: string;
  gameState: GameState;
}
