import React, { useEffect, useState, useRef } from 'react';
import {
  Settings,
  Languages,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  FolderOpen,
  X,
  Server,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { useTheme } from '../context/ThemeContext';
import { Collection } from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const SettingsPage: React.FC = () => {
  const { repository, resetToFixtures, notifyMutation } = useRepository();
  const { t, locale, setLocale } = useLocale();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteColId, setDeleteColId] = useState<string | null>(null);

  // New Collection modal
  const [newColOpen, setNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColNameFa, setNewColNameFa] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Backup import
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
      a.download = `wikigraph_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.collections && Array.isArray(json.collections)) {
          localStorage.setItem('wikigraph_collections', JSON.stringify(json.collections));
        }
        if (json.sources && Array.isArray(json.sources)) {
          localStorage.setItem('wikigraph_sources', JSON.stringify(json.sources));
        }
        if (json.knowledge && Array.isArray(json.knowledge)) {
          localStorage.setItem('wikigraph_knowledge', JSON.stringify(json.knowledge));
        }
        setImportStatus('Backup successfully restored.');
        notifyMutation();
        const updatedCols = await repository.listCollections();
        setCollections(updatedCols);
      } catch (err) {
        console.error(err);
        setImportStatus('Failed to restore backup: Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    await resetToFixtures();
    setResetModalOpen(false);
    const updatedCols = await repository.listCollections();
    setCollections(updatedCols);
    notifyMutation();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="pb-3 border-b border-zinc-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
          {t('settings.title')}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      {importStatus && (
        <div className="p-3.5 rounded-xl border border-blue-900/40 bg-blue-950/20 text-xs text-blue-300 flex items-center justify-between">
          <span>{importStatus}</span>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grouped Section 1: Localization & Language */}
      <div className="rounded-xl border border-zinc-800 bg-[#18181b] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Languages className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            {t('settings.languageSection')}
          </h2>
        </div>

        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-zinc-200 block">Workspace Language</span>
            <span className="text-[11px] text-zinc-500">Select interface language and text direction (LTR / RTL)</span>
          </div>

          <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                locale === 'en'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLocale('fa')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                locale === 'fa'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              فارسی (Persian)
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Section 2: Research Collections Management */}
      <div className="rounded-xl border border-zinc-800 bg-[#18181b] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Research Domains & Collections
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setNewColOpen(true)}
            className="heroui-btn-primary text-xs py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Collection</span>
          </button>
        </div>

        <div className="divide-y divide-zinc-800">
          {collections.map((col) => (
            <div
              key={col.id}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-850/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-100">{col.name}</span>
                  {col.nameFa && col.nameFa !== col.name && (
                    <span className="text-xs text-zinc-400 font-normal">({col.nameFa})</span>
                  )}
                </div>
                {col.description && (
                  <p className="text-[11px] text-zinc-400 truncate max-w-md mt-0.5">
                    {col.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDeleteColId(col.id)}
                className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                title="Delete Collection"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Grouped Section 3: Storage & Workspace Hygiene */}
      <div className="rounded-xl border border-zinc-800 bg-[#18181b] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            {t('settings.storageSection')}
          </h2>
        </div>

        <div className="p-4 space-y-4 divide-y divide-zinc-800">
          {/* Storage Description */}
          <div className="text-xs text-zinc-400 leading-relaxed">
            {t('settings.storageDesc')}
          </div>

          {/* Backup & Restore Controls */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-zinc-200 block">Workspace Backup</span>
              <span className="text-[11px] text-zinc-500">Download snapshot or restore from a JSON backup file</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="heroui-btn-secondary text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="heroui-btn-secondary text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>
          </div>

          {/* Reset Workspace */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-rose-400 block">{t('settings.btnReset')}</span>
              <span className="text-[11px] text-zinc-500">Reset all documents and knowledge back to clean fixtures</span>
            </div>

            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 border border-rose-900/50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 inline me-1.5" />
              <span>Reset Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Collection Modal */}
      {newColOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">Add Collection</h3>
              <button
                type="button"
                onClick={() => setNewColOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. LLM Reasoning Heuristics"
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Name (Persian / Alternate)
                </label>
                <input
                  type="text"
                  value={newColNameFa}
                  onChange={(e) => setNewColNameFa(e.target.value)}
                  placeholder="e.g. روش‌های استدلال مدل‌های زبانی"
                  className="heroui-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Scope and purpose..."
                  className="heroui-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewColOpen(false)}
                  className="heroui-btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="heroui-btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Collection Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteColId)}
        title="Delete Collection"
        description="Are you sure you want to delete this collection? Existing knowledge units will not be deleted."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        isDestructive
        onConfirm={handleDeleteCollection}
        onCancel={() => setDeleteColId(null)}
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title={t('settings.resetConfirmTitle')}
        description={t('settings.resetConfirmDesc')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        isDestructive
        onConfirm={handleReset}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
};
