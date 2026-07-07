// Клиент Supabase для КЛИЕНТСКИХ компонентов ("use client").
// Работает в браузере под anon-ключом; RLS в БД ограничивает доступ.
//
//   "use client";
//   import { createClient } from "@/lib/supabase/client";
//   const supabase = createClient();

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
