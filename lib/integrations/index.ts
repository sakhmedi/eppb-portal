import "server-only";

// ┌─ Единая интеграционная шина (ФАСАД) ───────────────────────────────────────────┐
// │ Единственная точка подключения к внешним системам холдинга. Сейчас за ней —     │
// │ mock-реализации; позже здесь встанут реальные вызовы шины (eGov IDP, ЭЦП/НУЦ,   │
// │ BPM дочерних организаций, каналы уведомлений). UI и серверные экшены зовут       │
// │ ТОЛЬКО этот слой, поэтому замена mock→реальность не потребует правок в UI.       │
// └────────────────────────────────────────────────────────────────────────────────┘

import { signApplication } from "./ecp";
import { submitToBpm } from "./bpm";
import { sendExternalNotification } from "./notifications";
import type { BusSubmissionResult } from "./types";

export { lookupCompanyByBin, DEMO_BINS } from "./bin-registry";
export * from "./types";

export interface BusSubmissionInput {
  applicationId: string;
  serviceTitle: string;
  /** Куда слать внешнее уведомление (в реале — телефон/email заявителя). */
  recipient: string;
}

/**
 * Провести поданную заявку через шину: подписать ЭЦП → передать в BPM → уведомить.
 * Один вызов из серверного экшена подачи. Возвращает данные для истории и полей заявки.
 */
export async function submitApplicationToBus(
  input: BusSubmissionInput,
): Promise<BusSubmissionResult> {
  const signature = await signApplication(input.applicationId);
  const bpm = await submitToBpm({
    applicationId: input.applicationId,
    serviceTitle: input.serviceTitle,
  });
  await sendExternalNotification({
    recipient: input.recipient,
    channel: "email",
    message: `Ваша заявка на услугу «${input.serviceTitle}» принята. Внешний номер: ${bpm.externalRef}.`,
  });

  return {
    signedAt: signature.signedAt,
    signatureId: signature.signatureId,
    externalRef: bpm.externalRef,
    bpmStatus: bpm.bpmStatus,
  };
}
