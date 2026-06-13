# SiteAudit

AI-powered SEO audit and CRM tool.


**Instant website audit. Zero paid services. Deploys to Vercel free tier in 5 minutes.**

Enter any URL → get a structured audit with a score, strengths, weaknesses, recommendations, and a ready-to-use cold outreach message.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Dashboard (single URL input + results)
│   ├── api/audit/route.ts   # POST /api/audit — the only API route
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── scraper/website.ts    # cheerio HTML fetcher + heuristic audit
│   ├── scoring/index.ts      # Weighted scoring + label helpers
│   └── ai/service.ts        # OpenAI fallback (only loaded if key present)
└── types/index.ts           # AuditRequest / AuditResult types
```

**Heuristic scoring is the default** (no AI key needed). Add `OPENAI_API_KEY` to enable AI-powered audits.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste any URL.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | No | — | Enables AI-powered audits (GPT-4o-mini or compatible) |
| `OPENAI_BASE_URL` | No | OpenAI | Custom endpoint (OpenRouter, Groq, etc.) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use |

> **Without any variables**, the app runs in heuristic mode — full audit, no AI needed.

---

## Heuristic Scoring Weights

| Signal | Deduct |
|---|---|
| No CTA button | −20 |
| No lead capture form | −20 |
| Few trust signals (< 2) | −15 |
| No visible contact info | −15 |
| No H1 heading | −15 |
| Missing meta description | −10 |
| Images missing alt text | −5 |

---

## Deploy to Vercel (free tier)

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repo to Vercel — push to `main` triggers deployment automatically.

**No environment variables are required** for heuristic mode. Add `OPENAI_API_KEY` in Vercel dashboard → Settings → Environment Variables to enable AI.

---

## Adding AI (optional)

1. Get an OpenAI key at [platform.openai.com](https://platform.openai.com)
2. Set `OPENAI_API_KEY` in Vercel environment variables
3. Audits now use GPT-4o-mini instead of heuristic scoring

For OpenRouter / other OpenAI-compatible APIs: also set `OPENAI_BASE_URL`.
Deployment trigger
chore: trigger redeploy
