import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Play,
  Copy,
  Check,
  Shield,
  FileCode,
  Globe,
  Sparkles,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';

export const ConnectionsPage: React.FC = () => {
  const { repository } = useRepository();
  const { t } = useLocale();

  // Test bench simulator state
  const [testQuery, setTestQuery] = useState('cache invalidation strategies');
  const [testFormat, setTestFormat] = useState<'markdown' | 'json'>('json');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Snippets tab
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'python'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      const results = await repository.listKnowledge({ search: testQuery });

      if (testFormat === 'json') {
        const payload = {
          status: 'success',
          access: 'public_read',
          query: testQuery,
          total_matched: results.length,
          timestamp: new Date().toISOString(),
          items: results.map((r) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            summary: r.summary,
            evidence: r.evidenceLevel,
            sourceExcerpt: r.sourceExcerpt,
          })),
        };
        setSimulatedResponse(JSON.stringify(payload, null, 2));
      } else {
        let md = `## WikiGraph Knowledge Match: "${testQuery}"\n\n`;
        results.forEach((r) => {
          md += `### [${r.type.toUpperCase()}] ${r.title}\n`;
          md += `> ${r.summary}\n`;
          md += `*Citation*: "${r.sourceExcerpt}" (Evidence: ${r.evidenceLevel})\n\n`;
        });
        setSimulatedResponse(md || 'No matching knowledge found for this query.');
      }
    } catch (err) {
      console.error(err);
      setSimulatedResponse('Error querying public knowledge endpoint.');
    } finally {
      setSimulating(false);
    }
  };

  const snippetCurl = `curl -X POST https://api.wikigraph.internal/v1/context/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "${testQuery}", "format": "${testFormat}"}'`;

  const snippetPython = `import requests

url = "https://api.wikigraph.internal/v1/context/search"
payload = {
    "query": "${testQuery}",
    "format": "${testFormat}"
}

response = requests.post(url, json=payload)
data = response.json()
print(f"Retrieved {len(data['items'])} public knowledge units")`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(activeSnippetTab === 'curl' ? snippetCurl : snippetPython);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--separator)]">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug">
            API & Agent Access
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Public machine-readable endpoint and schema documentation for autonomous AI agents, research pipelines, and developer tools.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-secondary)] text-xs text-[var(--muted)] border border-[var(--border)] font-mono">
          <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Public Access: No API Key Required</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Section (~65%) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Public Integration Notice */}
          <div className="ui-panel p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-[13px] sm:text-[14px] font-semibold text-[var(--foreground)] tracking-tight">
                Open Knowledge Protocol
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              WikiGraph exposes structured research nodes, verified causal relationships, and empirical test records as public data.
              Autonomous LLM workflows and evaluation benchmarks can consume cited context directly without authentication or session keys.
            </p>
          </div>

          {/* Interactive Request Sandbox */}
          <div className="ui-panel p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[var(--muted)]" />
                <div>
                  <h2 className="text-[13px] sm:text-[14px] font-semibold text-[var(--foreground)] tracking-tight">
                    Interactive Public Query Sandbox
                  </h2>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">
                    Test live knowledge retrieval queries against the repository dataset.
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-[var(--muted)] font-mono">Read-Only</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="text"
                dir="auto"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Query string (e.g. cache invalidation)..."
                className="ui-input flex-1 text-xs"
              />

              <select
                value={testFormat}
                onChange={(e) => setTestFormat(e.target.value as any)}
                className="ui-select text-xs h-9 w-full sm:w-auto"
              >
                <option value="json">Format: JSON</option>
                <option value="markdown">Format: Markdown</option>
              </select>

              <button
                type="button"
                disabled={simulating}
                onClick={handleRunSimulation}
                className="ui-button ui-button-primary text-xs w-full sm:w-auto shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{simulating ? 'Querying...' : 'Run Query'}</span>
              </button>
            </div>

            {simulatedResponse && (
              <div
                className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border)] font-mono text-xs text-[var(--foreground)] max-h-80 overflow-y-auto leading-relaxed select-text"
                dir="ltr"
              >
                <pre className="whitespace-pre-wrap">{simulatedResponse}</pre>
              </div>
            )}
          </div>

          {/* Response Schema Specifications */}
          <div className="ui-panel p-5 space-y-3 shadow-xs">
            <h2 className="text-[13px] sm:text-[14px] font-semibold text-[var(--foreground)] tracking-tight">
              Response Payload Schema
            </h2>
            <div className="overflow-x-auto text-xs font-mono" dir="ltr">
              <pre className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border)] text-[11px] text-[var(--foreground)] leading-relaxed">
{`{
  "status": "success",
  "access": "public_read",
  "query": "string",
  "total_matched": number,
  "timestamp": "ISO-8601 string",
  "items": [
    {
      "id": "string (e.g. kno-01)",
      "title": "string",
      "type": "procedure | skill | research_finding | tip | example | failure | lesson",
      "summary": "string",
      "evidence": "unverified | observed | tested",
      "sourceExcerpt": "string (grounding citation)"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Right / Supporting Reference Panel (~35%) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="ui-panel p-5 space-y-5 shadow-xs">
            {/* Endpoint Reference */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] block">
                Public API Specifications
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border)] font-mono text-[11px] space-y-1" dir="ltr">
                  <div className="flex items-center justify-between text-[var(--muted)]">
                    <span>Base URL</span>
                    <span>HTTPS</span>
                  </div>
                  <div className="font-semibold text-[var(--foreground)] truncate">
                    https://api.wikigraph.internal/v1
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/30 border border-[var(--border)] font-mono text-[11px]" dir="ltr">
                  <span className="text-[var(--muted)]">Endpoint:</span>
                  <span className="text-[var(--foreground)] font-semibold">POST /context/search</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-secondary)]/30 border border-[var(--border)] font-mono text-[11px]" dir="ltr">
                  <span className="text-[var(--muted)]">Authentication:</span>
                  <span className="text-[var(--foreground)] font-semibold">None (Public)</span>
                </div>
              </div>
            </div>

            {/* Integration Snippets */}
            <div className="space-y-2 pt-3 border-t border-[var(--separator)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span className="text-[11px] font-semibold text-[var(--foreground)] uppercase tracking-wider">
                    Code Snippet
                  </span>
                </div>

                <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setActiveSnippetTab('curl')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                      activeSnippetTab === 'curl'
                        ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSnippetTab('python')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                      activeSnippetTab === 'python'
                        ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    Python
                  </button>
                </div>
              </div>

              <div className="relative group">
                <div
                  className="p-3 rounded-lg bg-[var(--surface-secondary)]/70 border border-[var(--border)] font-mono text-[11px] text-[var(--foreground)] overflow-x-auto leading-relaxed select-text"
                  dir="ltr"
                >
                  <pre>{activeSnippetTab === 'curl' ? snippetCurl : snippetPython}</pre>
                </div>

                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="absolute top-2 end-2 ui-button ui-button-secondary text-xs px-2 py-1 shadow-sm"
                  title="Copy Code"
                >
                  {copiedSnippet ? (
                    <Check className="w-3 h-3 text-[var(--accent)]" />
                  ) : (
                    <Copy className="w-3 h-3 text-[var(--muted)]" />
                  )}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Architecture Notes */}
            <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/40 border border-[var(--border)] text-[11px] text-[var(--muted)] space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                <Shield className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Agent Architecture</span>
              </div>
              <p className="leading-relaxed">
                WikiGraph provides evidence-backed knowledge graph lookups. Administrative mutations and dataset additions occur exclusively through secure offline pipeline tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
