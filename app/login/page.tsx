import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; registered?: string };
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Войдите по email и паролю.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchParams.registered && (
            <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
              Регистрация почти завершена. Если включено подтверждение email —
              проверьте почту, затем войдите.
            </p>
          )}
          <LoginForm redirectTo={searchParams.redirect} />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Нет аккаунта?&nbsp;
          <Link href="/register" className="text-foreground underline underline-offset-4">
            Зарегистрироваться
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
