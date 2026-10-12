import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  X,
  Bot,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
  ChevronDown,
  Info,
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
  KnowledgeItem,
} from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { renderLlmsTxt } from '../shared/renderers';
import { formatContextMarkdown } from '../shared/retrieval';

interface McpToolDoc {
  name: string;
  summary: string;
  summaryFa: string;
  parameters: { name: string; type: string; required: boolean; desc: string }[];
  returns: string;
  exampleCall: Record<string, any>;
}

const MCP_TOOLS: McpToolDoc[] = [
  {
    name: 'get_context',
    summary: 'Deterministic context window packet builder with sufficiency assessment and conflict warnings.',
    summaryFa: 'سازنده بسته زمینه قطعی پنجره مدل همراه با ارزیابی کفایت و هشدارهای تعارض.',
    parameters: [
      { name: 'task', type: 'string', required: true, desc: 'Operational technical goal or natural language prompt' },
      { name: 'maxTokens', type: 'number', required: false, desc: 'Token budget ceiling (default: 4000)' },
      { name: 'requirements.tools', type: 'string[]', required: false, desc: 'Optional required tool dependencies (e.g. ["python", "pdfplumber"])' },
      { name: 'requirements.language', type: '"en" | "fa"', required: false, desc: 'Target content language filter' },
      { name: 'includeUnreviewed', type: 'boolean', required: false, desc: 'Whether to include unreviewed draft items (default: false)' },
      { name: 'includeRetired', type: 'boolean', required: false, desc: 'Whether to include retired historical items (default: false)' },
    ],
    returns: 'ContextResult { contextPacket, sufficiency: "sufficient"|"insufficient", sufficiencyNote, conflicts, selected, tokenEstimate, excluded }',
    exampleCall: {
      name: 'get_context',
      arguments: {
        task: 'Extract structured tables from borderless PDFs using python',
        maxTokens: 4000,
        requirements: { tools: ['python', 'pdfplumber'] },
      },
    },
  },
  {
    name: 'search_knowledge',
    summary: 'Fast keyword search across knowledge titles, summaries, and source excerpts.',
    summaryFa: 'جستجوی کلیدواژه‌ای سریع در میان عناوین، خلاصه‌ها و گزیده‌های اسناد.',
    parameters: [
      { name: 'query', type: 'string', required: true, desc: 'Search query string' },
      { name: 'collectionId', type: 'string', required: false, desc: 'Restrict search to a specific collection shelf' },
      { name: 'type', type: 'string', required: false, desc: 'Filter by item type (research_finding, tip, etc.)' },
      { name: 'language', type: '"en" | "fa"', required: false, desc: 'Filter by language' },
      { name: 'limit', type: 'number', required: false, desc: 'Number of items per page (default: 20)' },
      { name: 'cursor', type: 'string', required: false, desc: 'Pagination cursor for next page' },
    ],
    returns: '{ results: SearchMatchItem[], total: number, nextCursor?: string }',
    exampleCall: {
      name: 'search_knowledge',
      arguments: {
        query: 'bounding box heuristics',
        limit: 10,
      },
    },
  },
  {
    name: 'get_entry',
    summary: 'Fetch an exact knowledge entry by human-readable slug or unique ID in Markdown or JSON.',
    summaryFa: 'دریافت یک مدخل دانشی از طریق نامک خوانا (Slug) یا شناسه با فرمت مارک‌داون یا جی‌سان.',
    parameters: [
      { name: 'idOrSlug', type: 'string', required: true, desc: 'Knowledge item ID (kno-*) or human-readable slug' },
      { name: 'format', type: '"markdown" | "json"', required: false, desc: 'Output format (default: "markdown")' },
    ],
    returns: 'Compact citation-ready Markdown string or full JSON KnowledgeItem entity',
    exampleCall: {
      name: 'get_entry',
      arguments: {
        idOrSlug: 'dual-pass-bounding-box-heuristic',
        format: 'markdown',
      },
    },
  },
  {
    name: 'get_source',
    summary: 'Fetch the original grounded research document or skill and its extracted entry citations.',
    summaryFa: 'دریافت متن کامل سند یا مهارت پژوهشی مبدأ و فهرست مدخل‌های استخراج‌شده از آن.',
    parameters: [
      { name: 'idOrSlug', type: 'string', required: true, desc: 'Source document ID (src-*) or human-readable slug' },
      { name: 'format', type: '"markdown" | "json"', required: false, desc: 'Output format (default: "markdown")' },
    ],
    returns: 'Source Markdown document including metadata header, body text, and extracted citations list',
    exampleCall: {
      name: 'get_source',
      arguments: {
        idOrSlug: 'pdf-table-heuristics',
        format: 'markdown',
      },
    },
  },
  {
    name: 'list_collections',
    summary: 'Enumerate all curated research shelves with their titles, slugs, and entry counts.',
    summaryFa: 'فهرست‌بندی تمامی قفسه‌های پژوهشی همراه با عناوین، نامک‌ها و تعداد مدخل‌ها.',
    parameters: [],
    returns: 'Collection[] array with id, slug, name, nameFa, description, count',
    exampleCall: {
      name: 'list_collections',
      arguments: {},
    },
  },
  {
    name: 'report_outcome',
    summary: 'Agent write path to record empirical operational task execution results.',
    summaryFa: 'مسیر ثبت خروجی عملیاتی عامل‌ها جهت گزارش نتایج تجربی انجام وظایف.',
    parameters: [
      { name: 'task', type: 'string', required: true, desc: 'Task description that was performed' },
      { name: 'appliedKnowledgeIds', type: 'string[]', required: true, desc: 'Array of knowledge item IDs or slugs used' },
      { name: 'appliedRevisionIds', type: 'string[]', required: false, desc: 'Optional exact revision IDs used' },
      { name: 'result', type: '"success" | "failure" | "uncertain"', required: true, desc: 'Outcome evaluation' },
      { name: 'notes', type: 'string', required: false, desc: 'Empirical execution observation notes' },
      { name: 'reportedBy', type: 'string', required: false, desc: 'Agent ID or client name (e.g. "claude-worker-1")' },
    ],
    returns: 'KnowledgeOutcome entity with recordedAt timestamp and assigned ID (requires read_write scope, rate limited)',
    exampleCall: {
      name: 'report_outcome',
      arguments: {
        task: 'Extract complex table from invoice PDF',
        appliedKnowledgeIds: ['kno-table-extract-01'],
        result: 'success',
        notes: 'Dual-pass KDE column boundary split resolved overlapping monetary tokens perfectly.',
        reportedBy: 'claude-desktop-worker',
      },
    },
  },
];

export const ConnectionsPage: React.FC = () => {
  const { repository, version, notifyMutation } = useRepository();
  const { t, locale } = useLocale();
  const { showToast, showError } = useToast();

  // Data states
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sampleEntries, setSampleEntries] = useState<KnowledgeItem[]>([]);
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

  // Test bench simulator state ("Try it")
  const [testTask, setTestTask] = useState<string>(
    'How to extract structured tables from documents using python'
  );
  const [testTools, setTestTools] = useState<string>('python, pdfplumber');
  const [testLanguage, setTestLanguage] = useState<'any' | 'en' | 'fa'>('en');
  const [testBudget, setTestBudget] = useState<number>(4000);
  const [simulatedResponse, setSimulatedResponse] = useState<ContextResult | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Active MCP tool inspector tab
  const [selectedMcpTool, setSelectedMcpTool] = useState<string>('get_context');

  // Snippets tab
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'python' | 'curl_outcome'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // llms.txt copy state
  const [copiedLlmsTxt, setCopiedLlmsTxt] = useState<boolean>(false);

  // Load tokens, collections, and sample knowledge
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [tokList, colList, knoRes] = await Promise.all([
          repository.listTokens(),
          repository.listCollections(),
          repository.listKnowledgePaginated({ limit: 12 }),
        ]);
        if (!active) return;
        setTokens(tokList);
        setCollections(colList);
        setSampleEntries(knoRes.items);
      } catch (err) {
        showError(err, 'Failed to load agent configuration data');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [repository, version, showError]);

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'https://api.wikigraph.internal/api/v1';

  // Generate /llms.txt manifest preview
  const llmsTxtContent = useMemo(() => {
    return renderLlmsTxt({
      baseUrl,
      collections,
      sampleEntries,
    });
  }, [baseUrl, collections, sampleEntries]);

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
        maxTokens: testBudget,
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
  const snippetCurl = `curl -X POST ${baseUrl}/query \\
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
    "maxTokens": ${testBudget}
  }'`;

  // Python snippet for POST /api/v1/query
  const snippetPython = `import requests

url = "${baseUrl}/query"
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
    "maxTokens": ${testBudget}
}

response = requests.post(url, headers=headers, json=payload)
response.raise_for_status()
data = response.json()

print(f"Sufficiency: {data['sufficiency']}")
print(f"Tokens: {data['tokenEstimate']['used']} / {data['tokenEstimate']['budget']}")
print("\\n--- Citation Context Packet ---")
print(data["contextPacket"])`;

  // cURL snippet for POST /api/v1/outcomes (agent outcome reporting)
  const snippetCurlOutcome = `curl -X POST ${baseUrl}/outcomes \\
  -H "Authorization: Bearer <your-read-write-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task": "${testTask.replace(/"/g, '\\"')}",
    "appliedKnowledgeIds": ["kno-table-extract-01"],
    "result": "success",
    "notes": "Verified against test cases with 100% cell alignment.",
    "reportedBy": "agent-worker-01"
  }'`;

  const handleCopySnippet = () => {
    let textToCopy = snippetCurl;
    if (activeSnippetTab === 'python') textToCopy = snippetPython;
    if (activeSnippetTab === 'curl_outcome') textToCopy = snippetCurlOutcome;
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

  const handleCopyLlmsTxt = () => {
    navigator.clipboard.writeText(llmsTxtContent);
    setCopiedLlmsTxt(true);
    setTimeout(() => setCopiedLlmsTxt(false), 2000);
  };

  const activeTool = MCP_TOOLS.find((t) => t.name === selectedMcpTool) || MCP_TOOLS[0];

  return (
    <div className="max-w-[76ch] mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
      {/* 1. Page Header & What This Library Is */}
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {t('forAgents.title')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
            {t('forAgents.subtitle')}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-semibold text-[var(--foreground)] text-xs">
            <Bot className="w-4 h-4 text-[var(--foreground)]" />
            <span>{t('forAgents.overviewTitle')}</span>
          </div>
          <p dir="auto">
            {t('forAgents.overviewDesc')}
          </p>
        </div>
      </header>

      {/* 2. Base URL & Authentication */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
          {t('forAgents.authTitle')}
        </h2>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3 text-xs">
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-[var(--muted)]">API Base URL:</div>
            <code className="block p-2 rounded-md bg-[var(--surface-secondary)] text-[var(--foreground)] font-mono text-xs select-all">
              {baseUrl}
            </code>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-mono text-[var(--muted)]">HTTP Header:</div>
            <code className="block p-2 rounded-md bg-[var(--surface-secondary)] text-[var(--foreground)] font-mono text-xs select-all">
              Authorization: Bearer &lt;your-token-secret&gt;
            </code>
          </div>

          <div className="pt-2 border-t border-[var(--separator)] space-y-1 text-[11px] text-[var(--muted)]">
            <div className="font-semibold text-[var(--foreground)]">Permissions Scopes:</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{t('forAgents.scopeReadOnly')}</li>
              <li>{t('forAgents.scopeReadWrite')}</li>
              <li>{t('forAgents.scopeCollections')}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. The MCP Tool List */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              {t('forAgents.mcpTitle')}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {t('forAgents.mcpDesc')}
            </p>
          </div>
        </div>

        {/* MCP Tool Selector Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-[var(--separator)] pb-2">
          {MCP_TOOLS.map((tool) => (
            <button
              key={tool.name}
              type="button"
              onClick={() => setSelectedMcpTool(tool.name)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                selectedMcpTool === tool.name
                  ? 'bg-[var(--foreground)] text-[var(--surface)] font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)]'
              }`}
            >
              {tool.name}
            </button>
          ))}
        </div>

        {/* Selected Tool Details Card */}
        <div className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-sm font-semibold text-[var(--foreground)]">
                {activeTool.name}
              </div>
              <p className="text-xs text-[var(--muted)] mt-1" dir="auto">
                {locale === 'fa' ? activeTool.summaryFa : activeTool.summary}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-secondary)] text-[var(--foreground)] shrink-0 border border-[var(--border)]">
              MCP tool
            </span>
          </div>

          {/* Parameters Table */}
          {activeTool.parameters.length > 0 ? (
            <div className="space-y-1.5 pt-2 border-t border-[var(--separator)]">
              <div className="font-semibold text-[11px] text-[var(--foreground)] uppercase tracking-wider">
                Parameters
              </div>
              <div className="divide-y divide-[var(--separator)] border border-[var(--border)] rounded-lg overflow-hidden">
                {activeTool.parameters.map((param) => (
                  <div key={param.name} className="p-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-[11px] bg-[var(--surface)]">
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono font-semibold text-[var(--foreground)]">{param.name}</code>
                      <span className="font-mono text-[var(--muted)]">({param.type})</span>
                      {param.required && (
                        <span className="text-rose-500 font-bold text-[10px]">required</span>
                      )}
                    </div>
                    <div className="text-[var(--muted)] text-end sm:text-start max-w-sm">
                      {param.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-[var(--separator)] text-xs text-[var(--muted)] italic">
              No parameters required.
            </div>
          )}

          {/* Return Type */}
          <div className="space-y-1 pt-2 border-t border-[var(--separator)]">
            <div className="font-semibold text-[11px] text-[var(--foreground)] uppercase tracking-wider">
              Returns
            </div>
            <code className="block p-2 rounded-md bg-[var(--surface-secondary)] font-mono text-[11px] text-[var(--foreground)]">
              {activeTool.returns}
            </code>
          </div>

          {/* Example Call */}
          <div className="space-y-1 pt-2 border-t border-[var(--separator)]">
            <div className="font-semibold text-[11px] text-[var(--foreground)] uppercase tracking-wider">
              Example Call
            </div>
            <pre className="p-3 rounded-md bg-[var(--surface-secondary)] font-mono text-[11px] text-[var(--foreground)] overflow-x-auto leading-relaxed select-all" dir="ltr">
              {JSON.stringify(activeTool.exampleCall, null, 2)}
            </pre>
          </div>
        </div>
      </section>

      {/* 4. /llms.txt Directory Manifest Preview */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              {t('forAgents.llmsTxtTitle')}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {t('forAgents.llmsTxtDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLlmsTxt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            {copiedLlmsTxt ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('common.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>{t('forAgents.copyLlmsTxt')}</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] font-mono text-xs text-[var(--foreground)] max-h-72 overflow-y-auto leading-relaxed select-text" dir="ltr">
          <pre className="whitespace-pre-wrap">{llmsTxtContent}</pre>
        </div>
      </section>

      {/* 5. Integration Code Snippets (cURL, Python, Outcomes) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            {t('forAgents.codeExamplesTitle')}
          </h2>

          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveSnippetTab('curl')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeSnippetTab === 'curl'
                  ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              cURL (query)
            </button>
            <button
              type="button"
              onClick={() => setActiveSnippetTab('python')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeSnippetTab === 'python'
                  ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Python
            </button>
            <button
              type="button"
              onClick={() => setActiveSnippetTab('curl_outcome')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeSnippetTab === 'curl_outcome'
                  ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              report_outcome
            </button>
          </div>
        </div>

        <div className="relative group">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] font-mono text-xs text-[var(--foreground)] overflow-x-auto leading-relaxed select-text" dir="ltr">
            <pre>
              {activeSnippetTab === 'curl' && snippetCurl}
              {activeSnippetTab === 'python' && snippetPython}
              {activeSnippetTab === 'curl_outcome' && snippetCurlOutcome}
            </pre>
          </div>

          <button
            type="button"
            onClick={handleCopySnippet}
            className="absolute top-2 end-2 px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
          >
            {copiedSnippet ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span>{t('common.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[var(--muted)]" />
                <span>{t('common.copy')}</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 6. "Try it" Panel (Live Context Retrieval Simulator) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            {t('forAgents.tryItTitle')}
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {t('forAgents.tryItDesc')}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4 shadow-xs">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--foreground)]">
              {t('forAgents.taskDescription')}
            </label>
            <input
              type="text"
              dir="auto"
              value={testTask}
              onChange={(e) => setTestTask(e.target.value)}
              placeholder="Operational technical task prompt..."
              className="w-full p-2.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] focus:bg-[var(--surface)] focus:outline-none focus:border-[var(--foreground)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t('forAgents.requiredTools')}
              </label>
              <input
                type="text"
                dir="auto"
                value={testTools}
                onChange={(e) => setTestTools(e.target.value)}
                placeholder="python, pdfplumber"
                className="w-full p-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] focus:bg-[var(--surface)] focus:outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t('forAgents.targetLanguage')}
              </label>
              <select
                value={testLanguage}
                onChange={(e) => setTestLanguage(e.target.value as any)}
                className="w-full p-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] focus:bg-[var(--surface)] focus:outline-none"
              >
                <option value="any">Any Language</option>
                <option value="en">English (en)</option>
                <option value="fa">Persian (fa)</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="block text-xs font-medium text-[var(--muted)]">
                Token Budget
              </label>
              <input
                type="number"
                min={500}
                max={16000}
                step={500}
                value={testBudget}
                onChange={(e) => setTestBudget(Number(e.target.value) || 4000)}
                className="w-full p-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] focus:bg-[var(--surface)] focus:outline-none font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={simulating || !testTask.trim()}
            onClick={handleRunSimulation}
            className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{simulating ? 'Executing retrieval…' : t('forAgents.executeContract')}</span>
          </button>

          {simulatedResponse && (
            <div className="space-y-3 pt-3 border-t border-[var(--separator)] animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <span className="font-semibold text-[var(--foreground)]">
                  Sufficiency: <span className="uppercase text-[var(--accent)]">{simulatedResponse.sufficiency}</span>
                </span>
                <span className="text-[var(--muted)]">
                  {simulatedResponse.tokenEstimate.used} {t('forAgents.usedTokens')} / {simulatedResponse.tokenEstimate.budget} {t('forAgents.budgetCeiling')}
                </span>
              </div>

              {simulatedResponse.sufficiencyNote && (
                <p className="text-xs text-[var(--muted)] italic">
                  Note: {simulatedResponse.sufficiencyNote}
                </p>
              )}

              {/* Formatted Context Packet */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-[var(--muted)]">Generated Context Packet:</div>
                <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] font-mono text-xs text-[var(--foreground)] max-h-60 overflow-y-auto leading-relaxed select-text" dir="ltr">
                  <pre className="whitespace-pre-wrap">{formatContextMarkdown(simulatedResponse)}</pre>
                </div>
              </div>

              {/* Raw JSON Envelope */}
              <details className="text-xs">
                <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)] font-mono text-[11px]">
                  View Raw ContextResult JSON Envelope ({simulatedResponse.selected.length} selected items)
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] font-mono text-[11px] text-[var(--foreground)] max-h-60 overflow-y-auto leading-relaxed select-text" dir="ltr">
                  {JSON.stringify(simulatedResponse, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </section>

      {/* 7. Token Management (The ONLY write action in the UI) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              {t('forAgents.tokensTitle')}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {t('forAgents.tokensDesc')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('forAgents.generateToken')}</span>
          </button>
        </div>

        {/* Tokens Table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
          {tokens.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--muted)] space-y-1">
              <KeyRound className="w-5 h-5 mx-auto text-[var(--muted)]" />
              <p className="font-medium text-[var(--foreground)]">No machine tokens configured</p>
              <p className="text-[11px]">
                Generate a scoped Bearer token to authorize external agents to query or report outcomes.
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
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {tok.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
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
                        <span>·</span>
                        <span>
                          Scope:{' '}
                          {scopedCols ? (
                            <span className="text-[var(--foreground)]">
                              {scopedCols.map((c) => c.name).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[var(--foreground)]">All Collections</span>
                          )}
                        </span>
                        <span>·</span>
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
      </section>

      {/* Modal 1: Generate New Token */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[var(--separator)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {t('forAgents.generateToken')}
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
                  className="w-full p-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] focus:bg-[var(--surface)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[var(--foreground)] block">
                  Permissions Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    tokenScope === 'read_only'
                      ? 'border-[var(--foreground)] bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold'
                      : 'border-[var(--border)] text-[var(--muted)]'
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
                      ? 'border-[var(--foreground)] bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold'
                      : 'border-[var(--border)] text-[var(--muted)]'
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
                    <div className="text-[10px] opacity-80 mt-0.5">report_outcome & bundle import</div>
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
                      className="rounded border-[var(--border)] cursor-pointer"
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
                              className="rounded border-[var(--border)] cursor-pointer"
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
                  {creating ? 'Generating…' : 'Create Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: One-time Secret Display */}
      {createdSecretData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {t('forAgents.tokenCreated')}: {createdSecretData.token.name}
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {t('forAgents.copySecretNotice')}
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
                  className="p-2 rounded-lg border border-[var(--border)] font-mono text-xs flex-1 bg-[var(--surface-secondary)] text-[var(--foreground)] select-all"
                />
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {copiedSecret ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('common.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('common.copy')}</span>
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

export const ForAgentsPage = ConnectionsPage;
