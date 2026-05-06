"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastMessage = {
  id: number;
  message: string;
  type: ToastType;
};

let toastId = 0;
const listeners: Array<(toast: ToastMessage) => void> = [];
const recentMessages = new Map<string, number>();

export function showToast(message: string, type: ToastType = "info") {
  // Prevent duplicate messages within 2 seconds
  const now = Date.now();
  const lastShown = recentMessages.get(message);
  if (lastShown && now - lastShown < 2000) {
    return; // Skip duplicate toast
  }
  
  recentMessages.set(message, now);
  
  // Clean up old entries
  setTimeout(() => {
    recentMessages.delete(message);
  }, 2000);
  
  const toast: ToastMessage = { id: toastId++, message, type };
  listeners.forEach((listener) => listener(toast));
}

export function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (toast: ToastMessage) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl px-6 py-4 shadow-2xl text-white min-w-80 animate-slide-in ${
            toast.type === "success"
              ? "bg-gradient-to-r from-green-600 to-green-700"
              : toast.type === "error"
              ? "bg-gradient-to-r from-red-600 to-red-700"
              : "bg-gradient-to-r from-blue-600 to-blue-700"
          }`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
