"use client";

// Панель смены статуса заявки админом. Кнопки допустимых переходов зеркалят серверный
// ADMIN_TRANSITIONS (сервер — источник правды и всё равно проверит). При отклонении
// причина обязательна; для остальных переходов комментарий необязателен.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setApplicationStatus } from "@/lib/application-actions";
import type { ApplicationStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: [],
  awaiting_documents: [],
  submitted: ["in_review", "rejected"],
  in_review: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

// Подпись и вид кнопки для каждого целевого статуса.
const ACTION: Record<string, { label: string; className?: string; variant?: "destructive" }> = {
  in_review: { label: "Принять в работу" },
  approved: { label: "Одобрить", className: "bg-brand" },
  rejected: { label: "Отклонить", variant: "destructive" },
};

export function StatusChanger({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allowed = TRANSITIONS[currentStatus];

  if (allowed.length === 0) {
    const text =
      currentStatus === "draft" || currentStatus === "awaiting_documents"
        ? "Заявка ещё не подана — обрабатывать нечего."
        : "Заявка обработана: финальный статус изменить нельзя.";
    return <p className="text-sm text-muted-foreground">{text}</p>;
  }

  function run(next: ApplicationStatus) {
    setError(null);
    if (next === "rejected" && comment.trim() === "") {
      setError("Укажите причину отклонения.");
      return;
    }
    startTransition(async () => {
      const res = await setApplicationStatus(applicationId, next, comment.trim() || undefined);
      if (!res.ok) {
        setError(res.errors?.[0] ?? "Не удалось изменить статус");
        return;
      }
      setComment("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий (обязателен при отклонении)"
        rows={3}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {allowed.map((next) => {
          const a = ACTION[next];
          return (
            <Button
              key={next}
              onClick={() => run(next)}
              disabled={pending}
              variant={a.variant}
              className={a.className}
            >
              {a.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
