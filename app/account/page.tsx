import { getProfile } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { denied?: string };
}) {
  const profile = await getProfile();

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
          <CardDescription>
            Здесь появятся ваши заявки по услугам. Раздел наполним на следующих шагах.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Пока пусто.
        </CardContent>
      </Card>
    </main>
  );
}
