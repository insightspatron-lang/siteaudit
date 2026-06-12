import * as cheerio from "cheerio";
import { calculateScore } from "@/lib/scoring";
import type { WebsiteAnalysis } from "@/lib/scoring";

const USER_AGENT = "Mozilla/5.0 (compatible; WebsiteAuditor/1.0; +https://example.com/bot)";

// ─── Website analyser ──────────────────────────────────────────────────────────

export async function analyseWebsite(url: string): Promise<WebsiteAnalysis> {
  let html = "";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    return minimalAnalysis(url);
  }

  const $ = cheerio.load(html);
  const bodyText = $("body").text();
  const lower = bodyText.toLowerCase();

  // ── CTA ──────────────────────────────────────────────────────────────────
  const ctaSel = [
    'a[href*="contact"]', 'a[href*="book"]', 'a[href*="schedule"]',
    'a[href*="demo"]', 'a[href*="get-started"]', 'a[href*="quote"]',
    'button', 'input[type="submit"]',
  ].join(",");

  const ctaEls = $(ctaSel);
  const ctaTexts: string[] = [];
  ctaEls.each((_, el) => {
    const t = $(el).text().trim();
    if (t) ctaTexts.push(t);
  });
  const cta_count = ctaTexts.length;

  // CTA above fold: in <header> OR within first few body children (proxy for above 600px)
  const headerCTA = $("header").find(ctaSel).length;
  let aboveFold = headerCTA > 0;
  if (!aboveFold) {
    // Heuristic: CTA in first 5 body children is likely above the fold
    // without needing actual pixel heights (cheerio limitation)
    for (const el of $("body").children().toArray().slice(0, 5)) {
      if ($(el).find(ctaSel).length > 0) { aboveFold = true; break; }
    }
    // Fallback: CTA anywhere in the first 10% of DOM elements
    if (!aboveFold) {
      const allEls = $("body").find("*").toArray();
      const threshold = Math.max(10, Math.floor(allEls.length * 0.1));
      for (const el of allEls.slice(0, threshold)) {
        if ($(el).find(ctaSel).length > 0 || $(el).is(ctaSel)) { aboveFold = true; break; }
      }
    }
  }

  const actionWords = /contact|book|schedule|demo|get started|quote|consult|appoint/i;
  const cta_action_word = ctaTexts.some(t => actionWords.test(t));

  // ── Contact ────────────────────────────────────────────────────────────────
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  const phoneRe = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const channels: string[] = [];
  if (emailRe.test(bodyText)) channels.push("email");
  if (phoneRe.test(bodyText)) channels.push("phone");
  const has_address = /street|avenue|road|blvd|suite|ste\.?|#\d+/i.test(bodyText);

  // ── Trust ─────────────────────────────────────────────────────────────────
  const ts: string[] = [];
  if (/testimonial|review|client says|customer feedback/i.test(lower))
    ts.push("testimonial");
  if (/certified|certification|licensed|insured|accredited|bbb|better business/i.test(lower))
    ts.push("certification");
  if (/guarantee|satisfaction guarantee|money back|refund policy/i.test(lower))
    ts.push("guarantee");
  if (/award|winner|top rated|best of|as seen in|press|in the news/i.test(lower))
    ts.push("award");
  if (/\d+\+?\s*years?\s*(of\s+)?(experience|service|business)/i.test(lower)
      || /established\s+\d{4}/i.test(lower))
    ts.push("years");
  if (/[\u2605\u2606\u2665]/.test(bodyText) || /5[\s-]*star|4[\s-]*star\s+rating/i.test(lower))
    ts.push("rating");

  // ── SEO ───────────────────────────────────────────────────────────────────
  const title_text   = $("title").text().trim();
  const has_title    = title_text.length > 0;
  const has_meta_desc = !!$('meta[name="description"]').attr("content")?.trim();
  const has_h1        = $("h1").first().text().trim().length > 0;
  const word_count    = bodyText.split(/\s+/).filter(Boolean).length;

  // ── Mobile ────────────────────────────────────────────────────────────────
  const has_viewport = $('meta[name="viewport"]').length > 0;
  // Tap target: links/buttons with font-size ≥16px or vertical padding ≥16px
  const largeTap = $("a, button").filter((_, el) => {
    const fs = parseFloat($(el).css("fontSize") ?? "0");
    const pad = parseFloat($(el).css("paddingTop") ?? "0")
              + parseFloat($(el).css("paddingBottom") ?? "0");
    return fs >= 16 || pad >= 32;
  }).length;
  const has_tap_targets = largeTap >= 3;

  // ── Form ──────────────────────────────────────────────────────────────────
  // 0=none, 1=basic, 2=+email field, 3=+phone field, 4=+name field
  let form_quality = 0;
  const forms = $("form");
  if (forms.length > 0) {
    form_quality = 1;
    const formHtml = forms.first().html() ?? "";
    if (/type=["']?email["']?/.test(formHtml) || /name=["']?email["']/.test(formHtml))
      form_quality = 2;
    if (/type=["']?tel["']?/.test(formHtml) || /name=["']?(phone|mobile|tel)["']/.test(formHtml))
      form_quality = Math.max(form_quality, 3);
    if (/name=["']?(name|first[_ ]?name|full[_ ]?name)["']/.test(formHtml))
      form_quality = 4;
  }

  // ── Bonus ─────────────────────────────────────────────────────────────────
  const has_ssl     = url.startsWith("https://");
  const has_favicon = $('link[rel="icon"]').length > 0 || $('link[rel="shortcut icon"]').length > 0;
  const has_social  = /facebook\.com|instagram\.com|twitter\.com|linkedin\.com|youtube\.com/i.test(html);
  const has_og_tags = $('meta[property="og:title"]').length > 0;

  return {
    url,
    title_text,
    cta_count,
    cta_above_fold: aboveFold,
    cta_action_word,
    contact_channels: channels,
    has_address,
    trustSignals: ts,
    has_title,
    has_meta_desc,
    has_h1,
    word_count,
    has_viewport,
    has_tap_targets,
    form_quality,
    has_ssl,
    has_favicon,
    has_social,
    has_og_tags,
  };
}

function minimalAnalysis(url: string): WebsiteAnalysis {
  return {
    url,
    title_text: "",
    cta_count: 0, cta_above_fold: false, cta_action_word: false,
    contact_channels: [], has_address: false, trustSignals: [],
    has_title: false, has_meta_desc: false, has_h1: false, word_count: 0,
    has_viewport: false, has_tap_targets: false, form_quality: 0,
    has_ssl: url.startsWith("https://"), has_favicon: false,
    has_social: false, has_og_tags: false,
  };
}

// ─── Audit output ─────────────────────────────────────────────────────────────

export interface AuditOutput {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  outreach_message: string;
}

export async function runWebsiteAudit(url: string): Promise<AuditOutput> {
  const a = await analyseWebsite(url);

  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (apiKey && !apiKey.startsWith("your_")) {
    try {
      const { runAiAudit } = await import("@/lib/ai/service");
      return await runAiAudit(url, a as any);
    } catch { /* fall through */ }
  }

  return heuristicAudit(a);
}

function heuristicAudit(a: WebsiteAnalysis): AuditOutput {
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  const strengths: string[] = [];

  // ── Strengths ────────────────────────────────────────────────────────────
  if (a.cta_count >= 1)
    strengths.push(`${a.cta_count} CTA element${a.cta_count > 1 ? "s" : ""} detected`);
  if (a.cta_above_fold) strengths.push("CTA is placed above the fold");
  if (a.cta_action_word) strengths.push("CTA uses clear action language");
  if (a.contact_channels.includes("email")) strengths.push("Email address is visible");
  if (a.contact_channels.includes("phone")) strengths.push("Phone number is visible");
  if (a.has_address) strengths.push("Physical address is listed");
  if (a.trustSignals.length >= 2)
    strengths.push(`${a.trustSignals.length} trust signals detected`);
  if (a.has_title && a.has_meta_desc && a.has_h1)
    strengths.push("Core SEO elements all present");
  if (a.has_viewport) strengths.push("Mobile viewport configured");
  if (a.has_ssl) strengths.push("Site uses HTTPS");
  if (a.has_og_tags) strengths.push("Open Graph tags present (social-ready)");
  if (a.has_social) strengths.push("Social media links found");
  if (a.has_favicon) strengths.push("Favicon is set");

  // ── Weaknesses + Recommendations ─────────────────────────────────────────
  if (a.cta_count === 0) {
    weaknesses.push("No call-to-action element detected");
    recommendations.push("Add a clear CTA: 'Contact Us', 'Get a Quote', or 'Book Now'");
  } else if (!a.cta_above_fold) {
    weaknesses.push("CTA exists but is not placed above the fold");
    recommendations.push("Move your primary CTA into the first viewport — do not require scrolling to convert");
  }

  if (!a.contact_channels.includes("email") && !a.contact_channels.includes("phone")) {
    weaknesses.push("No email or phone number found on the page");
    recommendations.push("Display contact details in the header or footer — email minimum");
  } else if (!a.contact_channels.includes("phone")) {
    weaknesses.push("No phone number detected — mobile visitors expect to call directly");
    recommendations.push("Add a click-to-call phone number near the CTA");
  }

  if (a.trustSignals.length === 0) {
    weaknesses.push("No trust signals detected");
    recommendations.push("Add at least one trust anchor: testimonial, certification, or years in business");
  } else if (a.trustSignals.length === 1) {
    weaknesses.push("Only one trust signal detected");
    recommendations.push("Layer 2–3 trust signals: testimonial + certification + years in business");
  }

  if (!a.has_meta_desc) {
    weaknesses.push("No meta description — hurts SEO click-through rates");
    recommendations.push("Add a 150–160 character meta description with your primary keyword");
  }

  if (a.form_quality === 0) {
    weaknesses.push("No contact or lead capture form detected");
    recommendations.push("Add a contact form — primary lead generation tool for service businesses");
  } else if (a.form_quality === 1) {
    weaknesses.push("Form exists but has no email field — you cannot follow up");
    recommendations.push("Add an email address field to your form");
  } else if (a.form_quality < 4) {
    recommendations.push("Adding name and phone fields to your form typically increases lead quality");
  }

  if (!a.has_viewport) {
    weaknesses.push("No viewport meta tag — page renders at desktop width on mobile");
    recommendations.push("Add <meta name='viewport' content='width=device-width, initial-scale=1'>");
  }

  if (!a.has_ssl && !a.url.startsWith("https://")) {
    weaknesses.push("Site is not served over HTTPS — browsers warn visitors");
    recommendations.push("Install SSL (Let's Encrypt is free) and redirect HTTP to HTTPS");
  }

  if (!a.has_og_tags)
    recommendations.push("Add Open Graph meta tags for rich social media previews when shared");

  if (!a.has_h1) {
    weaknesses.push("No H1 heading found — search engines rely on this for structure");
    recommendations.push("Add a descriptive H1 heading that clearly states what the business does");
  }

  if (a.word_count < 150)
    recommendations.push("Thin content (<150 words) — add more copy to improve SEO and trust");

  if (strengths.length === 0) strengths.push("Basic page structure is present");
  if (recommendations.length === 0)
    recommendations.push("The site is well-optimised — conduct a full UX review for further gains");

  const siteName = a.has_title
    ? a.title_text.split("|")[0].split("-")[0].trim()
    : new URL(a.url).hostname.replace("www.", "");
  const outreach_message =
    `Hi ${siteName.split(" ")[0] || "there"}, I ran a quick audit on your site and found a few high-impact improvements. ` +
    `Most businesses in your space lose leads because CTAs are buried, contact info is hard to find, ` +
    `or trust signals are missing. Fixing those three typically moves the needle measurably. ` +
    `Happy to share exactly what I found — it takes 2 minutes.`;

  return {
    score: calculateScore(a),
    strengths,
    weaknesses,
    recommendations,
    outreach_message,
  };
}
