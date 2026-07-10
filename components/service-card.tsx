// Карточка одной услуги. Используется и на главной («популярные услуги»),
// и в каталоге. Презентационный компонент — данные получает через props,
// сам ничего не грузит, поэтому работает и в серверных, и в клиентских компонентах.

import Link from "next/link";
import type { PublicService } from "@/lib/services";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ServiceCard({ service }: { service: PublicService }) {
  return (
    <Link href={`/services/${service.slug}`} className="block">
      <Card className="flex h-full flex-col transition-colors hover:border-brand">
        <CardHeader className="space-y-2">
          {service.category && (
            <Badge variant="secondary" className="w-fit">
              {service.category}
            </Badge>
          )}
          <CardTitle className="text-base leading-snug">{service.title}</CardTitle>
          {service.organization && (
            <CardDescription>{service.organization}</CardDescription>
          )}
        </CardHeader>
        {service.description && (
          <CardContent className="mt-auto text-sm text-muted-foreground">
            <p className="line-clamp-2">{service.description}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
