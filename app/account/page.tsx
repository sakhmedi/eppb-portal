import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { getMyApplications } from "@/lib/applications";
import type { ApplicationStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Как показать статус заявки пользователю (метка + вариант бейджа).
const STATUS: Record<ApplicationStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Черновик", variant: "outline" },
  awaiting_documents: { label: "Требуются документы", variant: "default" },
  submitted: { label: "Подана", variant: "secondary" },
  in_review: { label: "На рассмотрении", variant: "secondary" },
  approved: { label: "Одобрена", variant: "secondary" },
  rejected: { label: "Отклонена", variant: "destructive" },
};

// Что предлагаем сделать с заявкой в зависимости от статуса.
function actionLabel(status: ApplicationStatus): string {
  if (status === "draft") return "Продолжить";
  if (status === "awaiting_documents") return "Приложить документы";
  return "Открыть";
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { denied?: string };
}) {
  const [profile, applications] = await Promise.all([getProfile(), getMyApplications()]);

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
            <ul className="divide-y">
              {applications.map((app) => {
                const status = STATUS[app.status];
                return (
                  <li
                    key={app.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{app.serviceTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        № {app.id.slice(0, 8).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {app.serviceSlug && (
                        <Link
                          href={`/services/${app.serviceSlug}/apply`}
                          className="text-sm font-medium text-brand underline-offset-4 hover:underline"
                        >
                          {actionLabel(app.status)}
                        </Link>
                      )}
                    </div>
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
