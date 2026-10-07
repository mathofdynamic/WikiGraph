import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { KnowledgeRepository } from './KnowledgeRepository';
import { MockKnowledgeRepository } from './mockRepository';
import { ApiKnowledgeRepository } from './apiRepository';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/storage';

interface RepositoryContextType {
  repository: KnowledgeRepository;
  isDemoMode: boolean;
  setDemoMode: (isDemo: boolean) => void;
  setIsDemoMode: (isDemo: boolean) => void;
  resetToFixtures: () => Promise<void>;
  version: number;
  notifyMutation: () => void;
}

const RepositoryContext = createContext<RepositoryContextType | null>(null);

const DEMO_MODE_STORAGE_KEY = 'wikigraph_pref_mode';

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // By default, this frontend prototype explicitly enables demo mode.
  // In production, when exported, it can be set to false or configured via env.
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = safeLocalStorageGet(DEMO_MODE_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [version, setVersion] = useState(0);

  const notifyMutation = () => {
    setVersion((v) => v + 1);
  };

  const handleSetDemoMode = (demo: boolean) => {
    setIsDemoMode(demo);
    safeLocalStorageSet(DEMO_MODE_STORAGE_KEY, String(demo));
    notifyMutation();
  };

  const mockRepo = useMemo(() => new MockKnowledgeRepository(), []);
  const apiRepo = useMemo(() => new ApiKnowledgeRepository(), []);

  const repository: KnowledgeRepository = isDemoMode ? mockRepo : apiRepo;

  const handleResetToFixtures = async () => {
    await repository.resetDemoStore();
    notifyMutation();
  };

  return (
    <RepositoryContext.Provider
      value={{
        repository,
        isDemoMode,
        setDemoMode: handleSetDemoMode,
        setIsDemoMode: handleSetDemoMode,
        resetToFixtures: handleResetToFixtures,
        version,
        notifyMutation,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
};

export function useRepository(): RepositoryContextType {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return ctx;
}
