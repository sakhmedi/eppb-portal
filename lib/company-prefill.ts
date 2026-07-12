// Сопоставление данных компании из реестра с полями конкретной услуги.
// ЧИСТЫЙ, client-safe модуль (форма подачи — клиентская). Ключи полей в услугах не
// стандартизированы, поэтому находим целевые поля по эвристике (ключ/label) — как это
// делает buildPrefill (lib/application-stages).

import type { Service, Field, ApplicationFormData } from "@/types";
import type { CompanyInfo } from "@/lib/integrations/types";

const NAME_KEYS = new Set(["applicantname", "companyname", "name", "fullname", "orgname"]);
const NAME_LABEL = /наимен|компан|организац|заявител/i;
const ACTIVITY_KEYS = new Set(["industry", "activity", "oked", "okved"]);
const ACTIVITY_LABEL = /вид деятельн|отрасл|оквэд|окэд/i;

function allFields(service: Service): Field[] {
  return service.steps.flatMap((s) => s.fields);
}

/** Найти ключ поля наименования организации/заявителя. */
function findNameKey(fields: Field[]): string | undefined {
  const field = fields.find(
    (f) =>
      (f.type === "text" || f.type === "textarea") &&
      (NAME_KEYS.has(f.key.toLowerCase()) || NAME_LABEL.test(f.label)),
  );
  return field?.key;
}

/** Найти ключ поля региона (select с регионами или поле region). */
function findRegionKey(fields: Field[]): string | undefined {
  const field = fields.find(
    (f) => f.key.toLowerCase() === "region" || /регион|область/i.test(f.label),
  );
  return field?.key;
}

/** Найти ключ поля вида деятельности. */
function findActivityKey(fields: Field[]): string | undefined {
  const field = fields.find(
    (f) =>
      (f.type === "text" || f.type === "textarea") &&
      (ACTIVITY_KEYS.has(f.key.toLowerCase()) || ACTIVITY_LABEL.test(f.label)),
  );
  return field?.key;
}

/**
 * Построить patch формы из данных компании: наименование, регион, вид деятельности.
 * Заполняем только те поля, что реально есть в услуге.
 */
export function mapCompanyToPrefill(
  service: Service,
  company: CompanyInfo,
): ApplicationFormData {
  const fields = allFields(service);
  const patch: ApplicationFormData = {};

  const nameKey = findNameKey(fields);
  if (nameKey) patch[nameKey] = company.name;

  const regionKey = findRegionKey(fields);
  if (regionKey) patch[regionKey] = company.region;

  const activityKey = findActivityKey(fields);
  if (activityKey) patch[activityKey] = company.activity;

  return patch;
}
