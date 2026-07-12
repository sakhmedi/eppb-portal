"use client";

// Клиентский виджет подбора услуги по описанию ситуации (сценарий 1).
// Отправляет текст в server action recommendServicesAction и показывает 1–3 реальные
// услуги из каталога. Самодостаточен: данные тянет сам через экшен, поэтому один и тот же
// компонент вставляется и на главную, и в каталог без дублирования логики.

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Search } from "lucide-react";

import { recommendServicesAction } from "@/lib/ai-actions";
import type { ServiceRecommendation } from "@/lib/ai/recommend";
import type { AiResult } from "@/lib/ai/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge } from "@/components/ai/ai-badge";

const PLACEHOLDER =
  "Например: я фермер, хочу купить скот в лизинг. Или: нужны оборотные средства для птицефермы.";

export function ServiceFinder({ className }: { className?: string }) {
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState<AiResult<ServiceRecommendation[]> | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const text = situation.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const res = await recommendServicesAction(text);
      setResult(res);
    });
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        <Textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={3}
          maxLength={1000}
          disabled={pending}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter — быстрый отправ, как в чатах.
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-brand" />
            Подбор выполняет AI по каталогу услуг
          </span>
          <Button
            onClick={handleSubmit}
            disabled={pending || !situation.trim()}
            className="bg-brand"
          >
            <Search className="h-4 w-4" />
            {pending ? "Подбираем…" : "Подобрать услугу"}
          </Button>
        </div>
      </div>

      {result && !pending && <Results result={result} />}
    </div>
  );
}

function Results({ result }: { result: AiResult<ServiceRecommendation[]> }) {
  if (!result.ok) {
    return (
      <p className="mt-5 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        AI-подбор сейчас недоступен. Попробуйте позже или воспользуйтесь фильтрами каталога.
      </p>
    );
  }

  if (result.data.length === 0) {
    return (
      <p className="mt-5 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Подходящих услуг в каталоге не нашлось. Попробуйте описать ситуацию иначе или
        посмотрите весь{" "}
        <Link href="/catalog" className="text-brand underline underline-offset-4">
          каталог услуг
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Подходящие меры поддержки</span>
        <AiBadge>Подобрано AI</AiBadge>
      </div>
      <ul className="space-y-3">
        {result.data.map((rec) => (
          <li key={rec.slug}>
            <Link
              href={`/services/${rec.slug}`}
              className="group flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:border-brand"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium leading-snug">{rec.title}</span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
              </div>
              {rec.organization && (
                <span className="text-xs text-muted-foreground">{rec.organization}</span>
              )}
              {rec.reason && <p className="text-sm text-muted-foreground">{rec.reason}</p>}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Ответ сгенерирован AI и может содержать неточности — проверяйте условия на карточке
        услуги.
      </p>
    </div>
  );
}
