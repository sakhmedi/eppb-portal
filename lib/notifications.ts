// Внутренние уведомления кабинета. Отдельной таблицы нет: уведомление — это событие
// смены статуса, а все смены уже записаны в applications.status_history. Здесь мы просто
// разворачиваем историю всех заявок пользователя в плоскую ленту и считаем непрочитанные
// по отметке users_profiles.notifications_last_read_at (её ставит markNotificationsRead).

import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, ApplicationStatusChange } from "@/types";

/** Одно событие ленты уведомлений. */
export interface NotificationItem {
  applicationId: string;
  serviceTitle: string;
  serviceSlug: string | null;
  status: ApplicationStatus;
  changedAt: string;
  comment?: string;
  /** Новее последней отметки «прочитано». */
  unread: boolean;
}

export interface NotificationsResult {
  items: NotificationItem[];
  unreadCount: number;
}

type ServiceRel =
  | { slug: string | null; title: string }
  | { slug: string | null; title: string }[]
  | null;

/**
 * Лента уведомлений о смене статусов заявок текущего пользователя, свежие сверху.
 * RLS отдаёт только его заявки и его профиль.
 */
export async function getMyNotifications(): Promise<NotificationsResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0 };

  const [{ data: apps }, { data: profile }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status_history, service:services(slug, title)"),
    supabase
      .from("users_profiles")
      .select("notifications_last_read_at")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const lastReadAt = profile?.notifications_last_read_at
    ? new Date(profile.notifications_last_read_at as string).getTime()
    : 0;

  const items: NotificationItem[] = [];
  for (const app of apps ?? []) {
    const rel = app.service as ServiceRel;
    const service = Array.isArray(rel) ? (rel[0] ?? null) : rel;
    const history = (app.status_history ?? []) as ApplicationStatusChange[];
    for (const change of history) {
      const at = new Date(change.changedAt).getTime();
      items.push({
        applicationId: app.id as string,
        serviceTitle: service?.title ?? "Услуга",
        serviceSlug: service?.slug ?? null,
        status: change.status,
        changedAt: change.changedAt,
        comment: change.comment,
        unread: Number.isFinite(at) && at > lastReadAt,
      });
    }
  }

  items.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  const unreadCount = items.filter((i) => i.unread).length;
  return { items, unreadCount };
}
