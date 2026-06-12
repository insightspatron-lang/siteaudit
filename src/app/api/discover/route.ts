import { NextRequest, NextResponse } from "next/server";
import { discoverBusinesses } from "@/lib/discovery/osm";
import { getNiche } from "@/lib/discovery/categories";

const VALID_COUNTRIES = new Set([
  "US", "GB", "CA", "AU", "DE", "FR", "ES", "IT", "NL", "BE",
  "AT", "CH", "IE", "NZ", "SE", "NO", "DK", "FI", "PL", "PT",
  "BR", "MX", "AR", "CL", "CO", "IN", "JP", "KR", "SG", "ZA",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const categoryKey = searchParams.get("category") ?? "";
  const city = searchParams.get("city") ?? "";
  const country = (searchParams.get("country") ?? "US").toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  if (!categoryKey || !city) {
    return NextResponse.json(
      { error: "category and city are required" },
      { status: 400 },
    );
  }

  const niche = getNiche(categoryKey);
  if (!niche) {
    return NextResponse.json(
      { error: `Unknown category: ${categoryKey}` },
      { status: 400 },
    );
  }

  if (!VALID_COUNTRIES.has(country)) {
    return NextResponse.json(
      { error: `Unsupported country code: ${country}` },
      { status: 400 },
    );
  }

  try {
    const businesses = await discoverBusinesses(niche, city, country, limit);
    return NextResponse.json({
      query: { category: categoryKey, city, country, limit },
      businesses,
      count: businesses.length,
    });
  } catch (err) {
    console.error("[/api/discover]", err);
    return NextResponse.json(
      { error: "Discovery failed. The city may not be recognised or Overpass is overloaded. Try a larger city or reduce the limit." },
      { status: 500 },
    );
  }
}
