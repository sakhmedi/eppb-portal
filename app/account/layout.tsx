// Личный кабинет — только для вошедших. Middleware уже редиректит гостей,
// но проверяем и здесь (на случай, если маршрут не попал под matcher).

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?redirect=/account");
  return <>{children}</>;
}
