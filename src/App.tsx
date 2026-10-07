import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './locales/useLocale';
import { RepositoryProvider } from './services/RepositoryContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

import { LibraryPage } from './pages/LibraryPage';
import { ContextPage } from './pages/ContextPage';
import { OutcomesPage } from './pages/OutcomesPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { KnowledgeDetailPage } from './pages/KnowledgeDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ImportPage } from './pages/ImportPage';
import { ReviewPage } from './pages/ReviewPage';
import { LoginPage } from './pages/LoginPage';
import { GraphPage } from './pages/GraphPage';

/**
 * Single-owner authentication guard.
 * Redirects unauthenticated requests to /login.
 */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <RepositoryProvider>
          <ToastProvider>
            <AuthProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public Single-Owner Login Screen */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* Authenticated Application Shell with Persistent Left Sidebar */}
                  <Route
                    path="/"
                    element={
                      <AuthGuard>
                        <AppLayout />
                      </AuthGuard>
                    }
                  >
                    <Route index element={<Navigate to="/library" replace />} />
                    <Route path="library" element={<LibraryPage />} />
                    <Route path="review" element={<ReviewPage />} />
                    <Route path="graph" element={<GraphPage />} />
                    <Route path="context" element={<ContextPage />} />
                    <Route path="import" element={<ImportPage />} />
                    <Route path="outcomes" element={<OutcomesPage />} />
                    <Route path="connections" element={<ConnectionsPage />} />
                    <Route path="documents/:id" element={<DocumentDetailPage />} />
                    <Route path="knowledge/:id" element={<KnowledgeDetailPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>

                  {/* Fallback routes */}
                  <Route path="*" element={<Navigate to="/library" replace />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </ToastProvider>
        </RepositoryProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
