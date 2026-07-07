// Поле формы — самый мелкий «кирпичик» конструктора.
// Из полей собираются шаги (Step), из шагов — услуга (Service).

import { ID } from "./common";
import { VisibilityRule, CalculatedFormula } from "./logic";

/** Тип поля — определяет, как оно рисуется и как валидируется. */
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "select" // выбор одного из списка
  | "radio" // то же, но переключателями
  | "checkbox" // одиночный флажок (да/нет)
  | "multiselect" // выбор нескольких значений
  | "file" // загрузка файла
  | "iin" // ИИН — 12 цифр, физлицо
  | "bin"; // БИН — 12 цифр, юрлицо

/** Вариант выбора для select / radio / multiselect. */
export interface FieldOption {
  value: string;
  label: string;
}

/** Правила валидации значения поля. */
export interface FieldValidation {
  required?: boolean;
  /** Для number — минимальное значение; для text — минимальная длина. */
  min?: number;
  /** Для number — максимальное значение; для text — максимальная длина. */
  max?: number;
  /** Регулярное выражение, которому должно соответствовать значение. */
  pattern?: string;
  /** Текст ошибки, если значение не прошло проверку. */
  message?: string;
}

/** Поле формы. */
export interface Field {
  id: ID;
  /**
   * Машинный ключ поля. Именно под ним значение хранится в заявке
   * (Application.data) и по нему на поле ссылаются условия и формулы.
   * Должен быть уникальным в рамках услуги, напр. "companyBin".
   */
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean;
  validation?: FieldValidation;

  /** Варианты заданы прямо здесь... */
  options?: FieldOption[];
  /** ...или подтягиваются из справочника по его `code` (см. Reference). */
  referenceCode?: string;

  /** Поле видно, только если правило истинно. Нет правила — видно всегда. */
  visibleIf?: VisibilityRule;
  /** Если задано — поле расчётное (значение вычисляется, а не вводится). */
  calculated?: CalculatedFormula;
}
