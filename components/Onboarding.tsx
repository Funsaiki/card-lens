"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "card-lens-onboarding-done";

const STEPS = [
  {
    title: "Welcome to Card Lens",
    description: "Recognize trading cards in real-time using your camera. Let's walk through the basics.",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
  {
    title: "1. Index a card set",
    description: "Open the Index tab in the sidebar, pick a set, and click \"Index Set\". This downloads card images and builds a local database for recognition.",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75" />
      </svg>
    ),
  },
  {
    title: "2. Start the camera",
    description: "Use your webcam directly, or connect your phone as a wireless camera via QR code for better angles.",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "3. Scan your cards",
    description: "Center a card inside the frame guide. After a few frames, it'll be recognized and you'll see its name, set, rarity and price.",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    title: "You're all set!",
    description: "You can reopen this guide anytime with the ? button in the top bar. Happy scanning!",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

interface OnboardingProps {
  show: boolean;
  onDone: () => void;
}

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const reopen = useCallback(() => {
    setShow(true);
  }, []);

  return { show, dismiss, reopen };
}

export default function Onboarding({ show, onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);

  // Reset step when re-opened
  useEffect(() => {
    if (show) setStep(0);
  }, [show]);

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onDone}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-scale-in">
        {/* Progress bar */}
        <div className="h-0.5 bg-zinc-800">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="text-blue-400 flex justify-center mb-4">
            {current.icon}
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {current.title}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === step
                  ? "bg-blue-500 w-4"
                  : i < step
                    ? "bg-blue-500/40"
                    : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-5">
          {isFirst ? (
            <button
              onClick={onDone}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}

          <button
            onClick={() => {
              if (isLast) {
                onDone();
              } else {
                setStep((s) => s + 1);
              }
            }}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isLast
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
