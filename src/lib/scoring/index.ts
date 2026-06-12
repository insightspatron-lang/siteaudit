// ─── scoring/index.ts ─────────────────────────────────────────────────────────────
// SiteAudit V2 — CRO-aware heuristic scoring engine
// Constraints: no AI, no DB, no external APIs, <200 lines of code

// ─── Weight table ───────────────────────────────────────────────────────────────
const W = {
  // CTA (max 17 pts)
  cta_presence:      8,   // at least 1 CTA element present
  cta_above_fold:    4,   // CTA within first viewport height
  cta_multiple:      3,   // 2+ distinct CTA elements
  cta_action_word:   2,   // CTA text uses action verbs

  // Contact (max 16 pts)
  contact_email:     6,   // email address visible on page
  contact_phone:      5,   // phone number visible on page
  contact_both:       2,   // both email AND phone present
  contact_address:   3,   // street address present

  // Trust (max 15 pts)
  trust_any:         4,   // ≥1 trust signal
  trust_second:      6,   // ≥2nd distinct trust signal
  trust_third:       5,   // ≥3rd trust signal

  // SEO / Content (max 15 pts)
  seo_title:         4,   // <title> element exists
  seo_meta_desc:     4,   // meta description present
  seo_h1:            4,   // <h1> present
  seo_word_count:    3,   // ≥150 words on page

  // Mobile (max 7 pts)
  mobile_viewport:   5,   // viewport meta tag present
  mobile_tap_targets:2,   // tap targets ≥44px (heuristic check)

  // Lead capture form (max 13 pts)
  form_exists:       6,   // at least 1 <form> on page
  form_email_field:  4,   // form has an email-type input
  form_phone_field:  2,   // form has a tel-type input
  form_name_field:   1,   // form has a name-type input
} as const;

const BONUS_W = {
  has_ssl:     4,  // HTTPS detected
  has_favicon: 2,  // <link rel="icon"> present
  has_social:  3,  // social media links detected
  has_og_tags: 3,  // Open Graph meta tags present
} as const;

export const MAX_SCORE = Object.values(W).reduce((a, b) => a + b, 0)
  + Object.values(BONUS_W).reduce((a, b) => a + b, 0); // 95

export interface WebsiteAnalysis {
  url: string;
  title_text:       string;
  cta_count:       number;
  cta_above_fold:  boolean;
  cta_action_word: boolean;
  contact_channels: string[];
  has_address:     boolean;
  trustSignals:    string[];
  has_title:       boolean;
  has_meta_desc:   boolean;
  has_h1:          boolean;
  word_count:      number;
  has_viewport:    boolean;
  has_tap_targets: boolean;
  form_quality:    number;
  has_ssl:         boolean;
  has_favicon:     boolean;
  has_social:      boolean;
  has_og_tags:     boolean;
}

// ─── Calculator ────────────────────────────────────────────────────────────────

export function calculateScore(a: WebsiteAnalysis): number {
  let s = 0;

  if (a.cta_count >= 1) s += W.cta_presence;
  if (a.cta_above_fold) s += W.cta_above_fold;
  if (a.cta_count >= 2) s += W.cta_multiple;
  if (a.cta_action_word) s += W.cta_action_word;

  const ch = a.contact_channels;
  if (ch.includes("email")) s += W.contact_email;
  if (ch.includes("phone")) s += W.contact_phone;
  if (ch.includes("email") && ch.includes("phone")) s += W.contact_both;
  if (a.has_address) s += W.contact_address;

  const tl = a.trustSignals.length;
  if (tl >= 1) s += W.trust_any;
  if (tl >= 2) s += W.trust_second;
  if (tl >= 3) s += W.trust_third;

  if (a.has_title)     s += W.seo_title;
  if (a.has_meta_desc) s += W.seo_meta_desc;
  if (a.has_h1)        s += W.seo_h1;
  if (a.word_count >= 150) s += W.seo_word_count;

  if (a.has_viewport)    s += W.mobile_viewport;
  if (a.has_tap_targets) s += W.mobile_tap_targets;

  if (a.form_quality >= 1) s += W.form_exists;
  if (a.form_quality >= 2) s += W.form_email_field;
  if (a.form_quality >= 3) s += W.form_phone_field;
  if (a.form_quality >= 4) s += W.form_name_field;

  if (a.has_ssl)     s += BONUS_W.has_ssl;
  if (a.has_favicon) s += BONUS_W.has_favicon;
  if (a.has_social)  s += BONUS_W.has_social;
  if (a.has_og_tags) s += BONUS_W.has_og_tags;

  return Math.min(s, MAX_SCORE);
}

export function scoreLabel(score: number): "High" | "Medium" | "Low" {
  if (score >= 85) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function scoreTextColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export function scoreBgColor(score: number): string {
  if (score >= 85) return "bg-emerald-500/20 text-emerald-400";
  if (score >= 40) return "bg-amber-500/20 text-amber-400";
  return "bg-red-500/20 text-red-400";
}
