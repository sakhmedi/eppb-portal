// Подвал портала. Статичный серверный компонент: бренд, короткое описание,
// колонки ссылок и правовая строка. Придаёт странице завершённый вид.

import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="font-semibold tracking-tight">ЕППБ</div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Единый портал поддержки бизнеса — меры поддержки холдинга «Байтерек»
            и его дочерних организаций в одном окне.
          </p>
        </div>

        <div>
          <div className="text-sm font-medium">Портал</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/catalog" className="transition-colors hover:text-foreground">
                Каталог услуг
              </Link>
            </li>
            <li>
              <Link href="/account" className="transition-colors hover:text-foreground">
                Личный кабинет
              </Link>
            </li>
            <li>
              <Link href="/login" className="transition-colors hover:text-foreground">
                Вход
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-medium">О проекте</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>АО «Байтерек»</li>
            <li>Национальный институт развития</li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} АО «Байтерек». Все права защищены.</span>
          <span>MVP · демонстрационная версия</span>
        </div>
      </div>
    </footer>
  );
}
