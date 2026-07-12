import "server-only";

// ┌─ MOCK ИНТЕГРАЦИЯ: проверка БИН/ИИН во внешнем реестре ────────────────────────┐
// │ Имитирует запрос в ГБД ЮЛ / e-gov через Единую интеграционную шину.           │
// │ Сейчас — демо-справочник из нескольких заготовленных БИН. Позже эта функция   │
// │ станет реальным вызовом реестра; сигнатура (bin → CompanyLookupResult)        │
// │ останется прежней, поэтому вызывающий код (server action, форма) не изменится. │
// └──────────────────────────────────────────────────────────────────────────────┘

import { simulateNetworkDelay } from "./delay";
import type { CompanyInfo, CompanyLookupResult } from "./types";

// Заготовленные компании. region — значение из справочника «Регионы Казахстана»
// (см. seed), чтобы предзаполненный select показал корректную подпись.
const DEMO_COMPANIES: Record<string, CompanyInfo> = {
  "990140000135": {
    bin: "990140000135",
    name: "ТОО «АгроФерма Астана»",
    region: "astana",
    activity: "Разведение крупного рогатого скота",
    status: "active",
  },
  "050340001234": {
    bin: "050340001234",
    name: "ТОО «Даму Агро»",
    region: "almaty-region",
    activity: "Выращивание зерновых культур",
    status: "active",
  },
  "120640005678": {
    bin: "120640005678",
    name: "ИП «Нуржанов»",
    region: "shymkent",
    activity: "Производство продуктов питания",
    status: "active",
  },
  "070540009876": {
    bin: "070540009876",
    name: "ТОО «КарагандыАгро»",
    region: "karaganda",
    activity: "Молочное животноводство",
    status: "active",
  },
  "980240003210": {
    bin: "980240003210",
    name: "ТОО «Атырау Мунай Сервис»",
    region: "atyrau",
    activity: "Вспомогательная деятельность в нефтегазовой отрасли",
    status: "active",
  },
};

/** Примеры демо-БИН для подсказки в UI (реальные данные вернут только они). */
export const DEMO_BINS = Object.keys(DEMO_COMPANIES);

/** Проверить БИН/ИИН и вернуть данные организации из демо-реестра. */
export async function lookupCompanyByBin(bin: string): Promise<CompanyLookupResult> {
  await simulateNetworkDelay();
  const company = DEMO_COMPANIES[bin.trim()];
  return company ? { found: true, company } : { found: false };
}
