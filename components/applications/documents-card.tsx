// Карточка «Документы»: приложенные файлы со ссылкой на скачивание (подписанный URL).
// Родитель подписывает ссылки нужным клиентом (session — в кабинете, service-role — в админке).

import { Download, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { DocumentLink } from "@/lib/application-documents";

export function DocumentsCard({ documents }: { documents: DocumentLink[] }) {
  return (
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
  );
}
