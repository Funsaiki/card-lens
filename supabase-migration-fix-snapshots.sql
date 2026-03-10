-- Migration: Fix portfolio_snapshots NULL game duplicates
-- The UNIQUE(user_id, snapshot_date, game) constraint doesn't prevent duplicates
-- when game is NULL (PostgreSQL treats NULLs as distinct in UNIQUE constraints).
-- This migration:
--   1. Converts NULL game rows to '_total'
--   2. Removes duplicates (keeps the row with highest value per date)
--   3. Adds a NOT NULL default so this can't happen again

-- Step 1: For each (user_id, snapshot_date) with game IS NULL,
-- keep only the row with the highest total_value_usd, delete the rest.
DELETE FROM public.portfolio_snapshots
WHERE game IS NULL
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, snapshot_date) id
    FROM public.portfolio_snapshots
    WHERE game IS NULL
    ORDER BY user_id, snapshot_date, total_value_usd DESC
  );

-- Step 2: Convert remaining NULL game rows to '_total'
UPDATE public.portfolio_snapshots
SET game = '_total'
WHERE game IS NULL;

-- Step 3: Set a default so future inserts can't have NULL game
ALTER TABLE public.portfolio_snapshots
  ALTER COLUMN game SET NOT NULL,
  ALTER COLUMN game SET DEFAULT '_total';
