import "server-only";

// ┌─ MOCK ИНТЕГРАЦИЯ: внешний канал уведомлений ───────────────────────────────────┐
// │ Единая точка отправки внешних уведомлений (SMS/email через шину). Сейчас пишет  │
// │ в лог; позже здесь будет реальная отправка. Внутренние уведомления в кабинете   │
// │ (из status_history) — отдельный механизм и уже работают; это ВНЕШНИЙ канал.     │
// └────────────────────────────────────────────────────────────────────────────────┘

import { simulateNetworkDelay } from "./delay";
import type { NotificationPayload } from "./types";

/** Отправить внешнее уведомление (демо: лог). Возвращает признак успеха. */
export async function sendExternalNotification(
  payload: NotificationPayload,
): Promise<{ ok: boolean }> {
  await simulateNetworkDelay(200, 500);
  console.log(
    `[MOCK ИНТЕГРАЦИЯ] Уведомление (${payload.channel}) → ${payload.recipient}: ${payload.message}`,
  );
  return { ok: true };
}
