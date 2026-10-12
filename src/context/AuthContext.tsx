import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRepository } from '../services/RepositoryContext';
import { useToast } from './ToastContext';
import { useLocale } from '../locales/useLocale';
import { RepositoryError } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { repository, isDemoMode } = useRepository();
  const { showError, showToast } = useToast();
  const { t } = useLocale();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check initial session
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        setIsLoading(true);
        const res = await repository.getSession();
        if (active) {
          setIsAuthenticated(Boolean(res.authenticated));
        }
      } catch (err) {
        if (active) {
          // If session fails (e.g. 401 in api mode), mark unauthenticated
          setIsAuthenticated(false);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    checkSession();
    return () => {
      active = false;
    };
  }, [repository, isDemoMode]);

  const login = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        const res = await repository.login(password);
        if (res.success) {
          setIsAuthenticated(true);
          showToast({
            type: 'success',
            message: t('auth.loginSuccess'),
          });
          return true;
        }
        return false;
      } catch (err) {
        showError(err, t('auth.loginFailed'));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [repository, showError, showToast, t]
  );

  const logout = useCallback(async () => {
    try {
      await repository.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setIsAuthenticated(false);
      showToast({
        type: 'info',
        message: t('auth.logoutSuccess'),
      });
    }
  }, [repository, showToast, t]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
