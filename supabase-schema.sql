-- Card Lens: Supabase schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  accepted_terms_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url, accepted_terms_at)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Collection items table
create table public.collection_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  card_id text not null,
  game text not null check (game in ('pokemon', 'onepiece', 'riftbound', 'hololive')),
  card_name text not null,
  card_set text,
  card_rarity text,
  card_image_url text,
  card_data jsonb,
  quantity integer default 1 not null check (quantity > 0),
  condition text default 'near_mint',
  variant text default 'normal',
  notes text,
  added_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique(user_id, card_id, game, variant)
);

alter table public.collection_items enable row level security;

create policy "Users can manage own collection"
  on public.collection_items for all using (auth.uid() = user_id);

create index idx_collection_user_game on public.collection_items(user_id, game);
create index idx_collection_card_id on public.collection_items(card_id);

-- Migration: add accepted_terms_at to existing profiles
-- Run this if you already have the profiles table:
--
-- alter table public.profiles add column if not exists accepted_terms_at timestamptz;
--
-- Then update the trigger with the new handle_new_user() function above.

-- 3. Stats view
create view public.collection_stats as
select
  user_id,
  game,
  count(*) as unique_cards,
  sum(quantity) as total_cards
from public.collection_items
group by user_id, game;

-- 4. Portfolio snapshots (daily value tracking)
create table public.portfolio_snapshots (
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

create index idx_snapshots_user_date
  on public.portfolio_snapshots(user_id, snapshot_date desc);
create index idx_snapshots_user_game_date
  on public.portfolio_snapshots(user_id, game, snapshot_date desc);
