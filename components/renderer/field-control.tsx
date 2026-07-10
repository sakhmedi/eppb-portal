"use client";

// Один input под тип поля. Чистый switch (field.type) → нужный shadcn-контрол.
// Никакой бизнес-логики здесь нет — только «нарисовать и вернуть значение».

import { useState } from "react";
import type { Field, FieldOption } from "@/types";
import { Input } from "@/components/ui/input";
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
import type { UploadFileHandler } from "./field-row";

interface FieldControlProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Уже разрешённые варианты (из field.options или справочника). */
  options: FieldOption[];
  /** Реальная загрузка файла (если не передан — file-поле хранит только имя). */
  onUploadFile?: UploadFileHandler;
  disabled?: boolean;
}

export function FieldControl({
  field,
  value,
  onChange,
  options,
  onUploadFile,
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

    case "calculated":
      // Расчётное поле пользователь не вводит — значение считает движок.
      return (
        <Input
          id={id}
          disabled
          readOnly
          value={value === undefined || value === null ? "—" : String(value)}
        />
      );

    default:
      // text / email / phone / iin / bin
      return (
        <Input
          id={id}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          disabled={disabled}
          inputMode={field.type === "iin" || field.type === "bin" ? "numeric" : undefined}
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
