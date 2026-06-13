"use client";

import type { OpportunityStats } from "@/types";
import { OPPORTUNITY_STATUSES, STATUS_LABELS } from "@/types";

interface Props {
  stats: OpportunityStats | null;
  isLoading: boolean;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-100 font-mono">{value}</p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

export default function CrmDashboard({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
            <div className="h-3 bg-slate-800 rounded w-24 mb-2" />
            <div className="h-7 bg-slate-800 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
        No opportunities yet. Discover businesses and run a batch audit to see your pipeline stats.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top-level stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Opportunities" value={stats.total} sub={`${stats.thisWeek} this week`} />
        <StatCard
          label="Pipeline Velocity"
          value={`${stats.pipelineVelocity}%`}
          sub="contacted + replied + meeting"
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate}%`}
          sub={`${stats.byStatus.won} won / ${stats.byStatus.lost} lost`}
        />
        <StatCard
          label="Avg Score"
          value={stats.avgScore ?? "—"}
          sub={`${stats.hotLeads} hot leads (score ≥ 70)`}
        />
      </div>

      {/* Pipeline funnel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Pipeline — {stats.total} total</p>
        <div className="space-y-2">
          {OPPORTUNITY_STATUSES.map((status) => {
            const count = stats.byStatus[status];
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            const isWinning = status === "won";
            const isLosing = status === "lost";
            const isActive = ["contacted", "replied", "meeting_booked"].includes(status);

            return (
              <div key={status} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-32 text-right shrink-0">
                  {STATUS_LABELS[status]}
                </span>
                <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWinning ? "bg-emerald-500" :
                      isLosing ? "bg-red-500" :
                      isActive ? "bg-indigo-500" :
                      "bg-slate-600"
                    }`}
                    style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
