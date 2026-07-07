// Пользователь и его роль. Роль определяет, что человеку доступно в портале.

import { ID, Timestamps } from "./common";

/**
 * Роль пользователя:
 * - user — заявитель (подаёт заявки в личном кабинете);
 * - admin — администратор (собирает услуги в конструкторе, ведёт заявки).
 */
export type UserRole = "user" | "admin";

export interface User extends Timestamps {
  id: ID;
  email: string;
  fullName?: string;
  /** ИИН физлица (12 цифр). */
  iin?: string;
  /** БИН юрлица (12 цифр). */
  bin?: string;
  role: UserRole;
}
