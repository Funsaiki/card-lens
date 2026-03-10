"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// Load Google Identity Services script once
let gisLoaded = false;
function loadGoogleScript(): Promise<void> {
  if (gisLoaded || typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    if (document.getElementById("google-gis")) {
      gisLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gis";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => { gisLoaded = true; resolve(); };
    document.head.appendChild(script);
  });
}

type AuthTab = "signin" | "signup";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const supabase = createClient();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Preload Google script when modal opens
  useEffect(() => {
    if (open && GOOGLE_CLIENT_ID) loadGoogleScript();
  }, [open]);

  const handleGoogle = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      // Fallback to Supabase OAuth if no client ID
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      return;
    }

    setError(null);
    setGoogleLoading(true);
    await loadGoogleScript();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      setError("Failed to load Google Sign-In");
      setGoogleLoading(false);
      return;
    }

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential?: string }) => {
        if (!response.credential) {
          setError("Google sign-in cancelled");
          setGoogleLoading(false);
          return;
        }
        try {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
          });
          if (error) {
            setError(error.message);
          } else {
            onCloseRef.current();
            window.location.reload();
          }
        } catch {
          setError("Failed to sign in with Google");
        }
        setGoogleLoading(false);
      },
    });

    // Show One Tap prompt; if blocked/skipped, fallback to Supabase OAuth
    google.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setGoogleLoading(false);
        // Fallback to Supabase redirect flow
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
      }
    });
  }, [supabase]);

  const handleDiscord = useCallback(async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }, [supabase]);

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        } else {
          onClose();
          window.location.reload();
        }
      } else {
        if (!username.trim()) {
          setError("Please choose a username");
          setLoading(false);
          return;
        }
        if (!acceptedTerms) {
          setError("You must accept the Terms of Use and Privacy Policy");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              display_name: username.trim(),
            },
          },
        });
        if (error) {
          setError(error.message);
        } else {
          setConfirmSent(true);
        }
      }

      setLoading(false);
    },
    [tab, email, password, username, acceptedTerms, supabase, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            {tab === "signin" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-xs text-zinc-500 mb-5">
            {tab === "signin"
              ? "Sign in to manage your collection"
              : "Create an account to start collecting"}
          </p>

          {confirmSent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-base font-medium text-white">Check your email</p>
              <p className="text-sm text-zinc-400 mt-2">
                We sent a confirmation link to
              </p>
              <p className="text-sm text-blue-400 font-medium mt-1">{email}</p>
              <p className="text-xs text-zinc-500 mt-4">
                Click the link to activate your account. Check your spam folder if you don&apos;t see it.
              </p>
              <button
                onClick={() => { setConfirmSent(false); setTab("signin"); setError(null); }}
                className="mt-5 px-4 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* OAuth */}
              <div className="space-y-2 mb-4">
                <button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-200 transition-colors disabled:opacity-50"
                >
                  {googleLoading ? (
                    <span className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Continue with Google
                </button>
                <button
                  onClick={handleDiscord}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-200 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Continue with Discord
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 uppercase">or</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {tab === "signup" && (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    minLength={3}
                    maxLength={30}
                    className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 pr-9 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {tab === "signup" && (
                  <>
                    {password.length > 0 && (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              password.length >= level * 3
                                ? password.length >= 12
                                  ? "bg-green-500"
                                  : password.length >= 9
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                                : "bg-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                        I agree to the{" "}
                        <Link href="/terms" target="_blank" className="text-blue-400 hover:text-blue-300 underline" onClick={(e) => e.stopPropagation()}>
                          Terms of Use
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" target="_blank" className="text-blue-400 hover:text-blue-300 underline" onClick={(e) => e.stopPropagation()}>
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {loading ? "..." : tab === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              {error && (
                <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
              )}

              {/* Tab switch */}
              <p className="mt-4 text-xs text-zinc-500 text-center">
                {tab === "signin" ? (
                  <>
                    No account?{" "}
                    <button onClick={() => { setTab("signup"); setError(null); }} className="text-blue-400 hover:text-blue-300">
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button onClick={() => { setTab("signin"); setError(null); }} className="text-blue-400 hover:text-blue-300">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
