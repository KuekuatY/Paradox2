import { ascensionPreparations, ASCENSION_PREPARATION_TARGET, getEndgameRequirements, INVASION_VICTORY_TARGET } from '@/data/endgame';
import { getItem } from '@/data/items';
import { realms } from '@/data/realms';
import { getSectRankIndex, isAtSectHeadquarters } from '@/data/sectWorld';
import { getWorldRegion } from '@/data/worldMap';
import { useGameStore } from '@/stores/gameStore';

const legacyChoices = [
  { id: 'guardian' as const, name: '守界之愿', description: '飞升后仍以庇护此界为道愿，偏重神识与气运。' },
  { id: 'conqueror' as const, name: '开天之愿', description: '以破界征途为道愿，偏重根骨与正面战斗。' },
  { id: 'wanderer' as const, name: '逍遥之愿', description: '不立仙庭，只求遍历诸界，偏重气运与人缘。' }
];

export default function EndgamePanel({ className = '' }: { className?: string }) {
  const { gameState, challengeEndgame, chooseEndgameLegacy, prepareAscension } = useGameStore();
  if (gameState.currentRealm.level < 8) return null;
  const busy = !!gameState.pendingCombat
    || !!gameState.pendingEvent
    || !!gameState.pendingTribulation
    || gameState.pendingFeatOptions.length > 0;
  const requirements = getEndgameRequirements(gameState);
  const currentRegion = getWorldRegion(gameState.worldMap.currentRegionId);
  const sect = gameState.sect;
  const leadershipReady = !sect
    || sect.sectId === 'loose'
    || gameState.endgame.leadershipWon
    || getSectRankIndex(sect.rank) >= getSectRankIndex('掌门');
  const atHeadquarters = !!sect && isAtSectHeadquarters(sect.sectId, gameState.worldMap.currentRegionId);
  const preparationsReady = Object.values(gameState.endgame.ascensionPreparation)
    .every(value => value >= ASCENSION_PREPARATION_TARGET);
  const requiredProgress = realms[gameState.currentRealm.level + 1]?.cultivationRequired
    ?? gameState.currentRealm.cultivationRequired;

  return (
    <section className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">飞升大愿</h2>
          <p className="mt-1 text-xs font-semibold text-[#66766e]">大乘之后需淬炼三关、平定界患，并通过天门终试</p>
        </div>
        <span className="rounded border border-[#a9823c]/25 bg-[#f0dfad]/45 px-3 py-1.5 text-xs font-bold text-[#7a5426]">
          完成 {requirements.filter(requirement => requirement.current >= requirement.target).length}/{requirements.length}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {requirements.map(requirement => {
          const done = requirement.current >= requirement.target;
          return (
            <div key={requirement.id} className="rounded border border-[#738275]/20 bg-[#fffdf2]/70 px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#45564f]">{requirement.label}</span>
                <span className={done ? 'font-bold text-[#355d58]' : 'text-[#7a5426]'}>{done ? '已完成' : `${requirement.current}/${requirement.target}`}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-[#738275]/20 pt-4">
        <div className="mb-2 font-bold text-[#45564f]">飞升道愿</div>
        <div className="grid gap-2 md:grid-cols-3">
          {legacyChoices.map(choice => {
            const selected = gameState.endgame.legacyChoice === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={busy || (!!gameState.endgame.legacyChoice && !selected)}
                onClick={() => chooseEndgameLegacy(choice.id)}
                className={`min-h-[92px] rounded-md border p-3 text-left ${selected
                  ? 'border-[#355d58]/45 bg-[#eef3df] text-[#355d58]'
                  : 'border-[#738275]/20 bg-[#fff9e8]/65 text-[#66766e] disabled:opacity-45'
                }`}
              >
                <span className="block text-sm font-bold">{choice.name}</span>
                <span className="mt-1 block text-xs leading-relaxed">{choice.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-[#738275]/20 pt-4">
        <div className="mb-2 font-bold text-[#45564f]">三关准备</div>
        <div className="grid gap-2 md:grid-cols-3">
          {ascensionPreparations.map(preparation => {
            const level = gameState.endgame.ascensionPreparation[preparation.id];
            const progressCost = Math.max(1, Math.round(requiredProgress * preparation.progressPercentCost));
            const itemsReady = preparation.itemCosts.every(cost => (
              gameState.inventory.find(entry => entry.itemId === cost.itemId)?.quantity ?? 0
            ) >= cost.quantity);
            const canPrepare = !busy
              && level < ASCENSION_PREPARATION_TARGET
              && gameState.spiritStones >= preparation.spiritStoneCost
              && gameState.cultivationProgress >= progressCost
              && itemsReady
              && gameState.age + preparation.timeCost < gameState.lifespan;
            return (
              <div key={preparation.id} className="flex min-h-[190px] flex-col rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-[#355d58]">{preparation.name}</span>
                  <span className="text-xs font-bold text-[#7a5426]">{level}/{ASCENSION_PREPARATION_TARGET}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#66766e]">{preparation.description}</p>
                <div className="mt-2 text-xs leading-relaxed text-[#7a5426]">
                  {preparation.timeCost}年 · 灵石 {preparation.spiritStoneCost} · 修为 {progressCost} · {preparation.itemCosts.map(cost => `${getItem(cost.itemId)?.name ?? cost.itemId}x${cost.quantity}`).join(' · ')}
                </div>
                <button
                  type="button"
                  disabled={!canPrepare}
                  onClick={() => prepareAscension(preparation.id)}
                  className="mt-auto min-h-[36px] rounded border border-[#355d58]/30 bg-[#355d58] px-2 text-xs font-bold text-[#fff9e8] disabled:border-[#738275]/15 disabled:bg-[#eee8d4] disabled:text-[#8d947f]"
                >
                  {level >= ASCENSION_PREPARATION_TARGET ? '准备圆满' : '进行一轮准备'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-2 border-t border-[#738275]/20 pt-4 md:grid-cols-3">
        <ChallengeCard
          title="掌门议决"
          detail={sect?.sectId === 'loose' ? '散修无需参与宗门议决。' : leadershipReady ? '宗门最高权柄已经稳固。' : '长老需返回宗门驻地，以实战和治宗威望争取掌门之位。'}
          button={leadershipReady ? '已完成' : atHeadquarters ? '参加议决' : '需返回驻地'}
          disabled={busy || leadershipReady || !atHeadquarters || getSectRankIndex(sect?.rank ?? '') < getSectRankIndex('长老')}
          onClick={() => challengeEndgame('leadership')}
        />
        <ChallengeCard
          title="界域入侵"
          detail={`前往天魔关击退三轮入侵先锋。当前 ${gameState.endgame.invasionVictories}/${INVASION_VICTORY_TARGET}。`}
          button={gameState.endgame.invasionVictories >= INVASION_VICTORY_TARGET ? '防线稳固' : currentRegion?.id === 'demon-gate' ? '迎击先锋' : '需前往天魔关'}
          disabled={busy || currentRegion?.id !== 'demon-gate' || gameState.endgame.invasionVictories >= INVASION_VICTORY_TARGET}
          onClick={() => challengeEndgame('invasion')}
        />
        <ChallengeCard
          title="天门终试"
          detail="三关、界患、掌门议决与飞升道愿齐备后，前往劫海天门挑战九劫道影。"
          button={gameState.endgame.heavenGateDefeated ? '天门已开' : currentRegion?.id === 'tribulation-boundary' ? '挑战道影' : '需前往劫海天门'}
          disabled={
            busy
            || currentRegion?.id !== 'tribulation-boundary'
            || gameState.endgame.heavenGateDefeated
            || !preparationsReady
            || gameState.endgame.invasionVictories < INVASION_VICTORY_TARGET
            || !leadershipReady
            || !gameState.endgame.legacyChoice
          }
          onClick={() => challengeEndgame('heaven-gate')}
        />
      </div>
    </section>
  );
}

function ChallengeCard({
  title,
  detail,
  button,
  disabled,
  onClick
}: {
  title: string;
  detail: string;
  button: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-[150px] flex-col rounded-md border border-[#738275]/20 bg-[#fffdf2]/70 p-3">
      <div className="font-bold text-[#45564f]">{title}</div>
      <p className="mt-2 text-xs leading-relaxed text-[#66766e]">{detail}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="mt-auto min-h-[36px] rounded border border-[#9a5b2f]/30 bg-[#f0dfad]/60 px-2 text-xs font-bold text-[#7a5426] disabled:border-[#738275]/15 disabled:bg-[#eee8d4] disabled:text-[#8d947f]"
      >
        {button}
      </button>
    </div>
  );
}
