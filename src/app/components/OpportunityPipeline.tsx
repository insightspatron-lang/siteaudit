"use client";

import type { Opportunity, OpportunityStatus } from "@/types";
import { OPPORTUNITY_STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/types";

interface Props {
  opportunities: Opportunity[];
  onStatusChange: (id: string, status: OpportunityStatus) => void;
  onSelect: (opp: Opportunity) => void;
  selectedId?: string;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-slate-600";
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export default function OpportunityPipeline({ opportunities, onStatusChange, onSelect, selectedId }: Props) {
  const byStatus = Object.fromEntries(
    OPPORTUNITY_STATUSES.map((s) => [s, opportunities.filter((o) => o.status === s)]),
  ) as Record<OpportunityStatus, Opportunity[]>;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: "320px" }}>
      {OPPORTUNITY_STATUSES.map((status) => {
        const items = byStatus[status];
        return (
          <div key={status} className="flex-shrink-0 w-56 flex flex-col">
            {/* Column header */}
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-t-lg ${STATUS_COLORS[status]}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">{STATUS_LABELS[status]}</span>
              <span className="text-xs opacity-70 font-mono">{items.length}</span>
            </div>

            {/* Column body */}
            <div className="flex-1 bg-slate-900 border border-slate-800 border-t-0 rounded-b-lg p-2 space-y-2 overflow-y-auto">
              {items.length === 0 && (
                <p className="text-xs text-slate-700 text-center py-4 italic">No opportunities</p>
              )}
              {items.map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => onSelect(opp)}
                  className={`bg-slate-800 border rounded-lg p-3 cursor-pointer transition-all text-xs space-y-1.5 ${
                    selectedId === opp.id
                      ? "border-indigo-500 ring-1 ring-indigo-500"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <p className="font-medium text-slate-200 leading-snug line-clamp-2">{opp.name}</p>
                  <p className="text-slate-600 text-[10px] truncate">{opp.city ?? opp.website ?? ""}</p>
                  {opp.opportunityScore !== null && (
                    <p className={`font-mono font-semibold ${scoreColor(opp.opportunityScore)}`}>
                      {opp.opportunityScore} / 100
                    </p>
                  )}

                  {/* Quick status transitions */}
                  <div className="pt-1 border-t border-slate-700">
                    {status === "new" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(opp.id, "contacted"); }}
                        className="w-full text-center text-blue-400 hover:text-blue-300 py-0.5 rounded text-[10px] hover:bg-blue-500/10 transition-colors"
                      >
                        Mark Contacted →
                      </button>
                    )}
                    {status === "contacted" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(opp.id, "replied"); }}
                        className="w-full text-center text-amber-400 hover:text-amber-300 py-0.5 rounded text-[10px] hover:bg-amber-500/10 transition-colors"
                      >
                        Mark Replied →
                      </button>
                    )}
                    {status === "replied" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(opp.id, "meeting_booked"); }}
                        className="w-full text-center text-purple-400 hover:text-purple-300 py-0.5 rounded text-[10px] hover:bg-purple-500/10 transition-colors"
                      >
                        Book Meeting →
                      </button>
                    )}
                    {(status === "contacted" || status === "replied") && (
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onStatusChange(opp.id, "won"); }}
                          className="flex-1 text-center text-emerald-400 hover:text-emerald-300 py-0.5 rounded text-[10px] hover:bg-emerald-500/10 transition-colors"
                        >
                          ✓ Won
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onStatusChange(opp.id, "lost"); }}
                          className="flex-1 text-center text-red-400 hover:text-red-300 py-0.5 rounded text-[10px] hover:bg-red-500/10 transition-colors"
                        >
                          ✗ Lost
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
