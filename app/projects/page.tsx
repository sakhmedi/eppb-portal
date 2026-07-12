// Публичная карта проектов холдинга «Байтерек». Доступна всем (RLS projects — public read).
// Серверный компонент грузит проекты из БД; интерактив (карта, фильтры, сводка) — в
// клиентском ProjectsExplorer. Сама карта (Leaflet) внутри него грузится динамически с
// ssr:false, поэтому серверный рендер страницы безопасен.

import type { Metadata } from "next";

import { getProjects } from "@/lib/projects";
import { ProjectsExplorer } from "@/components/projects/projects-explorer";

export const metadata: Metadata = {
  title: "Карта проектов — ЕППБ",
  description:
    "Интерактивная карта проектов, профинансированных холдингом «Байтерек» и его дочерними организациями, с фильтрами по региону, организации, отрасли и статусу.",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Карта проектов</h1>
        <p className="text-muted-foreground">
          Проекты, профинансированные холдингом «Байтерек» и его дочерними организациями.
          Выберите фильтры, чтобы увидеть распределение по регионам и отраслям.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Проекты пока не загружены. Примените миграции с демо-данными проектов, и карта
          наполнится.
        </div>
      ) : (
        <ProjectsExplorer projects={projects} />
      )}
    </main>
  );
}
