"use client";

// Форма регистрации. Отправляет данные в server action register (lib/auth-actions).
// Профиль в users_profiles создаст триггер handle_new_user — здесь только email + пароль.

import { useFormState, useFormStatus } from "react-dom";
import { register } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Создаём…" : "Зарегистрироваться"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(register, undefined);

  return (
    <form action={formAction} className="space-y-4">
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
          autoComplete="new-password"
          minLength={6}
          required
        />
        <p className="text-xs text-muted-foreground">Минимум 6 символов.</p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
