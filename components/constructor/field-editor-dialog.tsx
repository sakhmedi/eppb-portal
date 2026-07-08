"use client";

// Диалог редактирования одного поля: тип, подпись, идентификатор, подсказки,
// обязательность, источник вариантов (свои/справочник), формула (для расчётного)
// и условие видимости (ветвление). Всё — без кода.

import { useEffect, useState } from "react";
import type { Field, FieldType, ID, ReferenceOption, Service } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FIELD_TYPE_OPTIONS,
  allFields,
  numericFields,
} from "./constructor-utils";
import { ConditionBuilder } from "./condition-builder";
import { FormulaBuilder } from "./formula-builder";

interface ReferenceListItem {
  id: ID;
  title: string;
}

interface FieldEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: Field;
  service: Service;
  references: Record<ID, ReferenceOption[]>;
  referenceLists: ReferenceListItem[];
  onSave: (field: Field) => void;
}

const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const CHOICE = (t: FieldType) => t === "select" || t === "radio";

export function FieldEditorDialog({
  open,
  onOpenChange,
  field,
  service,
  references,
  referenceLists,
  onSave,
}: FieldEditorDialogProps) {
  const [draft, setDraft] = useState<Field>(field);
  const [error, setError] = useState<string | null>(null);

  // При каждом открытии — свежая копия редактируемого поля.
  useEffect(() => {
    if (open) {
      setDraft(JSON.parse(JSON.stringify(field)) as Field);
      setError(null);
    }
  }, [open, field]);

  function patch(p: Partial<Field>) {
    setDraft((prev) => ({ ...prev, ...p }));
  }

  function changeType(type: FieldType) {
    // Смена типа сбрасывает несовместимые настройки, чтобы не осталось «мусора».
    const next: Field = { ...draft, type };
    if (!CHOICE(type)) {
      delete next.options;
      delete next.referenceId;
    }
    if (type !== "calculated") delete next.formula;
    if (type === "calculated") next.required = false;
    setDraft(next);
  }

  // Источник вариантов для select/radio: свои варианты или справочник.
  const optionSource: "options" | "reference" = draft.referenceId ? "reference" : "options";

  function setOptionSource(src: "options" | "reference") {
    if (src === "reference") {
      patch({ options: undefined, referenceId: draft.referenceId ?? referenceLists[0]?.id });
    } else {
      patch({ referenceId: undefined, options: draft.options ?? [] });
    }
  }

  function updateOption(i: number, key: "value" | "label", val: string) {
    const options = [...(draft.options ?? [])];
    options[i] = { ...options[i], [key]: val };
    patch({ options });
  }
  function addOption() {
    patch({ options: [...(draft.options ?? []), { value: "", label: "" }] });
  }
  function removeOption(i: number) {
    patch({ options: (draft.options ?? []).filter((_, idx) => idx !== i) });
  }

  function handleSave() {
    if (!draft.label.trim()) return setError("Укажите подпись поля.");
    if (!KEY_RE.test(draft.key))
      return setError("Идентификатор: латиница/цифры/_, начинается с буквы.");
    if (allFields(service).some((f) => f.id !== draft.id && f.key === draft.key))
      return setError(`Идентификатор "${draft.key}" уже используется.`);
    if (CHOICE(draft.type) && !draft.options?.length && !draft.referenceId)
      return setError("Для списка задайте варианты или привяжите справочник.");
    if (CHOICE(draft.type) && optionSource === "options" && draft.options?.some((o) => !o.value || !o.label))
      return setError("Заполните value и label у всех вариантов.");
    if (draft.type === "calculated" && !draft.formula)
      return setError("Задайте формулу расчётного поля.");
    onSave(draft);
    onOpenChange(false);
  }

  // Поля, на которые можно ссылаться (исключаем текущее, чтобы не зациклиться).
  const otherFields = allFields(service).filter((f) => f.id !== draft.id);
  const formulaFields = numericFields(service).filter((f) => f.id !== draft.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Поле формы</DialogTitle>
          <DialogDescription>
            Настройте, как поле выглядит и когда показывается.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип поля</Label>
              <Select value={draft.type} onValueChange={(v) => changeType(v as FieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="f-label">Подпись</Label>
              <Input
                id="f-label"
                value={draft.label}
                onChange={(e) => patch({ label: e.target.value })}
                placeholder="напр. Сумма кредита, ₸"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="f-key">Идентификатор (для формул и условий)</Label>
              <Input
                id="f-key"
                value={draft.key}
                onChange={(e) => patch({ key: e.target.value })}
                placeholder="напр. loanAmount"
              />
            </div>
            {draft.type !== "calculated" && draft.type !== "checkbox" && (
              <div className="space-y-2">
                <Label htmlFor="f-ph">Плейсхолдер</Label>
                <Input
                  id="f-ph"
                  value={draft.placeholder ?? ""}
                  onChange={(e) => patch({ placeholder: e.target.value || undefined })}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-hint">Подсказка под полем</Label>
            <Input
              id="f-hint"
              value={draft.hint ?? ""}
              onChange={(e) => patch({ hint: e.target.value || undefined })}
            />
          </div>

          {draft.type !== "calculated" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="f-req"
                checked={!!draft.required}
                onCheckedChange={(c) => patch({ required: c === true })}
              />
              <Label htmlFor="f-req" className="font-normal">
                Обязательное поле
              </Label>
            </div>
          )}

          {/* Варианты для списка / переключателей */}
          {CHOICE(draft.type) && (
            <div className="space-y-3 rounded-md border p-3">
              <Label>Источник вариантов</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={optionSource === "options" ? "default" : "outline"}
                  onClick={() => setOptionSource("options")}
                >
                  Свои варианты
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={optionSource === "reference" ? "default" : "outline"}
                  onClick={() => setOptionSource("reference")}
                  disabled={referenceLists.length === 0}
                >
                  Из справочника
                </Button>
              </div>

              {optionSource === "reference" ? (
                <Select
                  value={draft.referenceId ?? ""}
                  onValueChange={(v) => patch({ referenceId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите справочник" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceLists.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  {(draft.options ?? []).map((o, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="значение (value)"
                        value={o.value}
                        onChange={(e) => updateOption(i, "value", e.target.value)}
                      />
                      <Input
                        placeholder="подпись (label)"
                        value={o.label}
                        onChange={(e) => updateOption(i, "label", e.target.value)}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => removeOption(i)}>
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    + Вариант
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Формула для расчётного поля */}
          {draft.type === "calculated" && (
            <div className="rounded-md border p-3">
              <FormulaBuilder
                formula={draft.formula}
                availableFields={formulaFields}
                onChange={(formula) => patch({ formula })}
              />
            </div>
          )}

          {/* Ветвление: показывать поле только при условии */}
          <ConditionBuilder
            title="Показывать поле только при условии"
            availableFields={otherFields}
            references={references}
            rule={draft.visibilityCondition}
            onChange={(rule) => patch({ visibilityCondition: rule })}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить поле</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
