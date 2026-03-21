-- ============================================
-- Syngenta — A Ponte da Produtividade
-- Supabase Migration
-- ============================================

-- ── Players ──
create table if not exists players (
  id         text primary key,
  name       text not null,
  doc        text not null,
  created_at timestamptz default now()
);

create unique index if not exists players_doc_idx on players (doc);

-- ── Scores ──
create table if not exists scores (
  id          text primary key,
  player_name text not null,
  player_doc  text not null,
  score       integer not null default 0,
  won         boolean not null default false,
  game_mode   smallint not null default 1,
  difficulty  smallint not null default 2,
  speed       smallint not null default 2,
  played_at   timestamptz default now()
);

create index if not exists scores_player_doc_idx on scores (player_doc);
create index if not exists scores_score_idx on scores (score desc);
create index if not exists scores_played_at_idx on scores (played_at desc);

-- ── RLS (Row Level Security) ──
-- Anon key can INSERT and SELECT, but not UPDATE or DELETE

alter table players enable row level security;
alter table scores  enable row level security;

-- Players: anyone can insert and read
create policy "Anyone can insert players"
  on players for insert
  to anon
  with check (true);

create policy "Anyone can read players"
  on players for select
  to anon
  using (true);

-- Upsert requires update permission
create policy "Anyone can update players"
  on players for update
  to anon
  using (true)
  with check (true);

-- Scores: anyone can insert and read
create policy "Anyone can insert scores"
  on scores for insert
  to anon
  with check (true);

create policy "Anyone can read scores"
  on scores for select
  to anon
  using (true);

-- Upsert requires update permission
create policy "Anyone can update scores"
  on scores for update
  to anon
  using (true)
  with check (true);
