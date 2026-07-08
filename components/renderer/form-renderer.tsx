"use client";

// Рендерер услуги: из JSON (Service) собирает рабочую пошаговую форму.
// Один шаг на экране, индикатор прогресса, навигация Назад/Далее.
// Вся логика — в useFormEngine; здесь только композиция UI.

import type { Service, ApplicationFormData, ReferenceOption, ID } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormEngine } from "./use-form-engine";
import { FieldRow } from "./field-row";

interface FormRendererProps {
  service: Service;
  initialData?: ApplicationFormData;
  /** Справочники для полей с referenceId (пока передаём вручную, без БД). */
  references?: Record<ID, ReferenceOption[]>;
  /** Показать текущий formData под формой (для наглядности на демо-странице). */
  debug?: boolean;
}

export function FormRenderer({ service, initialData, references, debug }: FormRendererProps) {
  const engine = useFormEngine(service, initialData);
  const { currentStep, currentIndex, totalSteps, formData, errors } = engine;

  // На случай, если все шаги скрыты ветвлением.
  if (!currentStep) {
    return <p className="text-sm text-muted-foreground">Нет доступных шагов.</p>;
  }

  const progress = totalSteps > 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0;

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
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentStep.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {currentStep.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              formData={formData}
              error={errors[field.key]}
              references={references}
              onChange={(value) => engine.setValue(field.key, value)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={engine.back} disabled={engine.isFirst}>
          Назад
        </Button>
        {/* Отправки пока нет: на последнем шаге кнопка «Далее» задизейблена. */}
        <Button onClick={engine.next} disabled={engine.isLast}>
          Далее
        </Button>
      </div>

      {debug && (
        <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-xs">
          {JSON.stringify(formData, null, 2)}
        </pre>
      )}
    </div>
  );
}
