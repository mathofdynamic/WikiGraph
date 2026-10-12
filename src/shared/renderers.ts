import { Collection, KnowledgeItem, SourceDocument } from '../types';

/**
 * Estimates token count from character length (~4 characters per token).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Renders a knowledge item as a compact, citation-ready Markdown document for AI agents.
 * Strict, token-efficient, zero-fluff layout.
 */
export function renderKnowledgeMarkdown(
  item: KnowledgeItem,
  options?: {
    sourceTitle?: string;
    sourceFilename?: string;
    collectionName?: string;
  }
): string {
  const slug = item.slug || item.id;
  const sourceRef = options?.sourceFilename || options?.sourceTitle || item.sourceId || 'unlinked';

  const sections: string[] = [
    `# ${item.title}`,
    `> slug: ${slug} | type: ${item.type} | evidence: ${item.evidenceLevel} | lang: ${item.language}`,
    item.sourceExcerpt
      ? `> source: ${sourceRef} | excerpt: "${item.sourceExcerpt.replace(/\n+/g, ' ').trim()}"`
      : `> source: ${sourceRef}`,
    ``,
    `## Summary`,
    item.summary.trim(),
    ``,
    `## Applicability`,
    item.applicability ? item.applicability.trim() : 'General applicability across supported environments.',
    ``,
    `## Exclusions`,
    item.exclusions ? item.exclusions.trim() : 'None specified.',
    ``,
    `## Requirements`,
    item.requirements && item.requirements.length > 0
      ? item.requirements.map((r) => `- ${r.trim()}`).join('\n')
      : 'No prerequisite tools or flags required.',
    ``,
    `## Details`,
    item.body ? item.body.trim() : '',
  ];

  return sections.join('\n');
}

/**
 * Renders a source document as Markdown for agents, including its metadata and extracted entries.
 */
export function renderSourceMarkdown(
  source: SourceDocument,
  extractedItems: KnowledgeItem[] = []
): string {
  const slug = source.slug || source.id;
  const sections: string[] = [
    `# ${source.title}`,
    `> slug: ${slug} | file: ${source.filename} | kind: ${source.kind || 'research_report'} | lang: ${source.language}`,
    source.contentSha256 ? `> sha256: ${source.contentSha256}` : '',
    ``,
    `## Source Text`,
    source.originalContent.trim(),
    ``,
  ];

  if (extractedItems.length > 0) {
    sections.push(`## Extracted Entries (${extractedItems.length})`);
    extractedItems.forEach((it) => {
      const itSlug = it.slug || it.id;
      sections.push(`- **[${itSlug}] ${it.title}** (${it.type}, ${it.evidenceLevel}): ${it.summary}`);
    });
  }

  return sections.filter(Boolean).join('\n');
}

/**
 * Renders a collection shelf as Markdown for agents.
 */
export function renderCollectionMarkdown(
  collection: Collection,
  items: KnowledgeItem[] = []
): string {
  const slug = collection.slug || collection.id;
  const sections: string[] = [
    `# ${collection.name}`,
    `> slug: ${slug} | entries: ${items.length}`,
    collection.description ? `\n${collection.description}\n` : '',
    ``,
    `## Knowledge Entries`,
  ];

  if (items.length === 0) {
    sections.push(`No entries currently cataloged in this collection.`);
  } else {
    items.forEach((it) => {
      const itSlug = it.slug || it.id;
      sections.push(`### [${itSlug}] ${it.title}`);
      sections.push(`> type: ${it.type} | evidence: ${it.evidenceLevel} | lang: ${it.language}`);
      sections.push(it.summary);
      sections.push(``);
    });
  }

  return sections.join('\n');
}

/**
 * Renders the /llms.txt manifest following the llmstxt.org standard.
 */
export function renderLlmsTxt(options: {
  baseUrl: string;
  collections: Collection[];
  sampleEntries?: KnowledgeItem[];
}): string {
  const { baseUrl, collections, sampleEntries = [] } = options;

  const lines: string[] = [
    `# WikiGraph Knowledge Library`,
    ``,
    `> WikiGraph is an empirical, read-only knowledge library built as a deterministic memory tier for autonomous AI agents.`,
    `> It provides peer-grounded procedures, research findings, and architectural guidelines with exact source citations and verified dependency relationships.`,
    ``,
    `## API Specification for AI Agents`,
    `- Base URL: ${baseUrl}`,
    `- Authentication: Bearer <token> (Authorization header)`,
    `- Scope read_only: Grants access to query context, search items, and read Markdown twins`,
    `- Scope read_write: Grants permissions to report execution outcomes and publish new bundles`,
    ``,
    `## MCP Tools & Endpoints`,
    `- POST /api/v1/query: Deterministic context window packet builder with sufficiency assessment and conflict warnings`,
    `- GET /api/v1/search?q={query}: Fast keyword and applicability search with matched excerpts`,
    `- GET /api/v1/knowledge/{idOrSlug}.md: Compact, token-efficient, citation-ready entry Markdown`,
    `- GET /api/v1/knowledge/{idOrSlug}.json: Full structured entity JSON representation`,
    `- GET /api/v1/sources/{idOrSlug}.md: Original grounded research document and extracted items index`,
    `- GET /api/v1/collections/{idOrSlug}.md: Curated shelf catalog and member units`,
    `- POST /api/v1/outcomes: Agent write path to report empirical execution results (success, failure, uncertain)`,
    ``,
    `## Research Collections`,
  ];

  collections.forEach((col) => {
    const slug = col.slug || col.id;
    lines.push(`- [${col.name}](${baseUrl}/collections/${slug}.md): ${col.description || 'Curated shelf.'}`);
  });

  if (sampleEntries.length > 0) {
    lines.push(``);
    lines.push(`## Key Knowledge Units`);
    sampleEntries.slice(0, 10).forEach((item) => {
      const slug = item.slug || item.id;
      lines.push(`- [${item.title}](${baseUrl}/knowledge/${slug}.md): ${item.summary}`);
    });
  }

  return lines.join('\n');
}
