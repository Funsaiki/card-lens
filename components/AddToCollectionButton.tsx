"use client";

import { useState, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { CardData } from "@/types";
import AuthModal from "./AuthModal";

interface AddToCollectionButtonProps {
  card: CardData;
}

type AddStatus = "idle" | "adding" | "added" | "error";

export default function AddToCollectionButton({ card }: AddToCollectionButtonProps) {
  const { user, loading } = useUser();
  const [status, setStatus] = useState<AddStatus>("idle");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    setStatus("adding");

    try {
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data = await res.json();
      setQuantity(data.quantity);
      setStatus("added");

      // Reset after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [user, card]);

  if (loading) return null;

  return (
    <>
      <button
        onClick={handleAdd}
        disabled={status === "adding"}
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
          status === "added"
            ? "bg-green-600/20 text-green-400 border border-green-600/30"
            : status === "error"
              ? "bg-red-600/20 text-red-400 border border-red-600/30"
              : "bg-blue-600 hover:bg-blue-500 text-white"
        }`}
      >
        {status === "adding" ? (
          <>
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Adding...
          </>
        ) : status === "added" ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            In Collection{quantity && quantity > 1 ? ` (x${quantity})` : ""}
          </>
        ) : status === "error" ? (
          "Failed — tap to retry"
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {user ? "Add to Collection" : "Sign in to Collect"}
          </>
        )}
      </button>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
