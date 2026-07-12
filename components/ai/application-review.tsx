"use client";

// Функция 1 (UI): «Проверить заявку с помощью AI» на последнем шаге подачи.
// Отправляет текущие данные формы в server action reviewApplicationAction и показывает
// список замечаний простым языком. Это ПОМОЩЬ, а не блокировка — кнопка «Подать» рядом
// работает независимо; при сбое AI показываем аккуратное сообщение, подача не страдает.

import { useState, useTransition } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

import { reviewApplicationAction } from "@/lib/ai-actions";
import type { AiResult } from "@/lib/ai/client";
import type { ApplicationFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { AiBadge } from "@/components/ai/ai-badge";

interface ApplicationReviewProps {
  slug: string;
  phase: "primary" | "documents";
  formData: ApplicationFormData;
}

export function ApplicationReview({ slug, phase, formData }: ApplicationReviewProps) {
  const [result, setResult] = useState<AiResult<string[]> | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCheck() {
    if (pending) return;
    startTransition(async () => {
      const res = await reviewApplicationAction(slug, phase, formData);
      setResult(res);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-brand" />
            Проверка перед отправкой
          </div>
          <p className="text-xs text-muted-foreground">
            AI подскажет, что стоит перепроверить. Это совет — подать заявку можно в любом случае.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleCheck}
          disabled={pending}
          className="shrink-0"
        >
          {pending
            ? "Проверяем…"
            : result
              ? "Проверить ещё раз"
              : "Проверить заявку с помощью AI"}
        </Button>
      </div>

      {result && !pending && <ReviewResult result={result} />}
    </div>
  );
}

function ReviewResult({ result }: { result: AiResult<string[]> }) {
  if (!result.ok) {
    return (
      <p className="rounded-lg border border-dashed bg-background p-3 text-sm text-muted-foreground">
        AI-проверка сейчас недоступна. Вы можете подать заявку — система проверит обязательные
        поля при отправке.
      </p>
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="space-y-2 rounded-lg border bg-background p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium">Замечаний не найдено</span>
          <AiBadge>Проверено AI</AiBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          AI не нашёл явных проблем. Проверьте данные ещё раз глазами и отправляйте.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium">Стоит перепроверить</span>
        <AiBadge>Проверено AI</AiBadge>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
        {result.data.map((remark, i) => (
          <li key={i}>{remark}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Замечания сформированы AI и могут быть неточными. Это подсказки, а не запрет на подачу.
      </p>
    </div>
  );
}
