export type KnowledgeType =
  | 'research_finding'
  | 'tip'
  | 'procedure'
  | 'skill'
  | 'example'
  | 'failure'
  | 'lesson';

export type ReviewStatus = 'draft' | 'reviewed' | 'deprecated' | 'needs_review';

export type EvidenceLevel = 'unverified' | 'observed' | 'tested';

export type RelationType =
  | 'requires'
  | 'complements'
  | 'conflicts_with'
  | 'alternative_to'
  | 'supports'
  | 'supersedes'
  | 'prerequisite_for'
  | 'derived_from'
  | 'relates_to';

export type RelationshipType = RelationType;

export type OutcomeResult = 'success' | 'failure' | 'uncertain';

export type AppLanguage = 'en' | 'fa';

export interface Collection {
  id: string;
  name: string;
  nameFa: string;
  description?: string;
  descriptionFa?: string;
  color?: string;
  count?: number;
}

export type SourceDocumentKind = 'research_report' | 'skill' | 'note';

export interface SourceRevision {
  revisionId: string;
  timestamp: string;
  changeSummary?: string;
  summary?: string;
  content?: string;
  rawSize?: number;
  headingsCount?: number;
}

export interface SourceDocument {
  id: string;
  title: string;
  filename: string;
  originalContent: string;
  rawSize?: number;
  language: AppLanguage;
  collectionId: string;
  kind?: SourceDocumentKind;
  tags?: string[];
  contentSha256?: string;
  content_sha256?: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
  sourceUrl?: string;
  importedAt?: string;
  revisions: SourceRevision[];
}

export type KnowledgeOrigin = 'bundle' | 'manual';
export type KnowledgeStatus = 'active' | 'retired';

export interface KnowledgeSnapshot {
  title: string;
  summary: string;
  body: string;
  type: KnowledgeType;
  collectionId: string;
  applicability: string;
  exclusions: string;
  requirements: string[];
  sourceId?: string | null;
  sourceRevisionId?: string | null;
  sourceExcerpt?: string | null;
  reviewStatus: ReviewStatus;
  evidenceLevel: EvidenceLevel;
  language: AppLanguage;
  origin?: KnowledgeOrigin;
  status?: KnowledgeStatus;
}

export interface KnowledgeRevision {
  id: string;
  knowledgeId: string;
  snapshot: KnowledgeSnapshot;
  changeNote?: string | null;
  createdAt: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  body: string;
  type: KnowledgeType;
  collectionId: string;
  applicability: string;
  exclusions: string;
  requirements: string[];
  sourceId?: string | null;
  sourceRevisionId?: string | null;
  sourceExcerpt?: string | null;
  origin?: KnowledgeOrigin;
  status?: KnowledgeStatus;
  retiredAt?: string | null;
  reviewStatus: ReviewStatus;
  evidenceLevel: EvidenceLevel;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  lastSourceSyncAt?: string;
  sourceHasChanged?: boolean;
  language: AppLanguage;
  relationships?: KnowledgeRelationship[];
}

export interface KnowledgeRelationship {
  id: string;
  sourceId?: string; // from knowledge item
  sourceKnowledgeId?: string;
  targetId?: string; // to knowledge item
  targetKnowledgeId?: string;
  type?: RelationType;
  relationshipType?: RelationType | string;
  rationale?: string;
  notes?: string;
  createdAt?: string;
}

export interface KnowledgeOutcome {
  id: string;
  knowledgeId?: string;
  taskContext?: string;
  task?: string;
  prompt?: string;
  appliedKnowledgeIds?: string[];
  pinnedRevisionId?: string;
  result: OutcomeResult;
  metrics?: string;
  notes?: string;
  reviewNotes?: string;
  recordedAt?: string;
  executedAt?: string;
}

export interface ApiToken {
  id: string;
  name: string;
  tokenMasked: string;
  scope: 'read_only' | 'read_write';
  collectionIds?: string[] | null; // null = all collections
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface CreateApiTokenRequest {
  name: string;
  scope: 'read_only' | 'read_write';
  collectionIds?: string[] | null;
}

export interface CreateApiTokenResponse {
  token: ApiToken;
  secret: string; // The secret is returned ONLY once on creation
}

export type RepositoryErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'rate_limited'
  | 'server_error'
  | 'network_error';

export interface ApiErrorPayload {
  error: {
    code: RepositoryErrorCode;
    message: string;
    details?: Record<string, unknown> | unknown[];
  };
}

export class RepositoryError extends Error {
  code: RepositoryErrorCode;
  details?: Record<string, unknown> | unknown[];
  status?: number;

  constructor(
    code: RepositoryErrorCode,
    message: string,
    details?: Record<string, unknown> | unknown[],
    status?: number
  ) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user?: {
    role: 'owner';
  };
}

export interface AuthLoginRequest {
  password: string;
}

export interface AuthLoginResponse {
  success: boolean;
  user?: {
    role: 'owner';
  };
}

export interface ContextRecipe {
  id: string;
  name: string;
  description?: string;
  selectedKnowledgeIds: string[];
  outputFormat: string;
  createdAt: string;
}

export interface ApiKeyGrant {
  id: string;
  label: string;
  tokenPrefix: string;
  allowedCollections: string[]; // collection IDs or 'all'
  grants: ('search' | 'read' | 'compose')[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  status: 'active' | 'revoked';
  isDemoSimulated: boolean;
}

export interface KnowledgeFilter {
  search?: string;
  sourceId?: string;
  collectionId?: string;
  type?: KnowledgeType | 'all';
  language?: AppLanguage | 'all';
  reviewStatus?: ReviewStatus | 'all';
  evidenceLevel?: EvidenceLevel | 'all';
  freshness?: 'all' | 'needs_review' | 'fresh' | 'stale';
  status?: 'all' | 'active' | 'retired';
  includeRetired?: boolean;
  origin?: 'all' | 'bundle' | 'manual';
}

export interface ContextRequest {
  task: string;
  requirements?: {
    tools?: string[];
    inputs?: string;
    outputFormat?: string;
    language?: 'en' | 'fa';
    constraints?: string;
  };
  collectionIds?: string[];
  maxTokens?: number;
  includeUnreviewed?: boolean;
}

export interface ContextResult {
  request: ContextRequest;
  sufficiency: 'sufficient' | 'partial' | 'insufficient';
  sufficiencyNote: string;
  selected: Array<{
    item: KnowledgeItem;
    score: number;
    reasons: string[];
    role: 'primary' | 'prerequisite' | 'supporting';
    warnings: string[];
    source?: {
      id: string;
      title: string;
      excerpt: string;
    };
  }>;
  conflicts: Array<{
    itemIds: [string, string];
    note?: string;
  }>;
  excluded: Array<{
    itemId: string;
    reason: 'superseded' | 'retired' | 'unreviewed' | 'over_budget' | 'exclusion_matched';
  }>;
  tokenEstimate: {
    used: number;
    budget: number;
  };
}

export interface ContextAssemblyRequest {
  task: string;
  collectionId?: string;
  language: AppLanguage | 'any';
  inputFormat: string;
  outputFormat: string;
  toolsEnvironment: string;
  characterBudget: number;
  selectedKnowledgeIds: string[];
}

export interface ContextAssemblyResult {
  task: string;
  timestamp: string;
  characterBudget: number;
  totalCharacters: number;
  applicableMethods: { item: KnowledgeItem; reason: string }[];
  prerequisites: { item: KnowledgeItem; requiredBy: string }[];
  alternatives: { item: KnowledgeItem; alternativeTo: string }[];
  conflicts: { itemA: KnowledgeItem; itemB: KnowledgeItem; warning: string }[];
  evidenceSources: { source: SourceDocument; revision: string; excerpt: string }[];
  limitations: string[];
  omittedItems: { item: KnowledgeItem; reason: string }[];
  markdownOutput: string;
  jsonOutput: string;
}

export interface StorageStats {
  documentCount: number;
  knowledgeCount: number;
  relationshipCount: number;
  outcomeCount: number;
  estimatedBytes: number;
  isDemoStore: boolean;
}

export interface BundleSource {
  title: string;
  filename: string;
  kind: SourceDocumentKind;
  language: 'en' | 'fa';
  tags: string[];
  content: string;
  content_sha256: string;
}

export interface BundleKnowledgeItem {
  local_id: string;
  title: string;
  summary: string;
  body?: string;
  type: KnowledgeType;
  language: 'en' | 'fa';
  applicability?: string;
  exclusions?: string;
  requirements?: string[];
  evidence_level: 'theoretical' | 'tested' | 'production_proven';
  review_status: 'needs_review';
  source_excerpt: string;
}

export interface BundleRelationship {
  source_local_id: string;
  relationship_type: RelationshipType;
  target_local_id: string;
  notes?: string;
}

export interface WikiGraphBundle {
  schema_version: 'wikigraph.bundle/1';
  generated_at?: string;
  generator?: {
    tool: string;
    version: string;
  };
  source: BundleSource;
  collection_suggestion?: {
    name: string;
    name_fa?: string;
  };
  knowledge_items: BundleKnowledgeItem[];
  relationships?: BundleRelationship[];
}

export interface BundleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportBundleOptions {
  collectionId?: string;
  createCollection?: {
    name: string;
    name_fa?: string;
  };
  onDuplicate?: 'skip' | 'new_revision' | 'overwrite';
}

export interface ImportBundleResult {
  sourceId: string;
  createdItemIds: string[];
  createdRelationshipIds: string[];
  skipped?: boolean;
  isNewRevision?: boolean;
}

