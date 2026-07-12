"use client";

// Обёртка одного поля: подпись, контрол, подсказка и текст ошибки.
// Само поле рисуется, только если оно видно по visibilityCondition —
// так пользователь не видит нерелевантные поля (ветвление на уровне поля).

import type { Field, ApplicationFormData, ReferenceOption, ID } from "@/types";
import type { CompanyInfo } from "@/lib/integrations/types";
import { isVisible } from "@/lib/logic";
import { Label } from "@/components/ui/label";
import { FieldControl } from "./field-control";
import { resolveOptions } from "./use-form-engine";

/** Обработчик загрузки файла: грузит File и возвращает путь в Storage + имя. */
export type UploadFileHandler = (
  fieldKey: string,
  file: File,
) => Promise<{ storagePath: string; fileName: string }>;

/** Результат проверки БИН для формы: найдена ли компания + готовый patch предзаполнения. */
export interface BinCheckResult {
  found: boolean;
  company?: CompanyInfo;
  patch?: Record<string, unknown>;
}

/** Обработчик проверки БИН: по номеру возвращает данные компании и patch для формы. */
export type BinCheckHandler = (bin: string) => Promise<BinCheckResult>;

interface FieldRowProps {
  field: Field;
  formData: ApplicationFormData;
  error?: string;
  references?: Record<ID, ReferenceOption[]>;
  onUploadFile?: UploadFileHandler;
  /** Проверка БИН во внешнем реестре (демо-интеграция). */
  onCheckBin?: BinCheckHandler;
  /** Применить предзаполнение сразу к нескольким полям. */
  onPrefill?: (patch: Record<string, unknown>) => void;
  /** Поле только для чтения (напр. уже поданные первичные данные на этапе документов). */
  disabled?: boolean;
  onChange: (value: unknown) => void;
}

export function FieldRow({
  field,
  formData,
  error,
  references,
  onUploadFile,
  onCheckBin,
  onPrefill,
  disabled,
  onChange,
}: FieldRowProps) {
  // Ветвление поля: нет правила — видно всегда; есть — считаем по текущим ответам.
  if (!isVisible(field.visibilityCondition, formData)) return null;

  const options = resolveOptions(field, references);
  const controlId = `field-${field.key}`;
  // У checkbox флажок и подпись стоят в одну строку; у остальных — подпись сверху.
  const inline = field.type === "checkbox";

  const label = (
    <Label htmlFor={controlId} className={inline ? "font-normal" : ""}>
      {field.label}
      {field.required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
  );

  const control = (
    <FieldControl
      field={field}
      value={formData[field.key]}
      options={options}
      onUploadFile={onUploadFile}
      onCheckBin={onCheckBin}
      onPrefill={onPrefill}
      disabled={disabled}
      onChange={onChange}
    />
  );

  return (
    <div className="space-y-2">
      {inline ? (
        <div className="flex items-center gap-2">
          {control}
          {label}
        </div>
      ) : (
        <>
          {label}
          {control}
        </>
      )}

      {field.hint && !error && (
        <p className="text-xs text-muted-foreground">{field.hint}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
