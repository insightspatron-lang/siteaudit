"use client";

import { useRef } from "react";
import type { DiscoveredBusiness } from "@/types";

interface Props {
  onParsed: (businesses: DiscoveredBusiness[]) => void;
}

export default function CsvImportPanel({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) return;

      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/['"]/g, ""));
      const rows = lines.slice(1);

      const businesses: DiscoveredBusiness[] = [];

      for (const row of rows) {
        if (!row.trim()) continue;
        const cols = parseCsvRow(row);

        // Flexible column mapping
        const get = (names: string[]): string => {
          for (const name of names) {
            const idx = headers.findIndex(
              (h) => h === name || h.includes(name) || name.includes(h),
            );
            if (idx >= 0) return (cols[idx] ?? "").trim();
          }
          return "";
        };

        const name = get(["name", "business", "company", "business_name"]);
        const url = get(["url", "website", "site", "link"]);
        const phone = get(["phone", "tel", "telephone", "mobile"]);
        const address = get(["address", "location", "street"]);
        const city = get(["city", "town", "locality"]);
        const country = get(["country", "nation", "region"]) || "US";
        const category = get(["category", "niche", "industry", "type"]) || "business";

        if (!name && !url) continue;

        let normalizedUrl: string | null = null;
        if (url) {
          const raw = url.trim();
          if (raw.startsWith("http://") || raw.startsWith("https://")) {
            normalizedUrl = raw;
          } else {
            normalizedUrl = `https://${raw}`;
          }
        }

        businesses.push({
          id: `csv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: name || normalizedUrl?.split("/")[2]?.replace("www.", "") || "Unknown",
          category,
          address,
          city,
          country,
          lat: 0,
          lon: 0,
          website: normalizedUrl,
          phone: phone || null,
          source: "csv",
        });
      }

      onParsed(businesses);
    };

    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <div>
        <h2 className="text-sm font-medium text-slate-200">Import from CSV</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload a CSV with columns: name, url (or website), phone, address, city, country
        </p>
      </div>

      <label className="block">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="hidden"
        />
        <span className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm cursor-pointer hover:bg-slate-700 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Choose CSV file
        </span>
      </label>
    </div>
  );
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
