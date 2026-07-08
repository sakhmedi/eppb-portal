// Публичный каталог услуг. Доступен всем.
// RLS в БД сама отдаёт анонимному пользователю только опубликованные услуги
// (status = 'published'), поэтому здесь дополнительной фильтрации по статусу не нужно.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ServiceRow {
  slug: string | null;
  title: string;
  description: string | null;
  organization: string | null;
  category: string | null;
}

export default async function CatalogPage() {
  const supabase = createClient();
  const { data: services } = await supabase
    .from("services")
    .select("slug, title, description, organization, category")
    .order("title");

  const list = (services as ServiceRow[] | null) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Каталог услуг</h1>
        <p className="text-muted-foreground">Выберите услугу, чтобы посмотреть детали.</p>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет опубликованных услуг.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="block">
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <CardDescription>{s.organization}</CardDescription>
                </CardHeader>
                {s.description && (
                  <CardContent className="text-sm text-muted-foreground">
                    {s.description}
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
