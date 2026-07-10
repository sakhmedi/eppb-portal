"use client";

// Оркестрация подачи заявки поверх готового FormRenderer.
// Здесь связываются три вещи, которых нет в самом рендерере:
//   - автосейв черновика при переходе между шагами (server action saveDraft);
//   - загрузка файлов в Supabase Storage (браузерный клиент);
//   - отправка этапа (submitPrimary / submitDocuments) и экран подтверждения.
// Сам движок формы не трогаем — передаём ему только колбэки.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, FileClock, ArrowRight } from "lucide-react";

import type { Service, ApplicationFormData, ApplicationDocument, ApplicationStatus } from "@/types";
import type { ReferenceOption, ID } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { splitStages, serviceForStage } from "@/lib/application-stages";
import { saveDraft, submitPrimary, submitDocuments } from "@/lib/application-actions";
import { FormRenderer } from "@/components/renderer/form-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BUCKET = "application-documents";

interface ApplyFormProps {
  service: Service;
  applicationId: string;
  userId: string;
  phase: "primary" | "documents";
  initialData: ApplicationFormData;
  initialDocuments: ApplicationDocument[];
  initialStepId?: string;
  references?: Record<ID, ReferenceOption[]>;
}

export function ApplyForm({
  service,
  applicationId,
  userId,
  phase,
  initialData,
  initialDocuments,
  initialStepId,
  references,
}: ApplyFormProps) {
  const router = useRouter();
  const { primarySteps, documentSteps, hasDocumentStage } = splitStages(service);
  const stageSteps = phase === "primary" ? primarySteps : documentSteps;
  const stageService = serviceForStage(service, stageSteps);

  // Загруженные документы держим здесь, чтобы приложить их к submit и к автосейву.
  const documentsRef = useRef<ApplicationDocument[]>(initialDocuments);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<{
    status: ApplicationStatus;
    id: string;
  } | null>(null);

  // Автосейв прогресса при смене шага (best-effort — ошибки не мешают заполнению).
  function handleStepAdvance(formData: ApplicationFormData, currentStepId: string) {
    void saveDraft(applicationId, {
      formData,
      currentStepId,
      documents: documentsRef.current,
    });
  }

  // Загрузка файла в Storage; в значение поля кладётся его путь (storagePath).
  async function handleUploadFile(fieldKey: string, file: File) {
    const supabase = createClient();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const storagePath = `${userId}/${applicationId}/${fieldKey}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      upsert: true,
    });
    if (error) throw new Error(error.message);

    // Обновляем список документов (один документ на поле — заменяем прежний).
    const doc: ApplicationDocument = {
      id: crypto.randomUUID(),
      fieldKey,
      fileName: file.name,
      storagePath,
      uploadedAt: new Date().toISOString(),
    };
    documentsRef.current = [
      ...documentsRef.current.filter((d) => d.fieldKey !== fieldKey),
      doc,
    ];
    return { storagePath, fileName: file.name };
  }

  async function handleSubmit(formData: ApplicationFormData) {
    setSubmitting(true);
    setErrors([]);
    const result =
      phase === "primary"
        ? await submitPrimary(applicationId, formData)
        : await submitDocuments(applicationId, formData, documentsRef.current);
    setSubmitting(false);

    if (result.ok && result.status) {
      setConfirmation({ status: result.status, id: result.id ?? applicationId });
    } else {
      setErrors(result.errors ?? ["Не удалось отправить заявку"]);
    }
  }

  if (confirmation) {
    return (
      <Confirmation
        status={confirmation.status}
        id={confirmation.id}
        onContinue={() => router.refresh()}
      />
    );
  }

  const submitLabel =
    phase === "documents"
      ? "Завершить подачу"
      : hasDocumentStage
        ? "Подать первичную заявку"
        : "Подать заявку";

  return (
    <div className="space-y-4">
      {phase === "documents" && (
        <p className="rounded-md border border-brand bg-brand-subtle p-3 text-sm">
          Первичная заявка уже подана. Приложите документы и подтвердите согласия, чтобы
          завершить подачу.
        </p>
      )}

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Проверьте форму:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <FormRenderer
        service={stageService}
        initialData={initialData}
        initialStepId={initialStepId}
        references={references}
        onStepAdvance={handleStepAdvance}
        onUploadFile={handleUploadFile}
        onSubmit={handleSubmit}
        submitLabel={submitLabel}
        submitting={submitting}
      />
    </div>
  );
}

/** Экран подтверждения после отправки этапа. */
function Confirmation({
  status,
  id,
  onContinue,
}: {
  status: ApplicationStatus;
  id: string;
  onContinue: () => void;
}) {
  const number = id.slice(0, 8).toUpperCase();
  const awaitingDocs = status === "awaiting_documents";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {awaitingDocs ? (
            <FileClock className="h-5 w-5 text-brand" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-brand" />
          )}
          {awaitingDocs ? "Первичная заявка принята" : "Заявка подана"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div className="rounded-md border bg-muted/40 p-4 text-foreground">
          <div className="text-xs text-muted-foreground">Номер заявки</div>
          <div className="text-lg font-semibold tracking-tight">№ {number}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Статус: {awaitingDocs ? "Требуются документы" : "Подана, на рассмотрении"}
          </div>
        </div>

        {awaitingDocs ? (
          <>
            <p>
              Первичные данные сохранены. Теперь приложите документы и подтвердите согласия —
              это можно сделать сейчас или позже, вернувшись из личного кабинета.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-brand" onClick={onContinue}>
                Приложить документы
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild variant="outline">
                <Link href="/account">В личный кабинет</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p>
              Заявка передана в организацию на рассмотрение. Следить за статусом можно в
              личном кабинете.
            </p>
            <Button asChild className="bg-brand">
              <Link href="/account">В личный кабинет</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
