// Клиентский путь подачи заявки — пока ЗАГЛУШКА.
//
// TODO (следующая задача): здесь будет реальная подача:
//   1. Требовать авторизацию (insert в applications разрешён только залогиненному — см. RLS);
//      если пользователь не вошёл — redirect на /login?redirect=/services/[slug]/apply.
//   2. Рендерить готовый <FormRenderer service={service} references={...} /> из
//      components/renderer/form-renderer.tsx (движок формы уже есть).
//   3. По сабмиту сохранять черновик/заявку в таблицу applications через server action
//      (по образцу lib/services-actions.ts), фиксируя service_version.
// Сейчас достаточно корректного маршрута и аккуратной страницы-заглушки.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock } from "lucide-react";

import { getServiceBySlug } from "@/lib/services";
import { getServiceFacts, pluralSteps } from "@/lib/service-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: { slug: string };
}

export const metadata: Metadata = {
  title: "Подача заявки — ЕППБ",
};

export default async function ApplyPage({ params }: PageProps) {
  const service = await getServiceBySlug(params.slug);
  if (!service) notFound();

  const facts = getServiceFacts(service);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Подача заявки</p>
        <h1 className="text-2xl font-bold tracking-tight">{service.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-brand" />
            Онлайн-подача скоро будет доступна
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Здесь появится пошаговая форма подачи заявки: {facts.stepCount}{" "}
            {pluralSteps(facts.stepCount)}
            {facts.documents.length > 0
              ? ` и загрузка документов (${facts.documents.length})`
              : ""}
            . Мы подключаем её на следующем шаге разработки.
          </p>
          <Button asChild variant="outline">
            <Link href={`/services/${service.slug}`}>
              <ArrowLeft className="h-4 w-4" />
              Вернуться к услуге
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
