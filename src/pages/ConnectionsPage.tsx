import React, { useState, useEffect } from 'react';
import {
  Code2,
  Terminal,
  Play,
  Copy,
  Check,
  Shield,
  FileCode,
  Globe,
  KeyRound,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { useToast } from '../context/ToastContext';
import {
  ApiToken,
  Collection,
  ContextRequest,
  ContextResult,
  CreateApiTokenResponse,
} from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const ConnectionsPage: React.FC = () => {
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const { showToast, showError } = useToast();

  // Data states
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Token Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenScope, setTokenScope] = useState<'read_only' | 'read_write'>('read_only');
  const [scopeAllCollections, setScopeAllCollections] = useState<boolean>(true);
  const [selectedColIds, setSelectedColIds] = useState<string[]>([]);
  const [creating, setCreating] = useState<boolean>(false);

  // One-time secret display modal
  const [createdSecretData, setCreatedSecretData] = useState<CreateApiTokenResponse | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);

  // Revoke confirm modal
  const [tokenToDelete, setTokenToDelete] = useState<ApiToken | null>(null);

  // Test bench simulator state
  const [testTask, setTestTask] = useState<string>(
    'How to extract structured tables from documents using python'
  );
  const [testTools, setTestTools] = useState<string>('python, pdfplumber');
  const [testLanguage, setTestLanguage] = useState<'any' | 'en' | 'fa'>('en');
  const [simulatedResponse, setSimulatedResponse] = useState<ContextResult | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Snippets tab
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'python' | 'curl_bundle'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // Load tokens and collections
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [tokList, colList] = await Promise.all([
          repository.listTokens(),
          repository.listCollections(),
        ]);
        if (!active) return;
        setTokens(tokList);
        setCollections(colList);
      } catch (err) {
        showError(err, 'Failed to load tokens and collections');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [repository, version, showError]);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;
    try {
      setCreating(true);
      const res = await repository.createToken({
        name: tokenName.trim(),
        scope: tokenScope,
        collectionIds: scopeAllCollections ? null : selectedColIds,
      });
      notifyMutation();
      setIsCreateModalOpen(false);
      setCreatedSecretData(res);
      // Reset form
      setTokenName('');
      setTokenScope('read_only');
      setScopeAllCollections(true);
      setSelectedColIds([]);
      showToast({
        type: 'success',
        message: `Token "${res.token.name}" created successfully.`,
      });
    } catch (err) {
      showError(err, 'Failed to create API token');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteToken = async () => {
    if (!tokenToDelete) return;
    try {
      await repository.deleteToken(tokenToDelete.id);
      notifyMutation();
      showToast({
        type: 'info',
        message: `Token "${tokenToDelete.name}" revoked.`,
      });
      setTokenToDelete(null);
    } catch (err) {
      showError(err, 'Failed to revoke token');
    }
  };

  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      const req: ContextRequest = {
        task: testTask.trim(),
        requirements: {
          tools: testTools
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          language: testLanguage === 'any' ? undefined : testLanguage,
        },
        maxTokens: 4000,
      };
      const res = await repository.buildContext(req);
      setSimulatedResponse(res);
    } catch (err) {
      showError(err, 'Query simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  // cURL snippet for POST /api/v1/query
  const snippetCurl = `curl -X POST https://api.wikigraph.internal/api/v1/query \\
  -H "Authorization: Bearer <your-api-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task": "${testTask.replace(/"/g, '\\"')}",
    "requirements": {
      "tools": [${testTools
        .split(',')
        .map((t) => `"${t.trim()}"`)
        .join(', ')}],
      "language": "${testLanguage === 'any' ? 'en' : testLanguage}"
    },
    "maxTokens": 4000
  }'`;

  // Python snippet for POST /api/v1/query
  const snippetPython = `import requests

url = "https://api.wikigraph.internal/api/v1/query"
headers = {
    "Authorization": "Bearer <your-api-token>",
    "Content-Type": "application/json"
}
payload = {
    "task": "${testTask.replace(/"/g, '\\"')}",
    "requirements": {
        "tools": [${testTools
          .split(',')
          .map((t) => `"${t.trim()}"`)
          .join(', ')}],
        "language": "${testLanguage === 'any' ? 'en' : testLanguage}"
    },
    "maxTokens": 4000
}

response = requests.post(url, headers=headers, json=payload)
response.raise_for_status()
data = response.json()

print(f"Sufficiency: {data['sufficiency']}")
print(f"Selected units: {len(data['selected'])}")
for unit in data['selected']:
    print(f"- [{unit['role']}] {unit['item']['title']} (Score: {unit['score']})")`;

  // cURL snippet for POST /api/v1/import/bundle
  const snippetCurlBundle = `curl -X POST https://api.wikigraph.internal/api/v1/import/bundle \\
  -H "Authorization: Bearer <your-api-token>" \\
  -H "Content-Type: application/json" \\
  -d @bundle.json`;

  const handleCopySnippet = () => {
    let textToCopy = snippetCurl;
    if (activeSnippetTab === 'python') textToCopy = snippetPython;
    if (activeSnippetTab === 'curl_bundle') textToCopy = snippetCurlBundle;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopySecret = () => {
    if (!createdSecretData) return;
    navigator.clipboard.writeText(createdSecretData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--separator)]">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--foreground)] leading-snug">
            API & Machine Connections
          </h1>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Manage scoped Bearer tokens for external AI agents, coding assistants, and automated pipelines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate New Token</span>
        </button>
      </div>

      {/* Section 1: Active API Tokens Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[var(--separator)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Active Access Tokens
            </h2>
            <span className="text-[11px] font-mono text-[var(--muted)]">({tokens.length})</span>
          </div>
          <span className="text-[11px] font-mono text-[var(--muted)]">Authorization: Bearer &lt;token&gt;</span>
        </div>

        {tokens.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--muted)] space-y-2">
            <KeyRound className="w-6 h-6 mx-auto text-[var(--muted)]" />
            <p className="font-medium text-[var(--foreground)]">No API tokens configured</p>
            <p className="text-[11px]">
              Generate a scoped token to allow autonomous tools to query or import knowledge.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--separator)]">
            {tokens.map((tok) => {
              const scopedCols =
                tok.collectionIds && tok.collectionIds.length > 0
                  ? collections.filter((c) => tok.collectionIds!.includes(c.id))
                  : null;

              return (
                <div
                  key={tok.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-secondary)]/30 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                        {tok.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                          tok.scope === 'read_write'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {tok.scope === 'read_write' ? 'Read + Write' : 'Read Only'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] font-mono flex-wrap">
                      <span>
                        Prefix: <span className="text-[var(--foreground)]">{tok.tokenMasked}</span>
                      </span>
                      <span>•</span>
                      <span>
                        Scope:{' '}
                        {scopedCols ? (
                          <span className="text-[var(--foreground)]">
                            {scopedCols.map((c) => c.name).join(', ')}
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            All Collections
                          </span>
                        )}
                      </span>
                      <span>•</span>
                      <span>Created: {new Date(tok.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTokenToDelete(tok)}
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                    title="Revoke Token"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Two-Column Layout: Sandbox + Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Section: Interactive Query Sandbox (~65%) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Live Contract Simulator: POST /api/v1/query
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[var(--muted)]">ContextResult</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--foreground)]">
                  Task Description
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={testTask}
                  onChange={(e) => setTestTask(e.target.value)}
                  placeholder="Task prompt..."
                  className="ui-input text-xs py-1.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[var(--muted)]">
                    Required Tools
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={testTools}
                    onChange={(e) => setTestTools(e.target.value)}
                    placeholder="Comma-separated tools..."
                    className="ui-input text-xs py-1.5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[var(--muted)]">
                    Target Language
                  </label>
                  <select
                    value={testLanguage}
                    onChange={(e) => setTestLanguage(e.target.value as any)}
                    className="ui-select text-xs py-1.5"
                  >
                    <option value="any">Any Language</option>
                    <option value="en">English (en)</option>
                    <option value="fa">Persian (fa)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={simulating || !testTask.trim()}
                onClick={handleRunSimulation}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{simulating ? 'Executing Retrieval...' : 'Execute Query Contract'}</span>
              </button>
            </div>

            {simulatedResponse && (
              <div className="space-y-2 pt-2 border-t border-[var(--separator)]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-[var(--foreground)]">
                    Sufficiency: {simulatedResponse.sufficiency.toUpperCase()}
                  </span>
                  <span className="text-[var(--muted)]">
                    {simulatedResponse.selected.length} items ({simulatedResponse.tokenEstimate.used} tokens)
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/60 border border-[var(--border)] font-mono text-[11px] text-[var(--foreground)] max-h-72 overflow-y-auto leading-relaxed select-text" dir="ltr">
                  <pre>{JSON.stringify(simulatedResponse, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Code Snippets & Endpoints (~35%) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[var(--muted)]" />
                <h3 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Integration Code Snippets
                </h3>
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
                  cURL Query
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
                <button
                  type="button"
                  onClick={() => setActiveSnippetTab('curl_bundle')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                    activeSnippetTab === 'curl_bundle'
                      ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Bundle Import
                </button>
              </div>
            </div>

            <div className="relative group">
              <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/80 border border-[var(--border)] font-mono text-[11px] text-[var(--foreground)] overflow-x-auto leading-relaxed select-text max-h-96" dir="ltr">
                <pre>
                  {activeSnippetTab === 'curl' && snippetCurl}
                  {activeSnippetTab === 'python' && snippetPython}
                  {activeSnippetTab === 'curl_bundle' && snippetCurlBundle}
                </pre>
              </div>

              <button
                type="button"
                onClick={handleCopySnippet}
                className="absolute top-2 end-2 px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[var(--muted)]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Architecture Notes */}
            <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/40 border border-[var(--border)] text-[11px] text-[var(--muted)] space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                <Shield className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Security & Permissions</span>
              </div>
              <p className="leading-relaxed">
                Tokens with <span className="font-semibold text-[var(--foreground)]">read_only</span> scope can call <code className="font-mono text-[10px]">POST /api/v1/query</code> and all GET endpoints.
                Tokens with <span className="font-semibold text-[var(--foreground)]">read_write</span> scope may additionally call <code className="font-mono text-[10px]">POST /api/v1/import/bundle</code> and mutate knowledge.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Generate New Token */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[var(--separator)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Generate Machine Access Token
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateToken} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-[var(--foreground)] block">
                  Token Name / Client Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. Claude Desktop, Local Python Pipeline"
                  className="ui-input py-1.5 text-xs w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[var(--foreground)] block">
                  Permissions Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    tokenScope === 'read_only'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                      : 'border-[var(--border)] bg-[var(--surface-secondary)]/40 text-[var(--muted)]'
                  }`}>
                    <input
                      type="radio"
                      name="scope"
                      value="read_only"
                      checked={tokenScope === 'read_only'}
                      onChange={() => setTokenScope('read_only')}
                      className="sr-only"
                    />
                    <div className="text-xs font-semibold">Read-Only</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Query & search access only</div>
                  </label>

                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    tokenScope === 'read_write'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                      : 'border-[var(--border)] bg-[var(--surface-secondary)]/40 text-[var(--muted)]'
                  }`}>
                    <input
                      type="radio"
                      name="scope"
                      value="read_write"
                      checked={tokenScope === 'read_write'}
                      onChange={() => setTokenScope('read_write')}
                      className="sr-only"
                    />
                    <div className="text-xs font-semibold">Read + Write</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Full mutation & bundle import</div>
                  </label>
                </div>
              </div>

              {/* Per-Collection Scoping */}
              <div className="space-y-2 pt-2 border-t border-[var(--separator)]">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-[var(--foreground)] block">
                    Collection Access Scoping
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={scopeAllCollections}
                      onChange={(e) => setScopeAllCollections(e.target.checked)}
                      className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                    <span>Allow All Collections</span>
                  </label>
                </div>

                {!scopeAllCollections && (
                  <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/30 space-y-1.5 max-h-40 overflow-y-auto">
                    {collections.length === 0 ? (
                      <p className="text-[11px] text-[var(--muted)] italic">No collections available</p>
                    ) : (
                      collections.map((col) => {
                        const isChecked = selectedColIds.includes(col.id);
                        return (
                          <label
                            key={col.id}
                            className="flex items-center gap-2 p-1 rounded hover:bg-[var(--surface-secondary)] cursor-pointer text-xs select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColIds([...selectedColIds, col.id]);
                                } else {
                                  setSelectedColIds(selectedColIds.filter((id) => id !== col.id));
                                }
                              }}
                              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                            />
                            <span className="text-[var(--foreground)] truncate">
                              {col.name}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--separator)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !tokenName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[var(--foreground)] text-[var(--surface)] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Generating...' : 'Create Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: One-time Secret Display */}
      {createdSecretData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--surface)] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  API Token Created: {createdSecretData.token.name}
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Copy your token now. For security reasons, this secret will{' '}
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    never be shown again
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-[var(--muted)]">
                Bearer Secret Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdSecretData.secret}
                  className="ui-input py-2 font-mono text-xs flex-1 bg-[var(--surface-secondary)] text-[var(--foreground)] select-all"
                />
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {copiedSecret ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCreatedSecretData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)]/80 transition-colors cursor-pointer border border-[var(--border)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(tokenToDelete)}
        title="Revoke Machine Token"
        description={`Are you sure you want to revoke "${tokenToDelete?.name}"? Any external agent or automation script using this token will immediately receive 401 Unauthorized errors.`}
        confirmLabel="Revoke Token"
        isDestructive={true}
        onConfirm={handleDeleteToken}
        onCancel={() => setTokenToDelete(null)}
      />
    </div>
  );
};
