"use client";

// Интерактивная часть каталога: поиск по названию/описанию и фильтры по категории
// и организации. Услуг немного, поэтому фильтруем в памяти на клиенте — без запросов к БД
// и без перезагрузки страницы. Начальные значения берём из URL (?q=, ?category=),
// чтобы витрина направлений с главной сразу применяла нужный фильтр.

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";

import type { PublicService } from "@/lib/services";
import { ServiceCard } from "@/components/service-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Значение для пункта «Все» в фильтрах (Radix Select не разрешает пустое value).
const ALL = "__all__";

interface CatalogBrowserProps {
  services: PublicService[];
  categories: string[];
  organizations: string[];
}

export function CatalogBrowser({
  services,
  categories,
  organizations,
}: CatalogBrowserProps) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  // Категорию из URL применяем как есть. Если такого направления в БД ещё нет
  // (напр. «Лизинг»), фильтр просто ничего не найдёт — и мы покажем дружелюбное
  // пустое состояние ниже (missingDirection), а не список всех услуг.
  const [category, setCategory] = useState(initialCategory || ALL);
  const [organization, setOrganization] = useState(ALL);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const matchesQuery =
        q === "" ||
        s.title.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q);
      const matchesCategory = category === ALL || s.category === category;
      const matchesOrg = organization === ALL || s.organization === organization;
      return matchesQuery && matchesCategory && matchesOrg;
    });
  }, [services, query, category, organization]);

  const isFiltered = query.trim() !== "" || category !== ALL || organization !== ALL;

  // Особый случай: с главной пришли по направлению, которого нет среди реальных категорий
  // (услуг по нему ещё нет). Показываем дружелюбный текст, а не «ничего не найдено».
  const missingDirection =
    initialCategory && !categories.includes(initialCategory) ? initialCategory : null;

  function reset() {
    setQuery("");
    setCategory(ALL);
    setOrganization(ALL);
  }

  return (
    <div className="space-y-6">
      {/* Панель поиска и фильтров */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию или описанию"
          className="sm:max-w-xs"
        />

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Все категории</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={organization} onValueChange={setOrganization}>
          <SelectTrigger className="sm:w-64">
            <SelectValue placeholder="Организация" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Все организации</SelectItem>
            {organizations.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button variant="ghost" onClick={reset} className="sm:ml-auto">
            Сбросить
          </Button>
        )}
      </div>

      {/* Результаты */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-10 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">
              {missingDirection
                ? `По направлению «${missingDirection}» пока нет услуг`
                : "По вашему запросу ничего не найдено"}
            </p>
            <p className="text-sm text-muted-foreground">
              {missingDirection
                ? "Мы уже работаем над наполнением этого раздела. Посмотрите другие направления."
                : "Попробуйте изменить запрос или сбросить фильтры."}
            </p>
          </div>
          <Button variant="outline" onClick={reset}>
            Показать все услуги
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Найдено услуг: {filtered.length}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
