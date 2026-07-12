"use client";

// Интерактивная часть каталога аналитики: фильтры по виду материала и организации +
// сетка карточек. Материалов немного, поэтому фильтруем в памяти на клиенте
// (паттерн catalog-browser / projects-explorer).

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";

import type { AnalyticsItem } from "@/types";
import { AnalyticsCard } from "@/components/analytics/analytics-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

function distinct(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b, "ru"),
  );
}

export function AnalyticsBrowser({ items }: { items: AnalyticsItem[] }) {
  const kinds = useMemo(() => distinct(items.map((i) => i.kind)), [items]);
  const organizations = useMemo(() => distinct(items.map((i) => i.organization)), [items]);

  const [kind, setKind] = useState(ALL);
  const [organization, setOrganization] = useState(ALL);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (kind === ALL || i.kind === kind) &&
          (organization === ALL || i.organization === organization),
      ),
    [items, kind, organization],
  );

  const isFiltered = kind !== ALL || organization !== ALL;

  function reset() {
    setKind(ALL);
    setOrganization(ALL);
  }

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Вид материала" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Все виды</SelectItem>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
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
          <p className="font-medium">По выбранным фильтрам материалов не нашлось</p>
          <Button variant="outline" onClick={reset}>
            Показать все материалы
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Материалов: {filtered.length}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((i) => (
              <AnalyticsCard key={i.id} item={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
