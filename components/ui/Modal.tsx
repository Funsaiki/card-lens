"use client";

import { ReactNode } from "react";

export default function Modal({ children, onClose, maxWidth = "sm" }: {
  children: ReactNode;
  onClose?: () => void;
  maxWidth?: "sm" | "md";
}) {
  const widths = { sm: "max-w-sm", md: "max-w-md" };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={`relative w-full ${widths[maxWidth]} bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-scale-in`}>
        {children}
      </div>
    </div>
  );
}
