"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";
import UserMenu from "./UserMenu";
import AuthModal from "./AuthModal";
import TermsAcceptanceModal from "./TermsAcceptanceModal";

export default function NavBar() {
  const { user, loading } = useUser();
  const { needsAcceptance, markAccepted } = useTermsAcceptance(user);
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <nav className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
            Card Lens
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/collection"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Collection
            </Link>
          )}

          {loading ? (
            <div className="w-6 h-6" />
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 rounded-lg border border-white/[0.08] transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      {needsAcceptance && <TermsAcceptanceModal onAccepted={markAccepted} />}
    </>
  );
}
