"use client";

import { useState, useEffect, useCallback } from "react";
import type { Opportunity, OpportunityStatus, OpportunityStats } from "@/types";
import { OPPORTUNITY_STATUSES } from "@/types";
import CrmDashboard from "./CrmDashboard";
import OpportunityPipeline from "./OpportunityPipeline";
import OutreachComposer from "./OutreachComposer";
import DiscoveryPanel from "./DiscoveryPanel";
import ManualEntryPanel from "./ManualEntryPanel";
import CsvImportPanel from "./CsvImportPanel";
import BatchStatusPanel from "./BatchStatusPanel";
import type { DiscoveredBusiness } from "@/types";

// ─── API helpers ────────────────────────────────────────────────────────────────

async function fetchStats(): Promise<OpportunityStats | null> {
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchOpportunities(params?: {
  status?: OpportunityStatus;
  search?: string;
  sort?: string;
  order?: string;
}): Promise<Opportunity[]> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.search) sp.set("search", params.search);
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.order) sp.set("order", params.order);
  sp.set("limit", "200");

  const res = await fetch(`/api/opportunities?${sp}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

async function updateOpportunity(id: string, patch: Partial<Opportunity>): Promise<void> {
  await fetch(`/api/opportunities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [filterStatus, setFilterStatus] = useState<OpportunityStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [statsError, setStatsError] = useState(false);
  const [statsKey, setStatsKey] = useState(0);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(false);
    try {
      const data = await fetchStats();
      if (data) setStats(data);
      else setStatsError(true);
    } catch { setStatsError(true); }
    finally { setLoadingStats(false); }
  }, []);

  const loadOpportunities = useCallback(async (status?: OpportunityStatus | "all") => {
    setLoadingOpp(true);
    const s = status === "all" ? undefined : status;
    const data = await fetchOpportunities({
      status: s,
      search: search || undefined,
      sort: "opportunityScore",
      order: "desc",
    });
    setOpportunities(data);
    setLoadingOpp(false);
  }, [search]);

  useEffect(() => { loadStats(); }, [loadStats, statsKey]);
  useEffect(() => { loadOpportunities(filterStatus); }, [loadOpportunities, filterStatus]);

  const handleStatusChange = async (id: string, newStatus: OpportunityStatus) => {
    await updateOpportunity(id, { status: newStatus });
    setStatsKey((k) => k + 1);
    loadOpportunities(filterStatus);
    if (selected?.id === id) {
      setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleOpportunityUpdate = async (id: string, patch: Partial<Opportunity>) => {
    await updateOpportunity(id, patch);
    setStatsKey((k) => k + 1);
    loadOpportunities(filterStatus);
    if (selected) {
      setSelected((prev) => prev ? { ...prev, ...patch } : null);
    }
  };

  const handleDiscovered = useCallback((businesses: DiscoveredBusiness[]) => {
    // After discovery, trigger batch + reload
    loadOpportunities(filterStatus);
  }, [loadOpportunities, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Discovery + Batch input */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DiscoveryPanel
          onDiscovered={handleDiscovered}
          onLoading={() => {}}
          isLoading={false}
        />
        <ManualEntryPanel onAdded={handleDiscovered} />
        <CsvImportPanel onParsed={handleDiscovered} />
      </div>

      {/* Dashboard stats */}
      {statsError ? (
        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4 text-xs text-red-400">
          ⚠ Could not load stats — Supabase is not configured yet. Run the migration and add env vars to enable persistence.
        </div>
      ) : (
        <CrmDashboard stats={stats} isLoading={loadingStats} />
      )}

      {/* Pipeline controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus("all")}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === "all"
                ? "bg-indigo-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          {OPPORTUNITY_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("pipeline")}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              view === "pipeline" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setView("list")}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              view === "list" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Main content area: pipeline/list + side panel */}
      <div className="flex gap-4">
        {/* Pipeline or List */}
        <div className={`flex-1 ${selected ? "max-w-[calc(100%-360px)]" : ""}`}>
          {loadingOpp ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No opportunities found.
            </div>
          ) : view === "pipeline" ? (
            <OpportunityPipeline
              opportunities={opportunities}
              onStatusChange={handleStatusChange}
              onSelect={setSelected}
              selectedId={selected?.id}
            />
          ) : (
            <OpportunityListView
              opportunities={opportunities}
              onSelect={setSelected}
              selectedId={selected?.id}
            />
          )}
        </div>

        {/* Detail side panel */}
        {selected && (
          <div className="w-80 flex-shrink-0">
            <OutreachComposer
              key={selected.id}
              opportunity={selected}
              onUpdate={handleOpportunityUpdate}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List view ─────────────────────────────────────────────────────────────────

function OpportunityListView({
  opportunities,
  onSelect,
  selectedId,
}: {
  opportunities: Opportunity[];
  onSelect: (o: Opportunity) => void;
  selectedId?: string;
}) {
  return (
    <div className="space-y-2">
      {opportunities.map((opp) => (
        <div
          key={opp.id}
          onClick={() => onSelect(opp)}
          className={`flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm ${
            selectedId === opp.id
              ? "bg-slate-800 border-indigo-500 ring-1 ring-indigo-500"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-200 truncate">{opp.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {[opp.city, opp.category].filter(Boolean).join(" · ") || (opp.website ?? "")}
            </p>
          </div>
          <span className={`text-xs font-mono font-semibold ${
            (opp.opportunityScore ?? 0) >= 70 ? "text-emerald-400" :
            (opp.opportunityScore ?? 0) >= 40 ? "text-amber-400" : "text-red-400"
          }`}>
            {opp.opportunityScore ?? "—"}
          </span>
          <span className="text-xs text-slate-600 capitalize">{opp.status.replace("_", " ")}</span>
        </div>
      ))}
    </div>
  );
}
