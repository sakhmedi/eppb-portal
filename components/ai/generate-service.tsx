"use client";

// Функция 2 (UI): «Собрать услугу по описанию» в конструкторе.
// Автор пишет услугу словами → server action generateServiceDraftAction возвращает валидный
// черновик структуры (или понятную ошибку). Успех отдаём наверх через onGenerated —
// конструктор подставляет черновик в редактор для доработки (не публикует автоматически).

import { useState, useTransition } from "react";
import { Sparkles, WandSparkles } from "lucide-react";

import { generateServiceDraftAction } from "@/lib/ai-actions";
import type { GeneratedDraft } from "@/lib/ai/generate-service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiBadge } from "@/components/ai/ai-badge";

const PLACEHOLDER =
  "Например: субсидирование ставки для аграриев. Нужны БИН, регион, сумма кредита, ставка, срок до 60 месяцев. Документы — устав и финотчётность. Если сумма больше 100 млн — нужен бизнес-план.";

export function GenerateServiceDraft({
  onGenerated,
}: {
  onGenerated: (draft: GeneratedDraft) => void;
}) {
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    const text = description.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await generateServiceDraftAction(text);
      if (res.ok) {
        onGenerated(res.data);
      } else if (res.reason === "invalid") {
        setError(
          `AI вернул структуру, которая не прошла проверку${
            res.message ? `: ${res.message}` : ""
          }. Уточните описание и попробуйте снова.`,
        );
      } else {
        setError(
          "AI-генерация сейчас недоступна. Попробуйте позже или соберите услугу вручную ниже.",
        );
      }
    });
  }

  return (
    <Card className="border-brand/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-brand" />
          Собрать услугу по описанию
          <AiBadge>AI</AiBadge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Опишите услугу словами — AI составит черновик этапов и полей. Вы сможете его
          доработать перед публикацией.
        </p>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={4}
          maxLength={4000}
          disabled={pending}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Черновик откроется в конструкторе — не публикуется автоматически.
          </span>
          <Button
            onClick={handleGenerate}
            disabled={pending || !description.trim()}
            className="bg-brand shrink-0"
          >
            <WandSparkles className="h-4 w-4" />
            {pending ? "Генерируем…" : "Сгенерировать черновик"}
          </Button>
        </div>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
