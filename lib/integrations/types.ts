// Типы слоя интеграций. ЧИСТЫЙ модуль без "server-only" — эти типы нужны и клиенту
// (форма подачи показывает данные компании), и серверу (шина). Сами реализации-mock'и
// лежат в server-only файлах рядом.

/** Данные организации/лица из внешнего реестра (ГБД ЮЛ / e-gov), пришедшие по БИН/ИИН. */
export interface CompanyInfo {
  bin: string;
  /** Наименование организации или ФИО. */
  name: string;
  /** Код региона — совпадает с value справочника «Регионы Казахстана». */
  region: string;
  /** Вид деятельности (ОКЭД) — свободный текст. */
  activity: string;
  /** Статус в реестре. */
  status: "active" | "inactive";
}

/** Результат проверки БИН/ИИН: нашли компанию или нет. */
export type CompanyLookupResult =
  | { found: true; company: CompanyInfo }
  | { found: false };

/** Результат подписания ЭЦП. */
export interface SignatureResult {
  /** Момент подписания (ISO). */
  signedAt: string;
  /** Идентификатор подписи (в реале — от НУЦ). */
  signatureId: string;
}

/** Результат передачи заявки во внешнюю BPM-систему дочерней организации. */
export interface BpmResult {
  /** Внешний регистрационный номер в BPM (напр. BPM-2026-000123). */
  externalRef: string;
  /** Статус приёма во внешней системе. */
  bpmStatus: "accepted" | "rejected";
}

/** Полезная нагрузка внешнего уведомления (SMS/email через шину). */
export interface NotificationPayload {
  /** Кому (в реале — телефон/email заявителя). */
  recipient: string;
  channel: "sms" | "email";
  message: string;
}

/** Сводный результат прохождения заявки через шину: подпись + BPM. */
export interface BusSubmissionResult {
  signedAt: string;
  signatureId: string;
  externalRef: string;
  bpmStatus: "accepted" | "rejected";
}
