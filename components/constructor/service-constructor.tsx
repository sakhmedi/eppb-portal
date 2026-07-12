"use client";

// Главный экран no-code конструктора услуги.
// Слева — редактор (карточка услуги + этапы + поля + логика), справа — ЖИВОЙ
// предпросмотр той же услуги через рендерер (тот самый движок из задачи 2.1).
// Всё состояние — один объект Service в памяти; кнопки сохраняют его в БД.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { ID, ReferenceOption, Service, Step } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormRenderer } from "@/components/renderer/form-renderer";
import { GenerateServiceDraft } from "@/components/ai/generate-service";
import type { GeneratedDraft } from "@/lib/ai/generate-service";
import {
  saveService,
  publishService,
  unpublishService,
  type ServiceInput,
} from "@/lib/services-actions";
import { StepEditor } from "./step-editor";
import { uid } from "./constructor-utils";

interface ReferenceListItem {
  id: ID;
  title: string;
}

interface ServiceConstructorProps {
  initialService: Service;
  references: Record<ID, ReferenceOption[]>;
  referenceLists: ReferenceListItem[];
}

export function ServiceConstructor({
  initialService,
  references,
  referenceLists,
}: ServiceConstructorProps) {
  const [service, setService] = useState<Service>(initialService);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // ── правки услуги (все проходят через нормализацию order у шагов) ──────────
  function patchMeta(p: Partial<Service>) {
    setService((s) => ({ ...s, ...p }));
  }
  function setSteps(steps: Step[]) {
    setService((s) => ({ ...s, steps: steps.map((st, i) => ({ ...st, order: i + 1 })) }));
  }
  function addStep() {
    setSteps([...service.steps, { id: uid(), title: "Новый этап", order: 0, fields: [] }]);
  }
  function updateStep(step: Step) {
    setSteps(service.steps.map((s) => (s.id === step.id ? step : s)));
  }
  function moveStep(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= service.steps.length) return;
    const steps = [...service.steps];
    [steps[index], steps[j]] = [steps[j], steps[index]];
    setSteps(steps);
  }
  function deleteStep(id: string) {
    setSteps(service.steps.filter((s) => s.id !== id));
  }

  // Подставить AI-черновик в редактор. Структура уже провалидирована serviceConfigSchema на
  // сервере. Если у услуги уже есть шаги — не затираем молча, спрашиваем подтверждение.
  function applyDraft(draft: GeneratedDraft) {
    if (
      service.steps.length > 0 &&
      !window.confirm(
        "Заменить текущую структуру услуги сгенерированным черновиком? Текущие этапы будут заменены.",
      )
    ) {
      return;
    }
    setService((s) => ({
      ...s,
      title: draft.meta.title ?? s.title,
      description: draft.meta.description ?? s.description,
      category: draft.meta.category ?? s.category,
      organization: draft.meta.organization ?? s.organization,
      steps: draft.steps.map((st, i) => ({ ...st, order: i + 1 })),
    }));
    setMessage("Черновик сгенерирован AI и подставлен в конструктор — проверьте и доработайте.");
    setErrors([]);
  }

  // ── сохранение / публикация ───────────────────────────────────────────────
  function payload(): ServiceInput {
    return {
      title: service.title,
      description: service.description,
      category: service.category,
      organization: service.organization,
      steps: service.steps,
    };
  }

  function run(action: () => Promise<{ ok: boolean; errors?: string[] }>, okText: string) {
    setMessage(null);
    setErrors([]);
    startTransition(async () => {
      const res = await action();
      if (res.ok) setMessage(okText);
      else setErrors(res.errors ?? ["Не удалось выполнить действие"]);
    });
  }

  const doSave = () => run(() => saveService(service.id, payload()), "Черновик сохранён");
  const doPublish = () =>
    run(async () => {
      const res = await publishService(service.id, payload());
      if (res.ok) setService((s) => ({ ...s, status: "published" }));
      return res;
    }, "Услуга опубликована");
  const doUnpublish = () =>
    run(async () => {
      const res = await unpublishService(service.id, payload());
      if (res.ok) setService((s) => ({ ...s, status: "draft" }));
      return res;
    }, "Снято с публикации");

  // Предпросмотр пересобирается при изменении структуры шагов/полей.
  const previewKey = useMemo(() => JSON.stringify(service.steps), [service.steps]);

  return (
    <div className="space-y-4">
      {/* Верхняя панель: статус + действия */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/services" className="text-sm text-muted-foreground hover:text-foreground">
          ← К списку услуг
        </Link>
        <Badge variant={service.status === "published" ? "default" : "secondary"}>
          {service.status === "published" ? "Опубликована" : "Черновик"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={doSave} disabled={pending}>
            Сохранить черновик
          </Button>
          {service.status === "published" ? (
            <Button variant="outline" onClick={doUnpublish} disabled={pending}>
              Снять с публикации
            </Button>
          ) : (
            <Button onClick={doPublish} disabled={pending}>
              Опубликовать
            </Button>
          )}
        </div>
      </div>

      {message && (
        <p className="rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">{message}</p>
      )}
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Не получилось. Исправьте:</p>
          <ul className="ml-4 list-disc">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Две колонки: редактор | предпросмотр */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Редактор ── */}
        <div className="space-y-4">
          {/* AI-помощник автору: собрать черновик услуги по текстовому описанию. */}
          <GenerateServiceDraft onGenerated={applyDraft} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Карточка услуги</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="s-title">Название</Label>
                <Input
                  id="s-title"
                  value={service.title}
                  onChange={(e) => patchMeta({ title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-desc">Описание</Label>
                <Textarea
                  id="s-desc"
                  value={service.description ?? ""}
                  onChange={(e) => patchMeta({ description: e.target.value || undefined })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="s-cat">Категория</Label>
                  <Input
                    id="s-cat"
                    value={service.category ?? ""}
                    onChange={(e) => patchMeta({ category: e.target.value || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-org">Дочерняя организация</Label>
                  <Input
                    id="s-org"
                    value={service.organization ?? ""}
                    onChange={(e) => patchMeta({ organization: e.target.value || undefined })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {service.steps.map((step, i) => (
              <StepEditor
                key={step.id}
                service={service}
                step={step}
                index={i}
                total={service.steps.length}
                references={references}
                referenceLists={referenceLists}
                onChange={updateStep}
                onMove={(dir) => moveStep(i, dir)}
                onDelete={() => deleteStep(step.id)}
              />
            ))}
            <Button variant="outline" onClick={addStep}>
              + Добавить этап
            </Button>
          </div>
        </div>

        {/* ── Живой предпросмотр ── */}
        <div className="lg:sticky lg:top-4 lg:h-fit">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Предпросмотр</Badge>
            <span>так услугу увидит заявитель</span>
          </div>
          {service.steps.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Добавьте этап и поля — здесь появится живая форма.
            </p>
          ) : (
            <div className="rounded-lg border p-4">
              <FormRenderer key={previewKey} service={service} references={references} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
