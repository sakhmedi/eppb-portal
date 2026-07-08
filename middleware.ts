// Корневой middleware Next.js (App Router).
// Единственная задача — на каждом подходящем запросе продлить сессию Supabase
// и применить защиту маршрутов (логика — в lib/supabase/middleware.ts).

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Пропускаем статику и картинки — им сессия не нужна, экономим работу.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
