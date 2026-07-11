import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Download, FileText, Paperclip } from "lucide-react";

import { getApplicationById } from "@/lib/applications";
import { getServiceById, listReferenceLists, referencesToMap } from "@/lib/services";
import { buildAnswerRows } from "@/lib/application-view";
import { STATUS_BADGE, STATUS_MEANING } from "@/lib/application-status";
import { formatDate, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BUCKET = "application-documents";

/** Документ заявки со ссылкой на скачивание (подписанный URL из приватного бакета). */
interface DocumentLink {
  id: string;
  fileName: string;
  uploadedAt: string;
  url: string | null;
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const application = await getApplicationById(params.id);
  // RLS отдаёт только свою заявку — для чужого id придёт null → 404 (чужие не видны).
  if (!application) notFound();

  // Конфиг услуги нужен, чтобы показать ответы по-человечески (label → значение).
  // Если услугу сняли с публикации, RLS вернёт null — тогда покажем сырые пары.
  const [service, references] = await Promise.all([
    getServiceById(application.serviceId),
    listReferenceLists().then(referencesToMap),
  ]);

  const answers = service
    ? buildAnswerRows(service, application.formData, application.documents, references)
    : Object.entries(application.formData)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([key, v]) => ({ key, label: key, value: String(v) }));

  // Подписанные ссылки на скачивание документов (действуют 10 минут).
  const supabase = createClient();
  const documents: DocumentLink[] = await Promise.all(
    application.documents.map(async (doc) => {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storagePath, 600);
      return {
        id: doc.id,
        fileName: doc.fileName,
        uploadedAt: doc.uploadedAt,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  const history = [...application.statusHistory].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  const badge = STATUS_BADGE[application.status];
  const number = `№ ${application.id.slice(0, 8).toUpperCase()}`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/account" className="hover:text-foreground">
          Личный кабинет
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">Заявка {number}</span>
      </nav>

      {/* Шапка: услуга, статус, что он значит */}
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
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{STATUS_MEANING[application.status]}</p>
          {application.status === "awaiting_documents" && application.serviceSlug && (
            <Button asChild className="bg-brand">
              <Link href={`/services/${application.serviceSlug}/apply`}>
                <Paperclip className="size-4" />
                Приложить документы
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Введённые данные — человекочитаемо */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Данные заявки</CardTitle>
        </CardHeader>
        <CardContent>
          {answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Данные пока не заполнены.</p>
          ) : (
            <dl className="divide-y">
              {answers.map((row) => (
                <div
                  key={row.key}
                  className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-4"
                >
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {!service && (
            <p className="mt-4 text-xs text-muted-foreground">
              Услуга недоступна, поэтому названия полей показаны техническими ключами.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Приложенные документы */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Документы</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Документы не приложены.</p>
          ) : (
            <ul className="divide-y">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{doc.fileName}</div>
                      <div className="text-xs text-muted-foreground">
                        загружен {formatDate(doc.uploadedAt)}
                      </div>
                    </div>
                  </div>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand underline-offset-4 hover:underline"
                    >
                      <Download className="size-4" />
                      Скачать
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">ссылка недоступна</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* История статусов */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">История статусов</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Пока изменений нет: заявка ещё не подана.
            </p>
          ) : (
            <ol className="space-y-4">
              {history.map((change, i) => {
                const b = STATUS_BADGE[change.status];
                return (
                  <li key={`${change.changedAt}-${i}`} className="flex gap-3">
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={b.variant}>{b.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(change.changedAt)}
                        </span>
                      </div>
                      {change.comment && (
                        <p className="mt-1 text-sm text-muted-foreground">{change.comment}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
