-- MNNO Games — A Ponte da Produtividade

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

-- ── RLS ──
alter table players enable row level security;
alter table scores  enable row level security;

-- Players policies
do $$ begin
  create policy "anon_insert_players" on players for insert to anon with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon_select_players" on players for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon_update_players" on players for update to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Scores policies
do $$ begin
  create policy "anon_insert_scores" on scores for insert to anon with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon_select_scores" on scores for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "anon_update_scores" on scores for update to anon using (true) with check (true);
exception when duplicate_object then null;
end $$;
