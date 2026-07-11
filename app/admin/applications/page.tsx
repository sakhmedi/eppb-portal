// Список всех заявок в админке: сводка по статусам + таблица с фильтрами и поиском.

import { listApplicationsForAdmin } from "@/lib/applications";
import { STATUS_BADGE } from "@/lib/application-status";
import type { ApplicationStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ApplicationsBrowser } from "@/components/admin/applications-browser";

// Порядок карточек-счётчиков — по ходу жизненного цикла заявки.
const STATUS_ORDER: ApplicationStatus[] = [
  "draft",
  "awaiting_documents",
  "submitted",
  "in_review",
  "approved",
  "rejected",
];

export default async function AdminApplicationsPage() {
  const applications = await listApplicationsForAdmin();

  // Сводка: сколько заявок в каждом статусе.
  const counts = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<ApplicationStatus, number>,
  );
  for (const a of applications) counts[a.status] += 1;

  // Уникальные услуги для фильтра.
  const services = Array.from(new Set(applications.map((a) => a.serviceTitle))).sort();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Обработка заявок</h1>
        <p className="text-muted-foreground">
          Все поданные заявки: просмотр данных, документов и смена статуса.
        </p>
      </div>

      {/* Сводка по статусам */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="rounded-lg border p-3">
            <div className="text-2xl font-bold tabular-nums">{counts[s]}</div>
            <Badge variant={STATUS_BADGE[s].variant} className="mt-1">
              {STATUS_BADGE[s].label}
            </Badge>
          </div>
        ))}
      </div>

      {applications.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Пока нет ни одной заявки.
        </p>
      ) : (
        <ApplicationsBrowser applications={applications} services={services} />
      )}
    </main>
  );
}
