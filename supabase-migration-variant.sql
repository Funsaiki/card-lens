-- Migration: add variant column to collection_items
-- Run this in Supabase SQL Editor

-- 1. Add the variant column (nullable for backwards compat, defaults to 'normal')
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS variant text DEFAULT 'normal';

-- 2. Backfill existing rows
UPDATE public.collection_items SET variant = 'normal' WHERE variant IS NULL;

-- 3. Drop the old unique constraint and create a new one including variant
ALTER TABLE public.collection_items
  DROP CONSTRAINT IF EXISTS collection_items_user_id_card_id_game_key;

ALTER TABLE public.collection_items
  ADD CONSTRAINT collection_items_user_id_card_id_game_variant_key
  UNIQUE (user_id, card_id, game, variant);
