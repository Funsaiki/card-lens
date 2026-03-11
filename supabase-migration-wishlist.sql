-- Wishlist migration: Add status column to collection_items
-- Run this in the Supabase SQL Editor

-- 1. Add status column (default 'owned' so existing items stay as-is)
ALTER TABLE public.collection_items
  ADD COLUMN status text NOT NULL DEFAULT 'owned'
  CHECK (status IN ('owned', 'wanted'));

-- 2. Update unique constraint to include status
-- (allows same card to be both owned AND wanted)
ALTER TABLE public.collection_items
  DROP CONSTRAINT collection_items_user_id_card_id_game_variant_key;

ALTER TABLE public.collection_items
  ADD CONSTRAINT collection_items_user_id_card_id_game_variant_status_key
  UNIQUE (user_id, card_id, game, variant, status);

-- 3. Index for filtering by status
CREATE INDEX idx_collection_status ON public.collection_items(user_id, status);
