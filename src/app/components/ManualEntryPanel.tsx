"use client";

import { useState } from "react";
import type { DiscoveredBusiness } from "@/types";

interface Props {
  onAdded: (businesses: DiscoveredBusiness[]) => void;
}

export default function ManualEntryPanel({ onAdded }: Props) {
  const [input, setInput] = useState("");
  const [added, setAdded] = useState(0);

  const handleAdd = () => {
    const url = input.trim();
    if (!url) return;

    let normalized = url;
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }

    try {
      const u = new URL(normalized);
      const hostname = u.hostname.replace("www.", "");

      const business: DiscoveredBusiness = {
        id: `manual-${Date.now()}`,
        name: hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1),
        category: "business",
        address: "",
        city: "",
        country: "",
        lat: 0,
        lon: 0,
        website: normalized,
        email: null,
        phone: null,
        source: "manual",
      };

      onAdded([business]);
      setAdded((n) => n + 1);
      setInput("");
      setTimeout(() => setAdded(0), 3000);
    } catch {
      // invalid URL — ignore
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <div>
        <h2 className="text-sm font-medium text-slate-200">Add URL manually</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter a website URL to add it to the batch
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder="https://example.com"
          className="flex-1 h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="h-9 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      {added > 0 && (
        <p className="text-xs text-emerald-400">Added! Add another or run the batch.</p>
      )}
    </div>
  );
}
