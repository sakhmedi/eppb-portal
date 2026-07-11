import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, User } from "lucide-react";

import { getApplicationById, getApplicantProfile } from "@/lib/applications";
import { getServiceById, listReferenceLists, referencesToMap } from "@/lib/services";
import { buildAnswerRows } from "@/lib/application-view";
import { STATUS_BADGE, STATUS_MEANING } from "@/lib/application-status";
import { signDocuments } from "@/lib/application-documents";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnswersCard } from "@/components/applications/answers-card";
import { DocumentsCard } from "@/components/applications/documents-card";
import { HistoryCard } from "@/components/applications/history-card";
import { StatusChanger } from "@/components/admin/status-changer";

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // RLS пускает админа к любой заявке; для несуществующего id придёт null → 404.
  const application = await getApplicationById(params.id);
  if (!application) notFound();

  const [service, references, applicant] = await Promise.all([
    getServiceById(application.serviceId),
    listReferenceLists().then(referencesToMap),
    getApplicantProfile(application.userId),
  ]);

  const answers = service
    ? buildAnswerRows(service, application.formData, application.documents, references)
    : Object.entries(application.formData)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([key, v]) => ({ key, label: key, value: String(v) }));

  // Документы заявителя подписываем сервис-ролевым клиентом: owner-only storage-политика
  // не пускает админа к чужим файлам обычным клиентом.
  const documents = await signDocuments(createAdminClient(), application.documents);

  const badge = STATUS_BADGE[application.status];
  const number = `№ ${application.id.slice(0, 8).toUpperCase()}`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/applications" className="hover:text-foreground">
          Обработка заявок
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">Заявка {number}</span>
      </nav>

      {/* Шапка: услуга, статус, заявитель */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>{application.serviceTitle}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {number} · подана {formatDate(application.createdAt)}
              </p>
            </div>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{applicant?.fullName || "Имя не указано"}</span>
            {applicant?.email && (
              <span className="text-muted-foreground">· {applicant.email}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{STATUS_MEANING[application.status]}</p>
        </CardContent>
      </Card>

      {/* Управление статусом */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Смена статуса</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusChanger applicationId={application.id} currentStatus={application.status} />
        </CardContent>
      </Card>

      <AnswersCard answers={answers} serviceMissing={!service} />
      <DocumentsCard documents={documents} />
      <HistoryCard history={application.statusHistory} />
    </main>
  );
}
