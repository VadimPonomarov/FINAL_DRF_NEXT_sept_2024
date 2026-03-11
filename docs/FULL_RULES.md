# Windsurf Global Rules

## CONTEXT-FIRST PROTOCOL

Before ANY code change, you MUST:
1. Read and internalize the existing code in the affected files
2. Identify all related modules, classes, and functions that interact with the target area
3. Check for existing patterns, naming conventions, and abstractions already in use
4. Never introduce a new pattern if an existing one solves the problem
5. Never rename, restructure, or move existing code unless explicitly asked

When switching to a new task or after a context gap, state explicitly:
"I see the following existing implementation: [summary]. I will extend it, not replace it."

---

## PROJECT BOOTSTRAP — MANDATORY BEFORE ANY CODE

No implementation work begins until all four project foundation documents are created,
confirmed by the user, and committed to the repository. This is an absolute gate.

AI is responsible for drafting all four documents based on user prompts and conversations.
The user confirms or corrects. Only after explicit confirmation does development start.

---

### DOCUMENT 1 — TECHNICAL SPECIFICATION (TZ)

File: docs/SPEC.md
Created by: AI, based on user requirements conversation
Confirmed by: user explicitly ("spec approved" or equivalent)

Required sections:
- Project purpose: what problem it solves, for whom, why it matters
- Functional requirements: every feature as a numbered user story (As a... I want... So that...)
- Non-functional requirements: performance targets, security constraints, supported browsers/devices
- Out of scope: explicit list of what will NOT be built
- Glossary: domain terms and their definitions
- Open questions: unresolved decisions that need user input

Rule: if a feature is not in the TZ — it does not get built. New features require TZ update first.

---

### DOCUMENT 2 — ROADMAP (PLAN)

File: docs/ROADMAP.md
Created by: AI, based on confirmed TZ
Confirmed by: user explicitly

Required sections:
- Milestones: numbered phases (M1, M2, M3...) each with a clear deliverable
- Each milestone contains: goal, list of features from TZ, definition of done
- Dependencies: which milestone blocks which
- Current status: which milestone is active, what is done, what is next
- Known risks: technical or scope risks with mitigation notes

Rule: every development session starts by stating the current milestone and active task.
Rule: completed items are marked ✓ in ROADMAP.md — it is a living document, updated each session.

---

### DOCUMENT 3 — FILE STRUCTURE

File: docs/STRUCTURE.md
Created by: AI, based on confirmed TZ + tech stack
Confirmed by: user explicitly

Required content:
- Full directory tree of the project with one-line description of each folder and key file
- Naming conventions: files, components, services, tests, constants
- Module ownership: which layer owns which responsibility
- Import rules: what can import what (e.g., UI cannot import DB layer directly)
- Prohibited patterns: what must never appear where

Format example:
```
src/
  components/       # Reusable UI components, no business logic
  pages/            # Route-level components, orchestrate components + services
  services/         # Business logic, API calls, data transformation
  store/            # State management (redux/zustand/pinia)
  utils/            # Pure functions, no side effects, no imports from services
  i18n/             # Localization — see I18N RULES
  types/            # Shared TypeScript interfaces and enums — single source of truth
  constants/        # App-wide named constants
tests/
  unit/             # Mirror of src/ structure
  integration/      # API and service integration tests
  e2e/              # Full user journey tests
docs/
  SPEC.md / ROADMAP.md / STRUCTURE.md / DEPLOY.md / DECISIONS.md / CONTEXT.md
tmp/
  .gitignore        # contains: * — nothing in tmp/ is ever committed
  .gitkeep          # keeps the directory tracked in git
```

Rule: no file may be created outside the agreed structure without updating STRUCTURE.md first.

---

### DOCUMENT 4 — DEPLOYMENT PLAN

File: docs/DEPLOY.md
Created by: AI, based on confirmed TZ + infrastructure discussion
Confirmed by: user explicitly

Required sections:
- Environments: local dev, staging, production — URLs, purposes, access rules
- Stack: what runs where (frontend host, backend host, DB, CDN, etc.)
- CI/CD pipeline: step-by-step from push to live (lint → test → build → deploy)
- Environment variables: full list of required env vars (names only, never values)
- Deployment commands: exact commands to deploy each environment
- Rollback procedure: how to revert a bad deployment
- Health checks: how to verify a deployment succeeded
- Secrets management: where secrets live, how they are injected, who has access

Rule: no production deployment without running the full PRE-PRODUCTION TEST PROGRAM first.
Rule: DEPLOY.md must be updated if infrastructure changes.

---

### DOCUMENT 5 — ARCHITECTURAL DECISIONS LOG

File: docs/DECISIONS.md
Created by: AI, updated after every non-trivial decision
Never deleted — append only. This is the institutional memory of the project.

Format — every entry follows this exact structure:
```markdown
## YYYY-MM-DD — [Decision title]
**Decision:** [What was decided]
**Reason:** [Why — trade-offs considered]
**Alternatives rejected:** [What else was considered and why not]
**Affects:** [Which files / modules / layers]
**Model:** [Which AI model made/confirmed this decision]
---
```

Example entries:
```markdown
## 2024-01-15 — Auth strategy: JWT + httpOnly cookies
**Decision:** JWT stored in httpOnly cookies, not localStorage
**Reason:** XSS protection — localStorage accessible to injected scripts
**Alternatives rejected:** localStorage (XSS risk), sessions (stateful, harder to scale)
**Affects:** src/services/auth.ts, src/middleware/auth.ts, docs/DEPLOY.md
**Model:** claude-sonnet
---

## 2024-01-16 — DB connection pooling via pgBouncer
**Decision:** pgBouncer with max_pool=20 in front of PostgreSQL
**Reason:** Railway limits 25 DB connections; pgBouncer multiplexes safely
**Alternatives rejected:** direct connections (hit limit under load)
**Affects:** docker-compose.yml, .env.base, docs/DEPLOY.md
**Model:** claude-opus
---
```

Rules:
- Every architecture choice, library selection, pattern, or structural decision → logged immediately
- Never overwrite an entry — append a new one with updated date if decision changes
- If a model makes any decision not explicitly requested — log it anyway
- DECISIONS.md is read at SESSION INITIALIZATION — incoming models must not contradict
  existing decisions without explicitly flagging the contradiction and asking user to confirm

---

### DOCUMENT 6 — LIVE CONTEXT SNAPSHOT

File: docs/CONTEXT.md
Created by: AI — overwritten at the END of every session.
This is a current-state snapshot, not a history log. Always reflects NOW.

Format:
```markdown
## Last updated
Date: YYYY-MM-DD
Model: [model name]
Session summary: [1-2 sentences — what was done this session]

## Current milestone
[M#] — [Milestone name]

## Completed in this session
- [task / file / feature] — [brief description]

## In progress (started but not finished)
- [task] — [current state, what remains to complete]

## Blocked
- [blocker] — [what is needed to unblock]

## Next task
[Exact description of what the next session should start with — specific enough
that a new model with zero chat history knows exactly what to do]

## Open questions for user
- [anything unclear that needs a decision before proceeding]

## Recent decisions (last 3)
- [date] [title] — see docs/DECISIONS.md
```

Rules:
- Every model MUST update CONTEXT.md at the end of the session before finishing
- If CONTEXT.md is missing at session start — create it immediately, then proceed
- "Next task" must be specific enough for a cold-start model to begin without asking
- "Open questions" — log ambiguities here instead of making silent assumptions
- CONTEXT.md is always plain markdown, never binary — diff-friendly, committable

---

## SESSION CONTINUITY — HISTORY · CONTEXT · LIVING DOCS

### Session start — mandatory before any action

At the START of every session and after every model switch:
1. Read `docs/SPEC.md`       — internalize current requirements
2. Read `docs/ROADMAP.md`    — identify current milestone and next task
3. Read `docs/STRUCTURE.md`  — internalize file/module ownership rules
4. Read `docs/DEPLOY.md`     — note target environment and infrastructure state
5. Read `docs/DECISIONS.md`  — internalize all prior architectural decisions, never contradict
6. Read `docs/CONTEXT.md`    — "Next task" field is the entry point

Confirm: `[RULES LOADED ✓] Milestone: [M#] | Task: [description]`

If docs/ folder does not exist — STOP and create all 6 documents before writing any code.
If any document is missing or empty — STOP and create it before proceeding.

---

### Docs are living — they change with the code, always

All project documentation lives exclusively in `docs/`. Every file is a living document.
It reflects the state of the project **right now**, not at the time it was first written.

The agent updates docs **proactively**, as part of the task — not as a separate step afterward.

**Trigger → required update:**

| What happened | Which docs to update |
|---|---|
| New feature, endpoint, component, or module | `SPEC.md`, `STRUCTURE.md`, `ROADMAP.md` |
| Architectural or design decision made | `DECISIONS.md` (append — never overwrite entries) |
| New dependency, env var, or deployment step | `DEPLOY.md` |
| New directory, naming rule, or import convention | `STRUCTURE.md` |
| Task completed, blocker resolved, next task defined | `CONTEXT.md` (overwrite entirely) |
| Bug fixed that changes observed behaviour | `SPEC.md` if it affects requirements |
| Sub-project structure changed | Same docs — they cover the whole project |

**Doc is "current" when:**
- Every file listed in `STRUCTURE.md` actually exists in the codebase
- Every completed task is marked ✓ in `ROADMAP.md`
- `CONTEXT.md` "Next task" is specific enough for a cold-start model to start without asking
- `DECISIONS.md` has an entry for every non-trivial decision made this session
- `DEPLOY.md` lists every currently required env var and service

**Doc is "stale" when (= violation):**
- Code changed but docs were not touched
- `STRUCTURE.md` lists files that no longer exist
- `ROADMAP.md` shows a milestone as "in progress" when it is done
- `CONTEXT.md` still shows last session's tasks as "in progress"
- `DECISIONS.md` is missing entries for decisions made in this session

---

### End-of-session protocol — mandatory, in this order:

```
1. docs/CONTEXT.md   → OVERWRITE with current state snapshot
                        (date / model / session summary / milestone /
                         completed / in progress / blocked / next task /
                         open questions / recent decisions last 3)

2. docs/DECISIONS.md → APPEND new entries only, never edit past ones
                        ## YYYY-MM-DD — [title]
                        Decision / Reason / Alternatives rejected / Affects / Model

3. docs/ROADMAP.md   → MARK completed tasks ✓, update "Current status"

4. docs/STRUCTURE.md → UPDATE for any file/dir added, moved, or removed

5. docs/DEPLOY.md    → UPDATE for any new env var, service, or step

6. docs/SPEC.md      → UPDATE if any requirement was added, changed, or clarified
```

Session is **not done** until all applicable docs are updated.

---

### .md files — absolute location rule

All `.md` files live in `docs/` exclusively.
The single exception is `README.md` at project root — standard convention, nothing else.

```
docs/SPEC.md          ← the only place for requirements
docs/ROADMAP.md       ← the only place for milestones and progress
docs/STRUCTURE.md     ← the only place for structure conventions
docs/DEPLOY.md        ← the only place for deployment docs
docs/DECISIONS.md     ← the only place for architectural decisions
docs/CONTEXT.md       ← the only place for current-state snapshot
docs/FULL_RULES.md    ← the only place for project rules
README.md             ← root only (project overview, links to docs/)
```

Any `.md` found outside `docs/` (except `README.md`) is a structural violation.
Delete it immediately. Move its content to the appropriate `docs/` file if it has value.

---

### Commit and deploy gate — canonical structure is a prerequisite

**No commit. No deploy. Until:**

```
□ tmp/ is empty (cleanup command ran)
□ No junk files anywhere in project or sub-project roots
□ No .md files outside docs/ (except README.md)
□ All 6 docs/ files exist and are non-empty
□ docs/CONTEXT.md updated this session
□ docs/DECISIONS.md has entries for all decisions made this session
□ docs/ROADMAP.md reflects current completion state
□ All lint / type / test gates pass
```

Pre-commit hook checks items 1–4 automatically and blocks the commit on failure.
Items 5–8 are verified by the agent before staging files for commit.

**Commit sequence:**
```
1. Finish task
2. Update all applicable docs/ files
3. run: find tmp/ -not -name '.gitignore' -not -name '.gitkeep' \
         -not -type d -delete
4. Run canonical structure scan — verify zero violations
5. Run lint + test gates
6. git add -A && git commit -m "[M#][US-##] description"
```

**Deploy sequence (additional steps after commit):**
```
7. Run full 10-phase PRE-PRODUCTION TEST PROGRAM
8. Verify bundle size targets met
9. Verify Docker image size targets met
10. Deploy
```

Every response that implements a feature must reference:
- Which TZ user story it satisfies (e.g., "implements US-04")
- Which roadmap milestone it belongs to (e.g., "M2 — Authentication")



---

## STRICT TYPING — MAXIMUM STRICTNESS, ZERO EXCEPTIONS

Typing is not a preference — it is a hard requirement at every layer of the codebase.
Any untyped, loosely typed, or duplicated type structure is a critical violation.

### TypeScript — compiler config

tsconfig.json must always include:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
```

Absolutely forbidden — zero tolerance:
- `any` — use `unknown` and narrow with type guards instead
- `as any` — never cast to any under any circumstance
- `@ts-ignore` — fix the type error, never suppress it
- `@ts-nocheck` — prohibited in all files
- Non-null assertions `!` without a documented guard justification
- `object`, `Function`, `{}` as types — use specific interfaces
- Implicit return types on exported functions — always explicit
- Optional chaining as a substitute for proper null handling

Python — mypy config (mypy.ini or pyproject.toml):
```ini
[mypy]
strict = true
disallow_any_explicit = true
disallow_any_generics = true
disallow_untyped_calls = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
warn_return_any = true
warn_unused_ignores = true
no_implicit_optional = true
```

---

## TYPE DRY — NO DUPLICATED TYPE STRUCTURES EVER

Types and interfaces are subject to the same DRY rules as logic.
Repeating a shape, field, or structure in more than one type definition is a violation.
Every shared structure must be defined once and composed everywhere else.

### Composition toolkit — use these patterns, never repeat structures

**Extend, never redefine:**
```typescript
// ✗ VIOLATION — fields repeated
interface CreateUserDto { name: string; email: string; role: string }
interface UpdateUserDto { name: string; email: string; role: string }

// ✓ CORRECT — extend from base
interface UserBase { name: string; email: string; role: string }
interface CreateUserDto extends UserBase {}
interface UpdateUserDto extends Partial<UserBase> {}
```

**Utility types — mandatory use:**
```typescript
Partial<T>          // all fields optional — for update DTOs, patches
Required<T>         // all fields required — for confirmed/validated shapes
Readonly<T>         // immutable — for config, constants, frozen state
Pick<T, K>          // select subset of fields — never redefine the subset
Omit<T, K>          // exclude fields — never redefine without excluded fields
Record<K, V>        // typed map/dictionary — never use plain object {}
Exclude<T, U>       // filter union types
Extract<T, U>       // narrow union types
NonNullable<T>      // strip null/undefined from type
ReturnType<T>       // derive return type from function — never manually duplicate
Parameters<T>       // derive param types from function
InstanceType<T>     // derive instance type from class constructor
Awaited<T>          // unwrap Promise type
```

**Mapped types for structural transformation:**
```typescript
// Derive API response shape from domain model — never define separately
type ApiResponse<T> = {
  readonly [K in keyof T]: T[K] extends Date ? string : T[K];
};

// Derive form state from entity — never repeat field names
type FormState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: string | null;
    touched: boolean;
  };
};

// Derive loading states from action map — no duplication
type LoadingState<T extends string> = Record<T, boolean>;
```

**Discriminated unions — for state machines and variants:**
```typescript
// ✗ VIOLATION — separate interfaces with repeated fields
interface LoadingState { status: "loading" }
interface SuccessState { status: "success"; data: User[] }
interface ErrorState   { status: "error";   error: string }

// ✓ CORRECT — discriminated union, composable
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error";   error: string };

// Reuse across the app:
type UsersState   = RequestState<User[]>;
type ProductState = RequestState<Product>;
```

**Template literal types for string unions:**
```typescript
// ✗ VIOLATION — manually listing string combinations
type EventName = "user_created" | "user_updated" | "user_deleted"
               | "order_created" | "order_updated" | "order_deleted";

// ✓ CORRECT — derive from constituents
type Entity = "user" | "order" | "product";
type Action = "created" | "updated" | "deleted";
type EventName = `${Entity}_${Action}`;
```

**Branded/nominal types — for domain primitives:**
```typescript
// Prevent mixing of semantically different strings/numbers
type UserId    = string & { readonly __brand: "UserId" };
type OrderId   = string & { readonly __brand: "OrderId" };
type PriceUSD  = number & { readonly __brand: "PriceUSD" };

// Constructor helpers
const UserId   = (id: string): UserId => id as UserId;
const PriceUSD = (n: number): PriceUSD => n as PriceUSD;
```

**Type guards — narrow unknown/union types explicitly:**
```typescript
// Never cast with `as` — always guard
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value
  );
}
```

**Infer from implementation, don't duplicate:**
```typescript
// ✗ VIOLATION — type manually mirrors the object shape
const CONFIG = { timeout: 3000, retries: 3, baseUrl: "/api" };
interface Config { timeout: number; retries: number; baseUrl: string }

// ✓ CORRECT — derive type from the single source of truth
const CONFIG = { timeout: 3000, retries: 3, baseUrl: "/api" } as const;
type Config = typeof CONFIG;
type ConfigKey = keyof Config;
```

### Type file organization — src/types/

```
src/types/
  domain.ts       # Core domain entities (User, Order, Product...)
  api.ts          # API request/response shapes — derived from domain via mapped types
  store.ts        # State shapes — derived from domain via RequestState<T> etc.
  forms.ts        # Form shapes — derived from domain via FormState<T>
  events.ts       # Event/action names — derived via template literal types
  primitives.ts   # Branded primitives (UserId, OrderId, PriceUSD...)
  utils.ts        # Reusable generic utility types
  index.ts        # Re-exports all types — single import point
```

Rules:
- domain.ts is the root — all other type files derive from it, never define shapes independently
- api.ts never re-declares fields that exist in domain.ts — use Pick, Omit, mapped types
- store.ts never re-declares entity shapes — wrap with RequestState<T> or similar
- forms.ts never re-declares field names — derive with FormState<T> or mapped type
- No type defined in two files — if needed in multiple places, it belongs in types/
- No inline interface definitions inside component files for shared shapes

### Type audit checklist — run on every response touching types:
```
NO any/unknown unnarrowed           ✓/✗
NO duplicated field sets            ✓/✗
NO manual string unions derivable   ✓/✗
Utility types used where applicable ✓/✗
Mapped types used for transforms    ✓/✗
Branded types for domain primitives ✓/✗
Type guards for unknown narrowing   ✓/✗
All exported functions typed        ✓/✗
ReturnType/Parameters inferred      ✓/✗
domain.ts is root, others derive    ✓/✗
```

---

## LINTING · FORMATTING · TYPE CHECKING — ON EVERY SAVE AND UPDATE

Code quality tools run on every file change, every save, every commit. Always.

### Toolchain — mandatory in every project

JavaScript / TypeScript:
```
ESLint      → .eslintrc.json          (zero warnings policy)
Prettier    → .prettierrc             (single formatting authority)
TypeScript  → tsconfig.json           (strict: true — see STRICT TYPING section)
lint-staged → lint-staged config      (staged files only — fast)
husky       → .husky/pre-commit       (blocks commit on any failure)
```

Python:
```
Ruff        → ruff.toml               (lint + format)
mypy        → mypy.ini                (strict — see STRICT TYPING section)
pre-commit  → .pre-commit-config.yaml
```

Shared IDE config — committed to repo:
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": true },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

lint-staged config:
```json
{
  "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix --max-warnings 0"],
  "*.{css,scss,json,md}": ["prettier --write"],
  "*.py": ["ruff format", "ruff check --fix"]
}
```

### Enforcement stages

Stage 1 — On save: ESLint auto-fix, Prettier format, TypeScript inline errors
Stage 2 — On commit: lint-staged runs, tsc --noEmit — commit BLOCKED on any failure
Stage 3 — On AI change: run and report lint/format/types before presenting code
Stage 4 — On CI: eslint + prettier --check + tsc --noEmit — merge BLOCKED on failure

Zero-tolerance:
- ESLint: --max-warnings 0 always
- Prettier: single authority, no manual formatting, no prettier-ignore without reason
- TypeScript: strict always, no @ts-ignore, no any, no implicit types
- No eslint-disable without explicit reason comment on the same line

---

## I18N — SINGLE SOURCE OF TRUTH LOCALIZATION

One file. One key. All locales. No per-language files. No scattered strings.

File: src/i18n/translations.ts

```typescript
export const translations = {
  nav_home:             { en: "Home",                    uk: "Головна",                  ru: "Главная",               de: "Startseite" },
  auth_login_button:    { en: "Sign in",                 uk: "Увійти",                   ru: "Войти",                 de: "Anmelden"   },
  error_field_required: { en: "This field is required",  uk: "Це поле є обов'язковим",   ru: "Это поле обязательно",  de: "Pflichtfeld" },
  dashboard_welcome:    { en: "Welcome, {name}",         uk: "Ласкаво просимо, {name}",  ru: "Добро пожаловать, {name}", de: "Willkommen, {name}" },
} as const;

export type TranslationKey = keyof typeof translations;
export type LocaleCode = "en" | "uk" | "ru" | "de";
```

Helper — single typed accessor, used everywhere:
```typescript
// src/i18n/t.ts
export function t(
  key: TranslationKey,
  locale: LocaleCode,
  vars?: Record<string, string>
): string {
  let str = translations[key][locale] ?? translations[key]["en"];
  if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  return str;
}
```

Rules:
- Zero hardcoded strings in components — t() only
- Key naming: snake_case with context prefix (nav_, auth_, error_, form_, btn_, msg_)
- Every key must have ALL locales populated — no partial translations
- Adding a string = adding ALL language values in one commit
- Pluralization: separate keys (item_count_one / item_count_many)
- Date/number formatting: Intl.DateTimeFormat / Intl.NumberFormat with locale

Completeness validator — runs in CI and pre-production:
```typescript
// src/i18n/validate.ts
import { translations } from "./translations";
const locales = ["en", "uk", "ru", "de"];
let errors = 0;
for (const [key, values] of Object.entries(translations)) {
  for (const locale of locales) {
    if (!values[locale]) { console.error(`MISSING: key="${key}" locale="${locale}"`); errors++; }
  }
}
if (errors > 0) process.exit(1);
```

---

## TESTING — 90%+ COVERAGE · UNIT · INTEGRATION · EVERY COMMIT

Testing is not optional. It is not a separate phase. It is part of writing code.
Every function, class, module, and API endpoint ships with tests. No exceptions.

---

### Coverage requirements — non-negotiable minimums

```
Line coverage:    ≥ 90%   (was 80% — raised, enforced by CI)
Branch coverage:  ≥ 85%   (every if/else/switch path tested)
Function coverage:≥ 95%   (nearly every function must be called in tests)
Statement coverage:≥ 90%
```

CI blocks merge and deploy if any threshold is not met.
Coverage is measured on every commit via pre-push hook and CI pipeline.

---

### Every functional and class element requires test coverage

**Functions — test matrix for every exported function:**
```
✓ Happy path (correct input → expected output)
✓ Boundary values (min, max, zero, empty string, empty array)
✓ Null / undefined / None input
✓ Wrong type input (if not statically prevented)
✓ Async: resolved value, rejected promise, timeout
✓ At least 2 negative cases (invalid input → expected error/exception)
✓ Side effects verified (if function has them)
```

**Classes — test matrix for every class:**
```
✓ Constructor: valid args, missing required args, invalid args
✓ Every public method: happy path + at least 1 negative case
✓ State transitions: verify object state changes correctly
✓ Error states: methods called in wrong order, on disposed object
✓ Inheritance: overridden methods behave correctly in subclass
✓ Integration with dependencies (via injection — never real)
```

**Async functions — additional required tests:**
```
✓ Resolved promise with expected value
✓ Rejected promise with expected error type and message
✓ Concurrent calls (no race conditions)
✓ Retry logic (if present) — verify retry count and delay
✓ Timeout handling — verify timeout is respected
✓ Cancellation (if supported)
```

---

### Unit test structure — mandatory format

Every test file follows this exact structure:

**TypeScript (vitest / jest):**
```typescript
// tests/services/user.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserService }   from "@/services/user.service";
import { UserRepository } from "@/repositories/user.repository";
import { AUTH, LIMITS }  from "@config";

// Mock all external dependencies — never use real DB/API in unit tests
vi.mock("@/repositories/user.repository");

describe("UserService", () => {

  let service: UserService;
  let repoMock: vi.Mocked<UserRepository>;

  beforeEach(() => {
    repoMock = vi.mocked(new UserRepository());
    service  = new UserService(repoMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  // ─── createUser ──────────────────────────────────────
  describe("createUser", () => {

    it("creates user with valid data and returns created entity", async () => {
      const dto   = { name: "Alice", email: "alice@example.com" };
      const saved = { id: "uid-1", ...dto, createdAt: new Date() };
      repoMock.save.mockResolvedValue(saved);

      const result = await service.createUser(dto);

      expect(result.id).toBe("uid-1");
      expect(repoMock.save).toHaveBeenCalledWith(dto);
    });

    // ─── Boundary values
    it("accepts name at maximum allowed length", async () => {
      const dto = { name: "A".repeat(LIMITS.MAX_NAME_LENGTH), email: "a@b.com" };
      repoMock.save.mockResolvedValue({ id: "1", ...dto, createdAt: new Date() });
      await expect(service.createUser(dto)).resolves.toBeDefined();
    });

    // ─── Negative: validation failures
    it("throws ValidationError when email is missing", async () => {
      await expect(service.createUser({ name: "Alice", email: "" }))
        .rejects.toThrow("email is required");
    });

    it("throws ValidationError when name exceeds max length", async () => {
      const dto = { name: "A".repeat(LIMITS.MAX_NAME_LENGTH + 1), email: "a@b.com" };
      await expect(service.createUser(dto))
        .rejects.toThrow("name too long");
    });

    it("throws ValidationError when email format is invalid", async () => {
      await expect(service.createUser({ name: "Alice", email: "not-an-email" }))
        .rejects.toThrow("invalid email");
    });

    // ─── Negative: repository failure
    it("propagates repository error without swallowing it", async () => {
      repoMock.save.mockRejectedValue(new Error("DB connection lost"));
      await expect(service.createUser({ name: "Alice", email: "a@b.com" }))
        .rejects.toThrow("DB connection lost");
    });

    // ─── Negative: null/undefined
    it("throws when called with null", async () => {
      await expect(service.createUser(null as any)).rejects.toThrow();
    });

    it("throws when called with undefined", async () => {
      await expect(service.createUser(undefined as any)).rejects.toThrow();
    });
  });
});
```

**Python (pytest):**
```python
# tests/services/test_user_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.services.user_service import UserService
from src.repositories.user_repository import UserRepository
from src.exceptions import ValidationError
from config import LIMITS

@pytest.fixture
def repo_mock():
    return AsyncMock(spec=UserRepository)

@pytest.fixture
def service(repo_mock):
    return UserService(repo=repo_mock)

class TestCreateUser:

    # ─── Happy path
    async def test_creates_user_with_valid_data(self, service, repo_mock):
        dto = {"name": "Alice", "email": "alice@example.com"}
        repo_mock.save.return_value = {"id": "uid-1", **dto}
        result = await service.create_user(dto)
        assert result["id"] == "uid-1"
        repo_mock.save.assert_called_once_with(dto)

    # ─── Boundary
    async def test_accepts_name_at_max_length(self, service, repo_mock):
        dto = {"name": "A" * LIMITS.MAX_NAME_LENGTH, "email": "a@b.com"}
        repo_mock.save.return_value = {"id": "1", **dto}
        result = await service.create_user(dto)
        assert result is not None

    # ─── Negative: validation
    async def test_raises_when_email_missing(self, service):
        with pytest.raises(ValidationError, match="email is required"):
            await service.create_user({"name": "Alice", "email": ""})

    async def test_raises_when_name_too_long(self, service):
        dto = {"name": "A" * (LIMITS.MAX_NAME_LENGTH + 1), "email": "a@b.com"}
        with pytest.raises(ValidationError, match="name too long"):
            await service.create_user(dto)

    async def test_raises_when_email_invalid(self, service):
        with pytest.raises(ValidationError, match="invalid email"):
            await service.create_user({"name": "Alice", "email": "not-an-email"})

    # ─── Negative: repository failure
    async def test_propagates_repository_error(self, service, repo_mock):
        repo_mock.save.side_effect = Exception("DB connection lost")
        with pytest.raises(Exception, match="DB connection lost"):
            await service.create_user({"name": "Alice", "email": "a@b.com"})

    # ─── Negative: null/None
    async def test_raises_on_none_input(self, service):
        with pytest.raises((TypeError, ValidationError)):
            await service.create_user(None)
```

---

### Integration tests — required scope

Integration tests verify real interactions between layers.
External services (third-party APIs, payment gateways) are mocked.
Own DB, cache, message queue — use real test instances (Docker or in-memory).

**Required for every:**
```
✓ API endpoint (request → handler → service → DB → response)
✓ Service method that touches DB (real test DB, rolled back after each test)
✓ Background job / worker (triggered → processed → state verified)
✓ Auth flows (register, login, refresh, logout, protected route access)
✓ Event emission and handling (publish → subscribe → handler called)
```

**Integration test structure:**
```typescript
// tests/integration/api/users.api.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestApp }  from "@/tests/helpers/app";
import { createTestDb }   from "@/tests/helpers/db";
import { HTTP, ROUTES }   from "@config";

describe("POST /api/v1/users — integration", () => {

  let app: App;
  let db:  TestDb;

  beforeAll(async () => {
    db  = await createTestDb();
    app = await createTestApp({ db });
  });

  afterAll(async () => { await db.close(); });

  beforeEach(async () => { await db.rollback(); }); // clean state per test

  it("creates user and returns 201 with id", async () => {
    const res = await app.inject({
      method: "POST",
      url:    ROUTES.API.USERS,
      body:   { name: "Alice", email: "alice@example.com" },
    });
    expect(res.statusCode).toBe(HTTP.CREATED);
    expect(res.json().id).toBeDefined();
  });

  it("returns 422 when email already exists", async () => {
    await app.inject({ method: "POST", url: ROUTES.API.USERS,
      body: { name: "Alice", email: "alice@example.com" } });

    const res = await app.inject({ method: "POST", url: ROUTES.API.USERS,
      body: { name: "Bob", email: "alice@example.com" } }); // same email

    expect(res.statusCode).toBe(HTTP.UNPROCESSABLE);
    expect(res.json().error).toMatch(/already exists/);
  });

  it("returns 400 when body is empty", async () => {
    const res = await app.inject({ method: "POST", url: ROUTES.API.USERS, body: {} });
    expect(res.statusCode).toBe(HTTP.BAD_REQUEST);
  });

  it("returns 401 on protected endpoint without token", async () => {
    const res = await app.inject({ method: "GET", url: ROUTES.API.USERS });
    expect(res.statusCode).toBe(HTTP.UNAUTHORIZED);
  });
});
```

---

### Negative test coverage — mandatory categories

Every module must cover ALL of the following negative scenarios that apply:

```
Category                        Examples
─────────────────────────────── ──────────────────────────────────────────
Empty / null / undefined        null input, empty string, empty array
Boundary violations             max+1, min-1, zero where positive required
Type mismatches                 string where number expected, object where array
Missing required fields         {} where {name, email} required
Invalid format                  "not-email", negative timeout, future date for DOB
Out-of-range values             page=-1, limit=0, limit=MAX+1
Duplicate data                  create entity that already exists
Not found                       get/update/delete non-existent id
Unauthorized access             missing token, expired token, wrong role
Concurrent modifications        two requests modify same resource simultaneously
Network / dependency failures   DB down, cache miss, third-party API timeout
Partial failures                first step succeeds, second fails → rollback verified
```

---

### Test naming — mandatory convention

Test names are executable documentation. They must be readable as sentences:

```
✗ test1
✗ test_email
✗ it("works")
✗ it("createUser error case")

✓ it("returns created user with id when valid data provided")
✓ it("throws ValidationError when email format is invalid")
✓ it("returns 401 when authorization header is missing")
✓ it("rolls back transaction when second insert fails")
✓ test_returns_empty_list_when_no_users_exist()
✓ test_raises_validation_error_when_email_exceeds_max_length()
```

---

### Test configuration — enforced thresholds

**vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider:   "v8",
      reporter:   ["text", "lcov", "html"],
      thresholds: {
        lines:      90,
        branches:   85,
        functions:  95,
        statements: 90,
      },
      exclude: [
        "config/**",         // constants — no logic to test
        "**/*.d.ts",
        "**/index.ts",       // re-exports only
        "tests/**",
      ],
    },
  },
});
```

**pytest (pyproject.toml):**
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths    = ["tests"]

[tool.coverage.run]
source  = ["src"]
omit    = ["src/config/*", "**/__init__.py"]

[tool.coverage.report]
fail_under = 90
show_missing = true
exclude_lines = [
  "pragma: no cover",
  "if TYPE_CHECKING:",
]
```

---

### Test execution gates — every commit and deploy

**Pre-commit (fast — unit tests only, ~30s max):**
```bash
# .husky/pre-commit
pnpm test:unit --run           # run unit tests only, no coverage
```

**Pre-push / CI on PR (full suite):**
```bash
pnpm test --run --coverage     # all tests + coverage thresholds
# BLOCKS push/merge if:
# - any test fails
# - line coverage < 90%
# - branch coverage < 85%
# - function coverage < 95%
```

**Pre-deploy (full suite + integration):**
```bash
pnpm test:unit --run --coverage
pnpm test:integration --run
pnpm test:e2e --run
# ALL must pass. No partial deploys.
```

**Forbidden patterns — these invalidate coverage:**
```typescript
// ✗ Skipping tests
it.skip("...", ...)               // forbidden in committed code
xit("...", ...)                   // forbidden
pytest.mark.skip                  // forbidden without explicit reason + issue link

// ✗ Fake assertions
expect(true).toBe(true)           // meaningless — rejected in code review
assert True                       // meaningless — rejected

// ✗ Coverage cheating
/* istanbul ignore next */        // forbidden without explicit documented reason
# pragma: no cover                // forbidden without explicit documented reason
```

---

### Testing checklist — append to every response that adds or modifies code:
```
TESTS
  Every new function has unit tests              ✓/✗
  Every new class has unit tests                 ✓/✗
  Every new API endpoint has integration tests   ✓/✗
  Happy path covered                             ✓/✗
  Boundary values covered                        ✓/✗
  Null/undefined/None covered                    ✓/✗
  At least 2 negative cases per function         ✓/✗
  Async: resolved + rejected + timeout tested    ✓/✗
  Test names describe behavior (sentence form)   ✓/✗
  No it.skip / xit / pytest.mark.skip            ✓/✗
  No meaningless assertions (expect(true)...)    ✓/✗
  Coverage ≥ 90% maintained                      ✓/✗  [actual: ___%]
```



---

## UI DEVELOPMENT RULES

- Never hardcode colors, fonts, spacing — use design tokens/CSS variables/theme system
- All interactive elements: hover, focus, disabled states required
- Forms: inline validation feedback, not just alerts
- Every async action: loading state (spinner/skeleton/disabled button)
- Use existing UI components before creating new ones
- Responsive by default: mobile-first, 320px / 768px / 1280px breakpoints
- Accessibility: semantic HTML, aria-labels on icon-only buttons, keyboard navigation
- Never use inline styles unless absolutely impossible

---

## RESPONSIVE & ERGONOMIC DESIGN — MANDATORY FOR ALL UI WORK

Responsive rules:
- Mobile-first: base styles 320px–767px, scale up via min-width breakpoints
- Breakpoints: 320 / 480 / 768 / 1024 / 1280 / 1920px
- Touch targets: minimum 44×44px on mobile
- No horizontal scroll on any viewport — ever
- Typography: clamp() or responsive units, never fixed px for font sizes
- Navigation: hamburger/bottom bar on mobile, full menu on desktop
- Images: width: 100% / max-width constrained, never overflow container
- Modals: full-screen on mobile, centered fixed-width on desktop
- Tables: horizontally scrollable wrapper on mobile, or card layout

Ergonomic rules:
- Desktop: hover states, tooltips, dense information layouts allowed
- Mobile: primary actions in bottom 60% of screen, avoid top-corner CTAs
- Inputs: min height 48px on mobile, 16px minimum font (prevents iOS zoom)
- WCAG AA contrast: 4.5:1 text, 3:1 UI components

---

## MCP VISUAL VERIFICATION — REQUIRED FOR ALL UI TASKS

All UI work must be verified via MCP tools with computer vision before marking complete.

Workflow — execute in this exact order:
1. Implement the UI change
2. Launch/reload the app in the browser
3. MCP screenshot → computer vision analysis (layout, alignment, regressions)
4. Mobile viewport 375px → screenshot → analyze
5. Desktop viewport 1280px → screenshot → analyze
6. Interact with all clickable/interactive elements — verify states visually
7. Fix any issues found — re-capture until clean
8. Only then mark the task complete

Verify on every page:
- Visual: no overflow, no broken alignment, no overlapping elements
- Design: spacing, color, typography, icon clarity
- Responsive: no cut-off elements, no horizontal scroll, touch targets correct
- Functional: all interactive states render correctly

Performance visual checks:
- No layout shift (CLS) on load
- Skeletons/spinners appear before content — no blank white flashes
- Above-fold renders without waiting for below-fold assets

Report: "MCP VISUAL CHECK: desktop ✓/✗ / mobile ✓/✗ / interactions ✓/✗ / perf ✓/✗"
If MCP unavailable: "MCP unavailable — manual verification required before merge"

---

## PERFORMANCE & LAZY LOADING — NAVIGATION PRIORITY

Performance is a first-class feature. Every page must load fast and feel instant.

Navigation rules:
- All routes: lazy loaded, separate dynamic import chunks
- Navigation renders immediately — never blocks on data fetching
- Use React.lazy() + Suspense, dynamic import(), or framework-native lazy routing

Content loading rules:
- Above-the-fold first — defer everything below the fold
- Images: lazy loading / Intersection Observer — never eager off-screen
- Heavy components (charts, maps, editors): dynamic import
- Fonts: font-display: swap — never block render
- Third-party scripts: async or defer, never blocking in <head>

Loading states — no blank screens, ever:
- Every async fetch shows skeleton immediately
- Skeleton matches shape/layout of real content
- Error states handled and displayed
- Stale-while-revalidate preferred

Performance targets:
- FCP < 1.5s / TTI < 3s / CLS < 0.1 / LCP < 2.5s

Confirm at end of every UI task:
"PERFORMANCE: lazy loading ✓ / skeletons ✓ / no blocking resources ✓"

---

## CODE PRINCIPLES AUDIT — DRY · KISS · SOLID · YAGNI · LoD

Every implementation must be audited before considered complete.

- DRY: zero duplicated logic OR type structures anywhere in the codebase
- KISS: simplest solution that works, explainable in one sentence, no clever tricks
- SOLID S: each class/module does exactly one thing — if you use "and" to describe it, split it
- SOLID O: extend via new code, never modify working existing code
- SOLID L: subclasses substitutable for base without breaking behavior
- SOLID I: small focused interfaces, no fat interfaces with unused methods
- SOLID D: depend on abstractions, inject dependencies, never hardcode them
- YAGNI: never implement for "future use" — requirements must exist today
- LoD: max 2-level chaining, never reach through objects to manipulate internals

Checklist — append to every response with non-trivial logic:
```
DRY ✓/✗ | KISS ✓/✗ | S ✓/✗ | O ✓/✗ | L ✓/✗ | I ✓/✗ | D ✓/✗ | YAGNI ✓/✗ | LoD ✓/✗
```

---

## PRE-PRODUCTION: COMPREHENSIVE TESTING PROGRAM

Before ANY production build, all 9 phases must pass. No exceptions.

**Phase 1 — Static Analysis**
Linter (0 warnings), type checker (0 errors), complexity audit,
duplicate detector, dependency CVE scan (0 high/critical)

**Phase 2 — Test Suite**
All unit tests pass, ≥80% line coverage, ≥70% branch coverage,
integration tests pass, contract tests for all external APIs

**Phase 3 — E2E Functional (MCP)**
Every page loads, every form works, every navigation path tested,
auth flows, all CRUD operations, error boundary behavior,
MCP computer vision check on each tested page

**Phase 4 — Performance (MCP Lighthouse)**
Lighthouse ≥90 all categories, chunks <250kb uncompressed,
FCP <1.5s / TTI <3s / CLS <0.1 / LCP <2.5s, tested on 3G throttle

**Phase 5 — Responsive/Device (MCP)**
Screenshots at 320 / 375 / 768 / 1024 / 1280 / 1920px,
zero overflow, all touch targets ≥44px, nav collapses correctly

**Phase 6 — Security**
No secrets in code or build output, all inputs validated and sanitized,
auth tokens in httpOnly cookies, no sensitive console.log, HTTPS-only

**Phase 7 — Accessibility**
axe-core zero critical violations, keyboard navigation works through all flows,
semantic landmarks present, all images have alt text, WCAG AA contrast

**Phase 8 — I18N Completeness**
Completeness validator passes with zero missing keys across all locales

**Phase 9 — Type Audit**
Zero `any`, zero duplicated type structures, type audit checklist fully passed,
domain.ts confirmed as root of type hierarchy

Production is cleared only when this full sign-off is produced:

```
PRE-PRODUCTION SIGN-OFF
════════════════════════════════════════════════════
Phase 1  — Static Analysis + Lint/Format/Types : ✓ PASS
Phase 2  — Test Suite                          : ✓ PASS  [line: __% br: __% fn: __%]
Phase 3  — E2E Functional (MCP)                : ✓ PASS  [__ journeys]
Phase 4  — Performance (MCP Lighthouse)        : ✓ PASS  [score: ___]
Phase 5  — Responsive/Device (MCP)             : ✓ PASS  [6 breakpoints]
Phase 6  — Security                            : ✓ PASS
Phase 7  — Accessibility                       : ✓ PASS
Phase 8  — I18N Completeness                   : ✓ PASS  [__ keys / __ locales]
Phase 9  — Type Audit                          : ✓ PASS  [0 any / 0 duplicates]
Phase 10 — Bundle & Image Optimization         : ✓ PASS  [JS: __kb | img: __MB]
════════════════════════════════════════════════════
PRODUCTION: CLEARED ✓
```

---

## PRODUCTION BUILD — LEAN · OPTIMIZED · MINIMUM BYTES

Every byte deployed costs money. Production build must be the smallest possible
artifact that delivers full functionality. No exceptions, no "it's just a few KB".

### The production contract

```
Production bundle contains:
  ✓ compiled application code (minified + tree-shaken)
  ✓ runtime dependencies only (no devDependencies)
  ✓ static assets (compressed, hashed)
  ✓ README.md (single documentation file)

Production bundle NEVER contains:
  ✗ source files (src/, app/)
  ✗ test files (tests/, *.spec.*, *.test.*)
  ✗ development tools (eslint, prettier, jest, vitest configs)
  ✗ type declaration source (*.d.ts sources, tsconfig.json)
  ✗ documentation beyond README.md (docs/, FULL_RULES.md, .windsurfrules)
  ✗ CI/CD configs (.github/, .gitlab-ci.yml)
  ✗ IDE configs (.vscode/, .idea/)
  ✗ git history (.git/)
  ✗ tmp/ directory
  ✗ lockfiles (package-lock, pnpm-lock — not needed at runtime)
  ✗ Dockerfile, docker-compose.yml (build tooling, not runtime)
  ✗ .env.* files (injected at runtime via secrets manager)
  ✗ node_modules devDependencies
  ✗ coverage reports, lint reports
  ✗ mock data, fixtures, seeds
  ✗ any file with extensions: .spec.ts .test.ts .stories.tsx .md (except README)
```

---

### Frontend — bundle optimization

**vite.config.ts / next.config.ts — mandatory settings:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target:           "esnext",
    minify:           "esbuild",          // fastest minifier
    cssMinify:        true,
    reportCompressedSize: true,           // show gzip sizes in build output
    chunkSizeWarningLimit: 200,           // warn if chunk > 200kb
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:  ["react", "react-dom"],
          router:  ["react-router-dom"],
          ui:      ["@radix-ui/react-dialog", "lucide-react"],
          // split by logical domain — never one giant bundle
        },
        // content-hashed filenames for aggressive caching
        entryFileNames:  "assets/[name].[hash].js",
        chunkFileNames:  "assets/[name].[hash].js",
        assetFileNames:  "assets/[name].[hash][extname]",
      },
    },
  },
});

// next.config.ts
const config: NextConfig = {
  output:       "standalone",             // minimal Docker image — only what runs
  compress:     true,
  poweredByHeader: false,
  images: {
    formats:    ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizeCss:      true,
    optimizePackageImports: ["lucide-react", "@radix-ui"],
  },
};
```

**Tree-shaking — always import specifically:**
```typescript
// ✗ VIOLATION — imports entire library
import _ from "lodash";
import * as R from "ramda";
import moment from "moment";              // moment = 67kb gzip

// ✓ CORRECT — import only what is used
import { debounce } from "lodash-es";    // tree-shakeable ESM build
import { format } from "date-fns";       // date-fns = modular, ~2kb per fn
```

**Asset optimization — mandatory:**
- Images: WebP/AVIF format, `loading="lazy"` on all below-fold images
- Fonts: `font-display: swap`, subset only used characters, preload critical fonts
- SVG icons: inline via sprite or component, never as separate HTTP requests
- CSS: PurgeCSS or Tailwind's built-in purge removes unused classes automatically
- JSON data files: minify, never ship pretty-printed JSON

**Bundle size targets:**
```
Initial JS bundle (above fold):   < 100kb gzip
Per-route lazy chunk:             < 50kb gzip
Total CSS:                        < 20kb gzip
Total initial page weight:        < 500kb gzip (all assets combined)
```

**Bundle analysis — run before every production deploy:**
```bash
# Vite
npx vite-bundle-visualizer

# Next.js
npx @next/bundle-analyzer

# Generic
npx bundlesize
```
Report chunk sizes. Any chunk > 200kb uncompressed → investigate and split.

---

### Backend — lean Docker image

Multi-stage Dockerfile is mandatory. Final image contains only runtime.

```dockerfile
# ─── STAGE 1: build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ─── STAGE 2: deps-prod only ───────────────────────────────────────────────
FROM node:20-alpine AS deps-prod
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
# --prod installs ONLY dependencies, not devDependencies

# ─── STAGE 3: production image — minimal ───────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy ONLY what is needed to run
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder   /app/dist         ./dist
COPY README.md ./

# No source code. No tests. No configs. No docs. No tools.
EXPOSE 8000
USER node                               # never run as root
CMD ["node", "dist/main.js"]
```

Python equivalent:
```dockerfile
# ─── STAGE 1: build + install ──────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# ─── STAGE 2: production — minimal ────────────────────────────────────────
FROM python:3.12-slim AS production
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY src/ ./src/
COPY README.md ./

# No tests/. No docs/. No config files. No .env.
USER nobody
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Docker image size targets:**
```
Node.js API image:     < 150MB
Python API image:      < 200MB
Frontend static:       < 50MB (nginx:alpine + built assets)
```

Verify after every build:
```bash
docker image ls --format "{{.Repository}}\t{{.Size}}"
docker history <image> --no-trunc   # find what's taking space
```

---

### .dockerignore — mandatory, mirrors .gitignore + extras

Every service must have a `.dockerignore` that excludes everything
not needed in the Docker build context. Fat build context = slow builds = wasted money.

```dockerignore
# ─── Version control ──────────────────────────────────────────────────────
.git
.gitignore
.gitattributes

# ─── Development tools ────────────────────────────────────────────────────
.vscode
.idea
*.swp
*.swo

# ─── Dependencies (reinstalled in build stage) ────────────────────────────
node_modules
__pycache__
*.pyc
*.pyo
.venv
venv

# ─── Test files ───────────────────────────────────────────────────────────
tests/
**/*.test.ts
**/*.spec.ts
**/*.test.py
coverage/
.coverage
htmlcov/

# ─── Documentation (README.md is copied explicitly) ───────────────────────
docs/
*.md
!README.md

# ─── CI/CD ────────────────────────────────────────────────────────────────
.github
.gitlab-ci.yml
.circleci
Jenkinsfile

# ─── Build configs (not needed at runtime) ────────────────────────────────
.eslintrc*
.prettierrc*
tsconfig*.json
jest.config.*
vitest.config.*
ruff.toml
mypy.ini
.pre-commit-config.yaml
.husky

# ─── Environment (injected at runtime) ────────────────────────────────────
.env*
!.env.example

# ─── Temporary ────────────────────────────────────────────────────────────
tmp/
*.log
logs/

# ─── Build artifacts from previous builds ────────────────────────────────
dist/
build/
.next/
__pycache__/
```

---

### .gitignore — production artifacts never committed

```gitignore
# ─── Build output ─────────────────────────────────────────────────────────
dist/
build/
.next/
out/
__pycache__/
*.pyc

# ─── Dependencies ─────────────────────────────────────────────────────────
node_modules/
.venv/
venv/

# ─── Environment (never commit secrets) ───────────────────────────────────
.env.local
.env.docker
.env.production
.env.staging
# .env.example IS committed — it's the template

# ─── Temporary ────────────────────────────────────────────────────────────
tmp/*
!tmp/.gitignore
!tmp/.gitkeep
logs/
*.log

# ─── Coverage & reports ───────────────────────────────────────────────────
coverage/
.coverage
htmlcov/
*.lcov

# ─── IDE ──────────────────────────────────────────────────────────────────
.vscode/settings.json   # .vscode/extensions.json IS committed
.idea/
*.swp

# ─── OS ───────────────────────────────────────────────────────────────────
.DS_Store
Thumbs.db
```

---

### Dependency audit — before every production build

```bash
# Remove unused dependencies
npx depcheck                          # find unused packages
pip install pip-autoremove && pip-autoremove -y  # Python

# Check for smaller alternatives
npx bundlephobia-cli <package>        # see gzip size before installing

# Audit and fix vulnerabilities
npm audit fix / pnpm audit --fix
pip audit

# Check for duplicates (multiple versions of same package)
npx dedupe / pnpm dedupe
```

**Dependency rules:**
- No dependency installed "just in case" — YAGNI applies to packages too
- Before adding any package: check if native API covers it first
  (e.g. `Array.groupBy` instead of lodash, `fetch` instead of axios)
- Every new dependency → check bundle size on bundlephobia.com first
- devDependencies strictly separated from dependencies — never mix
- Peer dependencies resolved explicitly — no implicit version ranges

---

### Production build checklist — run before every deploy:

```
BUNDLE SIZE
  Frontend initial JS < 100kb gzip          ✓/✗  [actual: ___kb]
  Per-route chunk < 50kb gzip               ✓/✗  [largest: ___kb]
  Total CSS < 20kb gzip                     ✓/✗  [actual: ___kb]
  No chunk > 200kb uncompressed             ✓/✗

DOCKER IMAGE
  Multi-stage build used                    ✓/✗
  Final image size within target            ✓/✗  [actual: ___MB]
  No source/test/doc files in image         ✓/✗
  .dockerignore present and complete        ✓/✗
  Running as non-root user                  ✓/✗

DEPENDENCIES
  No unused dependencies (depcheck)         ✓/✗
  No vulnerabilities (npm/pip audit)        ✓/✗
  devDeps not in production bundle          ✓/✗
  Tree-shaking verified (no * imports)      ✓/✗

CONTENT
  Only README.md in documentation           ✓/✗
  No .env files in image/bundle             ✓/✗
  No test files in image/bundle             ✓/✗
  No CI/dev configs in image/bundle         ✓/✗
  Assets compressed (WebP/AVIF, gzip)       ✓/✗
```



Every project must support three deployment targets from day one.
Each target is independently runnable. No target requires manual file editing to activate —
only the correct `.env.*` file is needed. All three share a common configuration foundation.

---

### Three mandatory deployment targets

```
local      — direct run on developer machine (no Docker), uses .env.local
docker     — Docker Compose on any machine, uses .env.docker
production — remote server / cloud hosting, uses .env.production
```

Documented in `docs/DEPLOY.md` with exact commands for each target:
```bash
# Local
pnpm dev  /  uvicorn main:app --reload

# Docker
docker compose --env-file .env.docker up --build

# Production
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

### ENV file structure — DRY, layered, single source of truth

No value is ever repeated across env files. Shared values live in `.env.base`.
Environment-specific files only override what differs. Nothing else.

```
.env.base            ← shared across ALL environments (ports, app name, common limits)
.env.local           ← local overrides only (extends .env.base)
.env.docker          ← docker overrides only (extends .env.base)
.env.production      ← production overrides only (extends .env.base)
.env.example         ← committed to repo, ALL keys present, NO real values
.env*.local          ← never committed (in .gitignore)
.env.production      ← never committed (injected by CI/CD or secrets manager)
```

`.env.base` — the root, committed to repo (contains no secrets):
```dotenv
# ─── APP ──────────────────────────────────────────────
APP_NAME=myapp
APP_VERSION=1.0.0
APP_PORT=3000
API_PORT=8000

# ─── PAGINATION ───────────────────────────────────────
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# ─── LIMITS ───────────────────────────────────────────
MAX_FILE_SIZE_MB=10
MAX_UPLOAD_COUNT=5

# ─── TIMEOUTS ─────────────────────────────────────────
API_TIMEOUT_MS=10000
SESSION_TTL_SEC=86400
```

`.env.local` — only what differs locally:
```dotenv
# extends .env.base
NODE_ENV=development
API_BASE_URL=http://localhost:8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
DEBUG=true
LOG_LEVEL=debug
```

`.env.docker` — only what differs in Docker (service names as hostnames):
```dotenv
# extends .env.base
NODE_ENV=development
API_BASE_URL=http://api:8000
DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp_dev
REDIS_URL=redis://redis:6379
DEBUG=true
LOG_LEVEL=debug
```

`.env.production` — only production overrides (injected by CI/CD, never committed):
```dotenv
# extends .env.base
NODE_ENV=production
API_BASE_URL=https://api.myapp.com
DATABASE_URL=${SECRET_DATABASE_URL}
REDIS_URL=${SECRET_REDIS_URL}
DEBUG=false
LOG_LEVEL=warn
```

`.env.example` — committed to repo, all keys, no real values, kept in sync always:
```dotenv
# Copy to .env.local / .env.docker / .env.production and fill in values

# ─── APP ──────────────────────────────────────────────
APP_NAME=
APP_VERSION=
APP_PORT=
API_PORT=

# ─── ENVIRONMENT ──────────────────────────────────────
NODE_ENV=
API_BASE_URL=
DEBUG=
LOG_LEVEL=

# ─── DATABASE ─────────────────────────────────────────
DATABASE_URL=

# ─── CACHE ────────────────────────────────────────────
REDIS_URL=

# ─── AUTH ─────────────────────────────────────────────
JWT_SECRET=
JWT_EXPIRES_IN=
```

ENV rules — enforced always:
- A key that exists in `.env.base` must NOT be repeated in any other env file unless overriding
- `.env.example` must contain every key used anywhere in the codebase — kept in sync on every change
- Secrets (passwords, tokens, API keys) never go in `.env.base` or `.env.example` values
- Application code never hardcodes env var names — they reference `src/constants/index.ts` ENV_KEYS:
  ```typescript
  // ✗ VIOLATION
  process.env.DATABASE_URL

  // ✓ CORRECT
  export const ENV_KEYS = {
    DATABASE_URL:  "DATABASE_URL",
    JWT_SECRET:    "JWT_SECRET",
    API_BASE_URL:  "API_BASE_URL",
    NODE_ENV:      "NODE_ENV",
  } as const;

  process.env[ENV_KEYS.DATABASE_URL]
  ```

---

### Docker Compose — DRY, YAML anchors, single source of truth

No value, image tag, resource limit, network name, or volume name is repeated.
YAML anchors (`&`) and aliases (`*`) are used for all shared blocks.
A single `docker-compose.yml` is the base. Overrides are in `docker-compose.prod.yml`.

`docker-compose.yml` — base for local docker + production foundation:
```yaml
# ─── ANCHORS (shared blocks — referenced below, never repeated) ────────────
x-common-env: &common-env
  env_file:
    - .env.base

x-restart-policy: &restart-policy
  restart: unless-stopped

x-logging: &logging
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"

x-healthcheck-defaults: &healthcheck-defaults
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s

x-resource-limits: &resource-limits
  deploy:
    resources:
      limits:
        cpus: "0.50"
        memory: 512M
      reservations:
        cpus: "0.25"
        memory: 256M

# ─── NETWORKS ──────────────────────────────────────────────────────────────
networks:
  app-network:
    driver: bridge

# ─── VOLUMES ───────────────────────────────────────────────────────────────
volumes:
  db-data:
  redis-data:

# ─── SERVICES ──────────────────────────────────────────────────────────────
services:

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "${APP_PORT}:3000"
    <<: [*common-env, *restart-policy, *logging, *resource-limits]
    env_file:
      - .env.base
      - .env.docker
    depends_on:
      api:
        condition: service_healthy
    networks:
      - app-network

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "${API_PORT}:8000"
    <<: [*common-env, *restart-policy, *logging, *resource-limits]
    env_file:
      - .env.base
      - .env.docker
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      <<: *healthcheck-defaults
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    volumes:
      - db-data:/var/lib/postgresql/data
    <<: [*common-env, *restart-policy, *logging]
    env_file:
      - .env.base
      - .env.docker
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      <<: *healthcheck-defaults
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    <<: [*restart-policy, *logging]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      <<: *healthcheck-defaults
    networks:
      - app-network
```

`docker-compose.prod.yml` — production overrides only:
```yaml
# Extends docker-compose.yml — only production-specific differences

x-prod-resource-limits: &prod-resource-limits
  deploy:
    resources:
      limits:
        cpus: "1.00"
        memory: 1024M
      reservations:
        cpus: "0.50"
        memory: 512M

services:

  frontend:
    build:
      args:
        NODE_ENV: production
    <<: *prod-resource-limits

  api:
    build:
      args:
        NODE_ENV: production
    <<: *prod-resource-limits

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - frontend
      - api
    <<: *restart-policy
    networks:
      - app-network
```

Docker Compose DRY rules:
- All shared service config (env_file, restart, logging, resource limits) → YAML anchor, used by reference
- Image tags pinned to exact versions — never `latest`
- Port mappings always use env vars: `"${APP_PORT}:3000"` — never hardcoded port numbers
- Volume names and network names defined once at top level, referenced by name only
- No copy-pasted blocks between services — if two services share config, it becomes an anchor
- `docker-compose.prod.yml` contains ONLY what differs from base — not a full redefinition

---

### Dockerfile — optimized, DRY, multi-stage

Each service Dockerfile uses multi-stage builds. Base stage is shared via `FROM ... AS base`.

```dockerfile
# ─── BASE ──────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ─── DEPS ──────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# ─── BUILD ─────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm build

# ─── PRODUCTION IMAGE ──────────────────────────────────
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Deployment checklist — append to every deploy-related response:
```
ENV      : .env.example in sync ✓/✗ | no secrets in base ✓/✗ | no repeated keys ✓/✗
COMPOSE  : anchors used for shared blocks ✓/✗ | ports use env vars ✓/✗ | no copy-paste ✓/✗
TARGETS  : local ✓/✗ | docker ✓/✗ | production ✓/✗
DOCKERFILE: multi-stage ✓/✗ | pinned versions ✓/✗
ENV_KEYS : constants module updated ✓/✗
```

---

## LOGGING — NO PRINT, ALWAYS STRUCTURED LOGGERS

`print()`, `console.log()`, `console.debug()` and any raw output calls are forbidden
in application code. Always. No exceptions. Even for "quick debug" — use the logger.

---

### TypeScript / Node.js — pino (preferred)

**Why pino:** fastest Node.js logger, native JSON output, minimal overhead, simple config,
excellent ecosystem (pino-pretty for dev, transports for prod).

Installation:
```bash
pnpm add pino pino-pretty
pnpm add -D @types/pino
```

`src/logger/index.ts` — single shared logger instance:
```typescript
import pino, { Logger, LoggerOptions } from "pino";
import { ENV_KEYS } from "@/constants";

const isDev = process.env[ENV_KEYS.NODE_ENV] !== "production";

const devTransport: LoggerOptions["transport"] = {
  target: "pino-pretty",
  options: {
    colorize:         true,          // ← colored output in terminal
    translateTime:    "SYS:HH:MM:ss.l",
    ignore:           "pid,hostname",
    messageFormat:    "{levelLabel} [{module}] {msg}",
    colorizeObjects:  true,
    singleLine:       false,
  },
};

const prodTransport: LoggerOptions["transport"] = {
  targets: [
    {
      // structured JSON to stdout (captured by log aggregator)
      target: "pino/file",
      options: { destination: 1 },
      level: "info",
    },
    {
      // compressed rotating file archive
      target: "pino-roll",
      options: {
        file:      "./logs/app.log",
        frequency: "daily",
        mkdir:     true,
        compress:  "gzip",            // ← zip archiving of rotated logs
        size:      "50m",             // rotate at 50MB regardless of date
        limit:     { count: 30 },     // keep last 30 archives
      },
      level: "warn",
    },
  ],
};

const options: LoggerOptions = {
  level:      isDev ? "debug" : "info",
  transport:  isDev ? devTransport : prodTransport,
  base:       { env: process.env[ENV_KEYS.NODE_ENV] },
  timestamp:  pino.stdTimeFunctions.isoTime,
  redact: {
    paths:  ["req.headers.authorization", "*.password", "*.token", "*.secret"],
    censor: "[REDACTED]",
  },
};

export const logger: Logger = pino(options);

// Child logger factory — always tag with module name
export const createLogger = (module: string): Logger =>
  logger.child({ module });
```

Usage — always child logger per module:
```typescript
// ✗ VIOLATION
console.log("User created", user);
print(f"User created: {user}")

// ✓ CORRECT — TypeScript
import { createLogger } from "@/logger";
const log = createLogger("UserService");

log.info({ userId: user.id }, "User created");
log.warn({ attempt }, "Login failed");
log.error({ err, userId }, "Failed to send email");
log.debug({ payload }, "Incoming request payload");
```

Additional packages for prod:
```bash
pnpm add pino-roll        # rotating + gzip archiving
```

---

### Python — loguru (preferred)

**Why loguru:** zero-config by default, beautiful colored output out of the box,
structured logging, built-in rotation + compression, exception tracing, no Handler boilerplate.

Installation:
```bash
pip install loguru
```

`src/logger/__init__.py` — single configured logger, imported everywhere:
```python
import sys
import os
from loguru import logger

# Remove default handler
logger.remove()

_is_dev = os.getenv("NODE_ENV", "development") != "production"

# ─── DEV — colored, human-readable ────────────────────
if _is_dev:
    logger.add(
        sys.stdout,
        level="DEBUG",
        colorize=True,                          # ← colored output
        format=(
            "<green>{time:HH:mm:ss.SSS}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        ),
        backtrace=True,
        diagnose=True,                          # ← full variable values in tracebacks
    )

# ─── PROD — JSON structured to stdout ─────────────────
else:
    logger.add(
        sys.stdout,
        level="INFO",
        serialize=True,                         # ← JSON output for log aggregators
        backtrace=False,
        diagnose=False,
    )

# ─── FILE — rotating + gzip archive (all envs) ────────
logger.add(
    "logs/app_{time:YYYY-MM-DD}.log",
    level="WARNING",
    rotation="50 MB",                           # rotate at 50MB
    retention="30 days",                        # keep 30 days of archives
    compression="zip",                          # ← zip archiving
    serialize=True,
    enqueue=True,                               # ← async write, no performance hit
    backtrace=True,
    diagnose=False,                             # diagnose=False in file (security)
)

__all__ = ["logger"]
```

Usage — import once, use everywhere:
```python
# ✗ VIOLATION
print(f"User created: {user_id}")

# ✓ CORRECT
from src.logger import logger

logger.info("User created", user_id=user_id, email=email)
logger.warning("Login failed", attempt=attempt, ip=ip)
logger.error("Email send failed", user_id=user_id)
logger.debug("Incoming payload", payload=payload)

# ✓ Exception with full traceback
try:
    process_payment(order)
except Exception:
    logger.exception("Payment processing failed", order_id=order.id)
```

---

### Log levels — mandatory usage rules

```
DEBUG    dev only — variable values, flow tracing, incoming payloads
INFO     normal operations — entity created/updated, service started, job completed
WARNING  unexpected but recoverable — retry, fallback used, deprecated call
ERROR    operation failed, requires attention — caught exception with context
CRITICAL service cannot continue — unrecoverable state, immediate alert needed
```

Rules:
- Never log at ERROR for expected/handled business cases (e.g. "user not found" → WARNING or INFO)
- Always include structured context — never interpolate into the message string:
  ```typescript
  // ✗ VIOLATION — unsearchable, unstructured
  log.error(`Failed to process order ${orderId} for user ${userId}`);

  // ✓ CORRECT — structured, filterable
  log.error({ orderId, userId, err }, "Order processing failed");
  ```
- Never log sensitive data: passwords, tokens, secrets, PII — use redact config
- Log files go to `./logs/` — this directory is in `.gitignore`
- `./logs/` directory is created automatically by the logger — never commit it

### .gitignore additions (mandatory):
```
logs/
*.log
```

### Logging checklist — append to every response touching application code:
```
NO print/console.log in application code  ✓/✗
Logger imported from shared module        ✓/✗
Child/named logger used (module tagged)   ✓/✗
Structured context passed, not interpolated ✓/✗
No sensitive data logged                  ✓/✗
Log rotation + compression configured     ✓/✗
logs/ in .gitignore                       ✓/✗
```

---

## MODEL SELECTION — COST · CAPABILITY · TASK MATCH

Using an expensive model for a simple task is waste. Using a weak model for a complex task
is risk. Match the model to the task every time. This is a mandatory decision, not a preference.

---

### Tier system

```
TIER 0 — Free / ultra-cheap     Routine, mechanical, no reasoning required (preferred: SWE-1.5)
TIER 1 — Fast & cheap           Simple logic, single-file edits, lookups
TIER 2 — Balanced (default)     Standard coding, refactoring, reviews
TIER 3 — Powerful               Architecture, complex debugging, multi-file reasoning
TIER 4 — Maximum                Hardest problems only — cross-system design, novel algorithms
```

---

### Task → Tier mapping

**TIER 0 — Free models (preferred: SWE-1.5 / fallback: gemini-flash-2.0, claude-haiku)**
- Generating boilerplate (CRUD, DTOs, simple components)
- Renaming, reformatting, moving files
- Writing docstrings and comments
- Generating `.env.example`, config stubs
- Simple regex, trivial utility functions
- Translating strings for i18n keys
- Generating test data / fixtures / mocks
- Filling in repetitive patterns already established in the codebase

**TIER 1 — Cheap fast models (gemini-flash-2.0, gpt-4o-mini)**
- Single-file bug fixes with obvious cause
- Adding a field to an existing type/schema
- Writing unit tests for already-implemented logic
- Linting and formatting fixes
- Simple SQL queries
- README updates
- Straightforward CSS/style adjustments

**TIER 2 — Balanced models — DEFAULT for coding (claude-sonnet-4-5, claude-sonnet-4-6)**
- Multi-file feature implementation
- Refactoring with DRY / SOLID compliance
- API endpoint implementation (full stack)
- State management changes
- Integration test writing
- Docker / CI config authoring
- Code review and principle audit (DRY, KISS, SOLID)
- Debugging non-obvious issues
- Type system design for a module
- Performance optimization of a specific component

> claude-sonnet is the primary coding model. Default to it for all standard dev tasks.

**TIER 3 — Powerful models (claude-opus, gpt-4.5)**
- Cross-module architecture decisions
- Complex async/concurrency debugging
- Security audit of authentication flows
- Database schema design with complex relations
- Performance profiling across services
- Migrating between frameworks or major versions
- Designing the type hierarchy for the whole project
- Writing the pre-production test program plan

**TIER 4 — Maximum models (gpt-5, claude-opus for hardest tasks)**
- Novel algorithm design with no clear prior pattern
- Cross-system distributed architecture (multiple services, queues, caches)
- Complex business logic with many interacting constraints
- Root cause analysis of subtle production bugs across multiple services
- Full project architecture from scratch with deep trade-off analysis
- Anything where TIER 3 has already failed or produced wrong results

> gpt-5 is reserved for the hardest multi-system reasoning and combinations.
> Never use TIER 4 for anything a TIER 2 can handle — cost is 10–50x higher.

---

### Decision rules — mandatory before selecting a model

```
1. Can a free model do this correctly in one shot?       → TIER 0
2. Is this a single-file, obvious, low-reasoning task?  → TIER 1
3. Is this standard coding / refactoring / testing?     → TIER 2 (claude-sonnet, default)
4. Does this require deep multi-file reasoning?         → TIER 3
5. Has TIER 3 failed, or is this truly novel/complex?   → TIER 4
```

Escalation rule: always start at the lowest viable tier.
If the result is wrong or incomplete — escalate exactly one tier and retry.
Never skip tiers. Never pre-escalate "just in case".

Downgrade rule: if a task was assigned TIER 3+ but turned out to be simple —
note it and use a lower tier for similar tasks in future.

---

### Anti-patterns — forbidden

```
✗ Using claude-opus / gpt-5 to generate a DTO or boilerplate
✗ Using gpt-5 to fix a typo or add a CSS class
✗ Using TIER 4 as the default "to be safe"
✗ Escalating without trying a lower tier first
✗ Using TIER 0 for architecture decisions or complex debugging
✗ Mixing models mid-task without re-reading context (causes regression)
```

---

### Model switch protocol

When switching models mid-project (different tier for a new task):
1. The incoming model MUST execute SESSION INITIALIZATION before touching code
2. Read all four docs/ foundation documents
3. State current milestone, active task, and relevant context
4. Only then proceed — never assume context from a prior session

Context loss on model switch is the #1 cause of DRY violations and structural regressions.
The session initialization protocol is the fix. It is not optional.

---

### Quick reference card

| Task type                        | Tier | Model examples                     |
|----------------------------------|------|------------------------------------|
| Boilerplate, stubs, i18n strings | 0    | **SWE-1.5** (preferred), gemini-flash-2.0, claude-haiku |
| Simple fixes, single-file edits  | 1    | gpt-4o-mini, gemini-flash-2.0      |
| Standard coding (DEFAULT)        | 2    | claude-sonnet-4-5, claude-sonnet-4-6 |
| Architecture, deep debugging     | 3    | claude-opus, gpt-4.5               |
| Novel/cross-system complexity    | 4    | gpt-5, claude-opus (hardest only)  |

---

## LINT & FORMAT ON EVERY EDIT — NON-NEGOTIABLE

After writing or modifying ANY file — before presenting the result, before moving to the
next file, before considering the task done — the agent MUST immediately run:

**TypeScript / JavaScript:**
```bash
# 1. Prettify — format the file
npx prettier --write <changed_file>

# 2. Lint — fix auto-fixable, report the rest
npx eslint --fix --max-warnings 0 <changed_file>

# 3. Type check — full project, no errors allowed
npx tsc --noEmit
```

**Python:**
```bash
# 1. Prettify + lint — ruff handles both
ruff format <changed_file>
ruff check --fix <changed_file>

# 2. Type check
mypy <changed_file>
```

**Multiple files changed in one task:**
```bash
# Run on all changed files at once, not one by one
npx prettier --write src/services/user.ts src/types/domain.ts src/constants/index.ts
npx eslint --fix --max-warnings 0 src/services/user.ts src/types/domain.ts src/constants/index.ts
npx tsc --noEmit
```

### Execution rules — no exceptions

- Run order is always: **prettier first → eslint second → tsc/mypy third**
  (prettier may reformat what eslint would flag; run prettier first to avoid false positives)
- If prettier changes anything — show the diff, do not silently apply
- If eslint reports errors that cannot be auto-fixed — fix them manually before proceeding,
  never present code with unresolved lint errors
- If tsc/mypy reports type errors — fix them before presenting, never leave type errors in output
- If a file was only read (not written) — skip lint/format for that file
- If a new file was created — lint and format it exactly like an edited file

### When lint/format cannot be run (no terminal access)

If the agent cannot execute shell commands in the current context:
1. Apply prettier formatting rules manually to the code before presenting it
2. Apply eslint rules mentally — check for violations before presenting
3. Explicitly state: "AUTO-RUN UNAVAILABLE — code formatted manually, verify with:
   `npx prettier --write <file> && npx eslint --fix <file> && npx tsc --noEmit`"

### Output format after running

Always report results inline before the end-of-response checklist:
```
→ prettier:  reformatted 2 lines in user.ts
→ eslint:    0 errors, 0 warnings
→ tsc:       0 errors
```
or on failure:
```
→ prettier:  applied
→ eslint:    ✗ 1 error — no-explicit-any at line 42 → FIXED
→ tsc:       ✗ 2 errors — fixed before presenting
```

Never present code that failed lint or type check without showing it was fixed.

---

## SAFE CHANGE PROTOCOL

- Change ONLY what was explicitly requested — no unprompted "improvements"
- Bugs outside scope: REPORT, never silently fix
- Never delete code — comment with // DEPRECATED: reason
- Refactor needed: ask first — "To do this cleanly, I need to refactor X. Should I proceed?"
- After changes: list all modified files, functions added/changed, anything deleted

---

## SELF-DOCUMENTATION DURING WORK

At the START of each response:
- Current milestone (from ROADMAP.md) and active task
- TZ user story being implemented
- Existing patterns found relevant

At the END of every response:
```
MILESTONE : [M#] — [name] | TASK: [desc] | TZ: [US-##]
CHANGED   : [file] — [what changed]
TESTED    : [file] — [N cases, what covered]
ASSUMPTION: [any assumption made]
TODO      : [out of scope, explicitly flagged]
PRINCIPLES: DRY ✓/✗ | KISS ✓/✗ | S ✓/✗ | O ✓/✗ | L ✓/✗ | I ✓/✗ | D ✓/✗ | YAGNI ✓/✗ | LoD ✓/✗
TYPES     : no-any ✓/✗ | no-dupl ✓/✗ | utility ✓/✗ | mapped ✓/✗ | branded ✓/✗ | guards ✓/✗
LINT      : ✓ 0 errors 0 warnings / ✗ [details]
FORMAT    : ✓ all formatted / ✗ [details]
TYPES CHK : ✓ 0 errors / ✗ [details]
MCP CHECK : desktop ✓/✗ / mobile ✓/✗ / interactions ✓/✗ / perf ✓/✗
PERF      : lazy ✓/✗ / skeletons ✓/✗ / no blocking ✓/✗
I18N      : keys added ✓/✗ / all locales ✓/✗ / completeness ✓/✗
CONSTANTS : no literals ✓/✗ | new consts in shared module ✓/✗ | derived refs base ✓/✗
LOGGING   : no print/console.log ✓/✗ | structured context ✓/✗ | no sensitive data ✓/✗
DEPLOY    : env.example synced ✓/✗ | no repeated keys ✓/✗ | compose anchors ✓/✗
MODEL     : correct tier used ✓/✗ | no over-spend ✓/✗ | context re-read after switch ✓/✗
ROADMAP   : updated ✓/✗ — [what marked done]
ROOT SCAN : project root ✓/✗ | sub-roots ✓/✗ | violations found+deleted: [list or —]
FILESYSTEM: tmp/ empty ✓/✗ | cleanup ran ✓/✗ | deleted this session: [list or —]
```

---

## CONSTANTS & CONFIG — ONE PLACE, ONE TRUTH, NO EXCEPTIONS

### The absolute rule

In the entire project — frontend, backend, microservices, scripts, docker, CI —
there is exactly **one place** where values of constants and general-purpose variables
are defined: `config/` at the top level.

Everywhere else — `src/`, `app/`, `services/`, `components/`, `utils/`, `tests/` —
there are **only references** (imports). Never values. Never definitions. Never literals.

This is not a style preference. This is a structural constraint.
Violation = introducing a second source of truth = DRY violation = bug waiting to happen.

```
╔══════════════════════════════════════════════════════╗
║  config/  ← THE ONLY PLACE where values are defined ║
╚══════════════════════════════════════════════════════╝
         ↓ import           ↓ import          ↓ import
    frontend/src/      backend/src/      service-x/src/
    (references only)  (references only) (references only)
```

### What "only references" means in practice

```typescript
// ✗ VIOLATION — value defined inside a service file
// src/services/auth.service.ts
const TOKEN_KEY = "access_token";          // definition — forbidden
const SESSION_TTL = 86400;                 // definition — forbidden
const MIN_PASS_LEN = 8;                    // definition — forbidden

// ✓ CORRECT — only import from config/
// src/services/auth.service.ts
import { AUTH } from "@config";
// AUTH.TOKEN_KEY, AUTH.SESSION_TTL_SEC, AUTH.MIN_PASSWORD_LEN
// — values live in config/auth.ts, not here
```

```python
# ✗ VIOLATION — value defined inside a service
# services/auth_service.py
TOKEN_KEY = "access_token"      # forbidden
MIN_PASS_LEN = 8                # forbidden

# ✓ CORRECT
from config import AUTH
# AUTH.TOKEN_KEY, AUTH.MIN_PASSWORD_LEN
```

### Scope of "general-purpose variables and constants"

Everything that is used by more than one file, or could ever be used by more than one file:
- API URLs, base paths, versions, timeouts, retry counts
- Auth keys, TTLs, token names, password rules
- Pagination defaults, limits, max sizes
- UI breakpoints, animation timings, z-index scale, spacing tokens
- Route paths (frontend and backend)
- Regular expressions
- HTTP status codes
- Event and message names
- Feature flags
- File size limits, upload counts, string length limits
- Log levels, rotation settings
- i18n locale codes, default locale
- Any number that appears more than once anywhere

The only values allowed to stay local to a file:
- A constant used exclusively within that one file AND has zero chance of reuse
  → still preferred in config/, but acceptable locally if truly single-use
- Component-internal style values with no design system equivalent
  → still should reference UI tokens from config/ui.ts where possible

When in doubt — it goes in config/. Default is always config/.

---

### Top-level config center — mandatory structure

The config center lives at the **top level** of the project (or monorepo root),
not inside any individual service. Every service imports from it.

```
config/                          ← top-level, shared across all services
  index.ts                       ← main entry, re-exports everything
  env.ts                         ← env var resolution with || fallbacks
  api.ts                         ← API URLs, versions, timeouts
  auth.ts                        ← auth settings, token keys, TTLs
  pagination.ts                  ← page sizes, limits
  ui.ts                          ← breakpoints, animation timings, z-index
  limits.ts                      ← file sizes, upload counts, string lengths
  routes.ts                      ← all route paths
  regex.ts                       ← all regular expressions
  http.ts                        ← HTTP status codes
  events.ts                      ← event/message names
  logger.ts                      ← log levels, rotation settings
  i18n.ts                        ← supported locales, default locale
```

For **monorepo** — config center is a shared package:
```
packages/config/
  index.ts                       ← imported as @config in all apps and services
```

For **single-repo multi-service** — config center at root:
```
config/                          ← imported relatively by each service
```

---

### .env priority — always .env first, constant as fallback

When a value can come from the environment (varies per deployment target),
`.env*` takes absolute priority. The constant file holds the fallback default.
**Never hardcode the value twice** — the fallback lives only in config/, nowhere else.

Pattern — always `process.env.VAR || DEFAULT`:
```typescript
// config/env.ts — single file that resolves ALL env vars with fallbacks

import { CONFIG_DEFAULTS } from "./defaults";

export const ENV = {
  // ─── APP ────────────────────────────────────────────
  NODE_ENV:       process.env.NODE_ENV        || "development",
  APP_PORT:       process.env.APP_PORT        || CONFIG_DEFAULTS.APP_PORT,
  APP_NAME:       process.env.APP_NAME        || CONFIG_DEFAULTS.APP_NAME,

  // ─── API ────────────────────────────────────────────
  API_BASE_URL:   process.env.API_BASE_URL    || CONFIG_DEFAULTS.API_BASE_URL,
  API_TIMEOUT_MS: process.env.API_TIMEOUT_MS  || CONFIG_DEFAULTS.API_TIMEOUT_MS,

  // ─── DATABASE ───────────────────────────────────────
  DATABASE_URL:   process.env.DATABASE_URL    || "",   // no fallback for secrets
  REDIS_URL:      process.env.REDIS_URL       || "",

  // ─── AUTH ───────────────────────────────────────────
  JWT_SECRET:     process.env.JWT_SECRET      || "",   // no fallback for secrets
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN  || CONFIG_DEFAULTS.JWT_EXPIRES_IN,

  // ─── LOGGING ────────────────────────────────────────
  LOG_LEVEL:      process.env.LOG_LEVEL       || CONFIG_DEFAULTS.LOG_LEVEL,
} as const;

// Validate required vars at startup — fail fast, never run with empty secrets
const REQUIRED = ["DATABASE_URL", "JWT_SECRET"] as const;
for (const key of REQUIRED) {
  if (!ENV[key]) throw new Error(`Missing required env var: ${key}`);
}
```

```typescript
// config/defaults.ts — all default values in one place, never scattered
export const CONFIG_DEFAULTS = {
  APP_PORT:       3000,
  APP_NAME:       "myapp",
  API_BASE_URL:   "/api/v1",
  API_TIMEOUT_MS: 10_000,
  JWT_EXPIRES_IN: "24h",
  LOG_LEVEL:      "info",
} as const;
```

Python equivalent — `config/env.py`:
```python
import os
from config.defaults import CONFIG_DEFAULTS

class ENV:
    NODE_ENV     = os.getenv("NODE_ENV",     "development")
    APP_PORT     = int(os.getenv("APP_PORT", CONFIG_DEFAULTS.APP_PORT))
    API_BASE_URL = os.getenv("API_BASE_URL", CONFIG_DEFAULTS.API_BASE_URL)
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    JWT_SECRET   = os.getenv("JWT_SECRET",   "")
    LOG_LEVEL    = os.getenv("LOG_LEVEL",    CONFIG_DEFAULTS.LOG_LEVEL)

# Fail fast
REQUIRED = ["DATABASE_URL", "JWT_SECRET"]
for key in REQUIRED:
    if not getattr(ENV, key):
        raise RuntimeError(f"Missing required env var: {key}")
```

---

### Thematic constant files — one responsibility per file

```typescript
// config/api.ts
import { ENV } from "./env";
export const API = {
  BASE_URL:       ENV.API_BASE_URL,
  TIMEOUT_MS:     ENV.API_TIMEOUT_MS,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1_000,
  VERSION:        "v1",
} as const;

// config/auth.ts
import { ENV } from "./env";
export const AUTH = {
  TOKEN_KEY:        "access_token",
  REFRESH_KEY:      "refresh_token",
  SESSION_TTL_SEC:  86_400,
  MIN_PASSWORD_LEN: 8,
  JWT_EXPIRES_IN:   ENV.JWT_EXPIRES_IN,
} as const;

// config/pagination.ts
export const PAGINATION = {
  DEFAULT_PAGE:      1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE:     100,
} as const;

// config/ui.ts
export const UI = {
  DEBOUNCE_MS:       300,
  TOAST_DURATION_MS: 4_000,
  ANIMATION_FAST_MS: 150,
  ANIMATION_SLOW_MS: 400,
  BREAKPOINTS: {
    MOBILE:   320,
    TABLET:   768,
    DESKTOP:  1024,
    WIDE:     1280,
  },
  Z_INDEX: {
    MODAL:    1000,
    DROPDOWN: 900,
    TOOLTIP:  800,
    HEADER:   700,
  },
} as const;

// config/limits.ts
export const LIMITS = {
  MAX_FILE_SIZE_MB:  10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,  // derived — never repeat the 10
  MAX_UPLOAD_COUNT:  5,
  MAX_NAME_LENGTH:   100,
  MAX_BIO_LENGTH:    500,
} as const;

// config/routes.ts
export const ROUTES = {
  HOME:      "/",
  LOGIN:     "/login",
  DASHBOARD: "/dashboard",
  PROFILE:   "/profile",
  SETTINGS:  "/settings",
  API: {
    USERS:   "/api/v1/users",
    AUTH:    "/api/v1/auth",
    HEALTH:  "/api/v1/health",
  },
} as const;

// config/regex.ts
export const REGEX = {
  EMAIL:  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE:  /^\+?[\d\s\-()]{7,15}$/,
  SLUG:   /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  UUID:   /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// config/http.ts
export const HTTP = {
  OK:            200,
  CREATED:       201,
  NO_CONTENT:    204,
  BAD_REQUEST:   400,
  UNAUTHORIZED:  401,
  FORBIDDEN:     403,
  NOT_FOUND:     404,
  UNPROCESSABLE: 422,
  SERVER_ERROR:  500,
} as const;

// config/events.ts
type Entity = "user" | "order" | "product";
type Action = "created" | "updated" | "deleted";
export type EventName = `${Entity}_${Action}`;
export const EVENTS = {
  USER_CREATED:    "user_created",
  USER_UPDATED:    "user_updated",
  SESSION_EXPIRED: "session_expired",
} as const satisfies Partial<Record<EventName, string>>;
```

Single re-export entry point — import everything from one place:
```typescript
// config/index.ts
export { ENV }        from "./env";
export { API }        from "./api";
export { AUTH }       from "./auth";
export { PAGINATION } from "./pagination";
export { UI }         from "./ui";
export { LIMITS }     from "./limits";
export { ROUTES }     from "./routes";
export { REGEX }      from "./regex";
export { HTTP }       from "./http";
export { EVENTS }     from "./events";

// Usage anywhere in the project:
// import { API, AUTH, HTTP, ROUTES } from "@config";
// import { API, AUTH, HTTP, ROUTES } from "config";
```

---

### DRY rules — enforced always

```typescript
// ✗ VIOLATION — value defined in two places
// .env.base:  API_TIMEOUT_MS=10000
// code:       const timeout = 10000;

// ✓ CORRECT — .env wins, constant is the fallback, used everywhere
// .env.base:  API_TIMEOUT_MS=10000
// config/env.ts: API_TIMEOUT_MS: process.env.API_TIMEOUT_MS || 10_000
// everywhere: import { ENV } from "@config"; fetch(url, { timeout: ENV.API_TIMEOUT_MS })
```

```typescript
// ✗ VIOLATION — derived value repeats base literal
MAX_FILE_SIZE_BYTES: 10_485_760   // magic number — what is this?

// ✓ CORRECT — derived from the named source
MAX_FILE_SIZE_MB:    10,
MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,   // self-documenting, DRY
```

- A value defined in `.env*` must NOT also be hardcoded anywhere in config/ as a duplicate
- A value in `config/` must NOT be redefined in any service, component, or utility file
- New constant → goes to the appropriate thematic file in config/ first, then imported
- No `const X = "value"` inside component files, service files, or utility files
- No per-service constants directories — only config/ at project root
- When a service needs a constant not yet in config/ → add to config/, then import
- Secrets (passwords, API keys) → `.env*` only, no fallback, validated at startup

---

### Constants audit — run on every response:
```
All values from .env* via ENV || fallback      ✓/✗
No hardcoded literals in src/ or app code      ✓/✗
No duplicate constant definitions              ✓/✗
New constants added to config/ thematic file   ✓/✗
Derived values reference base (not raw number) ✓/✗
Secrets have no fallback, validated at startup ✓/✗
Import via config/index.ts (not deep imports)  ✓/✗
```


---

## CODE QUALITY — THIN MODULES · ASYNC-FIRST · ZERO DEFECTS

---

### THIN MODULES — the default shape of all code

Every module, file, class, and function must be as thin as possible.
Complexity is always a problem to solve, never a feature to keep.

**File / module rules:**
- One module = one responsibility. If you need "and" to describe it — split it
- Max ~150 lines per file. Approaching 200 → extract before continuing
- Max 30 lines per function. Longer → extract named helpers
- Max 3 levels of nesting. Deeper → extract, early-return, or restructure
- Cyclomatic complexity per function: max 5 branches. More → split
- Zero side effects in pure utility functions — same input always same output
- No God objects, no God modules that accumulate unrelated responsibilities
- No barrel files that re-export 50+ things — split the domain first

**Module design checklist — before creating any new module:**
```
Can this be a pure function instead of a class?          → prefer function
Does this class have more than one reason to change?     → split it
Is this module imported by everything?                   → it's doing too much
Can I explain this module in 5 words?                    → if not, simplify
```

---

### SIMPLICITY — the primary design goal

Complexity is not sophistication. Simple code is harder to write and more valuable.

Rules:
- The simplest solution that correctly solves the problem is always preferred
- Never add abstraction before it is needed by at least 2 real use cases (YAGNI)
- Clever code is rejected — if it needs a comment to explain what it does, rewrite it
- No premature optimization — measure first, optimize only what is proven slow
- No defensive code for problems that do not exist yet
- Prefer flat over nested, explicit over implicit, boring over clever
- New team member rule: any developer should understand any module within 5 minutes

Readability hierarchy (highest to lowest priority):
```
1. Obvious intent        — what does this do? clear without reading internals
2. Predictable behavior  — no surprises, no hidden state changes
3. Discoverable          — easy to find what you need
4. Testable              — pure, injected deps, no hidden globals
5. Performant            — optimize last, never first
```

---

### ASYNC-FIRST — concurrency is the default, sync is the exception

All I/O operations are async by default. Sync is only acceptable for
CPU-bound pure computation with no I/O and no waiting.

**TypeScript / JavaScript:**
```typescript
// ✗ VIOLATION — sync I/O blocks the event loop
const data = fs.readFileSync("file.json");          // blocks everything
const result = execSync("git status");              // blocks everything

// ✓ CORRECT — async I/O, event loop stays free
const data = await fs.promises.readFile("file.json");
const result = await execAsync("git status");

// ✗ VIOLATION — sync DB call in async context
app.get("/users", (req, res) => {
  const users = db.querySync("SELECT * FROM users"); // blocks event loop
  res.json(users);
});

// ✓ CORRECT
app.get("/users", async (req, res) => {
  const users = await db.query("SELECT * FROM users");
  res.json(users);
});
```

**Python:**
```python
# ✗ VIOLATION — sync inside async function
async def get_users():
    time.sleep(2)                        # blocks the event loop — critical violation
    data = requests.get(url)             # sync HTTP in async context — violation

# ✓ CORRECT
async def get_users():
    await asyncio.sleep(2)               # non-blocking
    async with httpx.AsyncClient() as c: # async HTTP client
        data = await c.get(url)
```

**Sync-in-async detection — mandatory checks:**

These patterns are always violations in async code:
```
TypeScript:  fs.readFileSync, execSync, any *Sync method in async function
Python:      time.sleep(), requests.get/post(), open() without aiofiles,
             any blocking call inside async def
Both:        CPU-heavy loops without yielding (> ~10ms of pure computation)
             Blocking DB drivers in async context (use async driver instead)
```

**CPU-bound work — offload from async context:**
```typescript
// ✗ VIOLATION — heavy CPU work blocks event loop
async function processImage(buf: Buffer): Promise<Buffer> {
  return heavyImageProcessing(buf);      // blocks for 500ms — everything freezes
}

// ✓ CORRECT — offload to worker thread
import { runInWorker } from "@/utils/worker";
async function processImage(buf: Buffer): Promise<Buffer> {
  return runInWorker(() => heavyImageProcessing(buf));
}
```

```python
# ✗ VIOLATION
async def process_data(data: list) -> list:
    return [heavy_computation(x) for x in data]  # blocks event loop

# ✓ CORRECT — offload to thread pool executor
async def process_data(data: list) -> list:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: [heavy_computation(x) for x in data])
```

**Async rules — enforced always:**
- Every function that touches I/O (DB, file, network, cache) must be async
- Never mix sync and async in the same call chain without explicit offloading
- Never use sync sleep — always async sleep
- Database drivers must be async-native (asyncpg, motor, prisma, sqlalchemy async)
- HTTP clients must be async (httpx, aiohttp for Python; native fetch for Node)
- File operations must be async (aiofiles for Python; fs.promises for Node)
- Identify and annotate every sync block in async context with: `// SYNC-BLOCK: reason`
- Any sync block over ~10ms must be refactored to async or offloaded to worker

**Async code audit checklist:**
```
No *Sync methods in async functions               ✓/✗
No time.sleep() / Thread.sleep in async context   ✓/✗
No sync HTTP clients (requests) in async code     ✓/✗
No blocking DB calls in async handlers            ✓/✗
CPU-bound work offloaded to worker/executor       ✓/✗
All I/O-touching functions are async              ✓/✗
```

---

### QUALITY GATES — mandatory at every commit and deploy

**Every commit** triggers (via husky pre-commit + lint-staged):
```
prettier --write          → format all staged files
eslint --fix --max-warnings 0  → lint, zero warnings
tsc --noEmit / mypy       → type check, zero errors
```
Commit is BLOCKED if any gate fails. No --no-verify bypasses in normal workflow.

**Every PR / merge** triggers (CI pipeline):
```
lint + format check + type check    → zero errors
full test suite                     → all pass, coverage ≥ 80% line / 70% branch
async audit                         → no sync I/O detected in async context
thin module audit                   → no file > 200 lines, no function > 30 lines
```
PR is BLOCKED if any gate fails.

**Every deploy** triggers the full PRE-PRODUCTION TEST PROGRAM (all 9 phases).
No exceptions. No manual overrides. No "we'll fix it after deploy".

**Quality is not a phase — it is continuous:**
- Code that passes all gates is the minimum bar, not the goal
- Every code review must check: thin modules, async correctness, config/ usage, type safety
- Technical debt is logged in docs/DECISIONS.md immediately when introduced
- No TODO comments without a linked issue — remove or log it

---

## CODE QUALITY BASELINE

- Functions: max 30 lines — extract helpers if longer
- Files: max ~150 lines — approaching 200 → extract before continuing
- Cyclomatic complexity: max 5 branches per function, max 3 nesting levels
- All functions: explicit return types (TS) / type hints (Python)
- No magic numbers or strings — named constants in config/ only
- Error handling: never swallow silently — log + re-raise or handle explicitly
- Atomic commits: one logical change per task
- No dead commented-out code in final output
- Imports: stdlib → third-party → local, no unused imports
- Async: all I/O async, no sync blocking in async context

---

## FILESYSTEM CLEANLINESS — STRICT ZERO TOLERANCE

The project root, all sub-project roots, and all source directories are sacred.
The agent is the #1 source of filesystem pollution. These rules prevent that.

---

### THE AGENT JUNK PROBLEM — explicitly named and forbidden

Agents accumulate the following garbage in project roots. Every item below is
a violation. Every single one. No "just this once". No "it's temporary".

```
FORBIDDEN anywhere except tmp/ — agent-generated junk patterns:

Scripts & one-offs:
  fix.py  fix.ts  fix.sh  run.py  run.ts  setup.py  init.py  init.ts
  test.py  test.ts  try.py  try.ts  check.py  check.ts  debug.py  debug.ts
  seed.py  seed.ts  migrate.py  cleanup.py  cleanup.ts  reset.py  reset.ts
  main_temp.py  app_test.py  server_test.ts  index_new.ts  index2.ts

Reports & analysis dumps:
  report.md  report.txt  report.json  analysis.md  analysis.json
  results.md  results.txt  results.json  output.md  output.txt  output.json
  summary.md  summary.txt  plan.md  notes.md  notes.txt  todo.md  todo.txt
  diff.txt  diff.md  changes.txt  log.txt  error.log  debug.log

Versioned & backup duplicates:
  file_v2.py  file_v2.ts  file_old.py  file_old.ts  file_new.py  file_new.ts
  file_backup.py  file_copy.ts  file_temp.py  file2.py  file_fixed.ts
  component_v2.tsx  service_old.py  utils_new.ts  model_backup.py

Unrequested documentation:
  NOTES.md  CHANGES.md  TODO.md  PLAN.md  IDEAS.md  DESIGN.md
  ARCHITECTURE.md  DECISIONS.md (outside docs/)  TASKS.md  PROGRESS.md
  HOW_TO.md  SETUP.md  GUIDE.md  INSTRUCTIONS.md

Stale configs & experiments:
  .env.test2  .env.backup  .env.old  config_test.ts  config_backup.py
  tsconfig_test.json  tsconfig_old.json  jest.config_old.js

Data dumps:
  data.json  data.csv  dump.sql  export.json  import.json  test_data.json
  fixtures.json  sample.json  mock_data.py  fake_data.ts
```

---

### The rule: BEFORE creating any file, ask these questions

```
1. Will this file exist in the final project after this task? 
   NO  → tmp/ only, deleted same session
   YES → continue to question 2

2. Is this file in docs/STRUCTURE.md as an allowed project file?
   NO  → update STRUCTURE.md first, then create in proper location
   YES → create in proper location

3. Is this the project root or a sub-project root?
   YES → only canonical files allowed (see CANONICAL ROOT STRUCTURE)
         anything else → tmp/ or src/scripts/ or proper subdir
```

If you cannot answer YES to all three — do not create the file outside `tmp/`.

---

### tmp/ — the mandatory quarantine zone

```
tmp/
  .gitignore    ← single line: *
  .gitkeep      ← keeps dir in repo
```

Every file created for analysis, debugging, intermediate output, scaffolding,
one-off scripts, data generation → `tmp/` ONLY.

**Lifecycle — enforced within the same task cycle:**
```
CREATE  → tmp/filename     (never root, never src/, never anywhere else)
USE     → run, read, analyze
DELETE  → same response/session, before task ends
```

**Mandatory cleanup command — run at end of every task:**
```bash
find tmp/ -not -name '.gitignore' -not -name '.gitkeep' -not -type d -delete
echo "tmp/ cleaned"
```

If the cleanup was not run — the task is not complete.

---

### Root scan — mandatory at session start and end

At START of every session, scan and report:
```bash
# List everything in project root
ls -la

# List everything in each sub-project root
ls -la frontend/  backend/  services/*/

# Find agent-created junk patterns
find . -maxdepth 3 \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/tmp/*' \
  \( -name '*.bak' -o -name '*_old.*' -o -name '*_new.*' \
     -o -name '*_v2.*' -o -name '*_temp.*' -o -name '*_backup.*' \
     -o -name 'debug.*' -o -name 'test.*' -o -name 'fix.*' \
     -o -name 'run.*' -o -name 'notes.*' -o -name 'todo.*' \
     -o -name 'report.*' -o -name 'output.*' -o -name 'results.*' \
     -o -name 'analysis.*' -o -name 'dump.*' -o -name 'data.json' \) 2>/dev/null

# Find unexpected .md files outside docs/
find . -maxdepth 3 -name '*.md' \
  -not -name 'README.md' \
  -not -path '*/docs/*' \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' 2>/dev/null
```

At END of every session — run the same scan. If anything found → delete before finishing.

---

### Sub-project roots — same canonical cleanliness rules

Every service, app, and package root inside the monorepo or multi-service project
obeys the same canonical structure rules as the top-level root.

```
apps/web/           ← canonical frontend root only
apps/api/           ← canonical backend root only
packages/config/    ← only: index.ts + package.json + tsconfig.json
packages/ui/        ← only: src/ + package.json + tsconfig.json + README.md
services/worker/    ← canonical backend root only
```

**Cross-service junk is doubly forbidden:**
- A file created in `apps/web/` for a task on `apps/api/` → immediate violation
- Intermediate files from monorepo-wide scripts → `tmp/` at monorepo root only
- No service should have files belonging to another service

---

### What agent MUST do instead of polluting roots

| Instead of this (forbidden) | Do this instead |
|---|---|
| `fix.py` in root | `tmp/fix.py` → run → delete |
| `report.md` in root | Output content in chat response only |
| `notes.md` in root | Update `docs/CONTEXT.md` |
| `test_run.ts` in root | `tmp/test_run.ts` → run → delete |
| `data.json` in root | `tmp/data.json` → use → delete |
| `service_v2.py` in src/ | Edit `service.py` directly + git for backup |
| `index_new.ts` in src/ | Edit `index.ts` directly |
| `TODO.md` in root | Log in `docs/ROADMAP.md` or `docs/CONTEXT.md` |
| `DECISIONS.md` in root | Already in `docs/DECISIONS.md` |
| `debug.log` in root | `tmp/debug.log` → inspect → delete |
| Analysis output | Print in chat, never write to file |

---

### Allowed files — complete whitelist per location

**Project root (monorepo or single-service):**
```
README.md  .gitignore  .dockerignore  .env.example
package.json  pnpm-lock.yaml  pnpm-workspace.yaml
turbo.json  nx.json  Makefile
.eslintrc.json  .prettierrc  tsconfig.json
pyproject.toml  ruff.toml  mypy.ini
Dockerfile  docker-compose.yml  docker-compose.prod.yml
.husky/  .github/  .vscode/extensions.json
config/  docs/  tmp/  apps/  packages/  services/  src/  tests/
```

**docs/ — complete whitelist:**
```
README.md (symlink or copy — optional)
SPEC.md  ROADMAP.md  STRUCTURE.md  DEPLOY.md  DECISIONS.md  CONTEXT.md
[any .md explicitly requested by user by name]
```

**Anything not on a whitelist → tmp/ → delete.**

---

### Enforcement summary

```
Rule 1: Every temp file → tmp/ ONLY. Never root. Never src/. Never sub-project roots.
Rule 2: tmp/ is cleaned at end of every task. Empty = done.
Rule 3: Root scan at session start AND end. Violations deleted immediately.
Rule 4: No versioned duplicates anywhere (file_v2, file_old, file_new, file_backup).
Rule 5: No unrequested .md files anywhere outside docs/.
Rule 6: No data dumps, log files, or analysis output as persistent files anywhere.
Rule 7: Reports → chat response only, never written to filesystem.
Rule 8: Sub-project roots follow same rules as project root. No exceptions.
```

Confirm at end of every response:
```
ROOT SCAN : project root clean ✓/✗ | sub-roots clean ✓/✗ | violations found+deleted: [list or —]
FILESYSTEM: tmp/ empty ✓/✗ | cleanup ran ✓/✗ | deleted this session: [list or —]
```



---

### CANONICAL ROOT STRUCTURE — every service and app

Every service root and every app root must be canonically clean at all times.
Only files that belong there by established convention are allowed in the root.
Anything else is either moved to its proper directory or goes to `tmp/`.

**Canonical frontend root (Next.js / React / Vue):**
```
/
├── src/                    # all application source code
├── public/                 # static assets served directly
├── tests/                  # test suites (or colocated in src/ per framework convention)
├── docs/                   # project documentation
├── tmp/                    # temp/scratch only — fully gitignored
├── .github/                # CI/CD workflows
├── .husky/                 # git hooks
├── .vscode/                # shared IDE config (committed)
├── node_modules/           # never touched manually
├── .env.example            # committed — all keys, no values
├── .env.local              # not committed
├── .eslintrc.json          # linting config
├── .prettierrc             # formatting config
├── .gitignore              # standard ignores
├── tsconfig.json           # TypeScript config
├── package.json            # dependencies and scripts
├── pnpm-lock.yaml          # lockfile (or package-lock / yarn.lock)
└── README.md               # project entry point
```

**Canonical backend root (FastAPI / Django / Express):**
```
/
├── src/                    # all application source code
│   ├── api/                # route handlers / controllers
│   ├── services/           # business logic
│   ├── models/             # DB models / schemas
│   ├── repositories/       # data access layer
│   ├── utils/              # pure helpers
│   ├── constants/          # named constants
│   ├── logger/             # logging module
│   └── types/              # shared types / interfaces
├── tests/                  # test suites mirroring src/
├── migrations/             # DB migrations (Alembic / Prisma)
├── docs/                   # project documentation
├── tmp/                    # temp/scratch only — fully gitignored
├── .github/                # CI/CD workflows
├── .env.example            # committed — all keys, no values
├── .gitignore
├── Dockerfile
├── pyproject.toml          # Python: deps, ruff, mypy config
├── ruff.toml               # if separate from pyproject
└── README.md
```

**Canonical monorepo root:**
```
/
├── apps/                   # deployable applications
│   ├── web/                # frontend app (canonical frontend structure inside)
│   └── api/                # backend app (canonical backend structure inside)
├── packages/               # shared internal packages
│   ├── ui/                 # shared component library
│   ├── types/              # shared types across apps
│   └── config/             # shared configs (eslint, tsconfig base, etc.)
├── docs/                   # top-level project docs
├── tmp/                    # temp/scratch — gitignored
├── .github/
├── .env.example
├── .gitignore
├── package.json            # workspace root
├── pnpm-workspace.yaml
├── turbo.json              # or nx.json
└── README.md
```

### Root cleanliness rules — enforced on every task

**Allowed in any service/app root:** canonical config files, lockfiles, Dockerfile,
README.md, .env.example, .gitignore, and standard top-level directories.

**Never allowed in root:**
```
✗ One-off scripts:          setup.py, init.js, fix.sh, seed.py
✗ Dump files:               output.json, response.txt, data.csv
✗ Versioned duplicates:     app_old/, src_backup/, index_v2.ts
✗ Nested configs scattered: every tool config must be in root or its canonical subdir
✗ Undeclared directories:   anything not in docs/STRUCTURE.md
✗ Random markdown:          NOTES.md, TODO.md, CHANGES.md, PLAN.md
✗ Temporary test files:     test.py, try.ts, check.js, debug.py
✗ Build artifacts:          dist/, build/, .next/ — gitignored, never committed
```

**Where displaced files go:**
```
One-off scripts needed briefly    → tmp/        (deleted after use)
Permanent utility scripts         → src/scripts/ or Makefile targets
Tool configuration                → root (canonical) or config/ if many
Shared types                      → src/types/ or packages/types/ (monorepo)
Documentation notes               → docs/ (only the 6 approved docs)
DB seeds / fixtures               → tests/fixtures/ or src/db/seeds/
Migration scripts                 → migrations/
```

**Makefile / scripts/ for recurring tasks:**
If a project accumulates ad-hoc shell commands, they must be consolidated into
a `Makefile` or `scripts/` directory with clear named targets — never as loose
files in root:
```makefile
# Makefile
dev:        docker compose --env-file .env.docker up
build:      docker compose --env-file .env.production build
test:       pnpm test
lint:       pnpm lint && pnpm tsc --noEmit
clean-tmp:  find tmp/ -not -name '.gitignore' -not -name '.gitkeep' -not -type d -delete
```

**Structure audit — run at start of every session:**
1. Scan root directory — flag any file not in the canonical allowlist
2. Scan for duplicate or versioned directories/files
3. Verify `tmp/` contains only `.gitignore` and `.gitkeep` (no leftover files)
4. Report: `ROOT AUDIT: clean ✓` or list violations found

---

### tmp/ — the only place for anything temporary

```
tmp/                ← all temporary, scratch, debug, intermediate files live here ONLY
  .gitignore        ← contains: * (ignore everything inside tmp/)
```

`tmp/.gitignore` — created once, never touched again:
```
*
```

This means the `tmp/` directory itself is tracked (via an empty `.gitkeep`),
but every file inside it is ignored by git automatically. Nothing in `tmp/` ever
gets committed. Ever.

```
tmp/
  .gitignore        ← * (committed once)
  .gitkeep          ← empty file so the directory exists in repo
```

---

### What goes into tmp/ — mandatory routing

Every file that is not a permanent project artifact must go to `tmp/`:

```
tmp/debug_output.json       ← API response snapshots for debugging
tmp/test_run.py             ← throwaway test scripts
tmp/scratch.ts              ← exploratory code snippets
tmp/analysis.md             ← intermediate analysis notes
tmp/migration_check.sql     ← one-off SQL queries
tmp/diff_before.txt         ← comparison files
tmp/fixture_gen.py          ← one-time data generation scripts
tmp/lint_report.txt         ← saved lint output
tmp/type_check.log          ← saved tsc output
```

Forbidden locations for temp files — never create temp files here:
```
/                           ← project root — absolutely forbidden
src/                        ← source code only
tests/                      ← real tests only, no throwaway scripts
docs/                       ← permanent docs only
```

---

### Lifecycle — create → use → delete

Every file created in `tmp/` follows a strict lifecycle within the same task cycle:

```
1. CREATE  → tmp/filename        (never in root or src/)
2. USE     → read, run, analyze
3. DELETE  → rm tmp/filename     (in the same response/cycle, before task ends)
```

Deletion is mandatory. Not optional. Not "when convenient".
If the task ends and `tmp/` still has files created this session — the cycle is incomplete.

Cleanup command to run at end of every task cycle:
```bash
# Remove all files in tmp/ except .gitignore and .gitkeep
find tmp/ -not -name '.gitignore' -not -name '.gitkeep' -not -type d -delete
```

---

### Rules — enforced always

- Any file that serves only the current task and has no permanent value → `tmp/` only
- Never create versioned duplicates anywhere: `file_v2.py`, `file_new.ts`, `file_backup.py`
  → if a backup is needed, use git: `git stash` or a branch
- Never dump log output or command results to files in root or src/ — use `tmp/` or pipe to stdout
- If unsure whether a file should persist — it goes to `tmp/` and gets deleted after use
- The root directory must contain only: canonical project files, config files, and standard
  top-level dirs (src/, tests/, docs/, tmp/, .github/, etc.)

---

### Allowed .md files — explicit whitelist

The ONLY markdown files allowed to persist in the project:
```
README.md
docs/SPEC.md
docs/ROADMAP.md
docs/STRUCTURE.md
docs/DEPLOY.md
docs/DECISIONS.md
docs/CONTEXT.md
[any .md the user has explicitly named and requested]
```

Any other .md → `tmp/` → deleted after use.

---

Confirm at end of every response:
```
FILESYSTEM: clean ✓ — tmp/ empty, no junk in root or src/
```
or on cleanup performed:
```
FILESYSTEM: cleaned ✓ — deleted tmp/debug_output.json, tmp/scratch.ts
```

---

## SESSION INITIALIZATION

On every new conversation or model switch:
1. Read docs/SPEC.md → internalize requirements
2. Read docs/ROADMAP.md → current milestone + next task
3. Read docs/STRUCTURE.md → file/module ownership rules
4. Read docs/DEPLOY.md → target environment
5. Read docs/DECISIONS.md → all prior architectural decisions — never contradict without flagging
6. Read docs/CONTEXT.md → "Next task" field — this is the entry point for this session
7. Verify toolchain present: .eslintrc / .prettierrc / tsconfig.json / husky / lint-staged
8. Verify src/types/domain.ts exists as root of type hierarchy
9. State in one paragraph: current milestone, active task, context summary, toolchain status

At the END of every session before closing:
- Overwrite docs/CONTEXT.md with current snapshot
- Append new decisions to docs/DECISIONS.md
- Update docs/ROADMAP.md — mark completed items ✓

If docs/ missing → STOP, draft all 6 documents before any code.
If toolchain config missing → STOP, configure before writing any code.
If types/domain.ts missing → STOP, establish type root before writing any typed code.
If CONTEXT.md missing → create it now, then proceed.

If project context is unavailable, ask:
"Please share your project description so I can draft SPEC, ROADMAP, STRUCTURE, DEPLOY,
DECISIONS, CONTEXT, configure the quality toolchain, and establish the type hierarchy
before we start."
