"use client";

// Интерактивная часть списка заявок в админке: поиск по номеру и фильтры по статусу,
// услуге и диапазону дат подачи. Заявок немного — фильтруем в памяти на клиенте.

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";

import type { AdminApplicationSummary } from "@/lib/applications";
import type { ApplicationStatus } from "@/types";
import { STATUS_BADGE } from "@/lib/application-status";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Значение для пункта «Все» в фильтрах (Radix Select не разрешает пустое value).
const ALL = "__all__";

// Порядок статусов в фильтре — по ходу жизненного цикла заявки.
const STATUS_ORDER: ApplicationStatus[] = [
  "draft",
  "awaiting_documents",
  "submitted",
  "in_review",
  "approved",
  "rejected",
];

export function ApplicationsBrowser({
  applications,
  services,
}: {
  applications: AdminApplicationSummary[];
  services: string[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [service, setService] = useState<string>(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return applications.filter((a) => {
      const matchesQuery = q === "" || a.number.includes(q);
      const matchesStatus = status === ALL || a.status === status;
      const matchesService = service === ALL || a.serviceTitle === service;
      // Сравниваем по дате подачи (createdAt), границы включительно.
      const created = a.createdAt.slice(0, 10); // YYYY-MM-DD
      const matchesFrom = from === "" || created >= from;
      const matchesTo = to === "" || created <= to;
      return matchesQuery && matchesStatus && matchesService && matchesFrom && matchesTo;
    });
  }, [applications, query, status, service, from, to]);

  const isFiltered =
    query.trim() !== "" || status !== ALL || service !== ALL || from !== "" || to !== "";

  function reset() {
    setQuery("");
    setStatus(ALL);
    setService(ALL);
    setFrom("");
    setTo("");
  }

  return (
    <div className="space-y-4">
      {/* Панель поиска и фильтров */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по номеру"
          className="lg:max-w-[12rem]"
        />

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="lg:w-52">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Все статусы</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_BADGE[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="lg:w-56">
            <SelectValue placeholder="Услуга" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Все услуги</SelectItem>
            {services.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="from">
            с
          </label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[9.5rem]"
          />
          <label className="text-sm text-muted-foreground" htmlFor="to">
            по
          </label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[9.5rem]"
          />
        </div>

        {isFiltered && (
          <Button variant="ghost" onClick={reset} className="lg:ml-auto">
            Сбросить
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-10 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Заявки не найдены</p>
          <p className="text-sm text-muted-foreground">
            Измените условия поиска или сбросьте фильтры.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Найдено заявок: {filtered.length}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Услуга</TableHead>
                <TableHead>Заявитель</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Подана</TableHead>
                <TableHead className="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const badge = STATUS_BADGE[a.status];
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">№ {a.number}</TableCell>
                    <TableCell>{a.serviceTitle}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.applicantName || a.applicantEmail || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/applications/${a.id}`}>Открыть</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
