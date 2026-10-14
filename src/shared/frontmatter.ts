/**
 * Lightweight, robust, pure parser for leading YAML frontmatter ('---' block).
 * Zero DOM or React dependencies. Tested thoroughly.
 *
 * Supports:
 * - Simple key: value pairs
 * - Quoted strings ("value" and 'value')
 * - Folded and literal multi-line blocks (> and |)
 * - Safe error handling: on any failure, returns { data: {}, body: original, rawFrontmatter?: string, isMalformed: true }
 */

export interface ParsedFrontmatter {
  data: Record<string, string>;
  body: string;
  rawFrontmatter?: string;
  isMalformed?: boolean;
}

/**
 * Parses simple YAML scalar value: handles unquoted, double-quoted, single-quoted values.
 */
function parseYamlScalar(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Double quoted: "..."
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }

  // Single quoted: '...'
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }

  return trimmed;
}

export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  if (!markdown || typeof markdown !== 'string') {
    return { data: {}, body: markdown || '' };
  }

  // A valid frontmatter block must start at the very beginning with '---'
  // Line endings can be \r\n or \n. Normalize line endings to \n for parsing.
  const normalized = markdown.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---')) {
    return { data: {}, body: markdown };
  }

  // First line must be exactly '---' (with optional trailing whitespace)
  const firstLineEnd = normalized.indexOf('\n');
  if (firstLineEnd === -1) {
    return { data: {}, body: markdown };
  }

  const firstLine = normalized.slice(0, firstLineEnd).trim();
  if (firstLine !== '---') {
    return { data: {}, body: markdown };
  }

  // Find the closing '---' line
  // Needs to be on its own line: \n---(?:\n|$)
  const closingRegex = /\n---\s*(?:\n|$)/;
  const match = closingRegex.exec(normalized.slice(firstLineEnd));
  if (!match) {
    // Unclosed frontmatter block
    return {
      data: {},
      body: markdown,
      rawFrontmatter: normalized.slice(firstLineEnd + 1),
      isMalformed: true,
    };
  }

  const closingIndex = firstLineEnd + match.index;
  const rawYaml = normalized.slice(firstLineEnd + 1, closingIndex);
  const bodyStartIndex = closingIndex + match[0].length;
  const body = normalized.slice(bodyStartIndex);

  try {
    const lines = rawYaml.split('\n');
    const data: Record<string, string> = {};

    let currentKey: string | null = null;
    let blockMode: 'folded' | 'literal' | null = null;
    let blockLines: string[] = [];

    const flushBlock = () => {
      if (currentKey && blockMode) {
        if (blockMode === 'folded') {
          // Folded (>): join lines with spaces unless empty line (paragraph break)
          data[currentKey] = blockLines
            .join('\n')
            .split(/\n\n+/)
            .map((chunk) => chunk.replace(/\n/g, ' ').trim())
            .join('\n\n')
            .trim();
        } else {
          // Literal (|): preserve newlines
          data[currentKey] = blockLines.join('\n').trim();
        }
      }
      currentKey = null;
      blockMode = null;
      blockLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // If we are currently collecting a block scalar (> or |)
      if (blockMode && currentKey) {
        // If line is indented or empty, it belongs to the block
        if (/^\s+/.test(line) || line.trim() === '') {
          // Strip up to leading indentation (or 2/4 spaces)
          const stripped = line.replace(/^\s{2,4}/, '');
          blockLines.push(stripped);
          continue;
        } else {
          // Non-indented line ends the block scalar
          flushBlock();
        }
      }

      // Skip empty lines or comment lines
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Match key: value pattern
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        // Malformed line
        throw new Error(`Invalid YAML line without colon: ${line}`);
      }

      const key = line.slice(0, colonIndex).trim();
      const rawVal = line.slice(colonIndex + 1).trim();

      if (!key) {
        throw new Error(`Empty key at line: ${line}`);
      }

      if (rawVal === '>' || rawVal === '>-' || rawVal === '>+') {
        currentKey = key;
        blockMode = 'folded';
        blockLines = [];
      } else if (rawVal === '|' || rawVal === '|-' || rawVal === '|+') {
        currentKey = key;
        blockMode = 'literal';
        blockLines = [];
      } else {
        data[key] = parseYamlScalar(rawVal);
      }
    }

    if (blockMode && currentKey) {
      flushBlock();
    }

    return {
      data,
      body,
      rawFrontmatter: rawYaml,
      isMalformed: false,
    };
  } catch (_err) {
    return {
      data: {},
      body: markdown,
      rawFrontmatter: rawYaml,
      isMalformed: true,
    };
  }
}
