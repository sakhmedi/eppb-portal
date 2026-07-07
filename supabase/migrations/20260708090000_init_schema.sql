-- ЕППБ — начальная схема БД
-- Таблицы соответствуют модели данных из /types и ARCHITECTURE.md.
-- Вложенные структуры (steps, form_data, documents, options, status_history)
-- хранятся в jsonb — так одна и та же таблица описывает и простую, и сложную услугу.

-- gen_random_uuid() для генерации UUID (в Supabase обычно уже есть).
create extension if not exists pgcrypto;

-- Общий триггер: автоматически обновляет updated_at при UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- users_profiles ↔ тип User. Привязан 1:1 к Supabase Auth (auth.users).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.users_profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  iin        text,
  bin        text,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_users_profiles_updated_at
  before update on public.users_profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- services ↔ тип Service. steps (массив шагов с полями) — в jsonb.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.services (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique,
  title        text not null,
  description  text,
  category     text,
  organization text,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  version      integer not null default 1,
  steps        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_services_status on public.services (status);

create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- applications ↔ тип Application. Ответы/документы/история — в jsonb.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid not null references public.services (id) on delete restrict,
  service_version integer,
  user_id         uuid not null references auth.users (id) on delete cascade,
  current_step_id text,
  status          text not null default 'draft'
                    check (status in ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
  form_data       jsonb not null default '{}'::jsonb,
  documents       jsonb not null default '[]'::jsonb,
  status_history  jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_applications_user_id on public.applications (user_id);
create index idx_applications_service_id on public.applications (service_id);
create index idx_applications_status on public.applications (status);

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- reference_lists ↔ тип Reference (справочники). options — в jsonb.
-- Названо reference_lists, т.к. "references" — зарезервированное слово SQL.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.reference_lists (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  options    jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_reference_lists_updated_at
  before update on public.reference_lists
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- projects — для карты проектов (задел, типа в /types пока нет).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  region      text,
  latitude    double precision,
  longitude   double precision,
  status      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_projects_region on public.projects (region);

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- materials — раздел материалов (задел).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.materials (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text,
  url         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_materials_category on public.materials (category);

create trigger trg_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- analytics_items — аналитика (задел).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.analytics_items (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  value      numeric,
  unit       text,
  period     text,
  category   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_analytics_items_category on public.analytics_items (category);

create trigger trg_analytics_items_updated_at
  before update on public.analytics_items
  for each row execute function public.set_updated_at();
