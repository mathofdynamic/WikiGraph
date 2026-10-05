import React, { useState } from 'react';
import {
  KeyRound,
  Code2,
  Terminal,
  Play,
  Copy,
  Check,
  Plus,
  Trash2,
  Info,
  Clock,
  Shield,
  X,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { ApiToken } from '../types';

export const ConnectionsPage: React.FC = () => {
  const { repository } = useRepository();
  const { t } = useLocale();

  const [tokens, setTokens] = useState<ApiToken[]>([
    {
      id: 'tok-01',
      name: 'Codex / Antigravity Agent Tool',
      tokenMasked: 'wg_live_a89f••••••••••••••',
      scope: 'read_write',
      createdAt: '2026-03-12T10:00:00Z',
      lastUsedAt: '2026-03-20T14:32:00Z',
    },
    {
      id: 'tok-02',
      name: 'Automated CI/CD Verification Runner',
      tokenMasked: 'wg_read_4bc2••••••••••••••',
      scope: 'read_only',
      createdAt: '2026-02-28T08:15:00Z',
      lastUsedAt: '2026-03-19T22:10:00Z',
    },
  ]);

  // Test bench simulator state
  const [testQuery, setTestQuery] = useState('cache invalidation strategies');
  const [testFormat, setTestFormat] = useState<'markdown' | 'json'>('markdown');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Snippets tab
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'python'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // New Token Modal
  const [newTokenModalOpen, setNewTokenModalOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScope, setNewTokenScope] = useState<'read_only' | 'read_write'>('read_only');
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      const results = await repository.listKnowledge({ search: testQuery });

      if (testFormat === 'json') {
        const payload = {
          status: 'success',
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
        let md = `## WikiGraph AI Knowledge Match: "${testQuery}"\n\n`;
        results.forEach((r) => {
          md += `### [${r.type.toUpperCase()}] ${r.title}\n`;
          md += `> ${r.summary}\n`;
          md += `*Citation*: "${r.sourceExcerpt}" (Evidence: ${r.evidenceLevel})\n\n`;
        });
        setSimulatedResponse(md || 'No matching knowledge found for this query.');
      }
    } catch (err) {
      console.error(err);
      setSimulatedResponse('Error simulating endpoint call.');
    } finally {
      setSimulating(false);
    }
  };

  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    const secretKey = `wg_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const newToken: ApiToken = {
      id: `tok-${Date.now()}`,
      name: newTokenName.trim(),
      tokenMasked: `${secretKey.slice(0, 11)}••••••••••••••`,
      scope: newTokenScope,
      createdAt: new Date().toISOString(),
      lastUsedAt: 'Never',
    };

    setTokens((prev) => [newToken, ...prev]);
    setGeneratedSecret(secretKey);
    setNewTokenName('');
  };

  const handleDeleteToken = (id: string) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const snippetCurl = `curl -X POST https://api.wikigraph.internal/v1/context/search \\
  -H "Authorization: Bearer wg_live_your_api_token" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "${testQuery}", "format": "json"}'`;

  const snippetPython = `import requests

url = "https://api.wikigraph.internal/v1/context/search"
headers = {
    "Authorization": "Bearer wg_live_your_api_token",
    "Content-Type": "application/json"
}
payload = {
    "query": "${testQuery}",
    "format": "json"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(f"Matched {len(data['items'])} knowledge units")`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(activeSnippetTab === 'curl' ? snippetCurl : snippetPython);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {t('connections.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
            {t('connections.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setGeneratedSecret(null);
            setNewTokenModalOpen(true);
          }}
          className="ui-button ui-button-primary"
        >
          <Plus className="w-4 h-4" />
          <span>{t('connections.createKeyBtn')}</span>
        </button>
      </div>

      {/* Grouped Section 1: Active Machine Credentials */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
              {t('connections.activeKeys')}
            </h2>
          </div>
          <span className="text-xs text-[var(--muted)] font-mono">{tokens.length} active</span>
        </div>

        <div className="divide-y divide-[var(--separator)]">
          {tokens.map((tok) => (
            <div
              key={tok.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-tertiary)]/20 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--foreground)]">{tok.name}</span>
                  <span
                    className={`px-2 py-0.2 rounded text-[10px] font-mono ${
                      tok.scope === 'read_write'
                        ? 'bg-blue-950/40 text-blue-400 border border-blue-800/40'
                        : 'bg-[var(--surface-tertiary)] text-[var(--muted)] border border-[var(--border)]'
                    }`}
                  >
                    {tok.scope}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] font-mono">
                  <span>{tok.tokenMasked}</span>
                  <span>•</span>
                  <span>Last used: {tok.lastUsedAt || 'Never'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleDeleteToken(tok.id)}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-400 hover:bg-rose-950/20 cursor-pointer"
                  title="Revoke Token"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grouped Section 2: Integration Endpoints & Code Snippets */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs space-y-0">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
              Integration Snippets
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setActiveSnippetTab('curl')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeSnippetTab === 'curl'
                    ? 'bg-[var(--surface-tertiary)] text-[var(--foreground)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                cURL
              </button>
              <button
                type="button"
                onClick={() => setActiveSnippetTab('python')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeSnippetTab === 'python'
                    ? 'bg-[var(--surface-tertiary)] text-[var(--foreground)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Python
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopySnippet}
              className="ui-button ui-button-secondary text-xs py-1"
            >
              {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-[var(--surface-secondary)] font-mono text-xs text-[var(--foreground)] overflow-x-auto">
          <pre>{activeSnippetTab === 'curl' ? snippetCurl : snippetPython}</pre>
        </div>
      </div>

      {/* Grouped Section 3: Interactive Request Simulator */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
              {t('connections.requestSimulatorTitle')}
            </h2>
          </div>
          <span className="text-[11px] text-[var(--muted)] font-mono">Simulated Sandbox</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Query query string (e.g. cache invalidation)..."
            className="ui-input flex-1"
          />

          <select
            value={testFormat}
            onChange={(e) => setTestFormat(e.target.value as any)}
            className="ui-select text-xs py-2 w-full sm:w-auto"
          >
            <option value="markdown">Format: Markdown</option>
            <option value="json">Format: JSON</option>
          </select>

          <button
            type="button"
            disabled={simulating}
            onClick={handleRunSimulation}
            className="ui-button ui-button-primary w-full sm:w-auto"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{simulating ? 'Querying...' : 'Test Request'}</span>
          </button>
        </div>

        {simulatedResponse && (
          <div className="mt-3 p-3.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] font-mono text-xs text-[var(--foreground)] max-h-72 overflow-y-auto leading-relaxed">
            <pre className="whitespace-pre-wrap">{simulatedResponse}</pre>
          </div>
        )}
      </div>

      {/* New Token Modal */}
      {newTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                {t('connections.createKeyBtn')}
              </h3>
              <button
                type="button"
                onClick={() => setNewTokenModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {generatedSecret ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
                  <span className="font-semibold block">{t('connections.revealTitle')}</span>
                  <p className="text-[11px] text-[var(--muted)]">{t('connections.revealWarning')}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] font-mono text-xs text-[var(--foreground)] flex items-center justify-between break-all">
                  <span>{generatedSecret}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedSecret);
                    }}
                    className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                    title="Copy Token"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setNewTokenModalOpen(false)}
                    className="ui-button ui-button-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateToken} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    {t('connections.labelField')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="e.g. Gemini 2.5 Flash Autonomous Agent"
                    className="ui-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                    Permissions & Grants
                  </label>
                  <select
                    value={newTokenScope}
                    onChange={(e) => setNewTokenScope(e.target.value as any)}
                    className="ui-select w-full"
                  >
                    <option value="read_only">Read-Only (Query & Citations)</option>
                    <option value="read_write">Read & Write (Query, Ingest, Compose)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setNewTokenModalOpen(false)}
                    className="ui-button ui-button-secondary"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="ui-button ui-button-primary"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
