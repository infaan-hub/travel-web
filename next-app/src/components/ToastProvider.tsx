"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

type Toast = { id: number; kind: ToastKind; message: string };

type ToastContextValue = {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: {
        success: (message: string) => push("success", message),
        error: (message: string) => push("error", message),
        info: (message: string) => push("info", message),
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast-${item.kind}`}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue["toast"] {
  const context = useContext(ToastContext);
  if (!context) {
    // Rendering outside the provider should never break the page.
    return {
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return context.toast;
}

/** Small helper for pages that only need a one-off message. */
export function useToastEffect(): void {
  useEffect(() => {
    // Placeholder hook kept for API stability; behaviour lives in useToast.
  }, []);
}
