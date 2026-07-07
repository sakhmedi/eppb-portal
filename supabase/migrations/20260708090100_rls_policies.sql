-- ЕППБ — Row Level Security (RLS) и триггеры авторизации.
-- Идея: пользователь видит и меняет только свои заявки и свой профиль,
-- админ видит и меняет всё, публичный контент (услуги/справочники/проекты/
-- материалы/аналитика) доступен на чтение всем.

-- ─────────────────────────────────────────────────────────────────────────────
-- Хелпер: текущий пользователь — админ?
-- SECURITY DEFINER выполняется от владельца функции и ОБХОДИТ RLS,
-- поэтому обращение к users_profiles внутри политики не вызывает рекурсию.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Авто-создание профиля при регистрации нового пользователя в auth.users.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Защита от самоповышения: обычный пользователь не может сменить свою role.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Изменение роли доступно только администратору';
  end if;
  return new;
end;
$$;

create trigger trg_users_profiles_prevent_role_change
  before update on public.users_profiles
  for each row execute function public.prevent_role_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- Включаем RLS на всех таблицах.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.users_profiles  enable row level security;
alter table public.services        enable row level security;
alter table public.applications    enable row level security;
alter table public.reference_lists enable row level security;
alter table public.projects        enable row level security;
alter table public.materials       enable row level security;
alter table public.analytics_items enable row level security;

-- users_profiles: свой профиль или админ.
create policy "profiles: read own or admin"
  on public.users_profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own or admin"
  on public.users_profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- services: публичное чтение опубликованных; полный доступ у админа.
create policy "services: read published or admin"
  on public.services for select
  using (status = 'published' or public.is_admin());

create policy "services: admin write"
  on public.services for all
  using (public.is_admin())
  with check (public.is_admin());

-- applications: пользователь — только свои; черновики может менять/удалять сам.
create policy "applications: read own or admin"
  on public.applications for select
  using (user_id = auth.uid() or public.is_admin());

create policy "applications: insert own"
  on public.applications for insert
  with check (user_id = auth.uid());

create policy "applications: update own draft or admin"
  on public.applications for update
  using ((user_id = auth.uid() and status = 'draft') or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "applications: delete own draft or admin"
  on public.applications for delete
  using ((user_id = auth.uid() and status = 'draft') or public.is_admin());

-- Публичный контент: чтение всем, запись только админу.
create policy "reference_lists: public read"
  on public.reference_lists for select using (true);
create policy "reference_lists: admin write"
  on public.reference_lists for all
  using (public.is_admin()) with check (public.is_admin());

create policy "projects: public read"
  on public.projects for select using (true);
create policy "projects: admin write"
  on public.projects for all
  using (public.is_admin()) with check (public.is_admin());

create policy "materials: public read"
  on public.materials for select using (true);
create policy "materials: admin write"
  on public.materials for all
  using (public.is_admin()) with check (public.is_admin());

create policy "analytics_items: public read"
  on public.analytics_items for select using (true);
create policy "analytics_items: admin write"
  on public.analytics_items for all
  using (public.is_admin()) with check (public.is_admin());
