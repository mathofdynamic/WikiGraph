import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRepository } from '../services/RepositoryContext';
import { useToast } from './ToastContext';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
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
            message: 'Authenticated successfully as workspace owner.',
          });
          return true;
        }
        return false;
      } catch (err) {
        showError(err, 'Authentication failed. Incorrect password.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [repository, showError, showToast]
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
        message: 'Logged out of workspace session.',
      });
    }
  }, [repository, showToast]);

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
