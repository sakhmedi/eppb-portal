// Клиент Supabase для СЕРВЕРА (серверные компоненты, route handlers, server actions).
// Хранит сессию пользователя в куках, поэтому RLS видит, кто вошёл.
//
//   import { createClient } from "@/lib/supabase/server";
//   const supabase = createClient();
//   const { data } = await supabase.from("applications").select();

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Вызвано из серверного компонента, где куки менять нельзя.
            // Это нормально: обновлением сессии займётся middleware
            // (добавим, когда будет auth-UI).
          }
        },
      },
    },
  );
}
