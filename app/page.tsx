// Главная страница портала — точка входа предпринимателя.
// Серверный компонент: сам тянет опубликованные услуги из БД, считает,
// сколько услуг в каждом направлении, и рендерит витрину.

import Link from "next/link";
import { ArrowRight, Search, Compass, FileText, BellRing } from "lucide-react";
import type { Metadata } from "next";

import { getPublishedServices } from "@/lib/services";
import { SUPPORT_DIRECTIONS } from "@/lib/catalog-directions";
import { ServiceCard } from "@/components/service-card";
import { ServiceFinder } from "@/components/ai/service-finder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "ЕППБ — единая точка входа к мерам поддержки бизнеса",
  description:
    "Единый портал поддержки бизнеса: меры поддержки холдинга «Байтерек» и его дочерних организаций — кредитование, лизинг, гарантирование, субсидирование, страхование и поддержка экспорта.",
};

// Как оформить счётчик услуг рядом с направлением.
function countLabel(n: number): string {
  if (n === 0) return "Скоро";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} услуга`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} услуги`;
  return `${n} услуг`;
}

const HOW_IT_WORKS = [
  {
    icon: Compass,
    title: "Найдите услугу",
    text: "Выберите направление поддержки или воспользуйтесь поиском по каталогу.",
  },
  {
    icon: FileText,
    title: "Заполните заявку",
    text: "Пошаговая форма подскажет, какие данные и документы нужны именно вам.",
  },
  {
    icon: BellRing,
    title: "Следите за статусом",
    text: "Все обращения и их статусы — в личном кабинете, в одном месте.",
  },
];

export default async function Home() {
  const services = await getPublishedServices();

  // Сколько услуг в каждой категории — для счётчиков на плитках направлений.
  const countsByCategory = new Map<string, number>();
  for (const s of services) {
    if (s.category) {
      countsByCategory.set(s.category, (countsByCategory.get(s.category) ?? 0) + 1);
    }
  }

  const popular = services.slice(0, 6);

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="hero-surface">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-24">
          <Badge className="bg-brand border-0">Холдинг «Байтерек»</Badge>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Единая точка входа к мерам поддержки бизнеса
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/70">
            Меры поддержки холдинга «Байтерек» и его дочерних организаций — в одном месте.
            Найдите подходящую услугу, подайте заявку онлайн и отслеживайте её статус.
          </p>

          {/* Поле-приманка: обычная GET-форма, ведёт в каталог с поиском. */}
          <form
            action="/catalog"
            className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-2 rounded-md bg-white/10 px-3 ring-1 ring-white/15 focus-within:ring-brand">
              <Search className="h-4 w-4 shrink-0 text-white/60" />
              <input
                type="text"
                name="q"
                placeholder="Например: субсидирование ставки"
                className="h-11 w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
            </div>
            <Button type="submit" className="bg-brand h-11 px-6">
              Найти услугу
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Смотреть весь каталог
            </Link>
            <span className="text-white/30">·</span>
            <Link
              href="/account"
              className="text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Войти в личный кабинет
            </Link>
          </div>
        </div>
      </section>

      {/* AI-ПОДБОР ПО СИТУАЦИИ */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-16">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Не знаете, что выбрать? Опишите ситуацию
            </h2>
            <p className="text-muted-foreground">
              Расскажите своими словами, что нужно вашему бизнесу — AI подберёт подходящие
              меры поддержки из каталога.
            </p>
          </div>
          <ServiceFinder className="max-w-2xl" />
        </div>
      </section>

      {/* НАПРАВЛЕНИЯ ПОДДЕРЖКИ */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Направления поддержки</h2>
          <p className="text-muted-foreground">
            Выберите направление, чтобы увидеть подходящие услуги.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORT_DIRECTIONS.map((dir) => {
            const count = countsByCategory.get(dir.category) ?? 0;
            const empty = count === 0;
            const Icon = dir.icon;
            return (
              <Link
                key={dir.key}
                href={`/catalog?category=${encodeURIComponent(dir.category)}`}
                className={`group flex flex-col gap-3 rounded-lg border p-5 transition-colors hover:border-brand ${
                  empty ? "opacity-60 hover:opacity-100" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="bg-brand-subtle flex h-10 w-10 items-center justify-center rounded-md">
                    <Icon className="h-5 w-5 text-brand" />
                  </span>
                  <Badge variant={empty ? "outline" : "secondary"}>
                    {countLabel(count)}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold">{dir.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{dir.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ПОПУЛЯРНЫЕ УСЛУГИ */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Популярные услуги</h2>
              <p className="text-muted-foreground">
                Уже доступны для подачи заявки прямо сейчас.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/catalog">
                Весь каталог
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {popular.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Опубликованных услуг пока нет — они появятся здесь после публикации в конструкторе.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map((s) => (
                <ServiceCard key={s.slug} service={s} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* КАК ЭТО РАБОТАЕТ */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Как это работает</h2>
          <p className="text-muted-foreground">Три шага от идеи до заявки.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="bg-brand-subtle flex h-9 w-9 items-center justify-center rounded-full text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    Шаг {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ФИНАЛЬНЫЙ CTA */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-5xl px-4 py-16">
          <div className="hero-surface flex flex-col items-start gap-5 rounded-xl p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Готовы найти подходящую меру поддержки?
              </h2>
              <p className="mt-2 text-white/70">
                Откройте каталог услуг или войдите в личный кабинет, чтобы подать заявку.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Button asChild className="bg-brand">
                <Link href="/catalog">Открыть каталог</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/account">Личный кабинет</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
