"use client";

import type { AuditedBusiness, DiscoveredBusiness } from "@/types";

type BatchStatus = "idle" | "queued" | "processing" | "complete" | "error";

interface Props {
  status: BatchStatus;
  total: number;
  completed: number;
  onStart: () => void;
  onCancel: () => void;
  businesses: DiscoveredBusiness[];
  isEmpty: boolean;
}

export default function BatchStatusPanel({
  status,
  total,
  completed,
  onStart,
  onCancel,
  businesses,
  isEmpty,
}: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-200">Batch Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {status === "idle" && (isEmpty
              ? "Add businesses first using the panels above"
              : `${total} business${total !== 1 ? "es" : ""} queued — ready to audit`)}
            {status === "queued" && `Queued — ${total} businesses waiting`}
            {status === "processing" && `${completed} of ${total} audited (${pct}%)`}
            {status === "complete" && `Done — ${total} businesses audited`}
            {status === "error" && "Error occurred during audit"}
          </p>
        </div>

        {/* Action buttons */}
        {status === "idle" && !isEmpty && (
          <button
            onClick={onStart}
            className="h-9 px-5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium transition-colors"
          >
            Run Batch Audit
          </button>
        )}

        {status === "queued" && (
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
          >
            Cancel
          </button>
        )}

        {status === "processing" && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Processing…
          </div>
        )}
      </div>

      {/* Progress bar */}
      {(status === "queued" || status === "processing") && (
        <div className="space-y-1">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 text-right">{completed}/{total}</p>
        </div>
      )}

      {/* Complete state */}
      {status === "complete" && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Batch audit complete — {total} businesses scored
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">
          Some audits failed. Results are still shown — low-scoring entries may reflect unreachable sites.
        </div>
      )}
    </div>
  );
}
