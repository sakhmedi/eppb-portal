// Разбиение услуги на два этапа подачи: «первичный» и «документы».
// Правило универсальное (без хардкода под услугу): идём с конца по шагам, пока ВСЕ поля
// шага — это файлы (type="file") или согласия (type="checkbox"). Такие хвостовые шаги
// образуют «этап документов»; остальные — «первичный этап».
//
// Для «Агробизнеса»: шаг 4 (документы, все file) и шаг 5 (согласия, все checkbox) → этап
// документов; шаги 1–3 → первичный. Для услуги без такого хвоста этапа документов нет —
// она подаётся в одну фазу (сразу submitted).

import type { Service, Step, Field } from "@/types";
import type { Profile } from "@/lib/auth";
import type { ApplicationFormData } from "@/types";

export interface ServiceStages {
  primarySteps: Step[];
  documentSteps: Step[];
  /** Есть ли отдельный этап документов (иначе подача однофазная). */
  hasDocumentStage: boolean;
}

/** Все поля шага — файлы или согласия? Пустой шаг таким не считаем. */
function isDocumentStep(step: Step): boolean {
  if (step.fields.length === 0) return false;
  return step.fields.every((f) => f.type === "file" || f.type === "checkbox");
}

/** Разбить шаги услуги на первичный этап и этап документов. */
export function splitStages(service: Service): ServiceStages {
  const steps = [...service.steps].sort((a, b) => a.order - b.order);

  // Сколько хвостовых шагов подряд являются «документными».
  let boundary = steps.length;
  while (boundary > 0 && isDocumentStep(steps[boundary - 1])) {
    boundary -= 1;
  }

  const primarySteps = steps.slice(0, boundary);
  const documentSteps = steps.slice(boundary);

  // Если «документными» оказались вообще все шаги — считаем услугу однофазной
  // (нечего подавать «первично»), весь набор идёт как первичный.
  if (primarySteps.length === 0) {
    return { primarySteps: steps, documentSteps: [], hasDocumentStage: false };
  }

  return {
    primarySteps,
    documentSteps,
    hasDocumentStage: documentSteps.length > 0,
  };
}

/** Множество ключей полей, относящихся к этапу документов (для серверного мёржа). */
export function documentStageFieldKeys(service: Service): Set<string> {
  const { documentSteps } = splitStages(service);
  const keys = new Set<string>();
  for (const step of documentSteps) {
    for (const field of step.fields) keys.add(field.key);
  }
  return keys;
}

/** Услуга с подменённым набором шагов — для запуска рендерера на одном этапе. */
export function serviceForStage(service: Service, steps: Step[]): Service {
  return { ...service, steps };
}

/**
 * Предзаполнение формы данными профиля пользователя.
 * Соглашения о ключах полей нет, поэтому сопоставляем по ТИПУ поля и простым эвристикам:
 *   - поле type="email" → email профиля;
 *   - поле-имя (key применителя или label про «наименование/ФИО/имя») → full_name.
 * Заполняем только пустые поля. По БИН/ИИН из внешнего реестра — позже (см. TODO).
 */
export function buildPrefill(service: Service, profile: Profile | null): ApplicationFormData {
  if (!profile) return {};
  const data: ApplicationFormData = {};

  const nameKeys = new Set(["applicantname", "fullname", "fio", "name"]);
  const looksLikeName = (field: Field) =>
    nameKeys.has(field.key.toLowerCase()) ||
    /наимен|фио|\bимя\b|заявител/i.test(field.label);

  for (const step of service.steps) {
    for (const field of step.fields) {
      if (field.type === "email" && profile.email) {
        data[field.key] = profile.email;
      } else if (
        (field.type === "text" || field.type === "textarea") &&
        looksLikeName(field) &&
        profile.full_name
      ) {
        data[field.key] = profile.full_name;
      }
      // TODO: предзаполнение по БИН (подтягивание реквизитов из внешнего реестра) —
      // реализуем в задаче про интеграции; здесь mock не выдумываем.
    }
  }

  return data;
}
