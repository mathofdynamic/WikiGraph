# WikiGraph — Frontend Architecture & Backend Handoff Guide

This document specifies the technical architecture of the **WikiGraph** React frontend and defines the implementation contract for the upcoming **Cloudflare Pages + Pages Functions + Cloudflare D1** backend.

---

## 1. Executive Summary & Design System

WikiGraph is a private empirical knowledge workspace for a single owner. It turns deep-research Markdown reports into durable, reusable, and cited knowledge (procedures, findings, tips, skills, examples, failures, and lessons).

### Design Archetype: Editorial & Restrained
- **Typography**: Clean serif & modern sans with mathematical contrast, and `Vazirmatn` for native Persian typography.
- **Color Palette**: Sophisticated warm neutrals (light theme: stone-50 background, white containers, stone-900 typography, deep emerald accent `#047857`; dark theme: stone-950 background, stone-900 surface, stone-100 typography).
- **No AI Clichés**: Banned purple/blue neon gradients, glassmorphism, huge border radii, and floating cards.
- **Bilingual & RTL**: Fully localized in English and Persian (فارسی). Switches `html[dir="rtl"]`, `html[lang="fa"]`, and adjusts alignment dynamically.

---

## 2. Component Hierarchy & Routes

```
src/
├── components/
│   ├── common/
│   │   ├── Badge.tsx           # Dynamic color badges for KnowledgeType, ReviewStatus, EvidenceLevel
│   │   ├── ConfirmModal.tsx    # Accessible confirmation dialog
│   │   ├── EmptyState.tsx      # Editorial empty state placeholder
│   │   ├── MarkdownViewer.tsx  # Sanitized, secure markdown renderer
│   │   └── SearchModal.tsx     # Cmd+K global search dialog
│   └── layout/
│       └── AppLayout.tsx       # Sidebar navigation, top bar, search trigger, RTL support
├── context/
│   └── ThemeContext.tsx        # Light / Dark / System theme management
├── locales/
│   ├── en.ts                   # English dictionary
│   ├── fa.ts                   # Native Persian dictionary
│   └── useLocale.tsx           # Locale provider & translation hook
├── pages/
│   ├── LibraryPage.tsx         # Tabbed view: Knowledge vs Sources, filtering, side inspector
│   ├── DocumentDetailPage.tsx  # Source document viewer, section knowledge extractor, revisions
│   ├── KnowledgeDetailPage.tsx # Knowledge detail editor, relationship manager, citation pin
│   ├── GraphPage.tsx           # Interactive relationship graph & citation map
│   ├── ContextPage.tsx         # Two-pane prompt & context packet builder with live token counts
│   ├── ImportPage.tsx          # Drag & drop markdown file upload & manual paste parser
│   ├── OutcomesPage.tsx        # Real-world task outcome tracker + promotion to lessons/failures
│   ├── ConnectionsPage.tsx     # AI Agent test bench, cURL/Python snippets, token management UI
│   ├── SettingsPage.tsx        # Collections management, JSON backup export/import, data reset
│   └── LoginPage.tsx           # Single-owner access screen
├── services/
│   ├── KnowledgeRepository.ts  # Formal abstraction interface
│   ├── MockKnowledgeRepository.ts # Offline localStorage-backed repository with rich fixtures
│   ├── ApiKnowledgeRepository.ts  # Production Cloudflare Pages /api/v1 adapter seam
│   ├── RepositoryContext.tsx   # React dependency injection hook
│   └── fixtures.ts             # Realistic domain research fixtures (EN & FA)
└── types/
    └── index.ts                # TypeScript DTOs & domain contracts
```

---

## 3. Data Model & D1 Relational Schema

For Cloudflare D1 (SQLite-based), apply the following schema:

```sql
-- Collections
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_fa TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Source Documents (Original Research Reports)
CREATE TABLE source_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  tags TEXT NOT NULL, -- JSON array of strings: '["rag", "vector-db"]'
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en', -- 'en' or 'fa'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_source_collection ON source_documents(collection_id);

-- Source Revisions (Immutable history)
CREATE TABLE source_revisions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  content_snapshot TEXT NOT NULL,
  summary_of_changes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_revisions_source ON source_revisions(source_id);

-- Knowledge Items (Atomic findings, procedures, tips, etc.)
CREATE TABLE knowledge_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL, -- 'procedure', 'research_finding', 'tip', 'skill', 'example', 'failure', 'lesson'
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  source_revision_id TEXT NOT NULL,
  source_excerpt TEXT NOT NULL,
  applicability TEXT,
  exclusions TEXT,
  requirements TEXT, -- JSON array of strings
  review_status TEXT NOT NULL DEFAULT 'needs_review', -- 'needs_review', 'reviewed', 'outdated'
  evidence_level TEXT NOT NULL DEFAULT 'theoretical', -- 'theoretical', 'tested', 'production_proven'
  language TEXT NOT NULL DEFAULT 'en',
  source_has_changed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_knowledge_collection ON knowledge_items(collection_id);
CREATE INDEX idx_knowledge_source ON knowledge_items(source_id);
CREATE INDEX idx_knowledge_type ON knowledge_items(type);

-- Relationships between Knowledge Items
CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  source_knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  target_knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'supports', 'conflicts_with', 'prerequisite_for', 'derived_from', 'supersedes', 'relates_to'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_rel_source ON relationships(source_knowledge_id);
CREATE INDEX idx_rel_target ON relationships(target_knowledge_id);

-- Outcomes (Real-world execution logs)
CREATE TABLE knowledge_outcomes (
  id TEXT PRIMARY KEY,
  task TEXT NOT NULL,
  prompt TEXT,
  applied_knowledge_ids TEXT NOT NULL, -- JSON array of knowledge IDs
  result TEXT NOT NULL, -- 'success', 'failure', 'uncertain'
  review_notes TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- API Tokens (For external AI tools & CLI access)
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL, -- PBKDF2 or SHA-256 hash of token secret
  token_masked TEXT NOT NULL,
  scope TEXT NOT NULL, -- 'read_only' or 'read_write'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);
```

---

## 4. Cloudflare Pages Functions API Contract (`/functions/api/v1/*`)

The frontend's `ApiKnowledgeRepository` is already pre-configured to communicate with the following standard endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/knowledge` | List & filter knowledge items (`?collectionId=`, `?type=`, `?search=`, `?reviewStatus=`) |
| `POST` | `/api/v1/knowledge` | Create a new knowledge item |
| `GET` | `/api/v1/knowledge/:id` | Get knowledge item with embedded source and relationships |
| `PUT` | `/api/v1/knowledge/:id` | Update knowledge item |
| `DELETE` | `/api/v1/knowledge/:id` | Delete knowledge item |
| `GET` | `/api/v1/sources` | List all source documents |
| `POST` | `/api/v1/sources` | Ingest new markdown report |
| `GET` | `/api/v1/sources/:id` | Get source document details & revisions |
| `PUT` | `/api/v1/sources/:id` | Update source content & create new revision snapshot |
| `DELETE` | `/api/v1/sources/:id` | Delete source document |
| `GET` | `/api/v1/collections` | List all collections |
| `POST` | `/api/v1/collections` | Create collection |
| `DELETE` | `/api/v1/collections/:id` | Delete collection |
| `POST` | `/api/v1/relationships` | Add semantic relationship link between items |
| `DELETE` | `/api/v1/relationships/:id`| Remove relationship link |
| `GET` | `/api/v1/outcomes` | List task execution outcome records |
| `POST` | `/api/v1/outcomes` | Log real-world execution outcome |
| `DELETE` | `/api/v1/outcomes/:id` | Delete outcome record |
| `POST` | `/api/v1/query` | Natural language retrieval endpoint for external AI agents |

---

## 5. Switching from Mock to Production API

Inside `src/services/RepositoryContext.tsx`:
- By default, `isDemoMode = true`, which instantiates `MockKnowledgeRepository`.
- To activate production API requests against Cloudflare Pages Functions, pass `useDemo = false` or toggle it in Settings (`/settings`).
- All views, forms, modals, and detail inspectors interact only with the `KnowledgeRepository` interface, ensuring zero refactoring is needed when switching adapters.

---

## 6. Development & Build Instructions

```bash
# Install dependencies
npm install

# Start Vite dev server on port 3000
npm run dev

# Run TypeScript linter
npm run lint

# Production SPA build (outputs to dist/)
npm run build
```
