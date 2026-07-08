import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
            Собирайте услуги без кода: этапы, поля, ветвление и авторасчёты, с живым
            предпросмотром. Публикация выводит услугу в каталог.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/services">Открыть конструктор услуг</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
