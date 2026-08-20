-- =========================================================
-- RITCHIE LAB — esquema de Supabase
-- Ejecutar en el SQL Editor de tu proyecto de Supabase
-- =========================================================

-- 1. Tabla de puntuaciones
create table if not exists ritchie_scores (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  team text,
  score integer not null check (score >= 0 and score <= 100),
  time_seconds integer not null check (time_seconds >= 0),
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Índice para ordenar rápido por puntuación y tiempo (para el TOP 10)
create index if not exists idx_ritchie_scores_ranking
  on ritchie_scores (score desc, time_seconds asc);

-- 2. Row Level Security
alter table ritchie_scores enable row level security;

-- Permitir que cualquier persona con la clave pública (anon)
-- inserte su propia puntuación
create policy "Cualquiera puede registrar su puntuación"
  on ritchie_scores
  for insert
  to anon
  with check (true);

-- Permitir que cualquier persona con la clave pública (anon)
-- lea el ranking (necesario para el TOP 10 y el modo presentador)
create policy "Cualquiera puede leer el ranking"
  on ritchie_scores
  for select
  to anon
  using (true);

-- No se crean políticas de update/delete: los estudiantes no
-- pueden modificar ni borrar puntuaciones desde la app.
