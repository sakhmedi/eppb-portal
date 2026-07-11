// Карточка «История статусов»: лента изменений статуса (что, когда, комментарий).
// Родитель передаёт записи из status_history (порядок не важен — сортируем здесь).

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE } from "@/lib/application-status";
import { formatDateTime } from "@/lib/format";
import type { ApplicationStatusChange } from "@/types";

export function HistoryCard({ history }: { history: ApplicationStatusChange[] }) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">История статусов</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока изменений нет: заявка ещё не подана.
          </p>
        ) : (
          <ol className="space-y-4">
            {sorted.map((change, i) => {
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
  );
}
