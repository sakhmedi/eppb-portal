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
  | "file" // загрузка файла
  | "iin" // ИИН — 12 цифр, физлицо
  | "bin" // БИН — 12 цифр, юрлицо
  | "calculated"; // значение вычисляется по формуле, пользователь его не вводит

/** Вариант выбора для select / radio. */
export interface FieldOption {
  value: string;
  label: string;
}

/** Доп. правила валидации значения поля (обязательность — отдельно, в Field.required). */
export interface FieldValidation {
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
  /** Стабильный идентификатор (UUID) — идентичность поля в БД. */
  id: ID;
  /**
   * Человекочитаемый машинный ключ. По нему значение хранится в заявке
   * (Application.formData) и на поле ссылаются условия и формулы.
   * Уникален в рамках услуги, напр. "companyBin".
   */
  key: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  /** Подсказка под полем. */
  hint?: string;
  /** Обязательно ли поле для заполнения. */
  required?: boolean;
  defaultValue?: string | number | boolean;
  validation?: FieldValidation;

  /** Варианты выбора заданы прямо здесь... */
  options?: FieldOption[];
  /** ...или подтягиваются из справочника по его id (см. Reference). */
  referenceId?: ID;

  /** Поле видно, только если правило истинно. Нет правила — видно всегда. */
  visibilityCondition?: VisibilityRule;
  /** Формула расчёта. Задаётся, когда type === "calculated". */
  formula?: CalculatedFormula;
}
