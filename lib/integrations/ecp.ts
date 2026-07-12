import "server-only";

// ┌─ MOCK ИНТЕГРАЦИЯ: подпись ЭЦП ────────────────────────────────────────────────┐
// │ Имитирует подписание заявки электронной цифровой подписью (в реале — через НУЦ │
// │ РК / eGov). Возвращает время подписания и идентификатор подписи. Позже станет   │
// │ реальным вызовом; сигнатура сохранится.                                         │
// └───────────────────────────────────────────────────────────────────────────────┘

import { simulateNetworkDelay } from "./delay";
import type { SignatureResult } from "./types";

/** Подписать заявку ЭЦП (демо). Возвращает метку времени и id подписи. */
export async function signApplication(applicationId: string): Promise<SignatureResult> {
  await simulateNetworkDelay(300, 700);
  const signatureId = `ECP-${applicationId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  return { signedAt: new Date().toISOString(), signatureId };
}
