-- Migration: Add portfolio_snapshots table
-- Run this in the Supabase SQL Editor if you already have the base schema

create table if not exists public.portfolio_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  snapshot_date date not null,
  game text, -- null = total across all games
  total_value_usd numeric(12, 2) not null default 0,
  card_count integer not null default 0,
  unique_cards integer not null default 0,
  created_at timestamptz default now() not null,

  unique(user_id, snapshot_date, game)
);

alter table public.portfolio_snapshots enable row level security;

create policy "Users can read own snapshots"
  on public.portfolio_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert own snapshots"
  on public.portfolio_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update own snapshots"
  on public.portfolio_snapshots for update using (auth.uid() = user_id);

create index if not exists idx_snapshots_user_date
  on public.portfolio_snapshots(user_id, snapshot_date desc);
create index if not exists idx_snapshots_user_game_date
  on public.portfolio_snapshots(user_id, game, snapshot_date desc);
