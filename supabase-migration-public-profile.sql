-- Public profile migration: Add username and collection visibility
-- Run this in the Supabase SQL Editor

-- 1. Add columns to profiles table
ALTER TABLE profiles
  ADD COLUMN username TEXT UNIQUE,
  ADD COLUMN collection_public BOOLEAN NOT NULL DEFAULT false;

-- 2. Enforce URL-safe username format
ALTER TABLE profiles
  ADD CONSTRAINT username_format CHECK (
    username IS NULL OR username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'
  );

-- 3. Index for fast username lookup
CREATE INDEX idx_profiles_username ON profiles (username) WHERE username IS NOT NULL;

-- 4. RLS: anyone can read public profiles
CREATE POLICY "Public profiles are viewable by anyone"
  ON profiles FOR SELECT
  USING (collection_public = true);

-- 5. RLS: anyone can read collection items of public users
CREATE POLICY "Public collections are viewable"
  ON collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = collection_items.user_id
        AND profiles.collection_public = true
    )
  );
