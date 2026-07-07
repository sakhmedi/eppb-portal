// СЕРВИСНЫЙ клиент Supabase на service_role ключе.
// ВНИМАНИЕ: обходит RLS — имеет полный доступ к данным. Использовать ТОЛЬКО на
// сервере (админ-операции, миграции данных) и НИКОГДА не тянуть в браузер.
// `import "server-only"` роняет сборку, если файл случайно попадёт в клиент.

import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
