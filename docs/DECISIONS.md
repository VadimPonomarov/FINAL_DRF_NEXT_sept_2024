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
