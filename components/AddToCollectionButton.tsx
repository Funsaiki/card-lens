"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import Spinner from "@/components/ui/Spinner";
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
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup timeout on unmount
  useEffect(() => () => { clearTimeout(resetTimerRef.current); }, []);

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
      toast.success(data.quantity > 1 ? `${card.name} (x${data.quantity})` : `${card.name} added`);

      // Reset after 3 seconds
      resetTimerRef.current = setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      toast.error("Failed to add card");
      resetTimerRef.current = setTimeout(() => setStatus("idle"), 3000);
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
            ? "bg-green-500/10 text-green-400 border border-green-500/20"
            : status === "error"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm shadow-indigo-600/20"
        }`}
      >
        {status === "adding" ? (
          <>
            <Spinner />
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
