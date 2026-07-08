import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Административный кабинет</h1>
        <p className="text-muted-foreground">Доступ только для роли admin.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Конструктор услуг</CardTitle>
          <CardDescription>
            Отсюда админ будет собирать услуги через no-code конструктор и вести
            заявки. Наполним на следующих шагах.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Пока пусто.
        </CardContent>
      </Card>
    </main>
  );
}
