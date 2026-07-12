// Проект, профинансированный холдингом «Байтерек» — точка на карте проектов.
// Таблица public.projects (расширена миграцией 20260712100000).

/** Статус проекта. */
export type ProjectStatus = "in_progress" | "completed" | "paused";

/** Проект для карты и карточки. */
export interface Project {
  id: string;
  title: string;
  description?: string;
  /** Дочерняя организация холдинга (напр. «Банк Развития Казахстана»). */
  organization?: string;
  /** Регион — человекочитаемая подпись (напр. «Карагандинская область»). */
  region?: string;
  /** Населённый пункт. */
  locality?: string;
  /** Отрасль / направление (АПК, Промышленность, Экспорт…). */
  industry?: string;
  /** Сумма финансирования, ₸. */
  fundingAmount?: number;
  /** Годы реализации. */
  startYear?: number;
  endYear?: number;
  /** Координаты точки на карте. */
  latitude?: number;
  longitude?: number;
  /** Канонично 'in_progress'|'completed'|'paused', но в БД — text. */
  status?: ProjectStatus | string;
}
