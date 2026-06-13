"use client";

import { useState } from "react";
import type { Opportunity } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";

interface Props {
  opportunity: Opportunity;
  onUpdate: (id: string, patch: Partial<Opportunity>) => void;
  onClose: () => void;
}

export default function OutreachComposer({ opportunity, onUpdate, onClose }: Props) {
  const [message, setMessage] = useState(opportunity.outreachMessage ?? "");
  const [notes, setNotes] = useState(opportunity.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(opportunity.id, {
        outreachMessage: message,
        notes,
        // Status transition timestamps handled server-side
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const status = opportunity.status;
  const statusLabel = STATUS_LABELS[status];
  const statusColorClass = STATUS_COLORS[status];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColorClass}`}>
              {statusLabel}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{opportunity.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {opportunity.website ?? opportunity.email ?? opportunity.phone ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors ml-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Audit summary */}
        {opportunity.auditScore !== null && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Audit Score</p>
              <p className={`text-lg font-bold font-mono ${
                opportunity.auditScore >= 70 ? "text-emerald-400" :
                opportunity.auditScore >= 40 ? "text-amber-400" : "text-red-400"
              }`}>{opportunity.auditScore}/95</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Opportunity Score</p>
              <p className={`text-lg font-bold font-mono ${
                (opportunity.opportunityScore ?? 0) >= 70 ? "text-emerald-400" :
                (opportunity.opportunityScore ?? 0) >= 40 ? "text-amber-400" : "text-red-400"
              }`}>{opportunity.opportunityScore ?? "—"}/100</p>
            </div>
          </div>
        )}

        {/* Strengths / weaknesses */}
        {opportunity.auditStrengths && opportunity.auditStrengths.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Strengths</p>
            <ul className="space-y-1">
              {opportunity.auditStrengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {opportunity.auditWeaknesses && opportunity.auditWeaknesses.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Weaknesses</p>
            <ul className="space-y-1">
              {opportunity.auditWeaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-red-400 mt-0.5">✗</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Outreach message */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-500 uppercase tracking-wider">
              Outreach Message
            </label>
            <button
              onClick={handleCopy}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {copied ? (
                <span className="text-emerald-400">✓ Copied!</span>
              ) : (
                "Copy"
              )}
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">
            Private Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Call notes, pricing, next steps…"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {opportunity.website && (
            <a
              href={opportunity.website}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Visit Site
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
