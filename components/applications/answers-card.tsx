// Карточка «Данные заявки»: ответы пользователя человекочитаемо (label → значение).
// Данные готовит родитель через buildAnswerRows (lib/application-view).

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnswerRow } from "@/lib/application-view";

export function AnswersCard({
  answers,
  serviceMissing = false,
}: {
  answers: AnswerRow[];
  serviceMissing?: boolean;
}) {
  return (
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
        {serviceMissing && (
          <p className="mt-4 text-xs text-muted-foreground">
            Услуга недоступна, поэтому названия полей показаны техническими ключами.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
