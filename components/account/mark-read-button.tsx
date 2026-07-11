"use client";

import { useTransition } from "react";
import { markNotificationsRead } from "@/lib/application-actions";
import { Button } from "@/components/ui/button";

/**
 * Кнопка «Отметить прочитанными». Вызывает серверный экшен, который двигает отметку
 * notifications_last_read_at; revalidatePath("/account") в экшене обновляет счётчик.
 */
export function MarkReadButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => void markNotificationsRead())}
    >
      {pending ? "Отмечаем…" : "Отметить прочитанными"}
    </Button>
  );
}
