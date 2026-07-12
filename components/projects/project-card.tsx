// Карточка проекта — показывается в попапе при клике по маркеру.
// Презентационный компонент: все данные приходят через props.

import { Building2, MapPin, Factory, Wallet, CalendarRange, ArrowRight } from "lucide-react";

import type { Project } from "@/types";
import { statusMeta } from "@/lib/project-meta";
import { formatTenge } from "@/lib/format";
import { cn } from "@/lib/utils";

function Row({ icon: Icon, children }: { icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const status = statusMeta(project.status);
  const place = [project.locality, project.region].filter(Boolean).join(", ");
  const period =
    project.startYear && project.endYear
      ? `${project.startYear}–${project.endYear}`
      : project.startYear
        ? `с ${project.startYear}`
        : "—";

  return (
    <div className="w-64 space-y-2 text-sm">
      <div className="space-y-1">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
            status.badgeClass,
          )}
        >
          {status.label}
        </span>
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {project.title}
        </h3>
      </div>

      <div className="space-y-1.5 text-muted-foreground">
        {project.organization && <Row icon={Building2}>{project.organization}</Row>}
        {place && <Row icon={MapPin}>{place}</Row>}
        {project.industry && <Row icon={Factory}>{project.industry}</Row>}
        <Row icon={Wallet}>
          <span className="font-medium text-foreground">{formatTenge(project.fundingAmount)}</span>
        </Row>
        <Row icon={CalendarRange}>{period}</Row>
      </div>

      {project.description && (
        <p className="border-t pt-2 text-muted-foreground">{project.description}</p>
      )}

      {/* Заглушка-ссылка на расширенную информацию (отдельной страницы проекта пока нет). */}
      <span className="inline-flex cursor-not-allowed items-center gap-1 pt-1 text-xs text-brand/70">
        Расширенная информация
        <ArrowRight className="h-3 w-3" />
      </span>
    </div>
  );
}
