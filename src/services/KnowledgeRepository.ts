import {
  ApiToken,
  AuthLoginRequest,
  AuthLoginResponse,
  AuthSessionResponse,
  Collection,
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  KnowledgeFilter,
  KnowledgeItem,
  KnowledgeOutcome,
  KnowledgeRelationship,
  KnowledgeRevision,
  SourceDocument,
  SourceRevision,
  StorageStats,
  WikiGraphBundle,
  ImportBundleOptions,
  ImportBundleResult,
  ContextRequest,
  ContextResult,
  PaginatedKnowledgeRequest,
  PaginatedKnowledgeResponse,
  SearchKnowledgeRequest,
  SearchKnowledgeResponse,
} from '../types';

export interface KnowledgeRepository {
  // Auth (single owner)
  login(password: string): Promise<AuthLoginResponse>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSessionResponse>;

  // Sources
  listSources(): Promise<SourceDocument[]>;
  getSource(id: string): Promise<SourceDocument | null>;
  getSourceRevisions(sourceId: string): Promise<SourceRevision[]>;
  createSource(
    source: Omit<SourceDocument, 'id' | 'createdAt' | 'updatedAt' | 'revisions'> & {
      initialRevisionSummary?: string;
    }
  ): Promise<SourceDocument>;
  updateSource(
    id: string,
    updates: Partial<SourceDocument>,
    newContent?: string,
    changeSummary?: string
  ): Promise<SourceDocument>;
  deleteSource(id: string): Promise<void>;

  // Knowledge Items
  listKnowledge(filters?: KnowledgeFilter): Promise<KnowledgeItem[]>;
  listKnowledgePaginated(params?: PaginatedKnowledgeRequest): Promise<PaginatedKnowledgeResponse>;
  searchKnowledge(params: SearchKnowledgeRequest): Promise<SearchKnowledgeResponse>;
  getKnowledge(id: string): Promise<KnowledgeItem | null>;
  createKnowledge(
    item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>,
    changeNote?: string
  ): Promise<KnowledgeItem>;
  updateKnowledge(
    id: string,
    updates: Partial<KnowledgeItem>,
    changeNote?: string
  ): Promise<KnowledgeItem>;
  retireKnowledge(id: string, changeNote?: string): Promise<KnowledgeItem>;
  restoreKnowledge(id: string, changeNote?: string): Promise<KnowledgeItem>;

  // Knowledge Revisions (Edit History)
  getKnowledgeRevisions(knowledgeId: string): Promise<KnowledgeRevision[]>;
  restoreKnowledgeRevision(
    knowledgeId: string,
    revisionId: string,
    changeNote?: string
  ): Promise<KnowledgeItem>;

  // Relationships
  listRelationships(knowledgeId?: string): Promise<KnowledgeRelationship[]>;
  createRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship>;
  updateRelationship(
    id: string,
    updates: Partial<KnowledgeRelationship>
  ): Promise<KnowledgeRelationship>;
  deleteRelationship(id: string): Promise<void>;

  // Outcomes
  listOutcomes(knowledgeId?: string): Promise<KnowledgeOutcome[]>;
  createOutcome(
    outcome: Omit<KnowledgeOutcome, 'id' | 'recordedAt'>
  ): Promise<KnowledgeOutcome>;
  deleteOutcome(id: string): Promise<void>;

  // Collections
  listCollections(): Promise<Collection[]>;
  getCollection(idOrSlug: string): Promise<Collection | null>;
  createCollection(col: Omit<Collection, 'id'>): Promise<Collection>;
  deleteCollection(id: string, targetCollectionIdForMove?: string): Promise<void>;
  moveCollectionItems(fromCollectionId: string, toCollectionId: string): Promise<void>;

  // API Tokens (External AI Tools & CLI Access)
  listTokens(): Promise<ApiToken[]>;
  createToken(data: CreateApiTokenRequest): Promise<CreateApiTokenResponse>;
  deleteToken(id: string): Promise<void>;

  // Retrieval Contract
  buildContext(request: ContextRequest): Promise<ContextResult>;

  // Demo store management / Backup
  getStorageStats(): Promise<StorageStats>;
  resetDemoStore(): Promise<void>;
  exportData(): Promise<string>;
  importData(jsonString: string): Promise<boolean>;

  // Bundle Ingestion
  importBundle(bundle: WikiGraphBundle, options?: ImportBundleOptions): Promise<ImportBundleResult>;
}
