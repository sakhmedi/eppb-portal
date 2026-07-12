// Оформление статусов проекта: подпись, цвет пина на карте и классы бейджа.
// Один источник правды для карточки, маркеров карты и легенды (не дублируем цвета).
// Client-safe (без server-only) — используется и в клиентских компонентах.

export interface StatusMeta {
  label: string;
  /** Цвет пина-маркера на карте (hex — Leaflet рисует SVG, ему нужен конкретный цвет). */
  color: string;
  /** Классы Tailwind для бейджа статуса. */
  badgeClass: string;
}

export const PROJECT_STATUS_META: Record<string, StatusMeta> = {
  in_progress: {
    label: "Реализуется",
    color: "#16a34a", // зелёный — акцент бренда
    badgeClass: "bg-brand-subtle text-brand",
  },
  completed: {
    label: "Завершён",
    color: "#2563eb", // синий
    badgeClass: "bg-blue-100 text-blue-700",
  },
  paused: {
    label: "На паузе",
    color: "#d97706", // янтарный
    badgeClass: "bg-amber-100 text-amber-700",
  },
};

const FALLBACK: StatusMeta = {
  label: "—",
  color: "#6b7280",
  badgeClass: "bg-muted text-muted-foreground",
};

export function statusMeta(status?: string): StatusMeta {
  if (!status) return FALLBACK;
  return PROJECT_STATUS_META[status] ?? { ...FALLBACK, label: status };
}
