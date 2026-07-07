import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <Badge variant="secondary">MVP · скелет проекта</Badge>
      <h1 className="text-4xl font-bold tracking-tight">
        ЕППБ
      </h1>
      <p className="max-w-md text-muted-foreground">
        Единый портал поддержки бизнеса. Каркас готов — Next.js 14, TypeScript,
        Tailwind и shadcn/ui. Дальше собираем no-code конструктор услуг.
      </p>
    </main>
  );
}
