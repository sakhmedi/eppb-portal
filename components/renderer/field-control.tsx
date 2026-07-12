"use client";

// Один input под тип поля. Чистый switch (field.type) → нужный shadcn-контрол.
// Никакой бизнес-логики здесь нет — только «нарисовать и вернуть значение».

import { useState } from "react";
import type { Field, FieldOption } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCalculatedValue } from "@/lib/format";
import type { CompanyInfo } from "@/lib/integrations/types";
import type { UploadFileHandler, BinCheckHandler } from "./field-row";

interface FieldControlProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Уже разрешённые варианты (из field.options или справочника). */
  options: FieldOption[];
  /** Реальная загрузка файла (если не передан — file-поле хранит только имя). */
  onUploadFile?: UploadFileHandler;
  /** Проверка БИН во внешнем реестре (демо-интеграция). */
  onCheckBin?: BinCheckHandler;
  /** Применить предзаполнение к нескольким полям (после проверки БИН). */
  onPrefill?: (patch: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function FieldControl({
  field,
  value,
  onChange,
  options,
  onUploadFile,
  onCheckBin,
  onPrefill,
  disabled,
}: FieldControlProps) {
  const id = `field-${field.key}`;

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          id={id}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <Input
          id={id}
          type="number"
          value={value === undefined || value === null ? "" : (value as number)}
          placeholder={field.placeholder}
          disabled={disabled}
          // Пустое поле — undefined (а не 0), чтобы required и формулы работали верно.
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );

    case "date":
      return (
        <Input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "checkbox":
      return (
        <Checkbox
          id={id}
          checked={Boolean(value)}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      );

    case "select":
      return (
        <Select
          value={(value as string) ?? ""}
          disabled={disabled}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={field.placeholder ?? "Выберите…"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "radio":
      return (
        <RadioGroup
          value={(value as string) ?? ""}
          disabled={disabled}
          onValueChange={(v) => onChange(v)}
        >
          {options.map((o) => (
            <div key={o.value} className="flex items-center gap-2">
              <RadioGroupItem id={`${id}-${o.value}`} value={o.value} />
              <Label htmlFor={`${id}-${o.value}`} className="font-normal">
                {o.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "file":
      // Если передан обработчик загрузки — грузим файл в Storage и храним его путь.
      if (onUploadFile) {
        return (
          <FileUploadControl
            id={id}
            fieldKey={field.key}
            value={value}
            disabled={disabled}
            onUploadFile={onUploadFile}
            onChange={onChange}
          />
        );
      }
      // Иначе (демо, без БД) сохраняем только ИМЯ файла — чтобы отработала валидация required.
      return (
        <Input
          id={id}
          type="file"
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? undefined)}
        />
      );

    case "bin":
      // БИН/ИИН с проверкой во внешнем реестре (демо-интеграция): кнопка «Проверить»
      // подтягивает и предзаполняет реквизиты. Без onCheckBin (демо-страница) — обычный input.
      if (onCheckBin && onPrefill) {
        return (
          <BinCheckControl
            id={id}
            value={value}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={onChange}
            onCheckBin={onCheckBin}
            onPrefill={onPrefill}
          />
        );
      }
      return (
        <Input
          id={id}
          type="text"
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          disabled={disabled}
          inputMode="numeric"
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "calculated":
      // Расчётное поле пользователь не вводит — значение считает движок.
      // Показываем отформатированным (деньги — с округлением и разрядами).
      return (
        <Input id={id} disabled readOnly value={formatCalculatedValue(field, value)} />
      );

    default:
      // text / email / phone / iin (bin — в отдельном case выше)
      return (
        <Input
          id={id}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          disabled={disabled}
          inputMode={field.type === "iin" ? "numeric" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/**
 * Контрол загрузки файла с реальной отправкой в Storage.
 * При выборе файла: грузим через onUploadFile, а в значение поля кладём путь (storagePath).
 * Значение поля — строка-путь (как ждёт buildFormSchema), не сам File.
 */
function FileUploadControl({
  id,
  fieldKey,
  value,
  disabled,
  onUploadFile,
  onChange,
}: {
  id: string;
  fieldKey: string;
  value: unknown;
  disabled?: boolean;
  onUploadFile: UploadFileHandler;
  onChange: (value: unknown) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { storagePath, fileName: name } = await onUploadFile(fieldKey, file);
      onChange(storagePath);
      setFileName(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить файл");
      onChange(undefined);
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }

  // Файл уже был загружен ранее (возобновление заявки) — показываем это.
  const alreadyUploaded = typeof value === "string" && value.length > 0;

  return (
    <div className="space-y-1.5">
      <Input
        id={id}
        type="file"
        disabled={disabled || uploading}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {uploading && <p className="text-xs text-muted-foreground">Загрузка…</p>}
      {!uploading && fileName && (
        <p className="text-xs text-brand">Загружено: {fileName}</p>
      )}
      {!uploading && !fileName && alreadyUploaded && (
        <p className="text-xs text-muted-foreground">Файл уже загружен.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * БИН/ИИН с проверкой во внешнем реестре (демо-интеграция).
 * По кнопке «Проверить» зовёт onCheckBin; при успехе предзаполняет другие поля через
 * onPrefill и показывает, что данные пришли из внешнего источника (с бейджем «демо-интеграция»).
 */
function BinCheckControl({
  id,
  value,
  placeholder,
  disabled,
  onChange,
  onCheckBin,
  onPrefill,
}: {
  id: string;
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: unknown) => void;
  onCheckBin: BinCheckHandler;
  onPrefill: (patch: Record<string, unknown>) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CompanyInfo | "notfound" | null>(null);

  const bin = typeof value === "string" ? value : "";
  const canCheck = /^\d{12}$/.test(bin.trim());

  async function handleCheck() {
    setChecking(true);
    setResult(null);
    try {
      const res = await onCheckBin(bin.trim());
      if (res.found && res.company) {
        if (res.patch) onPrefill(res.patch);
        setResult(res.company);
      } else {
        setResult("notfound");
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          value={bin}
          placeholder={placeholder}
          disabled={disabled}
          inputMode="numeric"
          onChange={(e) => {
            onChange(e.target.value);
            setResult(null);
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleCheck}
          disabled={disabled || checking || !canCheck}
        >
          {checking ? "Проверка…" : "Проверить"}
        </Button>
      </div>

      {!result && !checking && (
        <p className="text-xs text-muted-foreground">
          Демо-режим: попробуйте БИН 990140000135 или 050340001234.
        </p>
      )}

      {result && result !== "notfound" && (
        <div className="rounded-md border border-brand bg-brand-subtle p-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{result.name}</span>
            <Badge variant="outline" className="border-brand text-brand">
              демо-интеграция
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Данные получены из внешнего реестра и подставлены в форму.
          </p>
        </div>
      )}

      {result === "notfound" && (
        <p className="text-xs text-muted-foreground">Компания не найдена в реестре.</p>
      )}
    </div>
  );
}
