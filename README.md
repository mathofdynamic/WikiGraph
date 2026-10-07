# WikiGraph — Empirical Knowledge Platform

**WikiGraph** is a private empirical knowledge workspace for a single owner and external AI agents. It transforms unstructured deep-research Markdown reports and machine-generated knowledge bundles into durable, reusable, and cited atomic knowledge units (procedures, findings, tips, skills, examples, failures, and lessons).

> **Important Architecture Notice**:  
> The backend for this application **does not exist yet**. **Demo mode is enabled by default** via `MockKnowledgeRepository`, using private `localStorage` persistence and rich synthetic research fixtures. You can immediately test the full application workflow (Library, Review Queue, Interactive Network Graph, Context Assembly, Bundle Ingestion, and Outcome Logging) entirely client-side without any server dependencies.
>
> For backend engineering specifications, D1 schemas, migration steps, and endpoint contracts, refer to [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md).

---

## Key Features

- **Empirical Research Library**: Categorized knowledge nodes organized by curated research collections, evidence levels (`tested`, `observed`, `unverified`), and status.
- **Review Queue**: Two-pane triage workspace for imported items (`needs_review`), with diff highlighting, excerpt grounding verification, and batch approvals.
- **Interactive Knowledge Network Graph**: Directed SVG relationship graph (`supports`, `conflicts_with`, `prerequisite_for`, `supersedes`, `complements`, `alternative_to`) with zoom, pan, bilingual Persian/English node labels, and inspection cards.
- **Context Builder (`buildContext`)**: Shared deterministic retrieval engine that scores keyword overlap, normalizes Persian typography (ي/ک variants, ZWNJ), enforces character and token budgets, includes prerequisites, surfaces mutual conflicts, and exports AI-ready Markdown and JSON prompt packets.
- **Bundle Ingestion (`wikigraph.bundle/1`)**: Standardized JSON bundle validation and import bench with SHA-256 integrity verification and excerpt provenance checking.
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

# Run automated test suite (bundle validation & deterministic retrieval tests)
npm run test

# Build production bundle for static hosting
npm run build
```

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
    │   ├── bundle.ts         # wikigraph.bundle/1 validator & sample fixtures
    │   ├── bundle.test.ts    # Automated bundle ingestion test suite
    │   ├── retrieval.ts      # Deterministic retrieval engine & Persian normalizer
    │   ├── retrieval.test.ts # Retrieval contract and token estimation test suite
    │   ├── storage.ts        # Safe localStorage wrapper, quota alerts, & usage accounting
    │   └── useFocusTrap.ts   # Keyboard accessibility and focus trap hook for modals
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
