// Административный кабинет — только для роли admin.
// Роль читаем из users_profiles (getProfile). Гостя отправляем на вход,
// обычного пользователя — в его кабинет с вежливым уведомлением.

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) redirect("/login?redirect=/admin");
  if (profile.role !== "admin") redirect("/account?denied=admin");

  return <>{children}</>;
}
