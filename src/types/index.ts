export type KnowledgeType =
  | 'research_finding'
  | 'tip'
  | 'procedure'
  | 'skill'
  | 'example'
  | 'failure'
  | 'lesson';

export type ReviewStatus = 'draft' | 'reviewed' | 'deprecated';

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
  createdAt: string;
  updatedAt: string;
  url?: string;
  sourceUrl?: string;
  importedAt?: string;
  revisions: SourceRevision[];
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
  sourceId: string;
  sourceRevisionId: string;
  sourceExcerpt: string;
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
  createdAt: string;
  lastUsedAt?: string;
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
