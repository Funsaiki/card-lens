"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useTermsAcceptance(user: User | null) {
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNeedsAcceptance(false);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("accepted_terms_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setNeedsAcceptance(!data?.accepted_terms_at);
        setLoading(false);
      });
  }, [user]);

  const markAccepted = useCallback(() => {
    setNeedsAcceptance(false);
  }, []);

  return { needsAcceptance, loading, markAccepted };
}
