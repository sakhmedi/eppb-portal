// Единый источник правды по статусам заявки: как показать бейдж, что статус значит
// простым языком и какое действие предложить. Используется списком заявок в кабинете,
// страницей отдельной заявки и лентой уведомлений — чтобы подписи не расходились.

import type { ApplicationStatus } from "@/types";

/** Вариант бейджа shadcn/ui для каждого статуса. */
export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

/** Метка и вариант бейджа статуса. */
export const STATUS_BADGE: Record<ApplicationStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Черновик", variant: "outline" },
  awaiting_documents: { label: "Требуются документы", variant: "default" },
  submitted: { label: "Подана", variant: "secondary" },
  in_review: { label: "На рассмотрении", variant: "secondary" },
  approved: { label: "Одобрена", variant: "secondary" },
  rejected: { label: "Отклонена", variant: "destructive" },
};

/** Что статус означает простым языком — для страницы заявки. */
export const STATUS_MEANING: Record<ApplicationStatus, string> = {
  draft: "Черновик ещё не отправлен. Вы можете продолжить заполнение в любой момент.",
  awaiting_documents:
    "Первичная заявка принята. Осталось приложить документы и подтвердить согласия.",
  submitted: "Заявка подана и ожидает обработки ведомством.",
  in_review: "Заявку рассматривают. Мы сообщим об изменении статуса.",
  approved: "Заявка одобрена.",
  rejected: "Заявка отклонена. Подробности — в истории статусов.",
};

/** Что предлагаем сделать с заявкой в зависимости от статуса (подпись действия). */
export function actionLabel(status: ApplicationStatus): string {
  if (status === "draft") return "Продолжить заполнение";
  if (status === "awaiting_documents") return "Приложить документы";
  return "Открыть";
}
