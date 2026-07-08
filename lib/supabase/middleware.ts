// Обновление сессии Supabase на каждом запросе + базовая защита маршрутов.
// Вызывается из корневого middleware.ts.
//
// Зачем это нужно: access-токен Supabase живёт недолго. Чтобы пользователь
// не "вылетал", middleware на каждом запросе продлевает сессию и записывает
// свежие куки и в запрос (чтобы их увидели серверные компоненты), и в ответ
// (чтобы они ушли в браузер). Это стандартный паттерн @supabase/ssr для App Router.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Маршруты, требующие входа. Проверку роли admin делаем в app/admin/layout.tsx
// (там уже есть профиль и можно показать вежливый отказ) — здесь только «вошёл/нет».
const PROTECTED_PREFIXES = ["/account", "/admin"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Кладём обновлённые куки и в запрос, и в ответ.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ВАЖНО: getUser() здесь и продлевает сессию, и говорит, вошёл ли пользователь.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  // Неавторизованного на защищённом маршруте — на вход, запомнив, куда он шёл.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Уже вошедшему на страницах входа/регистрации делать нечего — в кабинет.
  if (user && (path === "/login" || path === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    return NextResponse.redirect(url);
  }

  return response;
}
