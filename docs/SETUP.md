# SiteAudit — Production Setup Guide

## Prerequisites (all free)

- [Supabase account](https://supabase.com) (free tier)
- [Vercel account](https://vercel.com) connected to GitHub (free tier)
- [GitHub account](https://github.com) (already hosting the repo)

---

## Step 1 — Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `SiteAudit`, Region: closest to you
3. Save the **Database Password** securely

### Run Migrations

In Supabase Dashboard → **SQL Editor** → run these two files in order:

**1. `supabase/migrations/001_schema.sql`**
- Creates `opportunities` table with all fields
- Creates 4 indexes for query performance
- Creates `update_updated_at` trigger
- Enables RLS with `current_setting('app.user_id', true)` policy

**2. `supabase/migrations/002_rls_helper.sql`**
- Creates `set_user_id(text)` function (SECURITY DEFINER)
- Grants execute to `anon` and `authenticated`

### Get API Credentials

Project Settings → API:
| Secret | Copy value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Found at top: `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` key in "Project API keys" |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key in "Project API keys" — **keep server-side only** |

---

## Step 2 — Vercel Project Setup

### Option A: GitHub Integration (recommended — auto-deploys on push)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select `insightspatron-lang/siteaudit`
4. Under **Environment Variables**, add:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...   ← service_role key
```

5. Click **Deploy**

Every future `git push` will now auto-deploy.

### Option B: Manual Deploy (CLI)

```bash
npm install -g vercel
vercel login
vercel --prod
# Add env vars when prompted
```

---

## Step 3 — GitHub Secrets (for CI/CD)

If using GitHub Actions (`.github/workflows/deploy.yml`):

1. Go to GitHub → `insightspatron-lang/siteaudit` → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` secret key |
| `VERCEL_TOKEN` | From [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Found in Vercel project settings → General |
| `VERCEL_PROJECT_ID` | Found in Vercel project settings → General |

---

## Environment Variables Reference

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Public anon key (safe to expose in browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Service role (server-side only — bypasses RLS) |
| `OPENAI_API_KEY` | ❌ Optional | Not used in Phase 2 (heuristic scoring) |
| `OPENAI_BASE_URL` | ❌ Optional | Not used in Phase 2 |
| `OPENAI_MODEL` | ❌ Optional | Not used in Phase 2 |

---

## Smoke Test Plan (post-deploy)

### 1. Single Audit
```
POST /api/audit
Body: { "url": "example.com" }
Expect: 200 with { audit: { score, strengths, weaknesses, recommendations } }
```

### 2. Discovery
```
GET /api/discover?category=restaurant&city=Austin&country=US&limit=3
Expect: 200 with { businesses: [...], count: 3 }
```

### 3. Batch Audit
```
POST /api/batch
Body: { "businesses": [{ "name": "Test Restaurant", "website": "https://example.com" }] }
Expect: 200 with { results: [...], saved_to_db: true }
```

### 4. CRM — Stats Endpoint
```
GET /api/stats
Expect: 200 with { total, velocity, win_rate, funnel: { new, contacted, ... } }
```

### 5. CRM — List Opportunities
```
GET /api/opportunities
Expect: 200 with { opportunities: [...], total }
```

### 6. CRM — Create Opportunity
```
POST /api/opportunities
Body: { "name": "Test Co", "website": "https://test.com", "email": "test@test.com" }
Expect: 201 with { opportunity: { id, name, status: "new" } }
```

### 7. CRM — Update Status
```
PATCH /api/opportunities/[id]
Body: { "status": "contacted", "notes": "Left voicemail" }
Expect: 200 with updated opportunity
```

### 8. CRM — Outreach Generation
```
POST /api/outreach
Body: { "id": "[opportunity_id]" }
Expect: 200 with { outreach_message: "Hi..." }
```

### 9. CSV Import
Navigate to CRM tab → CSV Import → upload a CSV with columns: `name, website, email, phone, city, country`

---

## Architecture Overview

```
Browser
├── Single Audit tab  → POST /api/audit        → Cheerio scraper → heuristic score
├── Opportunity Engine → GET /api/discover    → OSM Overpass API → businesses
└── CRM tab           → All Phase 2 routes   → Supabase

Supabase (free tier)
├── opportunities table (user_id isolated via RLS)
├── set_user_id() function sets session context for each API call
└── 500MB DB / 50GB bandwidth / 100GB storage

Vercel (free tier)
├── All API routes as serverless functions
├── 100GB bandwidth / 100 invocations per hour
└── Auto-deploys from GitHub main branch
```

---

## Troubleshooting

### "RLS policy denies access" or all queries return 0 rows
The `set_user_id` migration wasn't run. Re-run `supabase/migrations/002_rls_helper.sql` in the SQL Editor.

### "Supabase is not configured" error
The env vars aren't set in Vercel. Go to Vercel Dashboard → Project → Settings → Environment Variables.

### Batch times out
Normal on Vercel free tier (10s timeout). Batches of 5-8 businesses complete in 3-6s. Data is saved to Supabase before the timeout so no work is lost.

### Discovery returns 0 businesses
Try a larger city or different category. OSM data coverage varies by region.

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                  # Main app with 3-tab layout
│   ├── api/
│   │   ├── audit/route.ts        # POST — single website audit
│   │   ├── discover/route.ts     # GET — OSM business discovery
│   │   ├── batch/route.ts        # POST — batch audit → Supabase
│   │   ├── opportunities/         # GET/POST list, POST create
│   │   ├── opportunities/[id]/    # GET/PATCH single
│   │   ├── outreach/route.ts      # POST regenerate single
│   │   ├── outreach/bulk/route.ts # POST regenerate by filter
│   │   └── stats/route.ts         # GET pipeline stats
│   └── components/
│       ├── CrmDashboard.tsx       # Stats cards + funnel
│       ├── OpportunityPipeline.tsx # Kanban board
│       ├── OutreachComposer.tsx    # Outreach editor
│       ├── CrmPage.tsx             # CRM tab orchestration
│       └── ...
└── lib/
    ├── supabase/
    │   ├── client.ts    # Browser Supabase client
    │   └── server.ts    # Admin client + setUserId helper
    ├── batch/
    │   └── processor.ts # Shared audit + scoring logic
    ├── discovery/
    │   └── osm.ts       # OpenStreetMap Overpass API
    └── scoring/
        └── index.ts     # Heuristic scoring engine

supabase/migrations/
├── 001_schema.sql   # opportunities table + indexes + RLS
└── 002_rls_helper.sql # set_user_id() function
```
