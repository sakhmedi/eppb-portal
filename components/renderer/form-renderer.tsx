"use client";

// Рендерер услуги: из JSON (Service) собирает рабочую пошаговую форму.
// Один шаг на экране, индикатор прогресса, навигация Назад/Далее.
// Вся логика — в useFormEngine; здесь только композиция UI.
//
// Опциональные пропсы (для реальной подачи заявки; демо их не передаёт):
//   onSubmit      — на последнем шаге вместо тупика показываем кнопку submit;
//   onStepAdvance — автосейв черновика при переходе на новый шаг;
//   onUploadFile  — реальная загрузка файлов в Storage (иначе — только имя файла).

import { useEffect, useRef } from "react";
import type { Service, ApplicationFormData, ReferenceOption, ID } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormEngine } from "./use-form-engine";
import { FieldRow, type UploadFileHandler } from "./field-row";

interface FormRendererProps {
  service: Service;
  initialData?: ApplicationFormData;
  /** Справочники для полей с referenceId. */
  references?: Record<ID, ReferenceOption[]>;
  /** Показать текущий formData под формой (для наглядности на демо-странице). */
  debug?: boolean;
  /** С какого шага начать (возобновление черновика). */
  initialStepId?: string;
  /** Вызывается на последнем шаге после успешной валидации — реальная отправка. */
  onSubmit?: (formData: ApplicationFormData) => void;
  /** Вызывается при переходе на новый шаг — автосейв черновика. */
  onStepAdvance?: (formData: ApplicationFormData, currentStepId: string) => void;
  /** Загрузка файла для поля type="file"; возвращает путь в Storage. */
  onUploadFile?: UploadFileHandler;
  /** Подпись кнопки отправки (по умолчанию «Отправить»). */
  submitLabel?: string;
  /** Идёт отправка — блокируем кнопку. */
  submitting?: boolean;
  /** Шаги (Step.id), которые показываем только для чтения (напр. уже поданные первичные). */
  readOnlyStepIds?: string[];
}

export function FormRenderer({
  service,
  initialData,
  references,
  debug,
  initialStepId,
  onSubmit,
  onStepAdvance,
  onUploadFile,
  submitLabel = "Отправить",
  submitting,
  readOnlyStepIds,
}: FormRendererProps) {
  const engine = useFormEngine(service, initialData, { initialStepId });
  const { currentStep, currentIndex, totalSteps, formData, errors } = engine;
  // Текущий шаг только для чтения? (данные уже поданы — их можно просмотреть, но не менять).
  const stepReadOnly = !!currentStep && !!readOnlyStepIds?.includes(currentStep.id);

  // Автосейв: срабатывает при СМЕНЕ шага (не на каждый ввод), сохраняя данные и id
  // шага, на котором пользователь сейчас находится — чтобы вернуться на это же место.
  const mounted = useRef(false);
  const stepId = currentStep?.id;
  useEffect(() => {
    if (!onStepAdvance || !stepId) return;
    // Первый рендер пропускаем — там сохранять ещё нечего (данные не менялись).
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onStepAdvance(formData, stepId);
    // Намеренно реагируем только на смену шага, formData берём актуальный.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  // На случай, если все шаги скрыты ветвлением.
  if (!currentStep) {
    return <p className="text-sm text-muted-foreground">Нет доступных шагов.</p>;
  }

  const progress = totalSteps > 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0;

  function handleSubmit() {
    if (!onSubmit) return;
    if (engine.validate()) onSubmit(engine.formData);
  }

  return (
    <div className="space-y-4">
      {/* Индикатор прогресса: «Шаг N из M» + полоска. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{service.title}</span>
          <span>
            Шаг {currentIndex + 1} из {totalSteps}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="bg-brand h-full rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentStep.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {stepReadOnly && (
            <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Эти данные уже поданы в первичной заявке — их можно просмотреть, но не изменить.
            </p>
          )}
          {currentStep.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              formData={formData}
              error={errors[field.key]}
              references={references}
              onUploadFile={onUploadFile}
              disabled={stepReadOnly}
              onChange={(value) => engine.setValue(field.key, value)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={engine.back} disabled={engine.isFirst}>
          Назад
        </Button>
        {engine.isLast && onSubmit ? (
          <Button className="bg-brand" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Отправка…" : submitLabel}
          </Button>
        ) : (
          <Button onClick={engine.next} disabled={engine.isLast}>
            Далее
          </Button>
        )}
      </div>

      {debug && (
        <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-xs">
          {JSON.stringify(formData, null, 2)}
        </pre>
      )}
    </div>
  );
}
