// ─── Shared Batch Processing Logic ─────────────────────────────────────────────
// Used by both:
//   1. /api/batch (Vercel API route — synchronous for small batches)
//   2. supabase/edge-functions/batch-processor (Edge Function — for large batches)

import { analyseWebsite } from "@/lib/scraper/website";
import { calculateScore } from "@/lib/scoring";
import { getNiche } from "@/lib/discovery/categories";
import type { DiscoveredBusiness, AuditedBusiness } from "@/types";

// ─── Opportunity Score ─────────────────────────────────────────────────────────

export function computeOpportunityScore(
  auditScore: number,
  websiteAvailable: boolean,
  hasEmail: boolean,
  hasPhone: boolean,
  categoryKey: string,
): number {
  const auditNorm = auditScore / 95;
  const websiteBonus = websiteAvailable ? 1 : 0;
  const contactBonus = Math.min((hasEmail ? 1 : 0) + (hasPhone ? 0.5 : 0), 1);
  const niche = getNiche(categoryKey);
  const catBonus = niche?.highOpportunity ? 1 : 0;

  const raw =
    auditNorm * 0.70 +
    websiteBonus * 0.15 +
    contactBonus * 0.10 +
    catBonus * 0.05;

  return Math.round(Math.min(raw * 100, 100));
}

// ─── Outreach Message Generator ─────────────────────────────────────────────────

export function buildOutreachMessage(
  name: string,
  auditScore: number,
  weaknesses: string[],
  category: string,
): string {
  const firstName = name.split(" ")[0] || "there";
  const topWeaknesses = weaknesses.slice(0, 2).join(" and ").toLowerCase();
  const categoryCapitalized = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ");

  if (auditScore < 40) {
    return `Hi ${firstName}, I ran a free audit on ${name}'s website (a ${categoryCapitalized} in your area) and found the biggest opportunity: ${topWeaknesses}. Most local businesses lose leads to competitors because CTAs are buried, contact info is hard to find, or there's no lead form. Happy to share exactly what I found — it takes 2 minutes. No obligation.`;
  } else if (auditScore < 70) {
    return `Hi ${firstName}, I looked at ${name}'s site and it's in decent shape. A few targeted tweaks could push conversion rates noticeably higher — particularly around ${topWeaknesses}. I'm a web strategist who works with ${categoryCapitalized} businesses specifically. Worth a quick 5-minute call if you're open to it?`;
  } else {
    return `Hi ${firstName}, I've been looking at ${name}'s website and you've actually done a solid job — it's clear you've invested in the site. One area I'd focus on for maximum impact: ${topWeaknesses}. If you're open to a quick call, I'd love to share what I found in under 5 minutes. No pressure either way.`;
  }
}

// ─── Single Business Audit ─────────────────────────────────────────────────────

export async function auditBusiness(
  business: DiscoveredBusiness,
): Promise<AuditedBusiness> {
  // If no website is available, use a domain guess from the business name
  const website = business.website ?? `https://${guessDomain(business)}`;

  let websiteAvailable = false;
  let auditScore = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  try {
    const analysis = await analyseWebsite(website);
    auditScore = calculateScore(analysis);
    websiteAvailable = analysis.title_text !== "" || analysis.cta_count > 0;

    const channels = analysis.contact_channels;
    if (analysis.cta_count >= 1)
      strengths.push(`${analysis.cta_count} CTA element${analysis.cta_count > 1 ? "s" : ""} detected`);
    if (analysis.cta_above_fold) strengths.push("CTA above the fold");
    if (analysis.cta_action_word) strengths.push("CTA uses clear action language");
    if (channels.includes("email")) strengths.push("Email address visible");
    if (channels.includes("phone")) strengths.push("Phone number visible");
    if (analysis.has_address) strengths.push("Physical address listed");
    if (analysis.trustSignals.length >= 2)
      strengths.push(`${analysis.trustSignals.length} trust signals detected`);

    if (analysis.cta_count === 0) weaknesses.push("No CTA element detected");
    else if (!analysis.cta_above_fold) weaknesses.push("CTA not above the fold");
    if (!channels.includes("email") && !channels.includes("phone"))
      weaknesses.push("No email or phone found");
    if (analysis.trustSignals.length === 0) weaknesses.push("No trust signals detected");
    if (!analysis.has_meta_desc) weaknesses.push("Missing meta description");
    if (analysis.form_quality === 0) weaknesses.push("No contact form found");
    if (!analysis.has_viewport) weaknesses.push("No mobile viewport set");
  } catch {
    weaknesses.push("Website unreachable or blocked");
  }

  // Extract email from the scrape if it was found (contact_channels includes 'email')
  const hasEmail = business.email !== null; // email will be in business.email after DB upsert
  const hasPhone = business.phone !== null;

  const opportunityScore = computeOpportunityScore(
    auditScore,
    websiteAvailable,
    hasEmail,
    hasPhone,
    business.category,
  );

  return {
    ...business,
    auditScore,
    auditStrengths: strengths,
    auditWeaknesses: weaknesses,
    websiteAvailable,
    opportunityScore,
    outreachMessage: buildOutreachMessage(business.name, auditScore, weaknesses, business.category),
  };
}

// ─── Domain Guesser ─────────────────────────────────────────────────────────────

function guessDomain(business: DiscoveredBusiness): string {
  const name = business.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .slice(0, 30);

  const tlds = ["com", "co", "net", "org"];
  // Try common TLDs
  return `${name}.com`;
}
