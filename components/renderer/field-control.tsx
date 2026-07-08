"use client";

// Один input под тип поля. Чистый switch (field.type) → нужный shadcn-контрол.
// Никакой бизнес-логики здесь нет — только «нарисовать и вернуть значение».

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

interface FieldControlProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Уже разрешённые варианты (из field.options или справочника). */
  options: FieldOption[];
  disabled?: boolean;
}

export function FieldControl({ field, value, onChange, options, disabled }: FieldControlProps) {
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
      // БД и загрузки пока нет: сохраняем ИМЯ файла (строку), чтобы отработала
      // валидация required. Реальная загрузка в Supabase Storage — на следующих шагах.
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
