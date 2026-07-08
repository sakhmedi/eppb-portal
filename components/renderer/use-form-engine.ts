"use client";

// «Мозг» рендерера: всё состояние пошаговой формы и вся бизнес-логика.
// Специально отделён от разметки — так логику легко читать и тестировать.
//
// Движок НЕ придумывает логику заново, а переиспользует готовый lib-слой:
//   - lib/logic.ts     → isVisible   (ветвление: видно ли поле/шаг)
//   - lib/formula.ts   → applyCalculations (пересчёт calculated-полей)
//   - lib/form-schema.ts → buildFormSchema  (Zod с условной обязательностью)

import { useMemo, useState } from "react";
import type { Service, Step, Field, ApplicationFormData } from "@/types";
import { isVisible } from "@/lib/logic";
import { applyCalculations } from "@/lib/formula";
import { buildFormSchema } from "@/lib/form-schema";

/** Собрать стартовые данные: ответы из initialData + defaultValue полей. */
function buildInitialData(service: Service, initialData?: ApplicationFormData): ApplicationFormData {
  const data: ApplicationFormData = { ...initialData };
  for (const step of service.steps) {
    for (const field of step.fields) {
      if (data[field.key] === undefined && field.defaultValue !== undefined) {
        data[field.key] = field.defaultValue;
      }
    }
  }
  // Один прогон, чтобы calculated-поля были посчитаны сразу при открытии формы.
  return applyCalculations(service, data);
}

export interface FormEngine {
  formData: ApplicationFormData;
  setValue: (key: string, value: unknown) => void;
  /** Видимые шаги (в порядке order, скрытые ветвлением выброшены). */
  visibleSteps: Step[];
  currentStep: Step;
  /** Индекс текущего шага среди видимых (с 0). */
  currentIndex: number;
  /** Всего видимых шагов (M в «шаг N из M»). */
  totalSteps: number;
  errors: Record<string, string>;
  isFirst: boolean;
  isLast: boolean;
  /** Проверить текущий шаг и, если валиден, перейти на следующий видимый. */
  next: () => void;
  /** Вернуться на предыдущий видимый шаг (без валидации). */
  back: () => void;
}

export function useFormEngine(
  service: Service,
  initialData?: ApplicationFormData,
): FormEngine {
  const [formData, setFormData] = useState<ApplicationFormData>(() =>
    buildInitialData(service, initialData),
  );
  // Индекс считаем по ИСХОДНОМУ порядку шагов; в видимые пересчитываем ниже.
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Шаги по порядку order.
  const orderedSteps = useMemo(
    () => [...service.steps].sort((a, b) => a.order - b.order),
    [service],
  );

  // Видимые шаги — пересчитываются на каждый рендер от текущих ответов,
  // поэтому шаг с visibilityCondition появляется/исчезает вживую.
  const visibleSteps = useMemo(
    () => orderedSteps.filter((s) => isVisible(s.visibilityCondition, formData)),
    [orderedSteps, formData],
  );

  // Индекс мог «уехать», если шаги скрылись — держим его в допустимых границах.
  const safeIndex = Math.min(stepIndex, Math.max(visibleSteps.length - 1, 0));
  const currentStep = visibleSteps[safeIndex];

  function setValue(key: string, value: unknown) {
    setFormData((prev) => {
      const next: ApplicationFormData = { ...prev, [key]: value };
      // После каждого изменения пересчитываем все расчётные поля.
      return applyCalculations(service, next);
    });
    // Сняли показанную ошибку с поля, как только пользователь его тронул.
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const rest = { ...prev };
      delete rest[key];
      return rest;
    });
  }

  /** Валидация только текущего шага: строим схему из под-услуги с одним шагом. */
  function validateCurrentStep(): boolean {
    // buildFormSchema принимает Service — подсовываем услугу с единственным шагом.
    // Кросс-шаговые условия работают, т.к. formData содержит ответы всех шагов.
    const schema = buildFormSchema({ ...service, steps: [currentStep] });
    const result = schema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
  }

  function next() {
    if (!validateCurrentStep()) return;
    setStepIndex(Math.min(safeIndex + 1, visibleSteps.length - 1));
  }

  function back() {
    setErrors({});
    setStepIndex(Math.max(safeIndex - 1, 0));
  }

  return {
    formData,
    setValue,
    visibleSteps,
    currentStep,
    currentIndex: safeIndex,
    totalSteps: visibleSteps.length,
    errors,
    isFirst: safeIndex === 0,
    isLast: safeIndex === visibleSteps.length - 1,
    next,
    back,
  };
}

/** Разрешить варианты выбора: из самого поля или из переданного справочника. */
export function resolveOptions(
  field: Field,
  references?: Record<string, { value: string; label: string }[]>,
): { value: string; label: string }[] {
  if (field.options?.length) return field.options;
  if (field.referenceId && references?.[field.referenceId]) {
    return references[field.referenceId];
  }
  return [];
}
