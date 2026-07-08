"use client";

// Форма входа. Отправляет данные в server action login (lib/auth-actions).
// useFormState хранит текст ошибки, useFormStatus — состояние «отправляется».

import { useFormState, useFormStatus } from "react-dom";
import { login } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Входим…" : "Войти"}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useFormState(login, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {/* Куда вернуть после входа (передаётся из middleware через ?redirect=...). */}
      <input type="hidden" name="redirect" value={redirectTo ?? "/account"} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
