export type EventType = 'childhood' | 'cultivation' | 'combat' | 'encounter' | 'social' | 'disaster' | 'daily' | 'resource' | 'mind' | 'sect';

export type Rarity = '凡品' | '下品' | '中品' | '上品' | '变异' | '极品' | '神话' | '传说';

export type ItemType = '丹药' | '灵材' | '法器' | '符箓' | '阵材' | '功法' | '杂物';

export type ResourceType = '灵草' | '矿材' | '兽材' | '符材' | '阵材' | '灵鱼' | '灵石' | '成品';

export type TechniqueGrade = '黄' | '玄' | '地' | '天' | '仙';

export type CheckMode = 'normal' | 'advantage' | 'disadvantage';

export type CheckOutcome = 'great-success' | 'success' | 'failure' | 'great-failure';

export type AttributeEffect = Partial<Attributes> & {
  家境?: number;
};

export type CultivationPathId = 'sword' | 'body' | 'spell' | 'demonic';

export type CultivationSectId = 'loose' | 'sword-pavilion' | 'alchemy-valley' | 'artifact-hall' | 'talisman-court' | 'array-gate' | 'hehuan-sect' | 'demonic-sect';

export type LifeSkillId = 'alchemy' | 'crafting' | 'talisman' | 'array' | 'fishing' | 'spirit-field';

export type YearActionId = 'cultivate' | 'adventure' | 'seclusion' | 'life-skill';

export type CultivationSessionStopReason = 'completed' | 'breakthrough' | 'event-choice' | 'combat' | 'path-choice' | 'sect-choice' | 'feat-choice' | 'tribulation' | 'lifespan' | 'ascended';

export type CombatActionId = 'attack' | 'defend' | 'technique' | 'flee';

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
  effectKeys?: Array<keyof Attributes | '家境' | '修为' | '寿命'>;
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
  familyWealth: number;
  combatStats: CombatStats;
  inventory: InventoryEntry[];
  techniques: LearnedTechnique[];
  lifeSkills: LifeSkillProgress[];
  feats: string[];
  pendingFeatOptions: string[];
  equippedSpellIds: string[];
  selectedYearAction: YearActionId;
  cultivationPlan: CultivationPlan;
  lastCultivationSession: CultivationSessionSummary | null;
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

export interface CultivationSessionSummary {
  startedAge: number;
  endedAge: number;
  requestedRounds: number;
  completedRounds: number;
  eventCount: number;
  cultivationChange: number;
  lifespanChange: number;
  familyWealthChange: number;
  attributeChanges: Partial<Attributes>;
  eventTitles: string[];
  stopReason: CultivationSessionStopReason;
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
  sectMissionId?: string;
  age: number;
  type: EventType;
  title: string;
  description: string;
  weight?: number;
  conditions?: {
    minRealmLevel?: number;
    maxRealmLevel?: number;
    minAge?: number;
    attributes?: Partial<Attributes> & { 家境?: number };
    spiritRootIds?: string[];
    talentIds?: string[];
  };
  effects: {
    根骨?: number;
    神识?: number;
    悟性?: number;
    气运?: number;
    颜值?: number;
    家境?: number;
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
  check?: D20CheckReport;
}

export interface CombatReport {
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
  itemSupportInjuryMultiplier: number;
  itemSupportText?: string;
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
  familyWealth: number;
  achievements: string[];
}

export interface SavedGameSlot {
  version: 2;
  savedAt: string;
  gameState: GameState;
}
