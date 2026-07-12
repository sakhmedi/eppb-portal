"use client";

// Интерактивная часть карты проектов: фильтры + распределение по регионам + карта.
// Проектов немного, поэтому фильтруем в памяти на клиенте (паттерн catalog-browser):
// один отфильтрованный список идёт И в карту (маркеры), И в сводку по регионам —
// они всегда согласованы.

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinned, SlidersHorizontal } from "lucide-react";

import type { Project } from "@/types";
import { PROJECT_STATUS_META, statusMeta } from "@/lib/project-meta";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Карту грузим только на клиенте: Leaflet трогает window на импорте (иначе SSR-ошибка).
const ProjectMap = dynamic(() => import("./project-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Загрузка карты…
    </div>
  ),
});

const ALL = "__all__";

function distinct(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b, "ru"),
  );
}

interface Option {
  value: string;
  label: string;
}

/** Один фильтр-Select с пунктом «Все». */
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Все</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function ProjectsExplorer({ projects }: { projects: Project[] }) {
  // Списки значений для фильтров — из полного набора проектов.
  const organizations = useMemo(() => distinct(projects.map((p) => p.organization)), [projects]);
  const regions = useMemo(() => distinct(projects.map((p) => p.region)), [projects]);
  const industries = useMemo(() => distinct(projects.map((p) => p.industry)), [projects]);
  const statuses = useMemo(() => distinct(projects.map((p) => p.status)), [projects]);
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const p of projects) {
      if (p.startYear && p.endYear) {
        for (let y = p.startYear; y <= p.endYear; y++) set.add(y);
      } else if (p.startYear) {
        set.add(p.startYear);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [projects]);

  const [organization, setOrganization] = useState(ALL);
  const [region, setRegion] = useState(ALL);
  const [industry, setIndustry] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [year, setYear] = useState(ALL);

  const filtered = useMemo(() => {
    const y = year === ALL ? null : Number(year);
    return projects.filter((p) => {
      if (organization !== ALL && p.organization !== organization) return false;
      if (region !== ALL && p.region !== region) return false;
      if (industry !== ALL && p.industry !== industry) return false;
      if (status !== ALL && p.status !== status) return false;
      if (y !== null) {
        // Проект «активен» в году y, если год попадает в период реализации.
        const inPeriod =
          p.startYear != null && p.endYear != null
            ? p.startYear <= y && y <= p.endYear
            : p.startYear === y;
        if (!inPeriod) return false;
      }
      return true;
    });
  }, [projects, organization, region, industry, status, year]);

  const isFiltered = [organization, region, industry, status, year].some((v) => v !== ALL);

  // Распределение по регионам — из ОТФИЛЬТРОВАННОГО списка (пересчитывается вместе с фильтрами).
  const regionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filtered) {
      const r = p.region ?? "Без региона";
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const maxCount = regionCounts[0]?.[1] ?? 0;

  function reset() {
    setOrganization(ALL);
    setRegion(ALL);
    setIndustry(ALL);
    setStatus(ALL);
    setYear(ALL);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ── Сайдбар: фильтры + сводка ── */}
      <aside className="space-y-6">
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4 text-brand" />
            Фильтры
          </div>
          <Filter
            label="Организация"
            value={organization}
            onChange={setOrganization}
            options={organizations.map((o) => ({ value: o, label: o }))}
          />
          <Filter
            label="Регион"
            value={region}
            onChange={setRegion}
            options={regions.map((r) => ({ value: r, label: r }))}
          />
          <Filter
            label="Отрасль"
            value={industry}
            onChange={setIndustry}
            options={industries.map((i) => ({ value: i, label: i }))}
          />
          <Filter
            label="Статус"
            value={status}
            onChange={setStatus}
            options={statuses.map((s) => ({ value: s, label: statusMeta(s).label }))}
          />
          <Filter
            label="Год финансирования"
            value={year}
            onChange={setYear}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={reset} className="w-full">
              Сбросить фильтры
            </Button>
          )}
        </div>

        {/* Распределение по регионам */}
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPinned className="h-4 w-4 text-brand" />
              По регионам
            </div>
            <span className="text-sm text-muted-foreground">Проектов: {filtered.length}</span>
          </div>
          {regionCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет проектов под фильтры.</p>
          ) : (
            <ul className="space-y-2">
              {regionCounts.map(([r, count]) => (
                <li key={r} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{r}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="bg-brand h-full rounded-full"
                      style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Легенда статусов (цвета маркеров) */}
        <div className="space-y-2 rounded-xl border p-4">
          <div className="text-sm font-medium">Статусы</div>
          <ul className="space-y-1.5">
            {Object.values(PROJECT_STATUS_META).map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Карта ── */}
      <div className="h-[70vh] min-h-[440px] overflow-hidden rounded-xl border">
        <ProjectMap projects={filtered} />
      </div>
    </div>
  );
}
