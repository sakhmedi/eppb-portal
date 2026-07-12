-- ЕППБ — расширение таблицы analytics_items под каталог аналитических материалов (ТЗ 6.7).
-- Базовая таблица (day 1) хранила числовые метрики (value/unit). Для витрины МАТЕРИАЛОВ
-- (готовые отчёты/дашборды/исследования со ссылкой или встраиванием) добавляем нужные поля.
-- Переиспользуем существующие: category = вид материала, period = период актуальности.
-- Идемпотентно (add column if not exists) — можно применять повторно.

alter table public.analytics_items
  add column if not exists description  text,
  add column if not exists organization text,   -- источник / дочерняя организация
  add column if not exists access_type  text,   -- 'link' | 'embed'
  add column if not exists url          text;   -- внешняя ссылка или URL для iframe

-- Индексы под фильтры каталога (category уже проиндексирован в init_schema).
create index if not exists idx_analytics_items_organization on public.analytics_items (organization);
create index if not exists idx_analytics_items_access_type  on public.analytics_items (access_type);
