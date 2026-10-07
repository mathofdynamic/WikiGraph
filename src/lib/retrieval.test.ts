import {
  normalizeSearchText,
  extractKeywords,
  estimateTokens,
  executeRetrieval,
  formatContextMarkdown,
} from './retrieval';
import {
  KnowledgeItem,
  KnowledgeRelationship,
  SourceDocument,
  ContextRequest,
} from '../types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runRetrievalTests() {
  console.log('--- Test Suite: Retrieval Normalization & Keywords ---');
  {
    const norm = normalizeSearchText('استخراج يادداشت\u200Cهاي تكنيكال');
    assert(norm.includes('یادداشت'), 'Arabic yeh replaced with Persian yeh');
    assert(norm.includes('تکنیکال'), 'Arabic kaf replaced with Persian keheh');
    assert(!norm.includes('\u200C'), 'ZWNJ stripped from text');

    const keywords = extractKeywords('How to extract complex tables from research documents using python');
    assert(keywords.includes('extract'), 'Keyword extract preserved');
    assert(keywords.includes('complex'), 'Keyword complex preserved');
    assert(keywords.includes('tables'), 'Keyword tables preserved');
    assert(!keywords.includes('to'), 'English stop words omitted');
    assert(!keywords.includes('from'), 'English stop words omitted');
  }

  console.log('--- Test Suite: Token Estimation ---');
  {
    assert(estimateTokens(400) === 100, '400 characters is 100 tokens');
    assert(estimateTokens(401) === 101, '401 characters is 101 tokens (ceil)');
    assert(estimateTokens(0) === 1, 'Empty string is at least 1 token');
  }

  console.log('--- Test Suite: Deterministic Retrieval Engine ---');
  {
    const sampleItems: KnowledgeItem[] = [
      {
        id: 'k-1',
        title: 'Dual-Pass Bounding Box Alignment for Borderless Tables',
        summary: 'Extracts tables from documents using projection profiles.',
        body: 'Detailed procedure for tables...',
        type: 'procedure',
        collectionId: 'col-1',
        applicability: 'Complex borderless PDF tables and extraction',
        exclusions: 'Simple HTML tables',
        requirements: ['python', 'pdfplumber'],
        reviewStatus: 'reviewed',
        evidenceLevel: 'tested',
        language: 'en',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'k-2',
        title: 'Foundational Text Normalization',
        summary: 'Pre-requisite text cleaner before table extraction.',
        body: 'Text cleaning steps...',
        type: 'procedure',
        collectionId: 'col-1',
        applicability: 'All document pipelines',
        exclusions: '',
        requirements: ['python'],
        reviewStatus: 'reviewed',
        evidenceLevel: 'tested',
        language: 'en',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'k-3',
        title: 'Single-Pass Heuristic Table Detection',
        summary: 'Fast but conflicting alternative for tables.',
        body: 'Fast heuristic...',
        type: 'procedure',
        collectionId: 'col-1',
        applicability: 'Borderless PDF tables',
        exclusions: '',
        requirements: ['python'],
        reviewStatus: 'reviewed',
        evidenceLevel: 'tested',
        language: 'en',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'k-retired',
        title: 'Legacy Retired Table Parser',
        summary: 'Old table parser',
        body: 'Old body',
        type: 'procedure',
        collectionId: 'col-1',
        applicability: 'Tables',
        exclusions: '',
        requirements: [],
        reviewStatus: 'reviewed',
        status: 'retired',
        evidenceLevel: 'unverified',
        language: 'en',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'k-unreviewed',
        title: 'Draft Unreviewed Table Method',
        summary: 'Unreviewed table parser',
        body: 'Draft body',
        type: 'procedure',
        collectionId: 'col-1',
        applicability: 'Tables',
        exclusions: '',
        requirements: [],
        reviewStatus: 'needs_review',
        status: 'active',
        evidenceLevel: 'unverified',
        language: 'en',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      },
    ];

    const sampleRelationships: KnowledgeRelationship[] = [
      {
        id: 'rel-1',
        sourceId: 'k-2',
        targetId: 'k-1',
        relationshipType: 'prerequisite_for',
        notes: 'Text normalization must run before table alignment',
      },
      {
        id: 'rel-2',
        sourceId: 'k-1',
        targetId: 'k-3',
        relationshipType: 'conflicts_with',
        rationale: 'Dual-pass and single-pass approaches cannot be combined in the same pipeline',
      },
    ];

    const sampleSources: SourceDocument[] = [
      {
        id: 'src-1',
        title: 'Table Extraction in PDF Documents',
        filename: 'tables.md',
        originalContent: 'Sample source content',
        language: 'en',
        collectionId: 'col-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        revisions: [],
      },
    ];

    // Test 1: High-relevance query with automatic prerequisite and conflict detection
    const req1: ContextRequest = {
      task: 'Extract complex borderless tables using python',
      requirements: {
        tools: ['python', 'pdfplumber'],
        language: 'en',
      },
      maxTokens: 4000,
      includeUnreviewed: false,
    };

    const res1 = executeRetrieval(req1, {
      items: sampleItems,
      sources: sampleSources,
      relationships: sampleRelationships,
    });

    assert(res1.selected.length >= 2, 'Selected primary and prerequisite items');
    assert(res1.selected.some((s) => s.item.id === 'k-1' && s.role === 'primary'), 'k-1 is selected as primary');
    assert(res1.selected.some((s) => s.item.id === 'k-2' && s.role === 'prerequisite'), 'k-2 is pulled in as prerequisite');
    assert(res1.conflicts.length > 0, 'Conflicts are reported between k-1 and k-3 without silent tie breaking');
    assert(res1.excluded.some((e) => e.itemId === 'k-retired' && e.reason === 'retired'), 'Retired item listed in excluded');
    assert(res1.excluded.some((e) => e.itemId === 'k-unreviewed' && e.reason === 'unreviewed'), 'Unreviewed item excluded when flag is false');
    assert(res1.sufficiency === 'sufficient', 'Sufficiency is sufficient for well-matched query');

    // Test 2: Include unreviewed flag
    const req2: ContextRequest = {
      ...req1,
      includeUnreviewed: true,
    };
    const res2 = executeRetrieval(req2, {
      items: sampleItems,
      sources: sampleSources,
      relationships: sampleRelationships,
    });
    assert(!res2.excluded.some((e) => e.itemId === 'k-unreviewed' && e.reason === 'unreviewed'), 'Unreviewed item is not excluded when flag is true');

    // Test 3: Insufficient query (unrelated task)
    const req3: ContextRequest = {
      task: 'Quantum mechanics wave equation simulation',
      maxTokens: 4000,
    };
    const res3 = executeRetrieval(req3, {
      items: sampleItems,
      sources: sampleSources,
      relationships: sampleRelationships,
    });
    assert(res3.sufficiency === 'insufficient', 'Sufficiency is insufficient when scores are below threshold');
    assert(res3.sufficiencyNote.length > 0, 'Sufficiency note explains the gap plainly');

    // Test 4: Token Budget ceiling enforcement
    const req4: ContextRequest = {
      ...req1,
      maxTokens: 60, // very small budget
    };
    const res4 = executeRetrieval(req4, {
      items: sampleItems,
      sources: sampleSources,
      relationships: sampleRelationships,
    });
    assert(res4.excluded.some((e) => e.reason === 'over_budget'), 'Item exceeding token budget listed in excluded as over_budget');
    assert(res4.tokenEstimate.used <= 60, 'Used tokens strictly honors budget ceiling');

    // Test 5: AI-ready Markdown Packet generation
    const mdPacket = formatContextMarkdown(res1);
    assert(mdPacket.includes('# Technical Context Packet'), 'Contains context packet header');
    assert(mdPacket.includes('**Task:** Extract complex borderless tables using python'), 'Contains task line');
    assert(mdPacket.includes('AI INSTRUCTION'), 'Contains AI instruction directive');
    assert(mdPacket.includes('Dual-Pass Bounding Box Alignment for Borderless Tables'), 'Contains selected item title');
    assert(mdPacket.includes('Conflicts'), 'Contains Conflicts section');
  }

  console.log('========================================');
  console.log('All Retrieval Tests Passed Successfully!');
  console.log('========================================');
}

runRetrievalTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
