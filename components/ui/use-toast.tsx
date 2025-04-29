"use client";
// Adapted from shadcn/ui toast implementation
import { useState, useEffect, createContext, useContext } from "react";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastContextType = {
  toast: (props: ToastProps) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = (props: ToastProps) => {
    setToasts((prev) => [...prev, props]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 5000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container could be rendered here */}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    // For now, provide a basic implementation that works without the provider
    return {
      toast: (props: ToastProps) => {
        console.log("Toast:", props);
      },
    };
  }

  return context;
}
