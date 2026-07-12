-- ЕППБ — расширение таблицы projects под карту проектов (ТЗ 6.8).
-- Базовая таблица (day 1) содержала только id/title/description/region/lat/lng/status.
-- Добавляем поля, нужные для карточки проекта и фильтров: организация, населённый пункт,
-- отрасль, сумма финансирования, период (годы начала/окончания).
-- Идемпотентно (add column if not exists) — миграцию можно применить повторно без ошибок.

alter table public.projects
  add column if not exists organization   text,   -- дочерняя организация холдинга
  add column if not exists locality       text,   -- населённый пункт
  add column if not exists industry       text,   -- отрасль / направление
  add column if not exists funding_amount numeric,-- сумма финансирования, ₸
  add column if not exists start_year     int,    -- год начала реализации
  add column if not exists end_year       int;    -- год завершения (план/факт)

-- Индексы под фильтры карты (регион уже проиндексирован в init_schema).
create index if not exists idx_projects_organization on public.projects (organization);
create index if not exists idx_projects_industry     on public.projects (industry);
create index if not exists idx_projects_status       on public.projects (status);

-- status храним как text, но канонические значения: 'in_progress' | 'completed' | 'paused'.
