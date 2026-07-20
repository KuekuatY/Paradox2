import { getJourneyInsights } from '@/data/journeyInsights';
import { useGameStore } from '@/stores/gameStore';

export default function JourneyInsightsPanel({ className = '' }: { className?: string }) {
  const gameState = useGameStore(state => state.gameState);
  const insights = getJourneyInsights(gameState);
  return (
    <section className={`ink-panel rounded-lg p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ink-title text-xl font-bold">本世洞察</h2>
          <p className="mt-1 text-xs font-semibold text-[#66766e]">根据当前构筑、收支、战绩和突破目标实时诊断</p>
        </div>
        <div className="rounded border border-[#355d58]/25 bg-[#eef3df] px-3 py-2 text-right">
          <div className="text-xs text-[#66766e]">构筑评分</div>
          <div className="font-bold text-[#355d58]">{insights.buildScore}/1000 · {insights.buildGrade}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="装备评级" value={insights.equipmentRating} />
        <Metric label="战斗胜率" value={`${insights.battleWinRate}%`} />
        <Metric label="修为完成" value={`${insights.progressPercent}%`} />
        <Metric label="灵石收入" value={`+${insights.spiritStoneIncome}`} />
        <Metric label="灵石支出" value={`-${insights.spiritStoneExpense}`} />
        <Metric label="灵石净额" value={insights.spiritStoneNet >= 0 ? `+${insights.spiritStoneNet}` : insights.spiritStoneNet} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InsightList title="当前瓶颈" entries={insights.bottlenecks} tone="warning" />
        <InsightList title="风险预警" entries={insights.deathRisks} tone="danger" />
        <InsightList title="建议行动" entries={insights.recommendations} tone="good" />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-[#738275]/20 bg-[#fffdf2]/70 px-3 py-2 text-center text-xs">
      <div className="text-[#66766e]">{label}</div>
      <div className="mt-1 font-bold text-[#355d58]">{value}</div>
    </div>
  );
}

function InsightList({
  title,
  entries,
  tone
}: {
  title: string;
  entries: string[];
  tone: 'warning' | 'danger' | 'good';
}) {
  const colors = tone === 'danger'
    ? 'border-[#9d3d2f]/20 bg-[#f2ddd4]/55 text-[#9d3d2f]'
    : tone === 'warning'
      ? 'border-[#a9823c]/20 bg-[#f0dfad]/35 text-[#7a5426]'
      : 'border-[#355d58]/20 bg-[#eef3df]/55 text-[#355d58]';
  return (
    <div className={`rounded-md border p-3 ${colors}`}>
      <div className="mb-2 text-sm font-bold">{title}</div>
      <div className="space-y-1 text-xs leading-relaxed">
        {entries.map(entry => <div key={entry}>· {entry}</div>)}
      </div>
    </div>
  );
}
