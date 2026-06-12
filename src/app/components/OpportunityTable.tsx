"use client";

import { useState } from "react";
import type { AuditedBusiness } from "@/types";

type SortKey = "opportunityScore" | "auditScore" | "name" | "category";
type SortDir = "asc" | "desc";

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function oppColor(score: number): string {
  if (score >= 70) return "bg-emerald-500/20 text-emerald-400";
  if (score >= 40) return "bg-amber-500/20 text-amber-400";
  return "bg-red-500/20 text-red-400";
}

interface Props {
  results: AuditedBusiness[];
  onExportCsv: () => void;
}

export default function OpportunityTable({ results, onExportCsv }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("opportunityScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...results].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "opportunityScore") cmp = a.opportunityScore - b.opportunityScore;
    else if (sortKey === "auditScore") cmp = a.auditScore - b.auditScore;
    else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
    return sortDir === "desc" ? -cmp : cmp;
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyMessage = (id: string, msg: string) => {
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      <span className="ml-1 text-indigo-400">{sortDir === "desc" ? "↓" : "↑"}</span>
    ) : null;

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No results yet. Discover businesses or import a CSV, then run a batch audit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {results.length} business{results.length !== 1 ? "es" : ""} · sorted by{" "}
          <span className="text-slate-300">{sortKey}</span>
        </p>
        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-8" />
              {(["name", "category", "opportunityScore", "auditScore"] as SortKey[]).map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none"
                >
                  {col === "opportunityScore" ? "Opportunity" : col === "auditScore" ? "Audit Score" : col.charAt(0).toUpperCase() + col.slice(1)}
                  <SortIcon col={col} />
                </th>
              ))}
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Website</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sorted.map((biz) => {
              const isExpanded = expanded.has(biz.id);
              return (
                <tr key={biz.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleExpand(biz.id)}
                      className="text-slate-600 hover:text-slate-300 text-xs transition-colors"
                    >
                      {isExpanded ? "−" : "+"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{biz.name}</div>
                    <div className="text-xs text-slate-500">{biz.city ? `${biz.city}, ${biz.country}` : biz.source}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs capitalize">{biz.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${oppColor(biz.opportunityScore)}`}>
                      {biz.opportunityScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono font-medium ${scoreColor(biz.auditScore)}`}>
                      {biz.auditScore}
                    </span>
                    <span className="text-slate-600 text-xs">/95</span>
                  </td>
                  <td className="px-4 py-3">
                    {biz.website ? (
                      <a
                        href={biz.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 truncate max-w-[160px] block"
                      >
                        {biz.website.replace("https://", "").replace("http://", "")}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">No URL</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyMessage(biz.id, biz.outreachMessage)}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copied === biz.id ? "✓ Copied" : "Copy msg"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
