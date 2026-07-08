"use client";

// Редактор одного этапа (Step): название, порядок, ветвление шага и список полей.
// Поля добавляются/редактируются через FieldEditorDialog; порядок — стрелками.

import { useState } from "react";
import type { Field, ID, ReferenceOption, Service, Step } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fieldTypeLabel, allFields, nextFieldKey, uid } from "./constructor-utils";
import { ConditionBuilder } from "./condition-builder";
import { FieldEditorDialog } from "./field-editor-dialog";

interface ReferenceListItem {
  id: ID;
  title: string;
}

interface StepEditorProps {
  service: Service;
  step: Step;
  index: number;
  total: number;
  references: Record<ID, ReferenceOption[]>;
  referenceLists: ReferenceListItem[];
  onChange: (step: Step) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}

export function StepEditor({
  service,
  step,
  index,
  total,
  references,
  referenceLists,
  onChange,
  onMove,
  onDelete,
}: StepEditorProps) {
  const [editing, setEditing] = useState<Field | null>(null);
  const [open, setOpen] = useState(false);

  function openNewField() {
    setEditing({ id: uid(), key: nextFieldKey(service), type: "text", label: "" });
    setOpen(true);
  }
  function openField(f: Field) {
    setEditing(f);
    setOpen(true);
  }

  function saveField(field: Field) {
    const exists = step.fields.some((f) => f.id === field.id);
    const fields = exists
      ? step.fields.map((f) => (f.id === field.id ? field : f))
      : [...step.fields, field];
    onChange({ ...step, fields });
  }

  function moveField(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= step.fields.length) return;
    const fields = [...step.fields];
    [fields[i], fields[j]] = [fields[j], fields[i]];
    onChange({ ...step, fields });
  }

  function deleteField(id: string) {
    onChange({ ...step, fields: step.fields.filter((f) => f.id !== id) });
  }

  // Условие шага обычно ссылается на поля ДРУГИХ шагов — их и предлагаем.
  const fieldsFromOtherSteps = allFields(service).filter(
    (f) => !step.fields.some((sf) => sf.id === f.id),
  );

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Шаг {index + 1}</Badge>
        <Input
          value={step.title}
          onChange={(e) => onChange({ ...step, title: e.target.value })}
          placeholder="Название этапа"
          className="max-w-xs"
        />
        <div className="ml-auto flex gap-1">
          <Button variant="outline" size="sm" onClick={() => onMove(-1)} disabled={index === 0}>
            ↑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
          >
            ↓
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            Удалить
          </Button>
        </div>
      </div>

      {/* Ветвление шага */}
      <ConditionBuilder
        title="Показывать шаг только при условии"
        availableFields={fieldsFromOtherSteps}
        references={references}
        rule={step.visibilityCondition}
        onChange={(rule) => onChange({ ...step, visibilityCondition: rule })}
      />

      {/* Поля шага */}
      <div className="space-y-2">
        {step.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">В этом шаге пока нет полей.</p>
        )}
        {step.fields.map((f, i) => (
          <div key={f.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{f.label || f.key}</span>
                {f.required && <span className="text-destructive">*</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline">{fieldTypeLabel(f.type)}</Badge>
                <span className="font-mono">{f.key}</span>
                {f.visibilityCondition && <Badge variant="outline">условие</Badge>}
                {f.formula && <Badge variant="outline">формула</Badge>}
              </div>
            </div>
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => moveField(i, -1)} disabled={i === 0}>
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveField(i, 1)}
                disabled={i === step.fields.length - 1}
              >
                ↓
              </Button>
              <Button variant="outline" size="sm" onClick={() => openField(f)}>
                Изменить
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteField(f.id)}>
                ✕
              </Button>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={openNewField}>
          + Добавить поле
        </Button>
      </div>

      {editing && (
        <FieldEditorDialog
          open={open}
          onOpenChange={setOpen}
          field={editing}
          service={service}
          references={references}
          referenceLists={referenceLists}
          onSave={saveField}
        />
      )}
    </div>
  );
}
