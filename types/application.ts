// Заявка — заполненный пользователем экземпляр услуги.
// Если Service — это «шаблон формы», то Application — «заполненный бланк».

import { ID, ISODateString, Timestamps } from "./common";

/** Статус заявки в её жизненном цикле. */
export type ApplicationStatus =
  | "draft" // черновик, ещё заполняется
  | "awaiting_documents" // первичная заявка подана, ждём документы и согласия
  | "submitted" // подана полностью
  | "in_review" // на рассмотрении
  | "approved" // одобрена
  | "rejected"; // отклонена

/**
 * Ответы пользователя. Ключ — это `key` поля из услуги (Field.key),
 * значение — то, что ввёл пользователь. Тип значения заранее не известен,
 * поэтому `unknown` (при чтении проверяем/приводим через Zod).
 */
export type ApplicationFormData = Record<string, unknown>;

/** Загруженный документ (файл лежит в Supabase Storage). */
export interface ApplicationDocument {
  id: ID;
  /** К какому file-полю относится (Field.key). */
  fieldKey: string;
  fileName: string;
  /** Путь к файлу в Supabase Storage. */
  storagePath: string;
  uploadedAt: ISODateString;
}

/** Запись в истории смены статуса — кто, когда и почему поменял статус. */
export interface ApplicationStatusChange {
  status: ApplicationStatus;
  changedBy: ID;
  changedAt: ISODateString;
  comment?: string;
}

/** Заявка. */
export interface Application extends Timestamps {
  id: ID;
  serviceId: ID;
  /**
   * Версия услуги на момент подачи. Храним её, чтобы уже поданная заявка
   * не «поехала», если админ потом изменит форму услуги.
   */
  serviceVersion?: number;
  userId: ID;
  /** Текущий этап мастера (Step.id) — где пользователь остановился. */
  currentStepId: ID;
  status: ApplicationStatus;
  formData: ApplicationFormData;
  documents: ApplicationDocument[];
  statusHistory: ApplicationStatusChange[];
  /** Внешний регистрационный номер в BPM дочерней организации (получен через шину). */
  externalRef?: string;
  /** Момент подписания заявки ЭЦП (получен через шину). */
  signedAt?: ISODateString;
}
