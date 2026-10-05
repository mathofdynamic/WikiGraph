import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  Code2,
  Terminal,
  Play,
  Copy,
  Check,
  Plus,
  Trash2,
  Info,
  Clock,
  Sparkles,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { ApiToken, KnowledgeItem } from '../types';

export const ConnectionsPage: React.FC = () => {
  const { repository, version } = useRepository();
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

  // Execute test bench query
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
        results.forEach((r, idx) => {
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

    const rawSecret = `wg_live_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;
    const masked = `${rawSecret.slice(0, 11)}••••••••••••••`;

    const newTok: ApiToken = {
      id: `tok-${Date.now()}`,
      name: newTokenName,
      tokenMasked: masked,
      scope: newTokenScope,
      createdAt: new Date().toISOString(),
      lastUsedAt: undefined,
    };

    setTokens((prev) => [newTok, ...prev]);
    setGeneratedSecret(rawSecret);
  };

  const handleRevokeToken = (id: string) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const curlSnippet = `curl -X POST https://your-wikigraph.pages.dev/api/v1/query \\
  -H "Authorization: Bearer wg_live_your_token_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "${testQuery || 'architecture rules'}",
    "format": "${testFormat}",
    "limit": 5
  }'`;

  const pythonSnippet = `import requests

url = "https://your-wikigraph.pages.dev/api/v1/query"
headers = {
    "Authorization": "Bearer wg_live_your_token_here",
    "Content-Type": "application/json"
}
payload = {
    "query": "${testQuery || 'architecture rules'}",
    "format": "${testFormat}",
    "limit": 5
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print("Assembled Context:", data["items"])`;

  const handleCopySnippet = () => {
    const text = activeSnippetTab === 'curl' ? curlSnippet : pythonSnippet;
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#23252a]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8a8f98] uppercase tracking-wider mb-1">
            <span>WikiGraph</span>
            <span>/</span>
            <span className="text-[#828fff] font-medium">
              {t('nav.connections')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-title text-[#f7f8f8]">
            {t('connections.title')}
          </h2>
          <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">
            {t('connections.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setGeneratedSecret(null);
            setNewTokenName('');
            setNewTokenModalOpen(true);
          }}
          className="linear-btn-primary text-xs sm:text-sm gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{t('connections.generateToken')}</span>
        </button>
      </div>

      {/* Backend Prototype Architectural Seam Notice */}
      <div className="p-4 rounded-xl border border-[#23252a] bg-[#0f1011] text-xs text-[#8a8f98] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#828fff] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-[#f7f8f8]">
            Cloudflare Pages Functions + D1 Architectural Seam:
          </span>
          <p className="leading-relaxed">
            {t('connections.tokenNotice')} Real cryptographic token hashing and rate limiting will be enforced at the edge when synced with Cloudflare D1. The interactive simulator below queries the workspace repository in real time.
          </p>
        </div>
      </div>

      {/* Token Management Section */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
        <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8] flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#828fff]" />
          <span>Active API Tokens</span>
        </h3>

        <div className="rounded-lg border border-[#23252a] divide-y divide-[#23252a] overflow-hidden bg-[#141516]">
          {tokens.map((tok) => (
            <div
              key={tok.id}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[#f7f8f8]">
                    {tok.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1b1c1d] border border-[#2e3036] text-[10px] font-medium text-[#8a8f98] uppercase">
                    {tok.scope}
                  </span>
                </div>
                <div className="text-xs text-[#8a8f98]">{tok.tokenMasked}</div>
              </div>

              <div className="flex items-center gap-4 text-[#8a8f98]">
                <span>
                  Created: {new Date(tok.createdAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => handleRevokeToken(tok.id)}
                  className="text-[#8a8f98] hover:text-[#fb7185] cursor-pointer p-1"
                  title="Revoke Token"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query Simulation / Test Bench */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#23252a]">
          <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#5e6ad2]" />
            <span>{t('connections.testBench')}</span>
          </h3>
          <span className="text-xs text-[#8a8f98]">POST /api/v1/query</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-8">
            <label className="block text-xs font-medium text-[#8a8f98] mb-1">
              Natural Language AI Tool Query
            </label>
            <input
              type="text"
              dir="auto"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="e.g. cache invalidation, evaluation harness"
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#8a8f98] mb-1">
              Response Format
            </label>
            <select
              value={testFormat}
              onChange={(e) => setTestFormat(e.target.value as 'markdown' | 'json')}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={simulating}
              onClick={handleRunSimulation}
              className="w-full linear-btn-primary text-xs sm:text-sm gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{simulating ? 'Testing...' : t('connections.runSimulation')}</span>
            </button>
          </div>
        </div>

        {/* Simulator Output Window */}
        {simulatedResponse && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-[#8a8f98]">
              <span>Response (Status: 200 OK)</span>
              <span>Payload Size: {simulatedResponse.length} B</span>
            </div>
            <textarea
              readOnly
              rows={8}
              value={simulatedResponse}
              className="w-full p-3 text-xs rounded-lg border border-[#23252a] bg-[#010102] text-[#d0d6e0] leading-relaxed focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Code Snippets Integration Tab */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#23252a]">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#828fff]" />
            <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8]">
              {t('connections.codeSnippets')}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-md bg-[#141516] border border-[#23252a] text-xs">
              <button
                type="button"
                onClick={() => setActiveSnippetTab('curl')}
                className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  activeSnippetTab === 'curl'
                    ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
                    : 'text-[#8a8f98]'
                }`}
              >
                cURL
              </button>
              <button
                type="button"
                onClick={() => setActiveSnippetTab('python')}
                className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  activeSnippetTab === 'python'
                    ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
                    : 'text-[#8a8f98]'
                }`}
              >
                Python
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopySnippet}
              className="linear-btn-secondary text-xs gap-1"
            >
              {copiedSnippet ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span className="text-[#4ade80]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-lg bg-[#010102] text-[#d0d6e0] text-xs overflow-x-auto leading-relaxed border border-[#23252a]">
          <code>{activeSnippetTab === 'curl' ? curlSnippet : pythonSnippet}</code>
        </pre>
      </div>

      {/* Rate-Limit & Audit Log Stub */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
        <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#8a8f98]" />
          <span>Audit Log & Rate Limit Telemetry (Stub)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a]">
            <span className="text-[#8a8f98] block mb-0.5">Rate Limit</span>
            <span className="font-semibold text-[#f7f8f8]">
              120 requests / min
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a]">
            <span className="text-[#8a8f98] block mb-0.5">Quota Window</span>
            <span className="font-semibold text-[#f7f8f8]">
              Unlimited (Single-Owner)
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a]">
            <span className="text-[#8a8f98] block mb-0.5">Audit Retention</span>
            <span className="font-semibold text-[#f7f8f8]">
              90 Days in D1
            </span>
          </div>
        </div>
      </div>

      {/* Generate Token Modal */}
      {newTokenModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[#0f1011] rounded-xl border border-[#23252a] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
                {t('connections.generateToken')}
              </h3>
              <button
                type="button"
                onClick={() => setNewTokenModalOpen(false)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                &times;
              </button>
            </div>

            {generatedSecret ? (
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-lg bg-[#10221c] border border-[#184a37] text-xs text-[#4ade80]">
                  Token generated! Copy it now as it will not be displayed in plaintext again.
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#8a8f98] mb-1">
                    BEARER TOKEN SECRET:
                  </label>
                  <div className="p-3 rounded bg-[#141516] text-xs break-all text-[#f7f8f8] select-all border border-[#23252a]">
                    {generatedSecret}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setNewTokenModalOpen(false)}
                    className="linear-btn-primary text-xs sm:text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateToken} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                    Client / Tool Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Local Codex Agent CLI"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                    Scope Permission
                  </label>
                  <select
                    value={newTokenScope}
                    onChange={(e) =>
                      setNewTokenScope(e.target.value as 'read_only' | 'read_write')
                    }
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="read_only">Read-Only (Query Knowledge & Sources)</option>
                    <option value="read_write">
                      Read/Write (Query + Log Outcomes & Citations)
                    </option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                  <button
                    type="button"
                    onClick={() => setNewTokenModalOpen(false)}
                    className="linear-btn-secondary text-xs sm:text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="linear-btn-primary text-xs sm:text-sm"
                  >
                    Generate Token
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
