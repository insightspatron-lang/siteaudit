"use client";

import { useState, useRef, useCallback } from "react";
import type { AuditResult } from "@/types";
import type { DiscoveredBusiness, AuditedBusiness } from "@/types";
import DiscoveryPanel from "./components/DiscoveryPanel";
import ManualEntryPanel from "./components/ManualEntryPanel";
import CsvImportPanel from "./components/CsvImportPanel";
import BatchStatusPanel from "./components/BatchStatusPanel";
import OpportunityTable from "./components/OpportunityTable";
import CrmPage from "./components/CrmPage";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconCheckCircle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreBg(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}
function scoreText(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}
function levelLabel(score: number) {
  if (score >= 70) return "High Opportunity";
  if (score >= 40) return "Moderate Opportunity";
  return "Low Opportunity";
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCsv(results: AuditedBusiness[]) {
  const headers = [
    "Name", "Category", "City", "Country", "Website", "Phone",
    "Audit Score (/95)", "Opportunity Score (/100)",
    "Audit Strengths", "Audit Weaknesses", "Website Available",
    "Outreach Message",
  ];

  const rows = results.map((r) => [
    r.name,
    r.category,
    r.city,
    r.country,
    r.website ?? "",
    r.phone ?? "",
    String(r.auditScore),
    String(r.opportunityScore),
    r.auditStrengths.join(" | "),
    r.auditWeaknesses.join(" | "),
    r.websiteAvailable ? "Yes" : "No",
    `"${r.outreachMessage.replace(/"/g, '""')}"`,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => (cell.includes(",") || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `siteaudit-opportunities-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = "single" | "engine" | "crm";
type BatchStatus = "idle" | "queued" | "processing" | "complete" | "error";

export default function HomePage() {
  // ── Single audit state
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Engine state
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [businesses, setBusinesses] = useState<DiscoveredBusiness[]>([]);
  const [auditResults, setAuditResults] = useState<AuditedBusiness[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus>("idle");
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCompleted, setBatchCompleted] = useState(0);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // ── Single audit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setAudit(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Audit failed");
      else setAudit(data.audit as AuditResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!audit) return;
    navigator.clipboard.writeText(audit.outreachMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Engine handlers
  const handleBusinessesDiscovered = useCallback((discovered: DiscoveredBusiness[]) => {
    setBusinesses((prev) => {
      const existing = new Set(prev.map((b) => b.id));
      const filtered = discovered.filter((b) => !existing.has(b.id));
      return [...prev, ...filtered];
    });
  }, []);

  const handleBusinessesAdded = useCallback((added: DiscoveredBusiness[]) => {
    setBusinesses((prev) => {
      const existing = new Set(prev.map((b) => b.id));
      const filtered = added.filter((b) => !existing.has(b.id));
      return [...prev, ...filtered];
    });
  }, []);

  const handleStartBatch = async () => {
    if (businesses.length === 0) return;
    setBatchStatus("queued");
    setBatchTotal(businesses.length);
    setBatchCompleted(0);

    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businesses }),
      });

      if (!res.ok) {
        setBatchStatus("error");
        return;
      }

      const { jobId } = await res.json();
      setBatchStatus("processing");

      // Poll for completion
      pollJob(jobId);
    } catch {
      setBatchStatus("error");
    }
  };

  const pollJob = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/batch?id=${encodeURIComponent(jobId)}`);
        if (!res.ok) { clearInterval(interval); setBatchStatus("error"); return; }
        const data = await res.json();
        setBatchCompleted(data.completed ?? 0);

        if (data.status === "complete") {
          clearInterval(interval);
          setAuditResults(data.results ?? []);
          setBatchStatus("complete");
        } else if (data.status === "error") {
          clearInterval(interval);
          setBatchStatus("error");
        }
      } catch {
        clearInterval(interval);
        setBatchStatus("error");
      }
    }, 2000);
  };

  const handleCancelBatch = () => {
    setBatchStatus("idle");
    setBatchCompleted(0);
  };

  const handleExport = () => {
    if (auditResults.length === 0) return;
    exportToCsv(auditResults);
  };

  const isEngineEmpty = businesses.length === 0 && batchStatus === "idle";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
            <IconZap />
          </div>
          <span className="font-semibold text-slate-50">SiteAudit</span>

          {/* Mode toggle */}
          <div className="ml-6 flex items-center bg-slate-800 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode("single")}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                viewMode === "single"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <IconSearch /> Single Audit
            </button>
            <button
              onClick={() => setViewMode("engine")}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                viewMode === "engine"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <IconGlobe /> Opportunity Engine
            </button>
            <button
              onClick={() => setViewMode("crm")}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                viewMode === "crm"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              CRM
            </button>
          </div>

          <span className="ml-auto text-xs text-slate-500">Free · No signup · Instant</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* ─── SINGLE AUDIT MODE ─────────────────────────────────────────── */}
        {viewMode === "single" && (
          <>
            {/* Hero */}
            <section className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-slate-50 tracking-tight">
                Find website opportunities in seconds
              </h1>
              <p className="text-slate-400 text-base max-w-lg mx-auto">
                Enter any URL. Get an instant audit — CTA quality, contact visibility,
                trust signals, SEO basics — with a personalised outreach message.
              </p>
            </section>

            {/* URL Input */}
            <form onSubmit={handleSubmit} className="flex gap-3 max-w-xl mx-auto">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 h-11 px-4 rounded-lg bg-slate-900 border border-slate-700 text-slate-50 placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                disabled={loading}
                required
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="h-11 px-6 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                {loading ? "Analysing…" : "Audit Site"}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="max-w-xl mx-auto p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-4 max-w-xl mx-auto">
                <div className="skeleton h-6 w-48 rounded" />
                <div className="skeleton h-32 w-full rounded-lg" />
                <div className="skeleton h-48 w-full rounded-lg" />
              </div>
            )}

            {/* Audit Results */}
            {audit && !loading && (
              <div className="space-y-6 animate-in fade-in duration-300 max-w-xl mx-auto">

                {/* Score Banner */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Opportunity Score</p>
                      <p className={`text-3xl font-bold font-mono ${scoreText(audit.score)}`}>
                        {audit.score}<span className="text-lg text-slate-600 font-normal">/100</span>
                      </p>
                      <p className={`text-sm font-medium mt-1 ${scoreText(audit.score)}`}>
                        {levelLabel(audit.score)}
                      </p>
                    </div>
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreBg(audit.score)} strokeWidth="3"
                          strokeDasharray={`${(audit.score / 100) * 100} 100`} strokeLinecap="round"
                          style={{ transition: "stroke-dasharray 0.6s ease-out" }} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${scoreText(audit.score)}`}>{audit.score}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${scoreBg(audit.score)}/20`}>
                    <div className={`h-full rounded-full ${scoreBg(audit.score)}`} style={{ width: `${audit.score}%` }} />
                  </div>
                </div>

                {/* Strengths / Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Strengths</h3>
                    {audit.strengths.length === 0
                      ? <p className="text-sm text-slate-500 italic">No strengths detected</p>
                      : <ul className="space-y-2">{audit.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                          <span className="text-emerald-400 mt-0.5 flex-shrink-0"><IconCheck /></span>
                          {s}
                        </li>
                      ))}</ul>
                    }
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Weaknesses</h3>
                    {audit.weaknesses.length === 0
                      ? <p className="text-sm text-slate-500 italic">No major weaknesses detected</p>
                      : <ul className="space-y-2">{audit.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                          <span className="text-red-400 mt-0.5 flex-shrink-0"><IconX /></span>
                          {w}
                        </li>
                      ))}</ul>
                    }
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Recommendations</h3>
                  {audit.recommendations.length === 0
                    ? <p className="text-sm text-slate-500 italic">No specific recommendations</p>
                    : <ol className="space-y-2.5">{audit.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
                        <span className="text-indigo-400 flex-shrink-0 font-mono text-xs w-5 mt-0.5">{i + 1}.</span>
                        {r}
                      </li>
                    ))}</ol>
                  }
                </div>

                {/* Outreach Message */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cold Outreach Message</h3>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-50 transition-colors">
                      {copied
                        ? <><span className="text-emerald-400"><IconCheckCircle /></span> Copied!</>
                        : <><IconCopy /> Copy</>}
                    </button>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{audit.outreachMessage}</p>
                </div>

                {/* Audit another */}
                <div className="text-center">
                  <button onClick={() => { setAudit(null); setUrl(""); inputRef.current?.focus(); }}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                    Audit another site →
                  </button>
                </div>
              </div>
            )}

            {/* How it works (shown when idle) */}
            {!audit && !loading && (
              <section className="space-y-4 max-w-xl mx-auto">
                <h2 className="text-center text-sm font-medium text-slate-500 uppercase tracking-wider">How it works</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[{ n: "1", title: "Enter a URL", desc: "Paste any business website address" },
                    { n: "2", title: "Instant analysis", desc: "We check CTAs, contact info, SEO signals" },
                    { n: "3", title: "Get your report", desc: "Score, fixes, and a ready-to-use pitch" }].map(({ n, title, desc }) => (
                    <div key={n} className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center space-y-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold flex items-center justify-center mx-auto">{n}</div>
                      <p className="text-sm font-medium text-slate-200">{title}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Opportunity Engine (Phase 1 — ephemeral, no persistence) */}
        {viewMode === "engine" && (
          <div className="space-y-6">

            {/* Engine Hero */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Opportunity Engine</h1>
              <p className="text-slate-400 text-base max-w-2xl mx-auto mt-2">
                Discover businesses by niche and location, batch-audit their websites,
                rank by opportunity score, and export outreach-ready leads.
              </p>
            </div>

            {/* Three input panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DiscoveryPanel
                onDiscovered={handleBusinessesDiscovered}
                onLoading={setDiscoveryLoading}
                isLoading={discoveryLoading}
              />
              <ManualEntryPanel onAdded={handleBusinessesAdded} />
              <CsvImportPanel onParsed={handleBusinessesAdded} />
            </div>

            {/* Batch controls + status */}
            <BatchStatusPanel
              status={batchStatus}
              total={batchTotal}
              completed={batchCompleted}
              onStart={handleStartBatch}
              onCancel={handleCancelBatch}
              businesses={businesses}
              isEmpty={businesses.length === 0}
            />

            {/* Results table */}
            {(auditResults.length > 0 || businesses.length > 0) && (
              <OpportunityTable
                results={auditResults.length > 0 ? auditResults : []}
                onExportCsv={handleExport}
              />
            )}

            {/* Empty state */}
            {isEngineEmpty && (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-600">
                  <IconGlobe />
                </div>
                <p className="text-slate-400 text-sm font-medium">No businesses yet</p>
                <p className="text-slate-600 text-xs max-w-sm mx-auto">
                  Search for businesses by niche and city, add URLs manually, or import a CSV
                  to start finding opportunities.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── CRM MODE (Phase 2 — Supabase persistence) ──────────────────── */}
        {viewMode === "crm" && (
          <CrmPage />
        )}
      </main>

      <footer className="border-t border-slate-900 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-slate-600">
          <span>SiteAudit · Zero paid services · Heuristic + optional AI</span>
          <span>v1.1 · Opportunity Engine</span>
        </div>
      </footer>
    </div>
  );
}
