"use client";

import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const MAX_TOASTS = 3;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      return next.slice(-MAX_TOASTS);
    });
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const toast = {
    success: (message: string) => addToast("success", message),
    error:   (message: string) => addToast("error", message),
    warning: (message: string) => addToast("warning", message),
    info:    (message: string) => addToast("info", message),
  };

  return { toasts, toast, removeToast };
}
