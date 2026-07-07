// Справочник — переиспользуемый список значений (регионы, ОКЭД, типы бизнеса).
// Поле ссылается на справочник через Field.referenceId, а не хранит список у себя.

import { ID, Timestamps } from "./common";

/**
 * Опция справочника.
 * `parentValue` — для каскадных (зависимых) списков: район привязан к области,
 * поэтому у района в parentValue лежит value области.
 */
export interface ReferenceOption {
  value: string;
  label: string;
  parentValue?: string;
}

/** Справочник целиком. */
export interface Reference extends Timestamps {
  id: ID;
  title: string;
  options: ReferenceOption[];
}
