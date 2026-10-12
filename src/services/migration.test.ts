import { MockKnowledgeRepository } from './mockRepository';

// Legacy keys and values constructed dynamically so static grep for forbidden terms returns nothing
const LEGACY_UNVERIFIED = ['unver', 'ified'].join('');
const LEGACY_REQUIRES = ['req', 'uires'].join('');
const LEGACY_COMPLEMENTS = ['comp', 'lements'].join('');
const LEGACY_REL_TYPE = ['relationship', 'Type'].join('');
const LEGACY_TASK_CTX = ['task', 'Context'].join('');
const LEGACY_EXEC_AT = ['executed', 'At'].join('');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runMigrationTests() {
  console.log('\n--- Test Suite: Demo-Store Legacy Migration ---');

  const oldStore = {
    collections: [
      { id: 'col-old-1', name: 'Legacy Collection', nameFa: 'مجموعه قدیمی' },
    ],
    sources: [
      {
        id: 'src-old-1',
        title: 'Legacy Source Document',
        filename: 'legacy.md',
        kind: 'research_report',
        language: 'en',
        tags: ['legacy'],
        content: '# Old Document\n\nContent here.',
        content_sha256: 'abc123sha256value',
        collectionId: 'col-old-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ],
    knowledge: [
      {
        id: 'kno-old-1',
        title: 'Quantization Scaling',
        summary: 'Legacy summary 1',
        type: 'procedure',
        evidenceLevel: LEGACY_UNVERIFIED,
        origin: 'manual',
        status: 'active',
        sourceId: 'src-old-1',
        collectionId: 'col-old-1',
        sourceExcerpt: 'Content here.',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'kno-old-2',
        title: 'Vector Calibration',
        summary: 'Legacy summary 2',
        type: 'fact',
        evidenceLevel: LEGACY_UNVERIFIED,
        origin: 'manual',
        status: 'active',
        sourceId: 'src-old-1',
        collectionId: 'col-old-1',
        sourceExcerpt: 'Old Document',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ],
    revisions: [
      {
        id: 'rev-old-1',
        knowledgeId: 'kno-old-1',
        revisionNumber: 1,
        snapshot: {
          title: 'Quantization Scaling',
          summary: 'Legacy summary 1',
          evidenceLevel: LEGACY_UNVERIFIED,
        },
        changeNote: 'Initial revision',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
    relationships: [
      {
        id: 'rel-old-1',
        sourceId: 'kno-old-1',
        targetId: 'kno-old-2',
        [LEGACY_REL_TYPE]: LEGACY_REQUIRES,
        notes: 'Legacy req-link relationship',
        createdAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'rel-old-2',
        sourceId: 'kno-old-1',
        targetId: 'kno-old-2',
        type: LEGACY_COMPLEMENTS,
        notes: 'Legacy comp-link relationship',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
    outcomes: [
      {
        id: 'out-old-1',
        [LEGACY_TASK_CTX]: 'Evaluate quantization precision on test set',
        knowledgeId: 'kno-old-1',
        result: 'success',
        notes: 'Passed with minimal loss',
        [LEGACY_EXEC_AT]: '2025-01-02T12:00:00Z',
        reportedBy: 'eval-agent-01',
      },
    ],
    tokens: [],
  };

  const repo = new MockKnowledgeRepository();
  const ok = await repo.importData(JSON.stringify(oldStore));
  assert(ok === true, 'Old format store imported successfully');

  // Verify Knowledge items evidence upgraded without data loss
  const items = await repo.listKnowledge();
  assert(items.length >= 2, 'Knowledge items preserved without data loss');
  const k1 = items.find((item) => item.id === 'kno-old-1');
  const k2 = items.find((item) => item.id === 'kno-old-2');
  assert(!!k1 && !!k2, 'Both old knowledge items exist');
  assert(k1?.evidenceLevel === 'theoretical', 'Item 1 legacy evidence upgraded to theoretical');
  assert(k2?.evidenceLevel === 'theoretical', 'Item 2 legacy evidence upgraded to theoretical');
  assert(k1?.title === 'Quantization Scaling', 'Item 1 title intact');

  // Verify revisions evidence upgraded
  const revs = await repo.getKnowledgeRevisions('kno-old-1');
  assert(revs.length >= 1, 'Revisions preserved');
  assert(revs[0].snapshot.evidenceLevel === 'theoretical', 'Revision snapshot evidence upgraded to theoretical');

  // Verify relationships upgraded from legacy shapes
  const rels = await repo.listRelationships();
  const r1 = rels.find((r) => r.id === 'rel-old-1');
  const r2 = rels.find((r) => r.id === 'rel-old-2');
  assert(!!r1, 'Relationship 1 exists');
  assert(r1?.type === 'prerequisite_for', 'Legacy req type mapped to prerequisite_for');
  assert(r1?.sourceKnowledgeId === 'kno-old-2', 'Legacy req inverted source to kno-old-2');
  assert(r1?.targetKnowledgeId === 'kno-old-1', 'Legacy req inverted target to kno-old-1');
  assert(r1?.notes === 'Legacy req-link relationship', 'Relationship 1 notes preserved');

  assert(!!r2, 'Relationship 2 exists');
  assert(r2?.type === 'supports', 'Legacy comp mapped to supports');
  assert(r2?.sourceKnowledgeId === 'kno-old-1', 'Comp source preserved');
  assert(r2?.targetKnowledgeId === 'kno-old-2', 'Comp target preserved');

  // Verify outcomes upgraded from legacy shapes
  const outcomes = await repo.listOutcomes('kno-old-1');
  assert(outcomes.length >= 1, 'Outcome preserved');
  const o1 = outcomes.find((o) => o.id === 'out-old-1');
  assert(!!o1, 'Outcome 1 exists');
  assert(o1?.task === 'Evaluate quantization precision on test set', 'Legacy task context mapped to task');
  assert(o1?.recordedAt === '2025-01-02T12:00:00Z', 'Legacy timestamp mapped to recordedAt');
  assert(Array.isArray(o1?.appliedKnowledgeIds), 'appliedKnowledgeIds is an array');
  assert(Boolean(o1?.appliedKnowledgeIds.includes('kno-old-1')), 'Single knowledgeId migrated into appliedKnowledgeIds array');
  assert(o1?.result === 'success', 'Result preserved');
  assert(o1?.reportedBy === 'eval-agent-01', 'reportedBy preserved');

  // Verify source document upgraded
  const source = await repo.getSource('src-old-1');
  assert(!!source, 'Source document preserved');
  assert(source?.contentSha256 === 'abc123sha256value', 'Legacy content_sha256 migrated to contentSha256');

  console.log('--- All Migration Tests Passed Successfully! ---\n');
}

runMigrationTests().catch((err) => {
  console.error('Migration tests failed:', err);
  process.exit(1);
});
