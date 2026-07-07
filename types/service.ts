// Услуга и её шаги — то, что админ собирает в конструкторе.
// Service — это, по сути, JSON-конфиг, который рендерер превращает в форму.

import { ID, Timestamps } from "./common";
import { Field } from "./field";
import { VisibilityRule } from "./logic";

/** Этап (шаг) услуги — один экран мастера с набором полей. */
export interface Step {
  id: ID;
  title: string;
  /** Порядок шага в мастере (1, 2, 3…). */
  order: number;
  fields: Field[];
  /** Шаг показывается, только если правило истинно (ветвление по шагам). */
  visibilityCondition?: VisibilityRule;
}

/** Статус публикации услуги. */
export type ServiceStatus = "draft" | "published";

/**
 * Услуга — единица каталога. Собирается конструктором и хранится как JSON.
 * Рендерер читает `steps` и выдаёт пользователю пошаговую форму.
 */
export interface Service extends Timestamps {
  id: ID;
  /** Человекочитаемый URL-идентификатор, напр. "subsidii-msb". */
  slug?: string;
  title: string;
  description?: string;
  category?: string;
  /** Дочерняя организация, оказывающая услугу (напр. «Фонд Даму»). */
  organization?: string;
  status: ServiceStatus;
  /** Растёт при публикации изменений. Заявка фиксирует версию (см. Application). */
  version?: number;
  steps: Step[];
}
