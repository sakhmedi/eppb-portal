// Справочник — переиспользуемый список значений (регионы, ОКЭД, типы бизнеса).
// Поле ссылается на справочник через Field.referenceCode, а не хранит список у себя.

import { ID, Timestamps } from "./common";

/**
 * Элемент справочника.
 * `parentValue` — для каскадных (зависимых) списков: район привязан к области,
 * поэтому у района в parentValue лежит value области.
 */
export interface ReferenceItem {
  value: string;
  label: string;
  parentValue?: string;
}

/** Справочник целиком. */
export interface Reference extends Timestamps {
  id: ID;
  /** Уникальный ключ, по которому на справочник ссылаются поля. */
  code: string;
  title: string;
  items: ReferenceItem[];
}
