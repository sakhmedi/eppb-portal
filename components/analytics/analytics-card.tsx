// Карточка аналитического материала в каталоге. Презентационный компонент.
// Действие зависит от типа доступа:
//   link  → внешняя ссылка (новая вкладка);
//   embed → страница материала /analytics/[id] со встраиванием.

import Link from "next/link";
import { Building2, CalendarRange, ExternalLink, ArrowRight, Frame } from "lucide-react";

import type { AnalyticsItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function AnalyticsCard({ item }: { item: AnalyticsItem }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {item.kind && <Badge variant="secondary">{item.kind}</Badge>}
          {item.accessType === "embed" && (
            <Badge variant="outline" className="gap-1 font-normal">
              <Frame className="h-3 w-3" />
              встраивается
            </Badge>
          )}
        </div>
        <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
        {item.description && (
          <CardDescription className="line-clamp-2">{item.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="mt-auto space-y-3">
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {item.organization && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{item.organization}</span>
            </div>
          )}
          {item.period && (
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 shrink-0" />
              <span>{item.period}</span>
            </div>
          )}
        </div>

        {item.accessType === "embed" ? (
          <Button asChild className="bg-brand w-full">
            <Link href={`/analytics/${item.id}`}>
              Открыть материал
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : item.url ? (
          <Button asChild variant="outline" className="w-full">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              Открыть источник
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Ссылка недоступна
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
