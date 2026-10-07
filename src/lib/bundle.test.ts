import {
  validateBundle,
  normalizeForExcerptMatch,
  detectTextScript,
  computeSha256,
  SAMPLE_BUNDLE,
  SAMPLE_BUNDLE_FA,
} from './bundle';
import { MockKnowledgeRepository } from '../services/mockRepository';
import { WikiGraphBundle } from '../types';

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${message}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  console.log('\n--- Test Suite: Excerpt Normalization ---');
  {
    // NFKC, Arabic ي->ی, ك->ک, remove U+200B..U+200F, U+0640, U+FEFF, collapse whitespace, trim
    const raw = '  \uFEFFتست\u200Cکلمه\u064A\u0643   \u0640متن  \n \t جدید\u200D  ';
    const normalized = normalizeForExcerptMatch(raw);
    assert(normalized.includes('تست'), 'contains basic word');
    assert(!normalized.includes('\u064A'), 'Arabic yeh replaced');
    assert(!normalized.includes('\u0643'), 'Arabic kaf replaced');
    assert(!normalized.includes('\u0640'), 'tatweel removed');
    assert(!normalized.includes('\uFEFF'), 'BOM removed');
    assert(!normalized.includes('\u200C'), 'ZWNJ removed');
    assert(!normalized.includes('\u200D'), 'ZWJ removed');
    assert(normalized === 'تستکلمهیک متن جدید', `normalized correctly: got "${normalized}"`);
  }

  console.log('\n--- Test Suite: Script Detection ---');
  {
    const enText = 'This is completely English text with standard Latin characters.';
    const faText = 'این یک متن آزمایشی کاملاً فارسی است که برای پردازش زبان طبیعی استفاده می‌شود.';
    assert(!detectTextScript(enText).isPersianScript, 'English text detected as non-Persian');
    assert(detectTextScript(faText).isPersianScript, 'Persian text detected as Persian');
  }

  console.log('\n--- Test Suite: Built-in Sample Bundles ---');
  {
    const resEn = await validateBundle(SAMPLE_BUNDLE);
    assert(resEn.valid, 'SAMPLE_BUNDLE is valid');
    assert(resEn.errors.length === 0, 'SAMPLE_BUNDLE has 0 errors');
    assert(resEn.warnings.length === 0, 'SAMPLE_BUNDLE has 0 warnings');

    const resFa = await validateBundle(SAMPLE_BUNDLE_FA);
    assert(resFa.valid, 'SAMPLE_BUNDLE_FA is valid');
    assert(resFa.errors.length === 0, 'SAMPLE_BUNDLE_FA has 0 errors');
    assert(resFa.warnings.length === 0, 'SAMPLE_BUNDLE_FA has 0 warnings');
  }

  console.log('\n--- Test Suite: Schema Version Check ---');
  {
    const invalidVersion = { ...SAMPLE_BUNDLE, schema_version: 'wikigraph.bundle/2' };
    const res = await validateBundle(invalidVersion);
    assert(!res.valid, 'Invalid schema_version is marked invalid');
    assert(res.errors.some(e => e.includes('Invalid schema_version')), 'Error reported for wrong schema_version');
  }

  console.log('\n--- Test Suite: CRLF and BOM Detection ---');
  {
    const crlfContent = SAMPLE_BUNDLE.source.content.replace(/\n/g, '\r\n');
    const crlfBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      source: {
        ...SAMPLE_BUNDLE.source,
        content: crlfContent,
        content_sha256: await computeSha256(crlfContent),
      },
    };
    const resCrlf = await validateBundle(crlfBundle);
    assert(!resCrlf.valid, 'CRLF content fails validation');
    assert(resCrlf.errors.some(e => e.includes('LF-only')), 'Error reported for CRLF');

    const bomContent = '\uFEFF' + SAMPLE_BUNDLE.source.content;
    const bomBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      source: {
        ...SAMPLE_BUNDLE.source,
        content: bomContent,
        content_sha256: await computeSha256(bomContent),
      },
    };
    const resBom = await validateBundle(bomBundle);
    assert(!resBom.valid, 'BOM content fails validation');
    assert(resBom.errors.some(e => e.includes('BOM')), 'Error reported for BOM');
  }

  console.log('\n--- Test Suite: SHA-256 Checksum Verification ---');
  {
    const badShaBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      source: {
        ...SAMPLE_BUNDLE.source,
        content_sha256: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    };
    const resBadSha = await validateBundle(badShaBundle);
    assert(!resBadSha.valid, 'SHA mismatch fails validation');
    assert(resBadSha.errors.some(e => e.includes('SHA-256 mismatch')), 'Error reported for SHA mismatch');
  }

  console.log('\n--- Test Suite: Excerpt Matching and Length Limits ---');
  {
    // Missing excerpt in content
    const ungroundedItem = {
      ...SAMPLE_BUNDLE.knowledge_items[0],
      source_excerpt: 'This excerpt does not exist anywhere inside the source document content at all.',
    };
    const ungroundedBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      knowledge_items: [ungroundedItem],
    };
    const resUngrounded = await validateBundle(ungroundedBundle);
    assert(!resUngrounded.valid, 'Ungrounded excerpt fails validation');
    assert(resUngrounded.errors.some(e => e.includes('could not be found inside source.content')), 'Error reported for ungrounded excerpt');

    // Normalized excerpt match (Arabic characters in excerpt matched against Persian in source)
    const faExcerptNorm = SAMPLE_BUNDLE_FA.knowledge_items[0].source_excerpt
      .replace(/ی/g, 'ي') // Arabic yeh
      .replace(/ک/g, 'ك'); // Arabic kaf
    const faNormBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE_FA,
      knowledge_items: [
        {
          ...SAMPLE_BUNDLE_FA.knowledge_items[0],
          source_excerpt: faExcerptNorm,
        },
      ],
    };
    const resFaNorm = await validateBundle(faNormBundle);
    assert(resFaNorm.valid, 'Normalized excerpt with Arabic characters matches source content');

    // Excerpt length limits (<15 chars)
    const shortExcerptItem = {
      ...SAMPLE_BUNDLE.knowledge_items[0],
      source_excerpt: 'Too short',
    };
    const shortExcerptBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      knowledge_items: [shortExcerptItem],
    };
    const resShort = await validateBundle(shortExcerptBundle);
    assert(!resShort.valid, 'Short excerpt (<15 chars) fails validation');
    assert(resShort.errors.some(e => e.includes('between 15 and 1500 chars')), 'Error reported for short excerpt');
    assert(resShort.warnings.some(e => e.includes('shorter than 15 characters')), 'Warning reported for short excerpt');

    // Excerpt ellipsis warning
    const ellipsisExcerptItem = {
      ...SAMPLE_BUNDLE.knowledge_items[0],
      source_excerpt: 'Scalar quantization (SQ8) ... maps continuous 32-bit floating point vectors',
    };
    const ellipsisBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      knowledge_items: [ellipsisExcerptItem],
    };
    const resEllipsis = await validateBundle(ellipsisBundle);
    assert(resEllipsis.warnings.some(w => w.includes('ellipsis')), 'Warning reported for ellipsis in excerpt');
  }

  console.log('\n--- Test Suite: Local ID, Review Status, & Relationships ---');
  {
    // Duplicate local_id
    const dupLocalIdBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      knowledge_items: [
        SAMPLE_BUNDLE.knowledge_items[0],
        { ...SAMPLE_BUNDLE.knowledge_items[1], local_id: SAMPLE_BUNDLE.knowledge_items[0].local_id },
      ],
    };
    const resDup = await validateBundle(dupLocalIdBundle);
    assert(!resDup.valid, 'Duplicate local_id fails validation');
    assert(resDup.errors.some(e => e.includes('duplicate local_id')), 'Error reported for duplicate local_id');

    // review_status not 'needs_review'
    const wrongStatusBundle: any = {
      ...SAMPLE_BUNDLE,
      knowledge_items: [
        { ...SAMPLE_BUNDLE.knowledge_items[0], review_status: 'reviewed' },
      ],
    };
    const resStatus = await validateBundle(wrongStatusBundle);
    assert(!resStatus.valid, 'review_status != needs_review fails validation');
    assert(resStatus.errors.some(e => e.includes("review_status must be 'needs_review'")), 'Error reported for review_status');

    // Self-link relationship
    const selfLinkBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      relationships: [
        {
          source_local_id: SAMPLE_BUNDLE.knowledge_items[0].local_id,
          target_local_id: SAMPLE_BUNDLE.knowledge_items[0].local_id,
          relationship_type: 'supports',
        },
      ],
    };
    const resSelfLink = await validateBundle(selfLinkBundle);
    assert(!resSelfLink.valid, 'Self-link fails validation');
    assert(resSelfLink.errors.some(e => e.includes('self-link detected')), 'Error reported for self-link');

    // Unknown local_id in relationship
    const unknownRelBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      relationships: [
        {
          source_local_id: 'non-existent-id',
          target_local_id: SAMPLE_BUNDLE.knowledge_items[0].local_id,
          relationship_type: 'supports',
        },
      ],
    };
    const resUnknownRel = await validateBundle(unknownRelBundle);
    assert(!resUnknownRel.valid, 'Unknown local_id in relationship fails');
    assert(resUnknownRel.errors.some(e => e.includes('does not match any local_id')), 'Error reported for unknown relationship local_id');
  }

  console.log('\n--- Test Suite: Warnings (Evidence level, Language, Applicability) ---');
  {
    // Item language differs from source language
    const langDiffBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      knowledge_items: [
        { ...SAMPLE_BUNDLE.knowledge_items[0], language: 'fa' },
      ],
    };
    const resLangDiff = await validateBundle(langDiffBundle);
    assert(resLangDiff.warnings.some(w => w.includes('differs from source language')), 'Warning for mismatched item/source language');

    // Evidence level != theoretical
    const evidenceDiffBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      knowledge_items: [
        { ...SAMPLE_BUNDLE.knowledge_items[0], evidence_level: 'tested' },
      ],
    };
    const resEvidence = await validateBundle(evidenceDiffBundle);
    assert(resEvidence.warnings.some(w => w.includes('evidence_level is \'tested\'')), 'Warning for evidence level other than theoretical');

    // Missing applicability
    const noApplicabilityBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      knowledge_items: [
        { ...SAMPLE_BUNDLE.knowledge_items[0], applicability: '' },
      ],
    };
    const resApp = await validateBundle(noApplicabilityBundle);
    assert(resApp.warnings.some(w => w.includes('item has no applicability specified')), 'Warning for missing applicability');

    // Script vs source.language disagreement
    const disagreeScriptBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE_FA,
      source: {
        ...SAMPLE_BUNDLE_FA.source,
        language: 'en', // Marked 'en' but Persian text
      },
    };
    const resScriptDisagree = await validateBundle(disagreeScriptBundle);
    assert(resScriptDisagree.warnings.some(w => w.includes('source.language disagrees with the text')), 'Warning for script/language disagreement');
  }

  console.log('\n--- Test Suite: MockKnowledgeRepository importBundle Ingestion ---');
  {
    const repo = new MockKnowledgeRepository();
    // 1. Fresh import
    const importRes = await repo.importBundle(SAMPLE_BUNDLE);
    assert(!importRes.skipped, 'Fresh import is not skipped');
    assert(importRes.createdItemIds.length === SAMPLE_BUNDLE.knowledge_items.length, 'All knowledge items created');
    assert(importRes.createdRelationshipIds.length === (SAMPLE_BUNDLE.relationships?.length || 0), 'All relationships created');

    // Verify imported items have origin='bundle', reviewStatus='needs_review'
    const importedItem = await repo.getKnowledge(importRes.createdItemIds[0]);
    assert(importedItem !== null, 'Imported item retrieved from repo');
    assert(importedItem?.origin === 'bundle', 'Imported item has origin === "bundle"');
    assert(importedItem?.reviewStatus === 'needs_review', 'Imported item has reviewStatus === "needs_review"');

    // 2. Duplicate by hash -> skipped
    const dupRes = await repo.importBundle(SAMPLE_BUNDLE);
    assert(dupRes.skipped === true, 'Duplicate hash import is skipped');
    assert(dupRes.createdItemIds.length === 0, 'No new items created on duplicate skip');

    // 3. Same filename, different content/hash -> import as new revision
    const updatedContent = SAMPLE_BUNDLE.source.content + '\n# Additional Appendix Note on AVX-512\n';
    const updatedSha = await computeSha256(updatedContent);
    const updatedBundle: WikiGraphBundle = {
      ...SAMPLE_BUNDLE,
      source: {
        ...SAMPLE_BUNDLE.source,
        content: updatedContent,
        content_sha256: updatedSha,
      },
    };

    const newRevRes = await repo.importBundle(updatedBundle, { onDuplicate: 'new_revision' });
    assert(!newRevRes.skipped, 'New revision import is not skipped');
    assert(newRevRes.isNewRevision === true, 'Flagged as isNewRevision');

    // Verify old knowledge items had sourceHasChanged set to true
    const prevItem = await repo.getKnowledge(importRes.createdItemIds[0]);
    assert(prevItem?.sourceHasChanged === true, 'Existing items for this source marked with sourceHasChanged = true');
  }

  console.log(`\n========================================`);
  console.log(`Tests finished: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
