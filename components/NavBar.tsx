"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";
import UserMenu from "./UserMenu";
import AuthModal from "./AuthModal";
import TermsAcceptanceModal from "./TermsAcceptanceModal";

interface NavBarProps {
  /** Optional subtitle shown next to the logo (e.g. game name) */
  subtitle?: string;
  /** Extra action buttons rendered before the nav links */
  extraActions?: ReactNode;
  /** Content rendered below the main row (e.g. search bar) */
  children?: ReactNode;
  /** Use compact padding (scan page) */
  compact?: boolean;
}

export default function NavBar({ subtitle, extraActions, children, compact }: NavBarProps) {
  const { user, loading } = useUser();
  const { needsAcceptance, markAccepted } = useTermsAcceptance(user);
  const [showAuth, setShowAuth] = useState(false);
  const pathname = usePathname();
  const isCollection = pathname === "/collection";
  const isScan = pathname === "/scan";

  return (
    <>
      <nav className={`sticky top-0 z-40 flex flex-col border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md ${compact ? "" : ""}`}>
        <div className={`flex items-center justify-between ${compact ? "px-3 py-2" : "px-5 py-3"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeLinecap="round">
                  <path d="M3 8V5a2 2 0 0 1 2-2h3" strokeWidth="2.5" />
                  <path d="M16 3h3a2 2 0 0 1 2 2v3" strokeWidth="2.5" />
                  <path d="M21 16v3a2 2 0 0 1-2 2h-3" strokeWidth="2.5" />
                  <path d="M8 21H5a2 2 0 0 1-2-2v-3" strokeWidth="2.5" />
                  <rect x="8" y="6" width="8" height="12" rx="1" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
                </svg>
              </div>
              {!subtitle && (
                <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  Card Lens
                </span>
              )}
            </Link>
            {subtitle && (
              <span className="text-sm font-medium text-zinc-200 truncate">{subtitle}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {extraActions}

            {user && !isScan && (
              isCollection ? (
                <Link
                  href="/"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  Scan
                </Link>
              ) : (
                <Link
                  href="/collection"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Collection
                </Link>
              )
            )}

            <a
              href="https://ko-fi.com/funsaiki"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-pink-300 hover:text-pink-200 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-lg transition-colors"
              title="Support Card Lens"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="hidden sm:inline">Donate</span>
            </a>

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
        </div>

        {children}
      </nav>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      {needsAcceptance && <TermsAcceptanceModal onAccepted={markAccepted} />}
    </>
  );
}
