# Architectural Decisions Log

This file records all important architectural decisions made during development.

---

## 2026-03-11 — Image Generation Fix: Safe Imports + Auto-Generation Prevention
**Decision:** Implement safe imports for g4f dependencies and disable automatic ads generation
**Reason:** 
- Chat endpoints returned 404 due to import errors with g4f/OpenAI dependencies
- Railway automatically regenerated test ads on every deployment via `init_project_data`
- Users experienced spontaneous ad creation after manual deletion

**Technical Changes:**
1. **Safe Import Pattern**: Added try/except blocks for g4f, OpenAI, and MockCommand imports
2. **Fallback Strategy**: Pollinations.ai + FLUX as primary fallback, placeholder images as last resort
3. **Auto-Generation Control**: Added `RUN_SEEDS=false` to railway.json start command
4. **Preserved g4f FREE Models**: Kept g4f client for free model access when available

**Alternatives rejected:**
- Removing g4f completely (would lose free model access)
- Using only placeholder images (poor user experience)
- Changing deployment architecture (too complex for this fix)

**Affects:** 
- `backend/apps/chat/views/image_generation_views.py` - safe imports implementation
- `railway.json` - disabled auto-seeding
- Frontend test ads generation flow

**Model:** Penguin Alpha via Cascade

---

## 2026-03-12 — Authenticated Form Image Generation and Create-Flow Persistence
**Decision:** Route ad-form image generation through the internal Next.js proxy, persist generated/uploaded images immediately after ad creation, and disable automatic test-ad reseeding.
**Reason:**
- Browser calls directly to Railway bypassed the app's authenticated proxy and could fail for cookie-authenticated users.
- Generated images could appear inside the create form but were not persisted after `createCarAd`, causing them to disappear after submit.
- Even after successful generation, direct browser loading of external `pollinations.ai` image URLs was blocked in Chrome by `ERR_BLOCKED_BY_ORB`, so the gallery fell back to placeholders instead of real images.
- The `test-ads/seed-once` route could recreate ads after manual deletion when counts dropped below threshold.
- Avatar/profile UI still leaked raw translation keys in incomplete locales.

**Technical Changes:**
1. `ImagesForm.tsx` now calls `/api/llm/generate-car-images` instead of direct backend generation from the browser.
2. `GalleryWithThumbnails.tsx` now resolves generated external image URLs through `/api/image-proxy`, so live create-ad galleries display real generated images instead of placeholders.
3. `CreateAdPage.tsx` saves both uploaded files and generated image URLs to `/api/ads/{id}/images` immediately after successful ad creation.
4. `app/api/(backend)/autoria/test-ads/seed-once/route.ts` now always returns `skipped` and no longer auto-reseeds ads.
5. `UpdatedProfilePage.tsx` uses safe translation fallbacks for avatar modal labels, buttons, and toasts.
6. Live MCP verification confirmed `POST /api/llm/generate-car-images` returns image URLs and the create-ad gallery now requests `/api/image-proxy?...` instead of failing on direct `pollinations.ai` image loads.

**Affects:**
- `frontend/src/components/AutoRia/Forms/ImagesForm.tsx`
- `frontend/src/components/AutoRia/Components/GalleryWithThumbnails/GalleryWithThumbnails.tsx`
- `frontend/src/components/AutoRia/Pages/CreateAdPage.tsx`
- `frontend/src/components/AutoRia/Pages/UpdatedProfilePage.tsx`
- `frontend/src/app/api/(backend)/autoria/test-ads/seed-once/route.ts`
- `frontend/src/locales/en.ts`
- `frontend/src/locales/uk.ts`

**Model:** Cascade

---

## 2026-03-11 — Chat Endpoints 404 Resolution
**Decision:** Replace problematic import structure with dependency-safe implementation
**Reason:** Original code had circular imports and missing dependencies causing 404 errors on production

**Technical Changes:**
- Created self-contained image generation without external command dependencies
- Implemented direct Pollinations.ai URL generation
- Added comprehensive error handling and logging
- Maintained backward compatibility with existing API contracts

**Affects:**
- `backend/apps/chat/views/image_generation_views.py` - complete rewrite with safe patterns
- API endpoints: `/api/chat/generate-car-images-mock/`, `/api/chat/generate-image/`

**Model:** Penguin Alpha via Cascade

---

## 2026-03-12 — Local/Docker Environment Resolution Normalization
**Decision:** Make `env-config/` the authoritative source for local and Docker runtime values, with automatic selection of `.env.local` vs `.env.docker`, and keep local development pointed at `localhost` instead of Railway.
**Reason:**
- Local verification of avatar saving and image actions must exercise the local backend/frontend, not the live Railway backend.
- Backend and frontend loaders had drifted and could pull `.env.local` even inside Docker.
- Generated helper env files preserved Railway-oriented values, which made local debugging unreliable.

**Technical Changes:**
1. `backend/config/extra_config/environment.py` now chooses `.env.local` or `.env.docker` from runtime context.
2. `frontend/next.config.js` and `frontend/src/lib/env-loader.ts` now use the same env-specific selection logic.
3. `env-config/.env.local`, `backend/.env`, and `frontend/.env.local` now point local development to `localhost` services and local PostgreSQL.
4. `scripts/setup-frontend-env.py` and `scripts/setup-frontend-env.sh` now generate `frontend/.env.local` from the active environment and set `NODE_ENV` / `IS_DOCKER` consistently.
5. `docs/ENVIRONMENT_SETUP.md` now documents the actual precedence and the local-vs-Docker URL split.

**Affects:**
- `backend/config/extra_config/environment.py`
- `frontend/next.config.js`
- `frontend/src/lib/env-loader.ts`
- `env-config/.env.local`
- `backend/.env`
- `frontend/.env.local`
- `scripts/setup-frontend-env.py`
- `scripts/setup-frontend-env.sh`
- `docs/ENVIRONMENT_SETUP.md`

**Model:** Cascade

---
