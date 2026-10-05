import {
  ApiKeyGrant,
  Collection,
  ContextAssemblyRequest,
  ContextAssemblyResult,
  KnowledgeFilter,
  KnowledgeItem,
  KnowledgeOutcome,
  KnowledgeRelationship,
  SourceDocument,
  StorageStats,
} from '../types';

export interface KnowledgeRepository {
  // Sources
  listSources(): Promise<SourceDocument[]>;
  getSource(id: string): Promise<SourceDocument | null>;
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
  getKnowledge(id: string): Promise<KnowledgeItem | null>;
  createKnowledge(
    item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<KnowledgeItem>;
  updateKnowledge(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem>;
  deleteKnowledge(id: string): Promise<void>;

  // Relationships
  listRelationships(): Promise<KnowledgeRelationship[]>;
  createRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship>;
  addRelationship(
    rel: Omit<KnowledgeRelationship, 'id' | 'createdAt'>
  ): Promise<KnowledgeRelationship>;
  deleteRelationship(id: string): Promise<void>;
  removeRelationship(id: string): Promise<void>;

  // Outcomes
  listOutcomes(knowledgeId?: string): Promise<KnowledgeOutcome[]>;
  createOutcome(
    outcome: Omit<KnowledgeOutcome, 'id' | 'recordedAt'>
  ): Promise<KnowledgeOutcome>;
  deleteOutcome(id: string): Promise<void>;

  // Collections
  listCollections(): Promise<Collection[]>;
  createCollection(col: Omit<Collection, 'id'>): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;

  // Scoped API Keys (Machine Connections)
  listApiKeys(): Promise<ApiKeyGrant[]>;
  createApiKey(data: {
    label: string;
    allowedCollections: string[];
    grants: ('search' | 'read' | 'compose')[];
    expiryDays: number;
  }): Promise<{ key: ApiKeyGrant; plainTextToken: string }>;
  revokeApiKey(id: string): Promise<void>;

  // Context Assembly
  assembleContext(req: ContextAssemblyRequest): Promise<ContextAssemblyResult>;

  // Demo store management / Backup
  getStorageStats(): Promise<StorageStats>;
  resetDemoStore(): Promise<void>;
  exportData(): Promise<string>;
  importData(jsonString: string): Promise<boolean>;
}
