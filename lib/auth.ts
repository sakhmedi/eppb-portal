// Серверные хелперы авторизации: "кто сейчас вошёл" и "какая у него роль".
// Используются в серверных компонентах и layout'ах для защиты маршрутов.
//
// ┌─ ЗАГЛУШКА: eGov IDP ─────────────────────────────────────────────────────┐
// │ Сейчас вход — по email + паролю через Supabase Auth (см. lib/auth-actions).│
// │ Позже вход заменится на государственный провайдер идентификации eGov IDP   │
// │ (OpenID Connect / SAML). Меняться будет только СПОСОБ входа: Supabase       │
// │ станет OIDC-клиентом eGov, а этот слой (getUser / getProfile) и защита      │
// │ маршрутов через роль в users_profiles останутся прежними.                  │
// └────────────────────────────────────────────────────────────────────────────┘

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

/** Профиль из таблицы users_profiles (то, что нужно UI: имя и роль). */
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
}

/**
 * Текущий вошедший пользователь Supabase Auth (или null).
 * getUser() ходит на сервер Supabase и проверяет токен — это надёжнее,
 * чем читать данные из куки напрямую.
 */
export async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Профиль текущего пользователя из users_profiles (или null, если не вошёл).
 * Профиль создаётся триггером handle_new_user при регистрации — здесь только читаем.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users_profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}
