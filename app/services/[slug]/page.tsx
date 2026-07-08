// Публичная карточка услуги. Доступна всем.
// Услугу тянем по slug; RLS отдаёт анониму только опубликованные — если услуга
// не найдена (или не опубликована), показываем 404.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Step {
  id: string;
  title: string;
  fields?: unknown[];
}

interface ServiceRow {
  title: string;
  description: string | null;
  organization: string | null;
  category: string | null;
  steps: Step[] | null;
}

export default async function ServicePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("services")
    .select("title, description, organization, category, steps")
    .eq("slug", params.slug)
    .maybeSingle();

  const service = data as ServiceRow | null;
  if (!service) notFound();

  const steps = service.steps ?? [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {service.category && <Badge variant="secondary">{service.category}</Badge>}
          {service.organization && (
            <span className="text-sm text-muted-foreground">{service.organization}</span>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{service.title}</h1>
        {service.description && (
          <p className="text-muted-foreground">{service.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Этапы заполнения</CardTitle>
          <CardDescription>
            {steps.length > 0
              ? `Услуга состоит из ${steps.length} шаг(ов).`
              : "Шаги пока не заданы."}
          </CardDescription>
        </CardHeader>
        {steps.length > 0 && (
          <CardContent>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {steps.map((step) => (
                <li key={step.id}>{step.title}</li>
              ))}
            </ol>
          </CardContent>
        )}
      </Card>

      {/* Подача заявки появится, когда добавим рендерер формы по конфигу услуги. */}
      <Button disabled>Подать заявку (скоро)</Button>

      <div>
        <Link
          href="/catalog"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← Назад в каталог
        </Link>
      </div>
    </main>
  );
}
