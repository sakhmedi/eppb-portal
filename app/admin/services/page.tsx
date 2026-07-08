// Список услуг в админке: создать новую и открыть существующую в конструкторе.

import Link from "next/link";
import { listServiceSummaries } from "@/lib/services";
import { createDraftService } from "@/lib/services-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminServicesPage() {
  const services = await listServiceSummaries();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Услуги</h1>
          <p className="text-muted-foreground">
            Конструктор услуг: собирайте формы без кода и публикуйте.
          </p>
        </div>
        {/* Создание — server action: вставляет черновик и открывает редактор. */}
        <form action={createDraftService}>
          <Button type="submit">+ Создать услугу</Button>
        </form>
      </div>

      {services.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Пока нет услуг. Нажмите «Создать услугу».
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Организация</TableHead>
              <TableHead>Этапов</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действие</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell className="text-muted-foreground">{s.organization ?? "—"}</TableCell>
                <TableCell>{s.stepsCount}</TableCell>
                <TableCell>
                  <Badge variant={s.status === "published" ? "default" : "secondary"}>
                    {s.status === "published" ? "Опубликована" : "Черновик"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/services/${s.id}`}>Открыть</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
