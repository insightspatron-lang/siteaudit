"use client";

import { useState } from "react";
import type { DiscoveredBusiness } from "@/types";
import { NICHE_KEYS, NICHES } from "@/lib/discovery/categories";

const COUNTRY_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IE", label: "Ireland" },
  { code: "NZ", label: "New Zealand" },
  { code: "NL", label: "Netherlands" },
  { code: "IN", label: "India" },
];

interface Props {
  onDiscovered: (businesses: DiscoveredBusiness[]) => void;
  onLoading: (loading: boolean) => void;
  isLoading: boolean;
}

export default function DiscoveryPanel({ onDiscovered, onLoading, isLoading }: Props) {
  const [category, setCategory] = useState("plumber");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("US");
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;

    setError(null);
    setDiscovered(null);
    onLoading(true);

    try {
      const params = new URLSearchParams({
        category: category,
        city: city.trim(),
        country,
        limit: String(limit),
      });

      const res = await fetch(`/api/discover?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Discovery failed");
        return;
      }

      setDiscovered(data.businesses.length);
      onDiscovered(data.businesses);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      onLoading(false);
    }
  };

  const nicheDef = NICHES[category];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-slate-200">Discover Businesses</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Search OpenStreetMap for businesses by niche and location
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        {/* Niche */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Niche</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          >
            {NICHE_KEYS.map((key) => (
              <option key={key} value={key}>
                {NICHES[key].label}
              </option>
            ))}
          </select>
          {nicheDef && (
            <p className="text-xs text-slate-600 mt-0.5">
              {nicheDef.highOpportunity ? "★ High-opportunity niche" : "Standard niche"}
            </p>
          )}
        </div>

        {/* City + Country row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Austin"
              required
              className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Limit */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Results limit: {limit}</label>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !city.trim()}
          className="w-full h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {isLoading ? "Searching…" : `Find ${limit} businesses`}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">{error}</p>
      )}

      {discovered !== null && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 rounded px-3 py-2">
          Found {discovered} businesses — click &ldquo;Run Batch Audit&rdquo; to score them all
        </p>
      )}
    </div>
  );
}
