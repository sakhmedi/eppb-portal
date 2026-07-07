// Пользователь и его роль. Роль определяет, что человеку доступно в портале.

import { ID, Timestamps } from "./common";

/**
 * Роль пользователя:
 * - applicant — заявитель (подаёт заявки в личном кабинете);
 * - operator — сотрудник организации (рассматривает заявки);
 * - admin — администратор (собирает услуги в конструкторе).
 */
export type UserRole = "applicant" | "operator" | "admin";

export interface User extends Timestamps {
  id: ID;
  email: string;
  fullName?: string;
  /** ИИН физлица (12 цифр). */
  iin?: string;
  /** БИН юрлица (12 цифр). */
  bin?: string;
  role: UserRole;
  /** К какой организации относится сотрудник (для operator/admin). */
  organizationId?: ID;
}
