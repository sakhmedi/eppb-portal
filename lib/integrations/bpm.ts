import "server-only";

// ┌─ MOCK ИНТЕГРАЦИЯ: передача заявки в BPM ───────────────────────────────────────┐
// │ Имитирует отправку заявки во внешнюю BPM-систему дочерней организации через     │
// │ Единую интеграционную шину и возврат внешнего регистрационного номера. Позже    │
// │ станет реальным вызовом шины; сигнатура (payload → BpmResult) сохранится.       │
// └────────────────────────────────────────────────────────────────────────────────┘

import { simulateNetworkDelay } from "./delay";
import type { BpmResult } from "./types";

export interface BpmSubmissionInput {
  applicationId: string;
  serviceTitle: string;
}

/** Передать заявку во внешнюю BPM-систему (демо). Возвращает внешний номер и статус. */
export async function submitToBpm(input: BpmSubmissionInput): Promise<BpmResult> {
  await simulateNetworkDelay(500, 1000);
  // Внешний номер: год + короткий фрагмент id заявки — читаемо и стабильно для демо.
  const suffix = input.applicationId.replace(/\D/g, "").slice(0, 6).padStart(6, "0");
  const externalRef = `BPM-2026-${suffix}`;
  return { externalRef, bpmStatus: "accepted" };
}
