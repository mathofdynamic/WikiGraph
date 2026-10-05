import React, { useEffect, useState, useRef } from 'react';
import {
  Settings,
  FolderKanban,
  Languages,
  Sun,
  Moon,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Server,
  Info,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { useTheme } from '../context/ThemeContext';
import { Collection } from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const SettingsPage: React.FC = () => {
  const { repository, isDemoMode, setIsDemoMode, resetToFixtures, notifyMutation } =
    useRepository();
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme, isDark } = useTheme();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteColId, setDeleteColId] = useState<string | null>(null);

  // New Collection modal
  const [newColOpen, setNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColNameFa, setNewColNameFa] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Backup import input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    repository.listCollections().then(setCollections);
  }, [repository]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      const created = await repository.createCollection({
        name: newColName,
        nameFa: newColNameFa || newColName,
        description: newColDesc || undefined,
      });

      setCollections((prev) => [...prev, created]);
      setNewColOpen(false);
      setNewColName('');
      setNewColNameFa('');
      setNewColDesc('');
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCollection = async () => {
    if (!deleteColId) return;
    try {
      await repository.deleteCollection(deleteColId);
      setCollections((prev) => prev.filter((c) => c.id !== deleteColId));
      setDeleteColId(null);
      notifyMutation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportBackup = async () => {
    try {
      const [sources, knowledge, cols, outcomes] = await Promise.all([
        repository.listSources(),
        repository.listKnowledge(),
        repository.listCollections(),
        repository.listOutcomes(),
      ]);

      const backup = {
        app: 'WikiGraph',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        collections: cols,
        sources,
        knowledge,
        outcomes,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wikigraph_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = JSON.parse(text);

        if (!data.knowledge || !data.sources) {
          setImportStatus('Invalid backup file structure.');
          return;
        }

        // Store into localStorage
        const store = {
          sources: data.sources || [],
          knowledge: data.knowledge || [],
          collections: data.collections || [],
          outcomes: data.outcomes || [],
        };
        localStorage.setItem('wikigraph_demo_store_v1', JSON.stringify(store));
        setImportStatus('Backup successfully imported! Reloading workspace...');
        notifyMutation();
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        console.error(err);
        setImportStatus('Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = () => {
    resetToFixtures();
    setResetModalOpen(false);
    repository.listCollections().then(setCollections);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#23252a]">
        <div className="flex items-center gap-2 text-xs text-[#8a8f98] uppercase tracking-wider mb-1">
          <span>WikiGraph</span>
          <span>/</span>
          <span className="text-[#828fff] font-medium">
            {t('nav.settings')}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-title text-[#f7f8f8]">
          {t('settings.title')}
        </h2>
        <p className="text-xs sm:text-sm text-[#8a8f98] mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* 1. Language & Direction */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#23252a]">
          <Languages className="w-4 h-4 text-[#828fff]" />
          <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8]">
            {t('settings.language')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between ${
              locale === 'en'
                ? 'border-[#5e6ad2] bg-[#141516]'
                : 'border-[#23252a] bg-[#141516] hover:bg-[#1b1c1d]'
            }`}
          >
            <div>
              <span className="font-semibold text-sm text-[#f7f8f8] block">
                English
              </span>
              <span className="text-xs text-[#8a8f98]">Left-to-right (LTR) layout</span>
            </div>
            {locale === 'en' && <Check className="w-4 h-4 text-[#828fff]" />}
          </button>

          <button
            type="button"
            onClick={() => setLocale('fa')}
            className={`p-3.5 rounded-lg border text-right transition-colors cursor-pointer flex items-center justify-between ${
              locale === 'fa'
                ? 'border-[#5e6ad2] bg-[#141516]'
                : 'border-[#23252a] bg-[#141516] hover:bg-[#1b1c1d]'
            }`}
          >
            <div>
              <span className="font-semibold text-sm text-[#f7f8f8] block">
                فارسی (Persian)
              </span>
              <span className="text-xs text-[#8a8f98]">چینش راست به چپ (RTL) با قلم وزیرمتن</span>
            </div>
            {locale === 'fa' && <Check className="w-4 h-4 text-[#828fff]" />}
          </button>
        </div>
      </div>

      {/* 2. Visual Theme */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#23252a]">
          <Sun className="w-4 h-4 text-[#eab308]" />
          <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8]">
            {t('settings.theme')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-lg border text-start transition-colors cursor-pointer flex items-center justify-between ${
              theme === 'light'
                ? 'border-[#5e6ad2] bg-[#141516]'
                : 'border-[#23252a] bg-[#141516] hover:bg-[#1b1c1d]'
            }`}
          >
            <div>
              <span className="font-semibold text-xs sm:text-sm text-[#f7f8f8] block">
                {t('settings.light')}
              </span>
              <span className="text-[11px] text-[#8a8f98]">Crisp high-contrast light</span>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-[#828fff]" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-lg border text-start transition-colors cursor-pointer flex items-center justify-between ${
              theme === 'dark'
                ? 'border-[#5e6ad2] bg-[#141516]'
                : 'border-[#23252a] bg-[#141516] hover:bg-[#1b1c1d]'
            }`}
          >
            <div>
              <span className="font-semibold text-xs sm:text-sm text-[#f7f8f8] block">
                {t('settings.dark')}
              </span>
              <span className="text-[11px] text-[#8a8f98]">Linear dark canvas (#010102)</span>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-[#828fff]" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-lg border text-start transition-colors cursor-pointer flex items-center justify-between ${
              theme === 'system'
                ? 'border-[#5e6ad2] bg-[#141516]'
                : 'border-[#23252a] bg-[#141516] hover:bg-[#1b1c1d]'
            }`}
          >
            <div>
              <span className="font-semibold text-xs sm:text-sm text-[#f7f8f8] block">
                {t('settings.system')}
              </span>
              <span className="text-[11px] text-[#8a8f98]">Follow OS setting</span>
            </div>
            {theme === 'system' && <Check className="w-4 h-4 text-[#828fff]" />}
          </button>
        </div>
      </div>

      {/* 3. Manage Collections */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#23252a]">
          <div className="flex items-center gap-2.5">
            <FolderKanban className="w-4 h-4 text-[#828fff]" />
            <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8]">
              {t('settings.collections')}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setNewColOpen(true)}
            className="linear-btn-primary text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('settings.newCollection')}</span>
          </button>
        </div>

        <div className="rounded-lg border border-[#23252a] divide-y divide-[#23252a] overflow-hidden bg-[#141516]">
          {collections.map((c) => (
            <div
              key={c.id}
              className="p-3.5 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-semibold text-[#f7f8f8] block">
                  {c.name} / {c.nameFa}
                </span>
                {c.description && (
                  <span className="text-[#8a8f98] text-[11px]">{c.description}</span>
                )}
              </div>

              {collections.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDeleteColId(c.id)}
                  className="p-1 rounded text-[#8a8f98] hover:text-[#fb7185] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Data Management: Export Backup & Reset */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-4">
        <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8] pb-2 border-b border-[#23252a]">
          Data Management & Portability
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="p-4 rounded-xl border border-[#23252a] hover:border-[#5e6ad2] bg-[#141516] hover:bg-[#1b1c1d] text-start space-y-1 cursor-pointer transition-colors"
          >
            <Download className="w-5 h-5 text-[#828fff] mb-1" />
            <span className="font-medium text-xs sm:text-sm text-[#f7f8f8] block">
              {t('settings.exportBackup')}
            </span>
            <span className="text-[11px] text-[#8a8f98] block leading-tight">
              Export complete JSON backup of all research and relationships
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl border border-[#23252a] hover:border-[#5e6ad2] bg-[#141516] hover:bg-[#1b1c1d] text-start space-y-1 cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <Upload className="w-5 h-5 text-[#828fff] mb-1" />
            <span className="font-medium text-xs sm:text-sm text-[#f7f8f8] block">
              {t('settings.importBackup')}
            </span>
            <span className="text-[11px] text-[#8a8f98] block leading-tight">
              Restore workspace from a previously exported JSON backup
            </span>
          </button>

          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="p-4 rounded-xl border border-[#3f1922] hover:border-[#fb7185] bg-[#1a0c10] text-start space-y-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-5 h-5 text-[#fb7185] mb-1" />
            <span className="font-medium text-xs sm:text-sm text-[#fecdd3] block">
              {t('settings.resetDemo')}
            </span>
            <span className="text-[11px] text-[#fda4af]/80 block leading-tight">
              Re-seed with fresh realistic demo reports and knowledge
            </span>
          </button>
        </div>

        {importStatus && (
          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a] text-xs text-[#d0d6e0]">
            {importStatus}
          </div>
        )}
      </div>

      {/* 5. Production Cloudflare Architecture Readiness */}
      <div className="p-5 rounded-xl border border-[#23252a] bg-[#0f1011] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#23252a]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#828fff]" />
            <h3 className="text-sm font-semibold tracking-title text-[#f7f8f8]">
              Cloudflare Pages + D1 Seam Status
            </h3>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#1b1c1d] border border-[#2e3036] text-[#828fff]">
            Repository Pattern Active
          </span>
        </div>

        <p className="text-xs text-[#8a8f98] leading-relaxed">
          The frontend strictly decouples all UI views from persistence using the{' '}
          <code className="px-1.5 py-0.5 bg-[#141516] border border-[#23252a] rounded text-[11px] text-[#d0d6e0]">
            KnowledgeRepository
          </code>{' '}
          contract. All routes are currently serviced by{' '}
          <code className="px-1.5 py-0.5 bg-[#141516] border border-[#23252a] rounded text-[11px] text-[#d0d6e0]">
            MockKnowledgeRepository
          </code>
          . When Codex wires Cloudflare Pages Functions + D1, simply toggle to{' '}
          <code className="px-1.5 py-0.5 bg-[#141516] border border-[#23252a] rounded text-[11px] text-[#d0d6e0]">
            ApiKnowledgeRepository
          </code>
          .
        </p>

        <div className="flex items-center gap-3 pt-1 text-xs">
          <span className="text-[#8a8f98]">Active Adapter:</span>
          <span className="font-semibold text-[#f7f8f8]">
            {isDemoMode ? 'MockKnowledgeRepository (Local Demo)' : 'ApiKnowledgeRepository (/api/v1)'}
          </span>
        </div>
      </div>

      {/* Create Collection Modal */}
      {newColOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[#0f1011] rounded-xl border border-[#23252a] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-title text-[#f7f8f8]">
                {t('settings.newCollection')}
              </h3>
              <button
                type="button"
                onClick={() => setNewColOpen(false)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Collection Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  نام مجموعه (فارسی)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثلا: هماهنگی توزیع‌شده"
                  value={newColNameFa}
                  onChange={(e) => setNewColNameFa(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#23252a]">
                <button
                  type="button"
                  onClick={() => setNewColOpen(false)}
                  className="linear-btn-secondary text-xs sm:text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary text-xs sm:text-sm"
                >
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title={t('settings.resetDemo')}
        description={t('settings.resetConfirm')}
        isDestructive
        onConfirm={handleConfirmReset}
        onCancel={() => setResetModalOpen(false)}
      />

      {/* Delete Collection Modal */}
      <ConfirmModal
        isOpen={deleteColId !== null}
        title="Delete Collection"
        description="Are you sure you want to delete this collection?"
        isDestructive
        onConfirm={handleDeleteCollection}
        onCancel={() => setDeleteColId(null)}
      />
    </div>
  );
};
