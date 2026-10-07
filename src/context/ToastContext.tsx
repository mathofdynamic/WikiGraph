import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { RepositoryError } from '../types';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  code?: string;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'> & { duration?: number }) => void;
  showError: (err: unknown, fallbackMessage?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type,
      title,
      message,
      code,
      duration = 4500,
    }: Omit<ToastItem, 'id'> & { duration?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, code };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 visible

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const showError = useCallback(
    (err: unknown, fallbackMessage: string = 'An unexpected error occurred') => {
      if (err instanceof RepositoryError) {
        showToast({
          type: 'error',
          title: `Error: ${err.code.replace(/_/g, ' ').toUpperCase()}`,
          message: err.message,
          code: err.code,
          duration: 6000,
        });
      } else if (err instanceof Error) {
        showToast({
          type: 'error',
          message: err.message || fallbackMessage,
          duration: 5000,
        });
      } else if (typeof err === 'string') {
        showToast({
          type: 'error',
          message: err,
          duration: 5000,
        });
      } else {
        showToast({
          type: 'error',
          message: fallbackMessage,
          duration: 5000,
        });
      }
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showError, dismissToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 end-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 border-rose-800'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-100 border-amber-800'
                : 'bg-zinc-900/90 text-zinc-100 border-zinc-700'
            }`}
          >
            {toast.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />}

            <div className="min-w-0 flex-1 space-y-0.5 text-xs">
              {toast.title && <div className="font-semibold">{toast.title}</div>}
              <div className="leading-relaxed break-words">{toast.message}</div>
              {toast.code && (
                <div className="text-[10px] font-mono opacity-60">code: {toast.code}</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
