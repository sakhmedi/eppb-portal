# ЕППБ — Единый портал поддержки бизнеса

MVP цифровой платформы с no-code конструктором услуг и форм.
Стек: Next.js 14 (App Router) + TypeScript, Supabase (Postgres + Auth + Storage),
shadcn/ui + Tailwind, Zod. Деплой — Vercel.

- Модель данных: `ARCHITECTURE.md` и папка `types/`.
- Логика/валидация: папка `lib/` (условия, формулы, Zod-схемы).
- База данных: миграции в `supabase/migrations/`, клиенты в `lib/supabase/`.

## Запуск локально

```bash
npm install
npm run dev
```

Откроется http://localhost:3000. Но сначала нужно настроить базу (ниже),
иначе работать с данными не получится.

Полезные команды:

```bash
npm run dev     # локальный запуск с автоперезагрузкой
npm run build   # production-сборка (проверяет типы)
npm run lint    # проверка кода
```

---

# База данных (Supabase) — пошагово для новичка

Supabase — это «облачный» PostgreSQL с готовой авторизацией и хранилищем файлов.
Пройди шаги по порядку, это займёт ~10 минут.

## Шаг 1. Создать проект Supabase

1. Зайди на https://supabase.com и зарегистрируйся (можно через GitHub).
2. Нажми **New project**.
3. Заполни:
   - **Name** — например `eppb`.
   - **Database Password** — придумай надёжный пароль и **сохрани его** (пригодится
     для CLI; для обычной работы через дашборд он не нужен).
   - **Region** — ближайший (напр. `Central EU (Frankfurt)`).
4. Нажми **Create new project** и подожди 1–2 минуты, пока проект поднимется.

## Шаг 2. Взять ключи

В дашборде проекта: **Project Settings** (шестерёнка внизу слева) → **API**.
Понадобятся три значения:

| В дашборде | Переменная в проекте | Что это |
|------------|----------------------|---------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` | Адрес твоей БД |
| **Project API keys → `anon` `public`** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Публичный ключ (можно в браузер) |
| **Project API keys → `service_role`** | `SUPABASE_SERVICE_ROLE_KEY` | **Секретный** ключ (только сервер!) |

> ⚠️ `service_role` даёт полный доступ в обход правил безопасности. Никогда не
> вставляй его в клиентский код и не коммить в git.

## Шаг 3. Прописать ключи в проект

1. Скопируй файл-пример в локальный (его git не отслеживает):
   ```bash
   cp .env.example .env.local
   ```
2. Открой `.env.local` и вставь свои значения:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ANTHROPIC_API_KEY=...    # позже, для AI
   ```
   `.env.local` уже в `.gitignore` — ключи в репозиторий не попадут.

## Шаг 4. Применить миграции (создать таблицы)

Миграции — это SQL-файлы в `supabase/migrations/`, которые создают таблицы и
правила безопасности. Применяй их **по порядку имён файлов**.

**Вариант А — через дашборд (проще всего):**
1. В дашборде открой **SQL Editor** (слева) → **New query**.
2. Открой первый файл `supabase/migrations/20260708090000_init_schema.sql`,
   скопируй всё содержимое, вставь в редактор и нажми **Run**.
3. Повтори для остальных файлов **строго по порядку**:
   - `..._init_schema.sql` — таблицы и индексы;
   - `..._rls_policies.sql` — правила безопасности (RLS) и триггеры;
   - `..._seed.sql` — демо-данные (необязательно, но удобно для теста).

**Вариант Б — через Supabase CLI (если удобнее командная строка):**
```bash
npm install -g supabase
supabase login
supabase link --project-ref <ref-из-URL-проекта>
supabase db push
```

## Шаг 5. Сделать себя администратором

Роли (`user` / `admin`) хранятся в таблице `users_profiles`. Профиль создаётся
автоматически при регистрации триггером `handle_new_user` (роль `user`).

Сменить роль напрямую мешает триггер **`prevent_role_change`**: он запрещает
менять роль тому, кто сам не админ. В **SQL Editor** запрос идёт без
пользовательской сессии (`auth.uid()` пуст → `is_admin()` = `false`), поэтому
обычный `update ... set role` там тоже будет заблокирован.

Чтобы назначить **первого** админа, временно отключи триггер, поменяй роль и
включи его обратно:

1. Сначала зарегистрируйся в приложении на `/register` **или** создай
   пользователя вручную: дашборд → **Authentication** → **Add user** — чтобы
   строка в `users_profiles` уже существовала.
2. В **SQL Editor** выполни (подставь свой email):
   ```sql
   alter table public.users_profiles
     disable trigger trg_users_profiles_prevent_role_change;

   update public.users_profiles
   set role = 'admin'
   where email = 'ты@example.com';

   alter table public.users_profiles
     enable trigger trg_users_profiles_prevent_role_change;
   ```

Дальнейшие изменения ролей можно делать уже под сессией администратора
(для него `is_admin()` = `true`, и триггер пропускает изменение).

## Шаг 6. (Опционально) сгенерировать типы БД

Можно получить TypeScript-типы прямо из схемы БД:
```bash
npx supabase gen types typescript --project-id <ref> > types/database.ts
```

---

## Структура БД (коротко)

| Таблица | Хранит | Связь |
|---------|--------|-------|
| `users_profiles` | Профиль и роль (`user`/`admin`) | 1:1 с `auth.users` |
| `services` | Услуги (конфиг-конструктор, `steps` в jsonb) | — |
| `applications` | Заявки пользователей (`form_data` в jsonb) | → `services`, `auth.users` |
| `reference_lists` | Справочники (регионы и т.п.) | ← `services` (по id в поле) |
| `projects` | Проекты для карты (задел) | — |
| `materials` | Раздел материалов (задел) | — |
| `analytics_items` | Аналитика (задел) | — |

**Безопасность (RLS):** обычный пользователь видит и меняет только свои заявки и
свой профиль; администратор видит и меняет всё; услуги/справочники/проекты/
материалы/аналитика доступны на чтение всем, а на запись — только админу.

## Клиенты в коде

- `lib/supabase/client.ts` — для клиентских компонентов (браузер).
- `lib/supabase/server.ts` — для серверных компонентов и route handlers.
- `lib/supabase/admin.ts` — сервисный клиент (service_role), только на сервере.

---

## Авторизация и защита маршрутов

Вход — по email и паролю через Supabase Auth (позже заменится на eGov IDP,
см. комментарий в `lib/auth.ts`).

- **Регистрация** — `/register` (email + пароль от 6 символов). Профиль создаёт
  триггер `handle_new_user`, роль по умолчанию `user`. Если в проекте включено
  подтверждение email — подтверди адрес по ссылке из письма, затем войди.
- **Вход** — `/login`. **Выход** — кнопка «Выйти» в верхнем меню.

| Зона | Маршруты | Кто видит |
|------|----------|-----------|
| Публичная | `/`, `/catalog`, `/services/[slug]` | все |
| Личный кабинет | `/account` | только вошедшие |
| Админкабинет | `/admin` | только роль `admin` |

`middleware.ts` продлевает сессию Supabase на каждом запросе и редиректит
неавторизованного с защищённого маршрута на `/login`. Роль `admin` проверяется
в `app/admin/layout.tsx` (читается из `users_profiles`); обычного пользователя
на `/admin` вежливо возвращает в его кабинет.

Ключевые файлы: `lib/auth.ts` (getUser / getProfile), `lib/auth-actions.ts`
(login / register / signOut), `lib/supabase/middleware.ts`, `components/site-header.tsx`.
