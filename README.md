# WikiGraph — Knowledge Library for AI Agents

**WikiGraph is an empirical, read-only knowledge library designed with autonomous AI agents as the primary consumer and a human publication view as a secondary reading lens.**

The site reads like a documentation/publication site (~72ch reading column, typographic hierarchy, generous whitespace, zero dashboard boxes). The web UI contains NO manual create, edit, or delete workflows for library articles. Knowledge enters exclusively through structured offline pipelines, and agents communicate with the library programmatically. Token management is the **only write action** remaining in the UI.

### Machine Twins & Agent View
- **Machine Twins**: Every human-readable page has an exact machine-readable equivalent:
  - `GET /api/v1/knowledge/:idOrSlug(.md|.json)`
  - `GET /api/v1/sources/:idOrSlug(.md|.json)`
  - `GET /api/v1/collections/:idOrSlug(.md|.json)`
  - `GET /llms.txt` (standard root directory manifest following llmstxt.org)
- **Agent View Toggle**: An "Agent view" toggle on every entry and source page displays the exact, token-efficient Markdown an agent receives, along with its live token estimate (`estimateTokens`).
- **Human-Readable Slugs**: Stable, unique human-readable slugs (derived from titles) are used in URLs, machine twin endpoints, and citations across both English and Persian.

### The Two Write Paths
1. **Bundle Publishing by Offline Skill (`wikigraph.bundle/1`)**:
   - An offline tool (a local AI skill) digests deep-research documents and publishes standardized packages to `POST /api/v1/import/bundle` using a `read_write` Bearer token.
   - Bundle review status is preserved (`needs_review` or `reviewed`). Items imported as `reviewed` get `reviewedAt = import time`. Unknown top-level fields are tolerated.
   - Optional `source.origin` records upstream provenance (URL, repository, path, author, license, version, retrieval date, and notes).
2. **Outcome Reporting by AI Agents (`report_outcome`)**:
   - Downstream AI agents report empirical task execution results via `POST /api/v1/outcomes` using Bearer tokens with `read_write` scope.
   - Canonical fields: `task`, `appliedKnowledgeIds`, optional `appliedRevisionIds` (recording exact versions used), `result` (`success` | `failure` | `uncertain`), `notes`, and optional `reportedBy`. Rate limited to 60 req/min.

> **Important Architecture Notice**:  
> The backend for this application **does not exist yet**. **Demo mode is enabled by default** via `MockKnowledgeRepository`, using private `localStorage` persistence seeded with sample content. You can immediately inspect the read-only library (Library, Document & Knowledge details with revision history and agent outcomes, Directed Network Graph, Context Builder test bench, and Token Management) entirely client-side without any server dependencies.
>
> For backend engineering specifications, D1 schemas, and endpoint contracts, refer to [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md).

---

## Key Features

- **Empirical Research Library**: Read-only categorized knowledge nodes organized by curated research collections, evidence levels (`theoretical`, `observed`, `tested`, `production_proven`), and status.
- **Interactive Knowledge Network Graph**: Directed SVG relationship graph (`supports`, `conflicts_with`, `alternative_to`, `prerequisite_for`, `derived_from`, `supersedes`, `relates_to`) with zoom, pan, bilingual Persian/English node labels, and inspection cards.
- **Context Builder (`buildContext`)**: Shared deterministic retrieval engine that scores keyword overlap, normalizes Persian typography (ي/ک variants, ZWNJ), enforces character and token budgets, includes prerequisites, surfaces mutual conflicts, and exports AI-ready Markdown and JSON prompt packets.
- **Agent Connections & Token Access**: Manage machine API tokens (`read_only` / `read_write`) for external tools and agents, and inspect interactive curl / python execution snippets.
- **Bilingual & RTL-First**: Complete native English (LTR) and Persian (RTL) localization with Vazirmatn typography, automatic script detection, and accessible direction handling.
- **WCAG AA Compliant**: High-contrast status badges, visible keyboard focus rings across all interactive controls, and accessible focus-trapped dialogs that dismiss on Escape.

---

## Quick Start (Standardized on npm)

This project strictly standardizes on `npm`.

### Prerequisites
- Node.js 18+ or 20+
- npm 9+ or 10+

### Installation & Development

```bash
# Install dependencies
npm install

# Start local development server on port 3000
npm run dev

# Run TypeScript verification / linter
npm run lint

# Run automated test suite (bundle validation, deterministic retrieval, & layout grid tests)
npm run test

# Build production bundle for static hosting
npm run build
```

---

## Shared 12-Column Layout Grid & Verification Overlay

WikiGraph enforces a single shared layout grid system across the top navigation bar, footer, and every application route.

### Canonical Layout Tokens
The layout system is governed by a single source of truth (`src/shared/layout.ts` and CSS token `--container` in `src/index.css`):
- **Container Max-Width**: `--container: 72rem` (1152px)
- **Grid Columns**: 12 equal-fraction columns (`grid-cols-12`)
- **Gutters / Gaps**: Constant 16px on mobile (`gap-4`), 24px on desktop (`md:gap-6`)
- **Horizontal Viewport Padding**: Constant 16px on mobile (`px-4`), 24px on desktop (`sm:px-6`)
- **Line Length**: Max 70ch (`max-w-[70ch]`), left-aligned to column starts (never centered)
- **Logical Flow**: Mirrored naturally for Persian (RTL) using CSS logical properties (`start-`, `end-`, `ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`).

### Grid Verification Overlay (`?grid=1` & `G` Toggle)
A non-intrusive verification overlay is built into the application layout shell:
1. **Activate**: Append `?grid=1` to any URL in the browser (e.g. `http://localhost:3000/?grid=1` or `http://localhost:3000/library?grid=1`).
2. **Visual Inspection**: Draws the 12 semi-transparent columns with exact gutters and column indicators (1 through 12) directly over the page. Pointer events are disabled (`pointer-events: none`), so all links, inputs, and buttons remain clickable.
3. **Interactive Toggle**: Press the `G` key at any time to toggle the overlay on or off (the toggle ignores keypresses inside input fields and textareas).

### Automated & Manual Verification Procedures

#### Automated Token & Layout Test
Run the automated layout verification suite via:
```bash
npx tsx src/shared/layout.test.ts
# or as part of the full test suite:
npm test
```
The test asserts that:
- Container and grid tokens (`--container`, 12 columns, 16px/24px gaps, 70ch line length) are defined in one place only.
- `<Container>` and `<PageGrid>` are used across all page routes.
- No obsolete ad-hoc centered column wrappers (`max-w-6xl mx-auto`, `max-w-[72ch] mx-auto`, etc.) remain in the codebase.

#### Manual Visual Verification Check
Open each route with `?grid=1` in the browser and confirm the following alignments:
1. **`/` (Home)**:
   - Wordmark starts on Column 1.
   - Task box, prompt chips, and submit button span Columns 1–8.
   - Collections shelf and Recent Additions list span all 12 columns; section headings align to Column 1, right-aligned links ("View all...") align to Column 12.
2. **`/library` (Library)**:
   - Page header and filter row align to Column 1.
   - Catalog entries reading list sits in Columns 1–8.
3. **`/collections` (Collections Index)**:
   - Page header aligns to Column 1.
   - Collection shelves list sits in Columns 1–8.
4. **`/collections/:id` (Collection Detail)**:
   - Breadcrumb and collection title align to Column 1; action buttons align to Column 12.
   - Entries list sits in Columns 1–8.
5. **`/search` (Search)**:
   - Search form and query matches sit in Columns 1–8; left edge aligns to Column 1.
6. **`/knowledge/:id` (Entry Detail)**:
   - Main article reading text sits in Columns 1–8 (left-aligned with wordmark, max 70ch lines).
   - "Use with an AI" side panel sits in Columns 9–12 (right edge aligns to Column 12 / top-bar controls; stacks below main article on mobile).
7. **`/documents/:id` (Source Document Detail)**:
   - Main source reading text sits in Columns 1–8.
   - Extracted knowledge units side panel sits in Columns 9–12 (stacks below on mobile).
8. **`/graph` (Knowledge Network Graph)**:
   - Top toolbar wraps in `<Container>`; back button and title align to Column 1; search, filters, and zoom controls end at Column 12.
9. **`/for-agents` (For Agents & API Tokens)**:
   - Overview, Base URL, MCP tool specs, `/llms.txt` preview, code examples, simulator, and token manager all sit in Columns 1–8, aligned to Column 1.
10. **`/login` (Single-Owner Login)**:
    - Login card sits in Columns 1–6 (left-aligned with Column 1, no centered narrow columns).
    - Grid verification overlay activates with `?grid=1` and toggles with `G`.
11. **Persian Mode (RTL)**:
    - Switch language to FA; verify that the grid and columns mirror cleanly from inline-start to inline-end.

---

## Architectural Pattern: Repository Pattern

The entire UI is built on the **Repository Pattern** decoupled via the `KnowledgeRepository` interface (`src/services/KnowledgeRepository.ts`). No page or UI component interacts with network calls or storage directly.

```
                  ┌──────────────────────────────┐
                  │        React UI Layer        │
                  │ (Pages, Contexts, Components)│
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    KnowledgeRepository       │
                  │   (Shared Abstract Contract) │
                  └──────────────┬───────────────┘
                                 │
                ┌────────────────┴────────────────┐
                ▼                                 ▼
   ┌─────────────────────────┐       ┌─────────────────────────┐
   │ MockKnowledgeRepository │       │  ApiKnowledgeRepository │
   │ (Active Default: Demo)  │       │ (Backend Contract / API)│
   │ - In-memory data store  │       │ - REST fetch /api/v1/*  │
   │ - Safe localStorage    │       │ - Bearer token auth     │
   │ - Persian normalizer    │       │ - Typed RepositoryError │
   │ - Quota guard & alerts  │       │ - D1 backend ready      │
   └─────────────────────────┘       └─────────────────────────┘
```

### Switching Adapters
In `Settings` or `RepositoryContext.tsx`, `isDemoMode` dictates which repository implementation is injected into the application tree:
- **Demo Mode (`true`, Default)**: `MockKnowledgeRepository` handles all mutations, snapshots, and evaluations in local storage.
- **Production Mode (`false`)**: `ApiKnowledgeRepository` communicates with the future Cloudflare Pages Functions `/api/v1` backend described in `FRONTEND_HANDOFF.md`.

---

## Folder Layout

```
.
├── .env.example              # Example environment template
├── FRONTEND_HANDOFF.md       # Comprehensive backend implementation contract
├── README.md                 # Project overview and developer instructions
├── index.html                # Application HTML entry point
├── metadata.json             # AI Studio applet capabilities and metadata
├── package.json              # Standard npm package configuration & scripts
├── tsconfig.json             # TypeScript compiler configuration
├── vite.config.ts            # Vite build configuration with Tailwind CSS v4
│
└── src/
    ├── App.tsx               # Root route declarations and authentication shell
    ├── main.tsx              # React application DOM bootstrap
    ├── index.css             # Tailwind CSS tokens, theme variables, and focus rings
    │
    ├── components/
    │   ├── common/           # Reusable UI primitives (Badge, ConfirmModal,
    │   │                     # CreateNoteModal, EmptyState, MarkdownViewer, SearchModal)
    │   └── layout/           # AppLayout shell, sidebar navigation, and header
    │
    ├── context/
    │   ├── AuthContext.tsx   # Single-owner session provider and guards
    │   ├── ThemeContext.tsx  # Theme customization (light/dark/contrast/fonts/blur)
    │   └── ToastContext.tsx  # User feedback toast notifications
    │
    ├── lib/
    │   ├── storage.ts        # Safe localStorage wrapper, quota alerts, & usage accounting
    │   └── useFocusTrap.ts   # Keyboard accessibility and focus trap hook for modals
    │
    ├── shared/
    │   ├── bundle.ts         # wikigraph.bundle/1 validator & sample fixtures
    │   ├── bundle.test.ts    # Automated bundle ingestion test suite
    │   ├── retrieval.ts      # Deterministic retrieval engine & Persian normalizer
    │   └── retrieval.test.ts # Retrieval contract and token estimation test suite
    │
    ├── locales/
    │   ├── en.ts             # English strings (LTR)
    │   ├── fa.ts             # Persian strings (RTL)
    │   └── useLocale.tsx     # Locale context, direction switching, and interpolation
    │
    ├── pages/
    │   ├── ConnectionsPage.tsx   # API Tokens, cURL & Python AI agent snippets
    │   ├── ContextPage.tsx       # AI Context Builder with Markdown / JSON export
    │   ├── DocumentDetailPage.tsx# Research document view & revision history
    │   ├── GraphPage.tsx         # Interactive network graph with bilingual SVG rendering
    │   ├── ImportPage.tsx        # Ingestion test bench for wikigraph.bundle/1
    │   ├── KnowledgeDetailPage.tsx # Knowledge unit inspector, relationships, & editor
    │   ├── LibraryPage.tsx       # Filterable research library and sources table
    │   ├── LoginPage.tsx         # Single-owner password gate
    │   ├── OutcomesPage.tsx      # Empirical outcome evaluation and metric tracking
    │   ├── ReviewPage.tsx        # Two-pane triage queue for unreviewed bundle items
    │   └── SettingsPage.tsx      # Appearance, language, collections, & storage backup
    │
    ├── services/
    │   ├── KnowledgeRepository.ts # Core repository interface & error types
    │   ├── RepositoryContext.tsx  # React provider for active repository adapter
    │   ├── apiRepository.ts       # HTTP REST implementation for Cloudflare backend
    │   ├── fixtures.ts            # High-fidelity synthetic research datasets
    │   └── mockRepository.ts      # Offline demo repository with localStorage persistence
    │
    └── types/
        └── index.ts          # Core domain models (KnowledgeItem, SourceDocument, etc.)
```

---

## Security & Privacy

- **No Remote Telemetry**: All data remains on the device in demo mode.
- **Zero API Key Leakage**: No external client-side API keys (`GEMINI_API_KEY` or similar) are exposed in the client bundle.
- **Quota Safeguard**: Local storage writes are guarded against `QuotaExceededError`. When storage capacity is reached, a dismissible alert guides the user to download an immediate JSON backup snapshot.
