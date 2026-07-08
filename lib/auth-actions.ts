"use server";

// Server Actions авторизации: вход, регистрация, выход.
// Выполняются на сервере; работают через серверный клиент Supabase (lib/supabase/server),
// который кладёт/снимает сессию в куках — поэтому после входа RLS в БД видит,
// кто вошёл.
//
// Профиль в users_profiles при регистрации создаётся триггером handle_new_user
// (роль по умолчанию 'user') — здесь мы его НЕ создаём и не дублируем эту логику.
//
// eGov IDP: позже signInWithPassword заменится на вход через государственный
// провайдер (OIDC). Подробнее — в комментарии к lib/auth.ts.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Состояние формы: либо ошибка для показа пользователю, либо ничего. */
export type AuthState = { error?: string } | undefined;

/** Переводим типовые ошибки Supabase на русский (в MVP — по подстроке). */
function ruAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверный email или пароль.";
  if (m.includes("email not confirmed")) return "Email не подтверждён. Проверьте почту.";
  if (m.includes("user already registered")) return "Пользователь с таким email уже зарегистрирован.";
  if (m.includes("password should be")) return "Пароль слишком короткий (минимум 6 символов).";
  if (m.includes("unable to validate email")) return "Некорректный email.";
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

/**
 * Разрешаем редирект только на внутренний путь ("/..."),
 * чтобы через ?redirect=... нельзя было увести пользователя на чужой сайт.
 */
function safeRedirect(target: string | null): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) return target;
  return "/account";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(formData.get("redirect") as string | null);

  if (!email || !password) return { error: "Заполните email и пароль." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: ruAuthError(error.message) };

  // Сбрасываем кэш layout'а, чтобы шапка сразу показала вошедшего пользователя.
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Заполните email и пароль." };
  if (password.length < 6) return { error: "Пароль должен быть не короче 6 символов." };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: ruAuthError(error.message) };

  // Профиль уже создан триггером handle_new_user (роль 'user').
  // Если в проекте включено подтверждение email, сессии пока нет —
  // отправляем на страницу входа с подсказкой проверить почту.
  if (!data.session) redirect("/login?registered=1");

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
