// Заявка — заполненный пользователем экземпляр услуги.
// Если Service — это «шаблон формы», то Application — «заполненный бланк».

import { ID, ISODateString, Timestamps } from "./common";

/** Статус заявки в её жизненном цикле. */
export type ApplicationStatus =
  | "draft" // черновик, ещё заполняется
  | "submitted" // подана
  | "in_review" // на рассмотрении у оператора
  | "approved" // одобрена
  | "rejected"; // отклонена

/**
 * Значения полей заявки. Ключ — это `name` поля из услуги (Field.name),
 * значение — то, что ввёл пользователь. Тип значения заранее не известен,
 * поэтому `unknown` (при чтении проверяем/приводим через Zod).
 */
export type ApplicationData = Record<string, unknown>;

/** Загруженный документ (файл лежит в Supabase Storage). */
export interface ApplicationDocument {
  id: ID;
  /** К какому file-полю относится (Field.name). */
  fieldName: string;
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
  serviceVersion: number;
  applicantId: ID;
  status: ApplicationStatus;
  data: ApplicationData;
  documents: ApplicationDocument[];
  history: ApplicationStatusChange[];
}
