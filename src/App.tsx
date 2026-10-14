import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './locales/useLocale';
import { RepositoryProvider } from './services/RepositoryContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { CollectionsIndexPage } from './pages/CollectionsIndexPage';
import { CollectionPage } from './pages/CollectionPage';
import { SearchPage } from './pages/SearchPage';
import { LoginPage } from './pages/LoginPage';

// Route-level lazy loading for heavier exploration and markdown sub-pages
const DocumentDetailPage = lazy(() =>
  import('./pages/DocumentDetailPage').then((m) => ({ default: m.DocumentDetailPage }))
);
const KnowledgeDetailPage = lazy(() =>
  import('./pages/KnowledgeDetailPage').then((m) => ({ default: m.KnowledgeDetailPage }))
);
const GraphPage = lazy(() =>
  import('./pages/GraphPage').then((m) => ({ default: m.GraphPage }))
);
const ConnectionsPage = lazy(() =>
  import('./pages/ConnectionsPage').then((m) => ({ default: m.ConnectionsPage }))
);

const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] w-full bg-[var(--background)]" aria-busy="true" />
);

/**
 * Single-owner authentication guard.
 * Redirects unauthenticated requests to /login if backend authentication is enforced.
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

                  {/* Authenticated Read-Only Publication Shell */}
                  <Route
                    path="/"
                    element={
                      <AuthGuard>
                        <AppLayout />
                      </AuthGuard>
                    }
                  >
                    {/* Home: Prominent task box, reading list, shelves & recent items */}
                    <Route index element={<HomePage />} />

                    {/* Library catalog */}
                    <Route path="library" element={<LibraryPage />} />

                    {/* Collections */}
                    <Route path="collections" element={<CollectionsIndexPage />} />
                    <Route path="collections/:id" element={<CollectionPage />} />

                    {/* Search */}
                    <Route path="search" element={<SearchPage />} />

                    {/* Article & Document Reading Pages */}
                    <Route
                      path="knowledge/:id"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <KnowledgeDetailPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="documents/:id"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <DocumentDetailPage />
                        </Suspense>
                      }
                    />

                    {/* Directed Map & Agent Connections */}
                    <Route
                      path="graph"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <GraphPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="for-agents"
                      element={
                        <Suspense fallback={<PageLoader />}>
                          <ConnectionsPage />
                        </Suspense>
                      }
                    />

                    {/* Aliases & Redirects */}
                    <Route path="connections" element={<Navigate to="/for-agents" replace />} />
                    <Route path="context" element={<Navigate to="/" replace />} />
                  </Route>

                  {/* Fallback routes */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </ToastProvider>
        </RepositoryProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
