import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './locales/useLocale';
import { RepositoryProvider } from './services/RepositoryContext';
import { AppLayout } from './components/layout/AppLayout';

import { LibraryPage } from './pages/LibraryPage';
import { GraphPage } from './pages/GraphPage';
import { ContextPage } from './pages/ContextPage';
import { ImportPage } from './pages/ImportPage';
import { OutcomesPage } from './pages/OutcomesPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { KnowledgeDetailPage } from './pages/KnowledgeDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <RepositoryProvider>
          <BrowserRouter>
            <Routes>
              {/* Standalone Login Screen */}
              <Route path="/login" element={<LoginPage />} />

              {/* Main Application with AppLayout Shell */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/library" replace />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="graph" element={<GraphPage />} />
                <Route path="context" element={<ContextPage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="outcomes" element={<OutcomesPage />} />
                <Route path="connections" element={<ConnectionsPage />} />
                <Route path="documents/:id" element={<DocumentDetailPage />} />
                <Route path="knowledge/:id" element={<KnowledgeDetailPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/library" replace />} />
            </Routes>
          </BrowserRouter>
        </RepositoryProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
