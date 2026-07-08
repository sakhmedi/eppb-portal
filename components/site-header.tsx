// Верхнее меню портала. Серверный компонент: сам читает, кто вошёл,
// и показывает либо кнопку «Войти», либо имя пользователя + «Выйти».
// Ссылка на админку видна только роли admin.

import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const profile = await getProfile();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          ЕППБ
        </Link>

        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/catalog" className="transition-colors hover:text-foreground">
            Каталог услуг
          </Link>
          {profile && (
            <Link href="/account" className="transition-colors hover:text-foreground">
              Кабинет
            </Link>
          )}
          {profile?.role === "admin" && (
            <Link href="/admin" className="transition-colors hover:text-foreground">
              Админка
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {profile ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {profile.full_name || profile.email}
              </span>
              {/* Выход — server action через форму, без клиентского JS. */}
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  Выйти
                </Button>
              </form>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
