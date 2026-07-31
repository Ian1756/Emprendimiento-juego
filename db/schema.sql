-- Esquema de Postgres / Supabase — INSTRUCCIONES.md §3.1.
-- Se aplica con: npm run db:migrate  (es idempotente, se puede repetir)
--
-- No usa extensiones: gen_random_uuid() es parte del core desde PostgreSQL 13,
-- y la unicidad del correo sin distinguir mayúsculas se resuelve con un índice
-- sobre lower(email) en vez de citext. Así la migración no necesita permisos
-- especiales en Supabase.

create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,
  email        text not null,
  consent_at   timestamptz not null,
  created_at   timestamptz not null default now()
);

-- Un correo = un jugador, sin importar mayúsculas ni acentos de teclado.
create unique index if not exists players_email_unico on players (lower(email));

-- Matrícula del Tec (A0…). Nullable: los jugadores registrados antes de que se
-- pidiera no la tienen. Es dato personal: no sale en ninguna respuesta pública.
alter table players add column if not exists matricula text;

create table if not exists game_sessions (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references players(id) on delete cascade,
  seed       bigint not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  status     text not null default 'open' check (status in ('open', 'closed', 'rejected'))
);

create table if not exists scores (
  id           uuid primary key default gen_random_uuid(),
  -- unique: una partida solo puede producir un puntaje (anti-trampa, §4.1)
  session_id   uuid not null unique references game_sessions(id) on delete cascade,
  player_id    uuid not null references players(id) on delete cascade,
  score        int not null check (score >= 0),
  company_name text not null,
  company_size text not null,
  company_type text not null,
  color_counts jsonb not null,
  created_at   timestamptz not null default now()
);

create index if not exists scores_ranking_idx on scores (score desc, created_at asc);
create index if not exists scores_player_idx on scores (player_id);
create index if not exists sessions_player_idx on game_sessions (player_id);

-- Seguridad (§4.4): RLS activado y SIN políticas. La API de Supabase expone las
-- tablas al rol anónimo por defecto; sin políticas, ese rol no puede leer ni
-- escribir nada. La app entra por conexión directa desde el servidor, que no
-- pasa por RLS. Resultado: el correo de los jugadores no es alcanzable desde
-- el navegador de nadie.
alter table players       enable row level security;
alter table game_sessions enable row level security;
alter table scores        enable row level security;
