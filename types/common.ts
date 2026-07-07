// Общие, «строительные» типы, которые используются во всех остальных файлах.

/** Уникальный идентификатор записи (UUID, который генерирует Supabase). */
export type ID = string;

/** Дата-время в формате ISO 8601, напр. "2026-07-07T10:00:00Z". */
export type ISODateString = string;

/**
 * Поля аудита — когда запись создана и когда последний раз менялась.
 * Наследуем их в сущностях, которые хранятся в БД (через `extends Timestamps`).
 */
export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
