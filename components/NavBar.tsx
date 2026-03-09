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
      <nav className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <Link href="/" className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors">
          Card Lens
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
              className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
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
