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
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeLinecap="round">
              <path d="M3 8V5a2 2 0 0 1 2-2h3" strokeWidth="2.5" />
              <path d="M16 3h3a2 2 0 0 1 2 2v3" strokeWidth="2.5" />
              <path d="M21 16v3a2 2 0 0 1-2 2h-3" strokeWidth="2.5" />
              <path d="M8 21H5a2 2 0 0 1-2-2v-3" strokeWidth="2.5" />
              <rect x="8" y="6" width="8" height="12" rx="1" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
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
