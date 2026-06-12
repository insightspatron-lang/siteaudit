# SiteAudit MVP — Specification

## 1. Concept & Vision

A single-purpose tool: paste a URL, get an instant website audit. No accounts, no databases, no complexity. The user experience is a landing page with one input and a structured result. It works immediately on Vercel free tier with zero configuration.

---

## 2. Design Language

- **Aesthetic**: Dark SaaS — slate-950 background, slate-900 cards, indigo-500 primary
- **Font**: Inter (system-ui fallback)
- **Icons**: Inline SVG only (zero icon library dependency)
- **Motion**: Score bar animates on mount; fade-in on results; no other animations

### Colour palette
| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0F172A` | Page background |
| `--surface` | `#1E293B` | Cards, inputs |
| `--border` | `#334155` | Borders |
| `--primary` | `#6366F1` | Buttons, accents |
| `--accent` | `#10B981` | High-opportunity score |
| `--warning` | `#F59E0B` | Medium-opportunity score |
| `--danger` | `#EF4444` | Low-opportunity score |

---

## 3. Layout

**Single page, no routing beyond `/`:**
- Sticky header (logo + tagline)
- Centered hero section (headline + single URL input + submit button)
- Conditional result section (score banner → strengths/weaknesses grid → recommendations → outreach message → "audit another" link)
- Footer

---

## 4. Core Workflow

```
User pastes URL
       ↓
POST /api/audit { url }
       ↓
analyseWebsite(url) — cheerio scrape
       ↓
[if OPENAI_API_KEY] → runAiAudit() → AI result
[else]               → heuristicAudit() → rule-based result
       ↓
{score, opportunityLevel, strengths[], weaknesses[], recommendations[], outreachMessage}
       ↓
Rendered in results section
```

---

## 5. API

### `POST /api/audit`

**Request:**
```json
{ "url": "https://example.com" }
```

**Response (200):**
```json
{
  "audit": {
    "url": "https://example.com",
    "score": 65,
    "opportunityLevel": "Medium",
    "strengths": ["Has a page title", "Email address is visible"],
    "weaknesses": ["No call-to-action buttons or links detected", "Missing meta description"],
    "recommendations": ["Add a prominent CTA button", "Add a 150–160 character meta description"],
    "outreachMessage": "Hi Example..."
  }
}
```

**Errors (400/500):** `{ "error": "..." }`

---

## 6. Scoring

See README.md for full weight table. Clamped to [0, 100].

| Range | Label | Colour |
|---|---|---|
| 70–100 | High Opportunity | Emerald |
| 40–69 | Moderate Opportunity | Amber |
| 0–39 | Low Opportunity | Red |

---

## 7. Constraints

- **No database** — stateless, no persistence
- **No authentication** — no user accounts
- **No external paid services required** — works on Vercel free tier
- **No batch processing** — single URL per request
- **Heuristic first** — AI is a drop-in enhancement, not a requirement
- **No routing beyond `/`** — all results on one page
