"use client";

// Клиентский виджет «Объяснить простыми словами» на карточке услуги (сценарий 2).
// По клику зовёт server action explainServiceAction(slug) и показывает объяснение прямо
// под кнопкой. AI — прогрессивное улучшение: карточка полностью работает и без него,
// а при сбое показывается аккуратное сообщение, страница не падает.

import { useState, useTransition } from "react";
import { Sparkles, WandSparkles } from "lucide-react";

import { explainServiceAction } from "@/lib/ai-actions";
import type { AiResult } from "@/lib/ai/client";
import { Button } from "@/components/ui/button";
import { AiBadge } from "@/components/ai/ai-badge";

export function ExplainService({ slug }: { slug: string }) {
  const [result, setResult] = useState<AiResult<string> | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (pending) return;
    startTransition(async () => {
      const res = await explainServiceAction(slug);
      setResult(res);
    });
  }

  return (
    <section className="space-y-4 rounded-xl border bg-muted/30 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-brand" />
            Не всё понятно?
          </h2>
          <p className="text-sm text-muted-foreground">
            AI объяснит условия этой услуги простыми словами.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleClick}
          disabled={pending}
          className="shrink-0"
        >
          <WandSparkles className="h-4 w-4" />
          {pending
            ? "Готовим объяснение…"
            : result?.ok
              ? "Объяснить заново"
              : "Объяснить простыми словами"}
        </Button>
      </div>

      {result && !pending && <Explanation result={result} />}
    </section>
  );
}

function Explanation({ result }: { result: AiResult<string> }) {
  if (!result.ok) {
    return (
      <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
        AI-объяснение сейчас недоступно. Попробуйте позже — условия услуги описаны выше на
        карточке.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <AiBadge>AI-объяснение</AiBadge>
      {/* Простой текст модели с сохранением абзацев — без сторонних markdown-парсеров. */}
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {result.data}
      </div>
      <p className="text-xs text-muted-foreground">
        Текст сгенерирован AI и может содержать неточности. Точные условия — в официальных
        документах услуги.
      </p>
    </div>
  );
}
