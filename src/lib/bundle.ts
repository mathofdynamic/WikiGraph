import {
  BundleKnowledgeItem,
  BundleRelationship,
  BundleSource,
  BundleValidationResult,
  WikiGraphBundle,
} from '../types';

/**
 * Computes hexadecimal SHA-256 checksum of UTF-8 string using Web Crypto API.
 */
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Excerpt matching normalized comparison:
 * - Unicode NFKC normalization
 * - Map Arabic ي (\u064A) -> Persian ی (\u06CC)
 * - Map Arabic ك (\u0643) -> Persian ک (\u06A9)
 * - Remove U+200B..U+200F (zero-width spaces/joiners), U+0640 (tatweel), U+FEFF (BOM)
 * - Collapse whitespace (\s+ -> ' ')
 * - Trim
 */
export function normalizeForExcerptMatch(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .replace(/\u064A/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/[\u200B-\u200F\u0640\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether text contains significant Arabic/Persian letters (> 30% of total letters).
 */
export function detectTextScript(text: string): { isPersianScript: boolean; ratio: number } {
  const allLetters = text.match(/\p{L}/gu);
  if (!allLetters || allLetters.length === 0) {
    return { isPersianScript: false, ratio: 0 };
  }

  // Count letters in the Arabic/Persian Unicode block
  const apLetters = allLetters.filter((ch) =>
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch)
  );
  const ratio = apLetters.length / allLetters.length;
  return {
    isPersianScript: ratio > 0.3,
    ratio,
  };
}

const VALID_KINDS = ['research_report', 'skill', 'note'] as const;
const VALID_TYPES = [
  'procedure',
  'research_finding',
  'tip',
  'skill',
  'example',
  'failure',
  'lesson',
] as const;
const VALID_EVIDENCE = ['theoretical', 'tested', 'production_proven'] as const;
const VALID_RELATIONSHIPS = [
  'supports',
  'conflicts_with',
  'prerequisite_for',
  'derived_from',
  'supersedes',
  'relates_to',
] as const;
const LOCAL_ID_REGEX = /^[a-z0-9_-]{1,40}$/;

/**
 * Pure validation function for WikiGraph bundle according to wikigraph.bundle/1 specification.
 */
export async function validateBundle(raw: unknown): Promise<BundleValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      valid: false,
      errors: ['Bundle root must be a valid JSON object.'],
      warnings: [],
    };
  }

  const bundle = raw as Partial<WikiGraphBundle>;

  // 1. Schema Version Check
  if (bundle.schema_version !== 'wikigraph.bundle/1') {
    errors.push(
      `Invalid schema_version: expected 'wikigraph.bundle/1', found '${bundle.schema_version || 'missing'}'.`
    );
  }

  // 2. Source Validation
  if (!bundle.source || typeof bundle.source !== 'object') {
    errors.push("Missing required 'source' object.");
  } else {
    const src = bundle.source;

    if (!src.title || typeof src.title !== 'string' || !src.title.trim()) {
      errors.push("Missing or empty required field 'source.title'.");
    }
    if (!src.filename || typeof src.filename !== 'string' || !src.filename.trim()) {
      errors.push("Missing or empty required field 'source.filename'.");
    }
    if (!src.kind || !VALID_KINDS.includes(src.kind as any)) {
      errors.push(
        `Invalid 'source.kind': expected one of [${VALID_KINDS.join(', ')}], found '${src.kind}'.`
      );
    }
    if (src.language !== 'en' && src.language !== 'fa') {
      errors.push(`Invalid 'source.language': must be 'en' or 'fa', found '${src.language}'.`);
    }
    if (!Array.isArray(src.tags)) {
      errors.push("Field 'source.tags' must be an array of strings.");
    }
    if (typeof src.content !== 'string') {
      errors.push("Missing or invalid 'source.content': must be a string.");
    } else {
      // LF-only and BOM check
      if (src.content.includes('\r')) {
        errors.push("Source content must use LF-only line endings (no CR/CRLF allowed).");
      }
      if (src.content.startsWith('\uFEFF')) {
        errors.push("Source content must not contain a Byte Order Mark (BOM).");
      }

      // SHA-256 verification
      if (!src.content_sha256 || typeof src.content_sha256 !== 'string') {
        errors.push("Missing required field 'source.content_sha256'.");
      } else {
        const expectedSha = src.content_sha256.toLowerCase().trim();
        const actualSha = await computeSha256(src.content);
        if (actualSha !== expectedSha) {
          errors.push(
            `SHA-256 mismatch for source.content: expected '${expectedSha}', computed '${actualSha}'.`
          );
        }
      }

      // Language / script check warning (more than 30% of letters in the Arabic/Persian Unicode block means 'fa')
      if (src.language === 'en' || src.language === 'fa') {
        const scriptDetection = detectTextScript(src.content);
        if (scriptDetection.isPersianScript && src.language !== 'fa') {
          warnings.push(
            `source.language disagrees with the text: marked as '${src.language}', but more than 30% of letters are in the Arabic/Persian Unicode block (${Math.round(scriptDetection.ratio * 100)}%).`
          );
        } else if (!scriptDetection.isPersianScript && src.language === 'fa') {
          warnings.push(
            `source.language disagrees with the text: marked as 'fa', but 30% or fewer letters are in the Arabic/Persian Unicode block (${Math.round(scriptDetection.ratio * 100)}%).`
          );
        }
      }
    }
  }

  // 3. Knowledge Items Validation
  const localIdSet = new Set<string>();
  const titlesSet = new Set<string>();
  const excerptsSet = new Set<string>();

  const normalizedSourceContent =
    bundle.source && typeof bundle.source.content === 'string'
      ? normalizeForExcerptMatch(bundle.source.content)
      : '';

  if (!Array.isArray(bundle.knowledge_items)) {
    errors.push("Field 'knowledge_items' must be an array.");
  } else {
    if (bundle.knowledge_items.length > 60) {
      warnings.push(
        `Bundle contains ${bundle.knowledge_items.length} knowledge items. High counts (>60) may degrade review experience.`
      );
    }

    bundle.knowledge_items.forEach((item, index) => {
      const itemPrefix = `knowledge_items[${index}]`;

      if (!item || typeof item !== 'object') {
        errors.push(`${itemPrefix}: must be a valid object.`);
        return;
      }

      // local_id check
      if (!item.local_id || typeof item.local_id !== 'string') {
        errors.push(`${itemPrefix}: missing 'local_id'.`);
      } else if (!LOCAL_ID_REGEX.test(item.local_id)) {
        errors.push(
          `${itemPrefix}: invalid 'local_id' '${item.local_id}'. Must match /^[a-z0-9_-]{1,40}$/.`
        );
      } else if (localIdSet.has(item.local_id)) {
        errors.push(`${itemPrefix}: duplicate local_id '${item.local_id}'.`);
      } else {
        localIdSet.add(item.local_id);
      }

      // Title check
      if (!item.title || typeof item.title !== 'string') {
        errors.push(`${itemPrefix}: missing required 'title'.`);
      } else {
        if (item.title.length > 120) {
          errors.push(
            `${itemPrefix} ('${item.local_id || index}'): title exceeds 120 characters (${item.title.length}).`
          );
        }
        if (titlesSet.has(item.title.toLowerCase().trim())) {
          warnings.push(
            `${itemPrefix} ('${item.local_id || index}'): duplicate title '${item.title}' found in bundle.`
          );
        } else {
          titlesSet.add(item.title.toLowerCase().trim());
        }
      }

      // Summary check
      if (!item.summary || typeof item.summary !== 'string') {
        errors.push(`${itemPrefix}: missing required 'summary'.`);
      } else if (item.summary.length > 400) {
        errors.push(
          `${itemPrefix} ('${item.local_id || index}'): summary exceeds 400 characters (${item.summary.length}).`
        );
      }

      // Body check
      if (item.body !== undefined && item.body !== null) {
        if (typeof item.body !== 'string') {
          errors.push(`${itemPrefix}: 'body' must be a string.`);
        } else if (item.body.length > 4000) {
          errors.push(
            `${itemPrefix} ('${item.local_id || index}'): body exceeds 4000 characters (${item.body.length}).`
          );
        }
      }

      // Type check
      if (!item.type || !VALID_TYPES.includes(item.type as any)) {
        errors.push(
          `${itemPrefix} ('${item.local_id || index}'): invalid type '${item.type}'. Expected one of [${VALID_TYPES.join(', ')}].`
        );
      }

      // Language check
      if (item.language !== 'en' && item.language !== 'fa') {
        errors.push(
          `${itemPrefix} ('${item.local_id || index}'): invalid language '${item.language}'. Must be 'en' or 'fa'.`
        );
      } else if (bundle.source && bundle.source.language && item.language !== bundle.source.language) {
        warnings.push(
          `${itemPrefix} ('${item.local_id || index}'): item language '${item.language}' differs from source language '${bundle.source.language}'.`
        );
      }

      // Review Status check
      if (item.review_status !== 'needs_review') {
        errors.push(
          `${itemPrefix} ('${item.local_id || index}'): review_status must be 'needs_review', found '${item.review_status}'.`
        );
      }

      // Evidence Level check
      if (!item.evidence_level || !VALID_EVIDENCE.includes(item.evidence_level as any)) {
        errors.push(
          `${itemPrefix} ('${item.local_id || index}'): invalid evidence_level '${item.evidence_level}'. Expected one of [${VALID_EVIDENCE.join(', ')}].`
        );
      } else if (item.evidence_level !== 'theoretical') {
        warnings.push(
          `${itemPrefix} ('${item.local_id || index}'): evidence_level is '${item.evidence_level}' (bundle defaults typically expect 'theoretical' prior to review).`
        );
      }

      // Applicability check
      if (item.applicability !== undefined && item.applicability !== null) {
        if (typeof item.applicability !== 'string') {
          errors.push(`${itemPrefix}: applicability must be a string.`);
        } else if (item.applicability.length > 600) {
          errors.push(
            `${itemPrefix} ('${item.local_id || index}'): applicability exceeds 600 characters (${item.applicability.length}).`
          );
        }
      }
      if (!item.applicability || !item.applicability.trim()) {
        warnings.push(
          `${itemPrefix} ('${item.local_id || index}'): item has no applicability specified.`
        );
      }

      // Exclusions check
      if (item.exclusions !== undefined && item.exclusions !== null) {
        if (typeof item.exclusions !== 'string') {
          errors.push(`${itemPrefix}: exclusions must be a string.`);
        } else if (item.exclusions.length > 600) {
          errors.push(
            `${itemPrefix} ('${item.local_id || index}'): exclusions exceeds 600 characters (${item.exclusions.length}).`
          );
        }
      }

      // Requirements check
      if (item.requirements !== undefined && item.requirements !== null) {
        if (!Array.isArray(item.requirements)) {
          errors.push(`${itemPrefix}: requirements must be an array of strings.`);
        } else {
          item.requirements.forEach((req, rIdx) => {
            if (typeof req !== 'string') {
              errors.push(`${itemPrefix}: requirements[${rIdx}] must be a string.`);
            } else if (req.length > 200) {
              errors.push(
                `${itemPrefix}: requirement '${req.slice(0, 30)}...' exceeds 200 characters (${req.length}).`
              );
            }
          });
        }
      }

      // Source Excerpt check
      if (!item.source_excerpt || typeof item.source_excerpt !== 'string') {
        errors.push(`${itemPrefix} ('${item.local_id || index}'): missing required 'source_excerpt'.`);
      } else {
        const excerptLen = item.source_excerpt.length;
        if (excerptLen < 15 || excerptLen > 1500) {
          errors.push(
            `${itemPrefix} ('${item.local_id || index}'): source_excerpt length must be between 15 and 1500 chars (found ${excerptLen}).`
          );
        }
        if (excerptLen < 15) {
          warnings.push(
            `${itemPrefix} ('${item.local_id || index}'): source_excerpt is shorter than 15 characters (${excerptLen}).`
          );
        }

        if (item.source_excerpt.includes('...') || item.source_excerpt.includes('…')) {
          warnings.push(
            `${itemPrefix} ('${item.local_id || index}'): source_excerpt contains ellipsis ('...' or '…'), which may indicate incomplete grounding.`
          );
        }

        const normExcerpt = normalizeForExcerptMatch(item.source_excerpt);
        if (excerptsSet.has(normExcerpt)) {
          warnings.push(
            `${itemPrefix} ('${item.local_id || index}'): identical excerpt used by another item in this bundle.`
          );
        } else {
          excerptsSet.add(normExcerpt);
        }

        // Substring check in normalized source content
        if (normalizedSourceContent) {
          if (!normalizedSourceContent.includes(normExcerpt)) {
            errors.push(
              `${itemPrefix} ('${item.local_id || index}'): source_excerpt could not be found inside source.content.`
            );
          }
        }
      }
    });
  }

  // 4. Relationships Validation
  if (bundle.relationships !== undefined && bundle.relationships !== null) {
    if (!Array.isArray(bundle.relationships)) {
      errors.push("Field 'relationships' must be an array.");
    } else {
      bundle.relationships.forEach((rel, rIdx) => {
        const relPrefix = `relationships[${rIdx}]`;
        if (!rel || typeof rel !== 'object') {
          errors.push(`${relPrefix}: must be a valid object.`);
          return;
        }

        if (!rel.source_local_id || !localIdSet.has(rel.source_local_id)) {
          errors.push(
            `${relPrefix}: source_local_id '${rel.source_local_id}' does not match any local_id in knowledge_items.`
          );
        }
        if (!rel.target_local_id || !localIdSet.has(rel.target_local_id)) {
          errors.push(
            `${relPrefix}: target_local_id '${rel.target_local_id}' does not match any local_id in knowledge_items.`
          );
        }
        if (rel.source_local_id === rel.target_local_id) {
          errors.push(
            `${relPrefix}: self-link detected; source_local_id cannot equal target_local_id ('${rel.source_local_id}').`
          );
        }
        if (!rel.relationship_type || !VALID_RELATIONSHIPS.includes(rel.relationship_type as any)) {
          errors.push(
            `${relPrefix}: invalid relationship_type '${rel.relationship_type}'. Expected one of [${VALID_RELATIONSHIPS.join(', ')}].`
          );
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Built-in valid sample bundle for interactive test bench.
 */
export const SAMPLE_BUNDLE_CONTENT = `# High-Throughput Token Extraction with Scalar Quantization

Modern semantic search engines face a severe memory bottleneck when storing billions of dense embedding vectors.
Scalar quantization (SQ8) maps continuous 32-bit floating point vectors into discrete 8-bit integers using uniform histogram calibration.
This reduces vector storage memory by exactly 75% while maintaining over 98.4% top-10 retrieval recall across MTEB benchmarks.

However, naive uniform quantization degrades sharply when embedding dimensions contain extreme outlier coordinates.
To prevent recall collapse, production engines must clip the upper and lower 0.05 percentiles prior to calculating the quantization scale factor.
`;

// Compute SHA-256 for sample content:
// LF line endings:
// "a3e9c70c0c66d3a9561b369cffbf325d97bfbc1f6004b39b0336aeeb27ea19c3"
export const SAMPLE_BUNDLE: WikiGraphBundle = {
  schema_version: 'wikigraph.bundle/1',
  generated_at: '2026-10-06T10:00:00Z',
  generator: {
    tool: 'wikigraph-ai-distiller',
    version: '1.4.0',
  },
  source: {
    title: 'High-Throughput Token Extraction with Scalar Quantization',
    filename: 'scalar_quantization_guide.md',
    kind: 'research_report',
    language: 'en',
    tags: ['vector-search', 'scalar-quantization', 'performance'],
    content: SAMPLE_BUNDLE_CONTENT,
    content_sha256: '7b7d7738bc6c8858e45a98b2ce0de570b13c7799b3c41eb446ef144a70911645',
  },
  collection_suggestion: {
    name: 'Vector Database Optimizations',
    name_fa: 'بهینه‌سازی پایگاه‌های داده برداری',
  },
  knowledge_items: [
    {
      local_id: 'sq8-memory-reduction',
      title: '75% Memory Reduction via Uniform SQ8 Quantization',
      summary:
        'Mapping continuous 32-bit floats to 8-bit integers compresses vector indices four-fold while preserving 98.4% top-10 recall.',
      body:
        'Apply SQ8 quantization across normalized unit vectors. Scale factors are calculated per dimension or per vector using symmetric min/max normalization.',
      type: 'research_finding',
      language: 'en',
      applicability: 'Dense vector retrieval systems indexing more than 10 million vectors under tight RAM budgets.',
      exclusions: 'Small collections (<100,000 vectors) where unquantized FP32 easily fits into host memory.',
      requirements: ['AVX-512 or NEON SIMD vector instruction support'],
      evidence_level: 'theoretical',
      review_status: 'needs_review',
      source_excerpt:
        'Scalar quantization (SQ8) maps continuous 32-bit floating point vectors into discrete 8-bit integers using uniform histogram calibration.\nThis reduces vector storage memory by exactly 75% while maintaining over 98.4% top-10 retrieval recall across MTEB benchmarks.',
    },
    {
      local_id: 'percentile-clipping-calibration',
      title: 'Outlier Coordinate Percentile Clipping for Quantization Calibration',
      summary:
        'Clipping the upper and lower 0.05 percentiles prevents extreme outliers from collapsing quantization bucket resolution.',
      body:
        '1. Collect coordinate value distributions over a 50,000 vector sample.\n2. Determine 0.05% and 99.95% quantiles.\n3. Clamp vector coordinates outside this window before calculating the uniform bucket width.',
      type: 'procedure',
      language: 'en',
      applicability: 'All transformer-based embeddings with non-uniform anisotropic coordinate tails.',
      exclusions: 'Already normalized binary vectors or sparse BM25 indices.',
      requirements: ['Offline calibration sample of at least 50k vectors'],
      evidence_level: 'theoretical',
      review_status: 'needs_review',
      source_excerpt:
        'To prevent recall collapse, production engines must clip the upper and lower 0.05 percentiles prior to calculating the quantization scale factor.',
    },
  ],
  relationships: [
    {
      source_local_id: 'percentile-clipping-calibration',
      relationship_type: 'prerequisite_for',
      target_local_id: 'sq8-memory-reduction',
      notes: 'Calibration clipping must precede uniform quantization to avoid bucket compression.',
    },
  ],
};

export const SAMPLE_BUNDLE_FA_CONTENT = `# راهنمای استخراج ساختاریافته متن و تقطیع جملات فارسی

در پردازش زبان طبیعی فارسی، نشانه‌گذاری انتهای جملات به دلیل استفاده مشترک از نقطه در علائم اختصاری با چالش مواجه می‌شود.
استفاده از عبارت‌های منظم مبتنی بر مرز کلمات و نیم‌فاصله امکان شناسایی دقیق پایان جملات را با دقت ۹۶.۸ درصد فراهم می‌کند.
`;

export const SAMPLE_BUNDLE_FA: WikiGraphBundle = {
  schema_version: 'wikigraph.bundle/1',
  generated_at: '2026-10-06T10:00:00Z',
  generator: {
    tool: 'wikigraph-ai-distiller',
    version: '1.4.0',
  },
  source: {
    title: 'راهنمای استخراج ساختاریافته متن و تقطیع جملات فارسی',
    filename: 'persian_sentence_segmentation.md',
    kind: 'skill',
    language: 'fa',
    tags: ['nlp', 'persian', 'tokenization'],
    content: SAMPLE_BUNDLE_FA_CONTENT,
    content_sha256: '80e18e2d067a54722eed70297e285582b4b2b5ff7a3ede75a02cabd861694369',
  },
  collection_suggestion: {
    name: 'Bilingual NLP & Persian Localization',
    name_fa: 'پردازش زبان طبیعی فارسی و محلی‌سازی',
  },
  knowledge_items: [
    {
      local_id: 'fa-sentence-boundary-detection',
      title: 'تقطیع دقیق جملات در متون فارسی با تحلیل نیم‌فاصله و علائم اختصاری',
      summary:
        'به‌کارگیری مرزهای عبارات منظم هماهنگ با نویسه‌های نیم‌فاصله درصد خطای تفکیک جملات را به زیر ۳.۲ درصد کاهش می‌دهد.',
      body:
        '۱. پیش‌پردازش و یکپارچه‌سازی حروف ی و ک عربی به فارسی.\n۲. تفکیک اختصارات رایج نظیر «ص.» یا «ق.ظ» قبل از اعمال نقطه پایانی.\n۳. برش رشته در مرزهای مشخص‌شده.',
      type: 'procedure',
      language: 'fa',
      applicability: 'سامانه‌های تولید بردار و قطعه‌بندی اسناد در زبان فارسی.',
      exclusions: 'متون غیررسمی شبکه‌های اجتماعی بدون رعایت علائم نگارشی.',
      requirements: ['پشتیبانی از کتابخانه عبارت‌های منظم یونیکد'],
      evidence_level: 'theoretical',
      review_status: 'needs_review',
      source_excerpt:
        'استفاده از عبارت‌های منظم مبتنی بر مرز کلمات و نیم‌فاصله امکان شناسایی دقیق پایان جملات را با دقت ۹۶.۸ درصد فراهم می‌کند.',
    },
  ],
};
