"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserProfile } from "@/types";

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

export default function CollectionVisibilityToggle({ onProfileChange }: {
  onProfileChange?: () => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setProfile(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const togglePublic = async () => {
    if (!profile) return;

    // If toggling to public and no username, show editor
    if (!profile.collectionPublic && !profile.username) {
      setEditing(true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionPublic: !profile.collectionPublic }),
      });
      if (!res.ok) throw new Error();
      setProfile({ ...profile, collectionPublic: !profile.collectionPublic });
      toast.success(profile.collectionPublic ? "Collection is now private" : "Collection is now public");
      onProfileChange?.();
    } catch {
      toast.error("Failed to update visibility");
    }
    setSaving(false);
  };

  const saveUsername = async () => {
    const value = username.toLowerCase().trim();
    if (!USERNAME_RE.test(value)) {
      toast.error("3-30 characters, lowercase letters, numbers, hyphens and underscores");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value, collectionPublic: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setProfile({ username: value, collectionPublic: true });
      setEditing(false);
      toast.success("Profile updated! Collection is now public.");
      onProfileChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  };

  const copyUrl = () => {
    if (!profile?.username) return;
    const url = `${window.location.origin}/u/${profile.username}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return null;
  if (!profile) return null;

  const publicUrl = profile.username ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${profile.username}` : "";

  return (
    <div className="space-y-2">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            placeholder="username"
            maxLength={30}
            className="flex-1 px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500/40 focus:outline-none"
          />
          <button
            onClick={saveUsername}
            disabled={saving || !USERNAME_RE.test(username)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors"
          >
            {saving ? "..." : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* Toggle */}
          <button
            onClick={togglePublic}
            disabled={saving}
            className="flex items-center gap-2 text-xs"
          >
            <div className={`relative w-8 h-4.5 rounded-full transition-colors ${profile.collectionPublic ? "bg-indigo-600" : "bg-zinc-700"}`}>
              <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${profile.collectionPublic ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-zinc-400">{profile.collectionPublic ? "Public" : "Private"}</span>
          </button>

          {/* Share URL */}
          {profile.collectionPublic && profile.username && (
            <button
              onClick={copyUrl}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-md hover:bg-indigo-500/20 transition-colors"
            >
              {copied ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
              {copied ? "Copied!" : publicUrl.replace(/^https?:\/\//, "")}
            </button>
          )}

          {/* Edit username */}
          {profile.username && (
            <button
              onClick={() => { setUsername(profile.username ?? ""); setEditing(true); }}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
