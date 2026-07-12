// Клиентский путь подачи заявки. Требует авторизации.
// Двухфазная модель: фаза определяется статусом заявки.
//   draft               → фаза «Основные сведения» (шаги 1–3);
//   awaiting_documents  → фаза «Документы и согласия» (шаги 4–5);
//   submitted и далее    → экран статуса (форму больше не показываем).

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";

import { getUser, getProfile } from "@/lib/auth";
import { getServiceBySlug, listReferenceLists, referencesToMap } from "@/lib/services";
import { getOrCreateApplication, getApplicationIntegrationInfo } from "@/lib/applications";
import { splitStages, buildPrefill } from "@/lib/application-stages";
import { formatDateTime } from "@/lib/format";
import type { ApplicationFormData } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ApplyForm } from "@/components/apply/apply-form";

interface PageProps {
  params: { slug: string };
}

export const metadata: Metadata = {
  title: "Подача заявки — ЕППБ",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Подана, на рассмотрении",
  in_review: "На рассмотрении",
  approved: "Одобрена",
  rejected: "Отклонена",
};

export default async function ApplyPage({ params }: PageProps) {
  // 1) Авторизация: гостя отправляем на вход и возвращаем обратно.
  const user = await getUser();
  if (!user) redirect(`/login?redirect=/services/${params.slug}/apply`);

  // 2) Услуга (RLS отдаёт только опубликованную) → иначе 404.
  const service = await getServiceBySlug(params.slug);
  if (!service) notFound();

  // 3) Активная заявка пользователя по услуге (или создаём черновик).
  const application = await getOrCreateApplication(service, user.id);
  const { hasDocumentStage } = splitStages(service);

  const header = (
    <div className="space-y-3">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/catalog" className="transition-colors hover:text-foreground">
          Каталог
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/services/${service.slug}`}
          className="transition-colors hover:text-foreground"
        >
          {service.title}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Подача заявки</span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">{service.title}</h1>
    </div>
  );

  // 4) Заявка уже подана полностью — показываем статус, а не форму.
  if (
    application.status === "submitted" ||
    application.status === "in_review" ||
    application.status === "approved" ||
    application.status === "rejected"
  ) {
    // Результаты интеграций (демо): внешний номер BPM и подпись ЭЦП, если есть.
    const integration = await getApplicationIntegrationInfo(application.id);
    const hasIntegration = integration && (integration.externalRef || integration.signedAt);

    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        {header}
        <div className="rounded-md border bg-muted/40 p-5">
          <div className="text-xs text-muted-foreground">Номер заявки</div>
          <div className="text-lg font-semibold tracking-tight">
            № {application.id.slice(0, 8).toUpperCase()}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Статус: {STATUS_LABEL[application.status] ?? application.status}
          </div>
        </div>

        {hasIntegration && (
          <div className="space-y-1.5 rounded-md border border-brand bg-brand-subtle p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Обработка через интеграционную шину</span>
              <Badge variant="outline" className="border-brand text-brand">
                демо-интеграция
              </Badge>
            </div>
            {integration?.signedAt && (
              <div className="text-sm text-muted-foreground">
                Подписано ЭЦП: {formatDateTime(integration.signedAt)}
              </div>
            )}
            {integration?.externalRef && (
              <div className="text-sm text-muted-foreground">
                Внешний номер BPM:{" "}
                <span className="font-semibold text-foreground">{integration.externalRef}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Заявка уже подана. Следить за её статусом можно в{" "}
          <Link href="/account" className="underline underline-offset-4">
            личном кабинете
          </Link>
          .
        </p>
      </main>
    );
  }

  // 5) Фаза по статусу.
  const phase: "primary" | "documents" =
    application.status === "awaiting_documents" ? "documents" : "primary";

  // 6) Предзаполнение профилем + сохранённые ответы поверх (сохранённое важнее).
  const profile = await getProfile();
  const prefill = buildPrefill(service, profile);
  const initialData: ApplicationFormData = { ...prefill, ...application.formData };

  // 7) Справочники для select-полей (напр. регионы).
  const references = referencesToMap(await listReferenceLists());

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      {header}
      {hasDocumentStage && (
        <p className="text-sm text-muted-foreground">
          {phase === "primary"
            ? "Этап 1 из 2 — основные сведения. Документы приложите на следующем этапе."
            : "Этап 2 из 2 — документы и согласия."}
        </p>
      )}
      <ApplyForm
        service={service}
        applicationId={application.id}
        userId={user.id}
        phase={phase}
        initialData={initialData}
        initialDocuments={application.documents}
        initialStepId={application.currentStepId ?? undefined}
        references={references}
      />
    </main>
  );
}
