"use client";

// No-code конструктор ОДНОГО условия видимости (ветвление).
// Аналитик выбирает: поле-условие → оператор → значение. Кода не пишет.
// Модель поддерживает и группы and/or, но для простоты UI собирает одно условие
// (этого хватает для большинства услуг). Результат — объект Condition,
// который сам по себе является валидным VisibilityRule.

import type { Condition, ConditionOperator, Field, ReferenceOption, ID, VisibilityRule } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OPERATOR_OPTIONS,
  NO_VALUE_OPERATORS,
  coerceConditionValue,
} from "./constructor-utils";

interface ConditionBuilderProps {
  title: string;
  /** Поля, которые можно выбрать как условие (для поля — все, кроме самого себя). */
  availableFields: Field[];
  references: Record<ID, ReferenceOption[]>;
  rule: VisibilityRule | undefined;
  onChange: (rule: VisibilityRule | undefined) => void;
}

export function ConditionBuilder({
  title,
  availableFields,
  references,
  rule,
  onChange,
}: ConditionBuilderProps) {
  // В UI работаем только с одиночным условием.
  const cond: Condition | null = rule && !("logic" in rule) ? (rule as Condition) : null;
  const enabled = !!cond;

  const condField = availableFields.find((f) => f.key === cond?.field);

  function optionsFor(field?: Field): ReferenceOption[] {
    if (!field) return [];
    if (field.options?.length) return field.options;
    if (field.referenceId && references[field.referenceId]) return references[field.referenceId];
    return [];
  }

  function toggle(on: boolean | "indeterminate") {
    if (on === true) {
      const first = availableFields[0];
      if (!first) return;
      onChange({ field: first.key, operator: "equals", value: "" });
    } else {
      onChange(undefined);
    }
  }

  function update(patch: Partial<Condition>) {
    if (!cond) return;
    onChange({ ...cond, ...patch });
  }

  function setField(key: string) {
    // Сменили поле-условие — сбрасываем значение (у нового поля может быть другой тип).
    onChange({ field: key, operator: cond?.operator ?? "equals", value: "" });
  }

  function setOperator(op: ConditionOperator) {
    if (NO_VALUE_OPERATORS.includes(op)) {
      onChange({ field: cond!.field, operator: op });
    } else {
      update({ operator: op });
    }
  }

  function setValue(raw: string) {
    if (cond?.operator === "in") {
      // «входит в список» — значения через запятую.
      const arr = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => coerceConditionValue(s, condField?.type) as string | number);
      update({ value: arr });
    } else {
      update({ value: coerceConditionValue(raw, condField?.type) });
    }
  }

  const opts = optionsFor(condField);
  const needsValue = cond && !NO_VALUE_OPERATORS.includes(cond.operator);

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="flex items-center gap-2">
        <Checkbox id={`cond-${title}`} checked={enabled} onCheckedChange={toggle} />
        <Label htmlFor={`cond-${title}`} className="font-normal">
          {title}
        </Label>
      </div>

      {availableFields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Сначала добавьте поля, на которые можно ссылаться.
        </p>
      )}

      {enabled && cond && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={cond.field} onValueChange={setField}>
            <SelectTrigger>
              <SelectValue placeholder="Поле" />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label || f.key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cond.operator} onValueChange={(v) => setOperator(v as ConditionOperator)}>
            <SelectTrigger>
              <SelectValue placeholder="Оператор" />
            </SelectTrigger>
            <SelectContent>
              {OPERATOR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {needsValue ? (
            condField?.type === "checkbox" ? (
              <Select
                value={String(cond.value ?? "")}
                onValueChange={(v) => update({ value: v === "true" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Значение" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Да</SelectItem>
                  <SelectItem value="false">Нет</SelectItem>
                </SelectContent>
              </Select>
            ) : opts.length > 0 && cond.operator !== "in" ? (
              <Select value={String(cond.value ?? "")} onValueChange={(v) => update({ value: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Значение" />
                </SelectTrigger>
                <SelectContent>
                  {opts.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={condField?.type === "number" ? "number" : "text"}
                placeholder={cond.operator === "in" ? "через запятую" : "Значение"}
                value={
                  Array.isArray(cond.value)
                    ? cond.value.join(", ")
                    : cond.value === undefined
                      ? ""
                      : String(cond.value)
                }
                onChange={(e) => setValue(e.target.value)}
              />
            )
          ) : (
            <div className="text-xs text-muted-foreground self-center">
              значение не требуется
            </div>
          )}
        </div>
      )}
    </div>
  );
}
