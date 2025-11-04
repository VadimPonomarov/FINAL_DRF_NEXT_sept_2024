'use client';

import * as React from 'react';

type ToastType = 'default' | 'destructive';

type Toast = {
  id: string;
  title: string;
  description: string;
  type?: ToastType;
};

type ToastContextType = {
  toast: (props: Omit<Toast, 'id'>) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback(({ title, description, type = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((currentToasts) => [...currentToasts, { id, title, description, type }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-0 right-0 z-50 flex flex-col p-4 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${
              toast.type === 'destructive' ? 'bg-red-600' : 'bg-gray-800'
            } text-white rounded-lg shadow-lg p-4 w-80 relative`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{toast.title}</h3>
                <p className="text-sm opacity-90">{toast.description}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
