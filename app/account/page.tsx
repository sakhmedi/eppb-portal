import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";

import { getProfile } from "@/lib/auth";
import { getMyApplications, type MyApplication } from "@/lib/applications";
import { getMyNotifications } from "@/lib/notifications";
import { STATUS_BADGE, actionLabel } from "@/lib/application-status";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarkReadButton } from "@/components/account/mark-read-button";

/** Куда ведёт заявка: черновик/ждёт документы → в форму подачи, остальное → карточка заявки. */
function applicationHref(app: MyApplication): string {
  const inForm = app.status === "draft" || app.status === "awaiting_documents";
  if (inForm && app.serviceSlug) return `/services/${app.serviceSlug}/apply`;
  return `/account/applications/${app.id}`;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { denied?: string };
}) {
  const [profile, applications, notifications] = await Promise.all([
    getProfile(),
    getMyApplications(),
    getMyNotifications(),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Личный кабинет</h1>
        <p className="text-muted-foreground">
          {profile?.full_name || profile?.email}
        </p>
      </div>

      {/* Вежливый отказ, если сюда перекинуло из админки. */}
      {searchParams.denied === "admin" && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Раздел «Админка» доступен только администраторам.
        </p>
      )}

      {/* Уведомления: события смены статусов заявок, свежие сверху. */}
      {notifications.items.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Уведомления
                {notifications.unreadCount > 0 && (
                  <Badge className="bg-brand">{notifications.unreadCount}</Badge>
                )}
              </CardTitle>
              {notifications.unreadCount > 0 && <MarkReadButton />}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {notifications.items.slice(0, 12).map((n, i) => (
                <li key={`${n.applicationId}-${n.changedAt}-${i}`}>
                  <Link
                    href={`/account/applications/${n.applicationId}`}
                    className={`flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent ${
                      n.unread ? "border-brand/40 bg-brand-subtle" : ""
                    }`}
                  >
                    <span className="min-w-0 text-sm">
                      Изменился статус заявки «{n.serviceTitle}» —{" "}
                      <span className="font-medium">{STATUS_BADGE[n.status].label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(n.changedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Мои заявки</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              У вас пока нет заявок. Выберите услугу в{" "}
              <Link href="/catalog" className="underline underline-offset-4">
                каталоге
              </Link>{" "}
              и подайте заявку.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {applications.map((app) => {
                const status = STATUS_BADGE[app.status];
                return (
                  <li
                    key={app.id}
                    className="flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/account/applications/${app.id}`}
                        className="min-w-0 font-medium hover:underline"
                      >
                        {app.serviceTitle}
                      </Link>
                      <Badge variant={status.variant} className="shrink-0">
                        {status.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      № {app.id.slice(0, 8).toUpperCase()} · обновлена{" "}
                      {formatDate(app.updatedAt)}
                    </div>
                    <Link
                      href={applicationHref(app)}
                      className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand underline-offset-4 hover:underline"
                    >
                      {actionLabel(app.status)}
                      <ChevronRight className="size-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
