# WikiGraph — Frontend Architecture & Backend Handoff Guide

This document specifies the technical architecture of the **WikiGraph** React frontend and defines the complete, production-grade implementation contract for the **Cloudflare Pages + Pages Functions + Cloudflare D1** backend. The backend implementation should strictly adhere to the schemas, conventions, and endpoints detailed below.

---

## 1. Executive Summary & Design System

WikiGraph is a private empirical knowledge workspace for a single owner. It turns deep-research Markdown reports into durable, reusable, and cited knowledge units (procedures, findings, tips, skills, examples, failures, and lessons).

### Design Archetype: Editorial & Restrained
- **Typography**: Clean serif and modern sans with mathematical contrast, and `Vazirmatn` for native Persian typography.
- **Color Palette**: Sophisticated warm neutrals (light theme: stone-50 background, white containers, stone-900 typography, deep emerald accent `#047857`; dark theme: stone-950 background, stone-900 surface, stone-100 typography).
- **No AI Clichés**: Banned purple/blue neon gradients, glassmorphism, huge border radii, and floating cards.
- **Bilingual & RTL**: Fully localized in English and Persian (فارسی). Switches `html[dir="rtl"]`, `html[lang="fa"]`, and adjusts alignment dynamically.

---

## 2. API Conventions & Standards

All backend endpoints under `/api/v1/*` must adhere to these uniform conventions:

### 2.1 Authentication & Authorization
1. **Single-Owner Web Session**:
   - `POST /api/v1/auth/login` sets an `httpOnly`, `Secure`, `SameSite=Lax` cookie named `wikigraph_session` containing an encrypted session token or JWT.
   - All browser requests from the frontend send `credentials: 'include'`.
2. **External Machine Access (AI Agents, CLI, Automation)**:
   - External tools authenticate via standard HTTP header: `Authorization: Bearer <token_secret>`.
   - `read_only` tokens are authorized for all `GET` endpoints and `POST /api/v1/query`.
   - `read_write` tokens are authorized for all endpoints, including mutations and bundle imports.
   - If a token has `collection_ids` configured (not `null`), queries and item mutations are strictly scoped to those collections.

### 2.2 Timestamps
- All timestamps in request and response bodies MUST be ISO-8601 UTC strings formatted as `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `"2026-10-07T12:00:00.000Z"`).

### 2.3 Pagination
- List endpoints accept optional query parameters:
  - `limit`: Integer (default `50`, maximum `200`).
  - `cursor`: Opaque string (ID or timestamp of last item from previous page).
- List endpoints return responses in the format:
  ```json
  {
    "items": [...],
    "nextCursor": "string | null"
  }
  ```
  *(Note: The frontend adapter `ApiKnowledgeRepository` automatically normalizes both flat arrays and `{ items, nextCursor }` envelopes).*

### 2.4 Error Envelope & Error Codes
When a request fails, the server MUST return HTTP status `4xx` or `5xx` with a JSON payload conforming to:
```json
{
  "error": {
    "code": "unauthorized | forbidden | not_found | validation_failed | conflict | rate_limited | server_error",
    "message": "Human-readable explanation of error.",
    "details": {}
  }
}
```

Standard Error Codes:
- `unauthorized` (401): Missing or expired cookie session, or invalid Bearer token.
- `forbidden` (403): Token lacks permission scope (e.g. `read_only` token attempting a mutation, or token restricted to another collection).
- `not_found` (404): Requested entity does not exist.
- `validation_failed` (400 / 422): Request body or query parameters failed validation constraints.
- `conflict` (409): Resource already exists (e.g. duplicate source content hash without overwrite option) or concurrent edit conflict.
- `rate_limited` (429): Request threshold exceeded.
- `server_error` (500): Unexpected backend execution fault.

---

## 3. Data Model & Cloudflare D1 Relational Schema

Cloudflare D1 is based on SQLite. The database schema matches `src/types/index.ts` exactly.

### Migration 0001: Initial Schema (`migrations/0001_initial_schema.sql`)
```sql
-- 1. Collections
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_fa TEXT NOT NULL,
  description TEXT,
  description_fa TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Source Documents (Original Research Reports)
CREATE TABLE source_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  content TEXT NOT NULL,
  content_sha256 TEXT NOT NULL, -- Hex lowercase SHA-256 (LF line endings, no BOM)
  kind TEXT NOT NULL DEFAULT 'research_report', -- 'research_report' | 'skill' | 'note'
  language TEXT NOT NULL DEFAULT 'en', -- 'en' | 'fa'
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_source_collection ON source_documents(collection_id);
CREATE INDEX idx_source_hash ON source_documents(content_sha256);

-- 3. Source Revisions (Immutable history snapshots)
CREATE TABLE source_revisions (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  content_snapshot TEXT NOT NULL,
  summary_of_changes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_revisions_source ON source_revisions(source_id);

-- 4. Knowledge Items (Atomic findings, procedures, tips, etc.)
CREATE TABLE knowledge_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL, -- 'procedure' | 'research_finding' | 'tip' | 'skill' | 'example' | 'failure' | 'lesson'
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
  source_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL, -- Nullable for manual notes
  source_revision_id TEXT, -- Nullable
  source_excerpt TEXT, -- Nullable
  origin TEXT NOT NULL DEFAULT 'manual', -- 'bundle' | 'manual'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'retired'
  retired_at TEXT, -- Nullable ISO timestamp
  applicability TEXT,
  exclusions TEXT,
  requirements TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  review_status TEXT NOT NULL DEFAULT 'needs_review', -- 'draft' | 'reviewed' | 'deprecated' | 'needs_review'
  evidence_level TEXT NOT NULL DEFAULT 'theoretical', -- 'theoretical' | 'tested' | 'production_proven' | 'unverified' | 'observed'
  language TEXT NOT NULL DEFAULT 'en', -- 'en' | 'fa'
  source_has_changed INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_knowledge_collection ON knowledge_items(collection_id);
CREATE INDEX idx_knowledge_source ON knowledge_items(source_id);
CREATE INDEX idx_knowledge_type ON knowledge_items(type);
CREATE INDEX idx_knowledge_status ON knowledge_items(status);
CREATE INDEX idx_knowledge_review ON knowledge_items(review_status);

-- 5. Knowledge Revisions (Immutable audit trail & snapshots)
CREATE TABLE knowledge_revisions (
  id TEXT PRIMARY KEY,
  knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  snapshot TEXT NOT NULL, -- JSON object of KnowledgeSnapshot
  change_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_revisions_knowledge ON knowledge_revisions(knowledge_id);

-- 6. Relationships Between Knowledge Items
CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  source_knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  target_knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'requires' | 'complements' | 'conflicts_with' | 'alternative_to' | 'supports' | 'supersedes' | 'prerequisite_for' | 'derived_from' | 'relates_to'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_rel_source ON relationships(source_knowledge_id);
CREATE INDEX idx_rel_target ON relationships(target_knowledge_id);
CREATE INDEX idx_rel_type ON relationships(relationship_type);

-- 7. Outcomes (Empirical task results)
CREATE TABLE knowledge_outcomes (
  id TEXT PRIMARY KEY,
  task TEXT NOT NULL,
  task_context TEXT,
  prompt TEXT,
  applied_knowledge_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of Knowledge IDs
  result TEXT NOT NULL, -- 'success' | 'failure' | 'uncertain'
  metrics TEXT,
  notes TEXT,
  review_notes TEXT,
  executed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 8. API Tokens (External Machine Access)
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL, -- SHA-256 hex digest of secret
  token_masked TEXT NOT NULL, -- e.g. wg_live_8f3a...b21c
  scope TEXT NOT NULL DEFAULT 'read_only', -- 'read_only' | 'read_write'
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at TEXT
);
```

### Migration 0002: Collection Scoping on API Tokens (`migrations/0002_add_collection_ids_to_api_tokens.sql`)
```sql
-- Add optional per-collection scoping to API tokens.
-- NULL means access to all collections.
-- Non-null is a JSON array of collection IDs, e.g. '["col-data-extraction", "col-rag"]'.
ALTER TABLE api_tokens ADD COLUMN collection_ids TEXT DEFAULT NULL;
```

---

## 4. Complete Cloudflare Pages Functions Endpoint Contract

All endpoints are mounted under `/api/v1/*`.

### 4.1 Authentication & Session (Single Owner)

#### `POST /api/v1/auth/login`
Authenticates single workspace owner and sets secure session cookie.
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "password": "owner_master_password_here"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "user": {
      "role": "owner"
    }
  }
  ```
  *Sets header:* `Set-Cookie: wikigraph_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
- **Error Cases**:
  - `400 validation_failed`: Password field missing or empty.
  - `401 unauthorized`: Invalid password.
  - `429 rate_limited`: More than 5 failed attempts per minute.

#### `POST /api/v1/auth/logout`
Destroys session and clears cookie.
- **Auth**: Cookie
- **Request Body**: None
- **Response `200 OK`**:
  ```json
  {
    "success": true
  }
  ```
  *Sets header:* `Set-Cookie: wikigraph_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`

#### `GET /api/v1/auth/session`
Checks current session state.
- **Auth**: Cookie
- **Response `200 OK`**:
  ```json
  {
    "authenticated": true,
    "user": {
      "role": "owner"
    }
  }
  ```
- **Response `200 OK` (when not logged in)**:
  ```json
  {
    "authenticated": false
  }
  ```

---

### 4.2 Machine Access Tokens (`/api/v1/tokens`)

#### `GET /api/v1/tokens`
Lists all active API tokens. Secret hashes are omitted.
- **Auth**: Cookie or Bearer (`read_only` / `read_write`)
- **Query Params**: `?limit=50&cursor=tok-xyz`
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "tok-17382910-a8f2",
        "name": "Claude Desktop Integration",
        "tokenMasked": "wg_live_7a8b...9c2d",
        "scope": "read_only",
        "collectionIds": ["col-data-extraction"],
        "createdAt": "2026-10-07T12:00:00.000Z",
        "lastUsedAt": "2026-10-07T12:05:00.000Z"
      }
    ],
    "nextCursor": null
  }
  ```

#### `POST /api/v1/tokens`
Generates a new token. **The secret is returned ONLY once in this response.**
- **Auth**: Cookie or Bearer (`read_write`)
- **Request Body**:
  ```json
  {
    "name": "Local Python Pipeline",
    "scope": "read_write",
    "collectionIds": null
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "token": {
      "id": "tok-17382910-b91c",
      "name": "Local Python Pipeline",
      "tokenMasked": "wg_live_3f4e...8a1b",
      "scope": "read_write",
      "collectionIds": null,
      "createdAt": "2026-10-07T12:10:00.000Z",
      "lastUsedAt": null
    },
    "secret": "wg_live_3f4e9128aa104928bf72019283718a1b"
  }
  ```
- **Error Cases**:
  - `400 validation_failed`: Name is empty or scope is invalid.
  - `401 unauthorized`: Missing session or token.
  - `403 forbidden`: Token lacks `read_write` permission.

#### `DELETE /api/v1/tokens/:id`
Permanently revokes a token.
- **Auth**: Cookie or Bearer (`read_write`)
- **Response `204 No Content`**
- **Error Cases**:
  - `404 not_found`: Token does not exist.

---

### 4.3 Knowledge Natural Language Query Contract (`POST /api/v1/query`)

External AI tools, skills, and agents query the workspace through this unified endpoint.
- **Auth**: Bearer token (`read_only` or `read_write`) or Cookie session.
- **Request Body** (`ContextRequest`):
  ```json
  {
    "task": "Extract borderless financial tables from scanned PDF filings",
    "requirements": {
      "tools": ["python", "pdfplumber"],
      "inputs": "scanned PDF documents",
      "outputFormat": "structured markdown",
      "language": "en",
      "constraints": "cpu-only sandbox"
    },
    "collectionIds": ["col-data-extraction"],
    "maxTokens": 4000,
    "includeUnreviewed": false
  }
  ```
- **Response `200 OK`** (`ContextResult`):
  ```json
  {
    "request": { ... },
    "sufficiency": "sufficient",
    "sufficiencyNote": "Sufficient knowledge units found covering the task and specified requirements.",
    "selected": [
      {
        "item": {
          "id": "kno-01",
          "title": "Dual-Pass Bounding Box Alignment for Borderless Tables",
          "summary": "Extracts tabular columns using KDE projection profiles.",
          "body": "Step 1: Compute horizontal pixel projections...",
          "type": "procedure",
          "collectionId": "col-data-extraction",
          "applicability": "Borderless PDF tables, financial filings",
          "exclusions": "Simple HTML tables",
          "requirements": ["python", "pdfplumber"],
          "reviewStatus": "reviewed",
          "evidenceLevel": "tested",
          "language": "en",
          "sourceId": "src-01",
          "sourceExcerpt": "Dual-pass alignment resolves 98.4% of table column boundaries..."
        },
        "score": 9.5,
        "reasons": [
          "Matched 'tables' in applicability",
          "Matched 'tables' in title",
          "Matched requested tool 'python'"
        ],
        "role": "primary",
        "warnings": [],
        "source": {
          "id": "src-01",
          "title": "High-Throughput Table Extraction in PDF Documents",
          "excerpt": "Dual-pass alignment resolves 98.4% of table column boundaries..."
        }
      }
    ],
    "conflicts": [],
    "excluded": [
      {
        "itemId": "kno-retired-01",
        "reason": "retired"
      }
    ],
    "tokenEstimate": {
      "used": 420,
      "budget": 4000
    }
  }
  ```
- **Error Cases**:
  - `400 validation_failed`: Task string is empty or maxTokens <= 0.
  - `401 unauthorized`: Invalid or missing Bearer token.
  - `403 forbidden`: Token collection scoping does not permit access to requested `collectionIds`.

---

### 4.4 Bundle Import & Full Workspace Backup

#### `POST /api/v1/import/bundle`
Ingests an external AI skill bundle (`wikigraph.bundle/1` format). Atomic: creates source document, knowledge items with review status `needs_review`, initial revisions, and mapped relationships.
- **Auth**: Cookie or Bearer (`read_write`)
- **Request Body**:
  ```json
  {
    "bundle": {
      "schema_version": "wikigraph.bundle/1",
      "source": {
        "title": "Document Parsing Heuristics",
        "filename": "parsing.md",
        "kind": "research_report",
        "language": "en",
        "tags": ["parsing", "pdf"],
        "content": "# Document Parsing Heuristics\n\nContent...",
        "content_sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
      },
      "items": [
        {
          "local_id": "item-1",
          "title": "Heuristic Row Separation",
          "summary": "Separates table rows via white-space valleys.",
          "type": "procedure",
          "language": "en",
          "evidence_level": "theoretical",
          "review_status": "needs_review",
          "source_excerpt": "Separates table rows via white-space valleys."
        }
      ],
      "relationships": []
    },
    "options": {
      "collectionId": "col-data-extraction",
      "onDuplicate": "skip"
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "sourceId": "src-17382910-a1b2",
    "createdItemIds": ["kno-17382910-c3d4"],
    "createdRelationshipIds": [],
    "skipped": false,
    "isNewRevision": false
  }
  ```
- **Error Cases**:
  - `400 validation_failed`: Bundle failed validation (e.g. SHA mismatch, CRLF line endings, ungrounded excerpts, invalid schema version).
  - `409 conflict`: Source content already imported and `onDuplicate` option is `error`.

#### `GET /api/v1/export`
Exports full JSON backup containing all collections, sources, source revisions, knowledge items, knowledge revisions, relationships, and outcomes.
- **Auth**: Cookie or Bearer (`read_only` / `read_write`)
- **Response `200 OK`**: Complete JSON snapshot of entire database.

#### `POST /api/v1/import/backup`
Restores full JSON backup snapshot into the workspace.
- **Auth**: Cookie or Bearer (`read_write`)
- **Request Body**: Complete backup JSON object.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "restoredCollections": 3,
    "restoredSources": 8,
    "restoredKnowledge": 24,
    "restoredRelationships": 12,
    "restoredOutcomes": 5
  }
  ```

---

### 4.5 Knowledge Items & Lifecycle

#### `GET /api/v1/knowledge`
List & filter knowledge items.
- **Query Params**:
  - `search`: string
  - `collectionId`: string
  - `sourceId`: string
  - `type`: KnowledgeType
  - `reviewStatus`: `draft | reviewed | deprecated | needs_review`
  - `evidenceLevel`: `theoretical | tested | production_proven`
  - `status`: `active | retired`
  - `includeRetired`: boolean (`true | false`)
  - `limit`: number, `cursor`: string
- **Response `200 OK`**: `{ "items": [ KnowledgeItem... ], "nextCursor": null }`

#### `POST /api/v1/knowledge`
Creates a new knowledge item. Automatically commits initial revision snapshot.
- **Request Body**: `KnowledgeItem` creation payload + optional `changeNote`.
- **Response `201 Created`**: Created `KnowledgeItem`.

#### `GET /api/v1/knowledge/:id`
Retrieves a knowledge item with embedded source and relationship links.
- **Response `200 OK`**: `KnowledgeItem` object.
- **Error**: `404 not_found`.

#### `PATCH /api/v1/knowledge/:id`
Updates knowledge item fields. Automatically saves a new immutable `knowledge_revisions` record.
- **Request Body**: Partial `KnowledgeItem` + optional `changeNote`.
- **Response `200 OK`**: Updated `KnowledgeItem`.

#### `POST /api/v1/knowledge/:id/retire`
Sets `status = 'retired'` and `retired_at = ISO-8601 UTC`. Hides item from normal searches and context queries, but preserves citations and history. Creates revision snapshot.
- **Request Body**: `{ "changeNote": "Retiring in favor of GPU alignment." }`
- **Response `200 OK`**: Updated `KnowledgeItem`.

#### `POST /api/v1/knowledge/:id/restore`
Sets `status = 'active'` and `retired_at = null`. Creates revision snapshot.
- **Request Body**: `{ "changeNote": "Restoring item to active pool." }`
- **Response `200 OK`**: Updated `KnowledgeItem`.

#### `GET /api/v1/knowledge/:id/revisions`
Returns list of all revision snapshots for an item, ordered newest to oldest.
- **Response `200 OK`**: `{ "items": [ KnowledgeRevision... ] }`

#### `POST /api/v1/knowledge/:id/revisions/:revisionId/restore`
Replaces item's current content with snapshot from historical revision. Commits a new revision note noting the restoration.
- **Response `200 OK`**: Restored `KnowledgeItem`.

#### `DELETE /api/v1/knowledge/:id`
Hard deletion. Restricted to administrative resets.
- **Response `204 No Content`**

---

### 4.6 Sources & Source Revisions

#### `GET /api/v1/sources`
List all sources.
- **Query Params**: `?limit=50&cursor=src-xyz`
- **Response `200 OK`**: `{ "items": [ SourceDocument... ] }`

#### `GET /api/v1/sources/:id`
Returns source document details, full content, and revision metadata.
- **Response `200 OK`**: `SourceDocument`
- **Error**: `404 not_found`

#### `GET /api/v1/sources/:id/revisions`
Returns historical revision snapshots for a source document.
- **Response `200 OK`**: `{ "items": [ SourceRevision... ] }`

#### `POST /api/v1/sources`
Ingests a new Markdown source document. Verifies and stores SHA-256 hash.
- **Request Body**: `{ "title": "...", "filename": "...", "content": "...", "collectionId": "..." }`
- **Response `201 Created`**: `SourceDocument`

#### `PUT /api/v1/sources/:id`
Updates source content. Archives previous content as a `source_revisions` entry, updates `content_sha256`, and sets `source_has_changed = 1` on all knowledge items pointing to this source.
- **Request Body**: `{ "newContent": "...", "changeSummary": "..." }`
- **Response `200 OK`**: Updated `SourceDocument`.

#### `DELETE /api/v1/sources/:id`
Deletes source document. Sets `source_id = NULL` on related knowledge items.
- **Response `204 No Content`**

---

### 4.7 Relationships

#### `GET /api/v1/relationships`
List relationships, optionally filtered by knowledge ID.
- **Query Params**: `?knowledgeId=kno-01`
- **Response `200 OK`**: `{ "items": [ KnowledgeRelationship... ] }`

#### `POST /api/v1/relationships`
Creates relationship between two knowledge items.
- **Request Body**:
  ```json
  {
    "sourceKnowledgeId": "kno-01",
    "targetKnowledgeId": "kno-02",
    "relationshipType": "prerequisite_for",
    "notes": "Text normalization must run before table parsing"
  }
  ```
- **Response `201 Created`**: `KnowledgeRelationship`

#### `PUT /api/v1/relationships/:id`
Updates an existing relationship's type or notes.
- **Request Body**: `{ "relationshipType": "conflicts_with", "notes": "Updated conflict note" }`
- **Response `200 OK`**: Updated `KnowledgeRelationship`.

#### `DELETE /api/v1/relationships/:id`
Deletes relationship link.
- **Response `204 No Content`**

---

### 4.8 Collections & Outcomes

#### Collections:
- `GET /api/v1/collections`: List collections.
- `POST /api/v1/collections`: Create collection.
- `POST /api/v1/collections/move-items`: Move items `{ "fromCollectionId": "col-1", "toCollectionId": "col-2" }`.
- `DELETE /api/v1/collections/:id`: Delete collection (`?moveTo=col-2` to migrate items).

#### Outcomes:
- `GET /api/v1/outcomes`: List outcomes (`?knowledgeId=kno-01`).
- `POST /api/v1/outcomes`: Log new execution outcome.
- `DELETE /api/v1/outcomes/:id`: Delete outcome record.

---

## 5. Backend Search Engine Requirements (Full-Text Search)

> **Backend TODO / Architecture Requirement**:

Full-text search in the backend must meet the following criteria across both English and Persian content:

1. **Target Search Surface**:
   - `knowledge_items.title`
   - `knowledge_items.summary`
   - `knowledge_items.applicability`
   - `knowledge_items.body`
   - `knowledge_items.requirements`

2. **Persian Text Normalization**:
   - Must normalize typography at both **index time** and **query time**:
     - Replace Arabic Yeh (`ي` `\u064A`) with Persian Yeh (`ی` `\u06CC`).
     - Replace Arabic Kaf (`ك` `\u0643`) with Persian Keheh (`ک` `\u06A9`).
     - Strip Zero-Width Non-Joiner (`\u200C`) and Zero-Width Joiner (`\u200D`).
     - Strip Arabic diacritics / vowels (Tashkeel: `\u064B` to `\u065F`).
     - Normalize Persian plural suffixes (`ها`, `های`).

3. **Field Weighting & Relevance Ranking**:
   - Matches in `applicability` (Weight 3.5x) and `title` (Weight 3.0x) must be ranked significantly higher than matches in `summary` (1.5x), `requirements` (1.5x), or `body` (1.0x).
   - Penalize items whose `exclusions` field matches the query task.

4. **Recommended Implementation on Cloudflare D1**:
   - Implement via **SQLite FTS5 virtual tables** (e.g. `CREATE VIRTUAL TABLE knowledge_fts USING fts5(...)`) with synchronized `AFTER INSERT/UPDATE/DELETE` triggers on `knowledge_items`.
   - Store pre-normalized tokens in a dedicated search index column or trigger expression to ensure fast `MATCH` execution within Cloudflare worker CPU time limits.

---

## 6. Switching from Demo Mode to Production API

Inside the application:
1. Open **Settings** (`/settings`) or toggle `DEMO_MODE_STORAGE_KEY` in `localStorage`.
2. When Demo Mode is turned off, `RepositoryContext` automatically switches to `ApiKnowledgeRepository`.
3. All UI pages and components consume `useRepository()`, interacting solely with the abstract `KnowledgeRepository` interface with zero code refactoring required.
4. HTTP errors thrown by `ApiKnowledgeRepository` are typed `RepositoryError` instances and automatically displayed via non-intrusive UI toasts.
