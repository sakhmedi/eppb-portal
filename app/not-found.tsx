// Глобальная страница 404 (Next.js рендерит её, когда вызван notFound() или маршрут не найден).
// Локализованная и в стиле портала, чтобы «услуга не найдена» выглядела аккуратно, а не как ошибка.

import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <span className="bg-brand-subtle flex h-14 w-14 items-center justify-center rounded-full">
        <Compass className="h-7 w-7 text-brand" />
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Страница не найдена</h1>
        <p className="text-muted-foreground">
          Возможно, услуга ещё не опубликована или ссылка устарела. Загляните в каталог —
          там все доступные меры поддержки.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-brand">
          <Link href="/catalog">В каталог услуг</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </main>
  );
}
