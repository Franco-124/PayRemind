"use client";

import { createContext, useContext } from "react";
import { useToast } from "@/app/hooks/useToast";
import { ToastContainer } from "./toast-notification";

type ToastAPI = {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  warning: (msg: string) => void;
  info:    (msg: string) => void;
};

const ToastContext = createContext<ToastAPI>({
  success: () => {},
  error:   () => {},
  warning: () => {},
  info:    () => {},
});

export function useToastContext() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, toast, removeToast } = useToast();
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}
