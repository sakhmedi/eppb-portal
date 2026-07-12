"use server";

// Server Action-обёртка над интеграцией проверки БИН. Форма (клиент) зовёт её вместо
// прямого обращения к mock'у: так «шина» остаётся серверной, а замена mock→реальный
// вызов реестра не затронет клиентский код.

import { createClient } from "@/lib/supabase/server";
import { lookupCompanyByBin } from "@/lib/integrations";
import type { CompanyLookupResult } from "@/lib/integrations/types";

/** Проверить БИН/ИИН во внешнем реестре (демо). Требует входа в систему. */
export async function checkCompanyByBin(bin: string): Promise<CompanyLookupResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { found: false };

  const digits = (bin ?? "").replace(/\D/g, "");
  if (digits.length !== 12) return { found: false };

  return lookupCompanyByBin(digits);
}
