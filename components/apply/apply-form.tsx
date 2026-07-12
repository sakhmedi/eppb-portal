"use client";

// Оркестрация подачи заявки поверх готового FormRenderer.
// Здесь связываются три вещи, которых нет в самом рендерере:
//   - автосейв черновика при переходе между шагами (server action saveDraft);
//   - загрузка файлов в Supabase Storage (браузерный клиент);
//   - отправка этапа (submitPrimary / submitDocuments) и экран подтверждения.
// Сам движок формы не трогаем — передаём ему только колбэки.

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileClock, ArrowRight } from "lucide-react";

import type { Service, ApplicationFormData, ApplicationDocument, ApplicationStatus } from "@/types";
import type { ReferenceOption, ID } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { splitStages, serviceForStage } from "@/lib/application-stages";
import { saveDraft, submitPrimary, submitDocuments } from "@/lib/application-actions";
import { checkCompanyByBin } from "@/lib/integration-actions";
import { mapCompanyToPrefill } from "@/lib/company-prefill";
import type { BinCheckResult } from "@/components/renderer/field-row";
import { FormRenderer } from "@/components/renderer/form-renderer";
import { ApplicationReview } from "@/components/ai/application-review";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

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
  // Этапы услуги считаем один раз (стабильная идентичность — не дёргаем движок ре-рендерами).
  const { primarySteps, documentSteps, hasDocumentStage } = useMemo(
    () => splitStages(service),
    [service],
  );

  // Активная фаза держим в состоянии: после подачи первичной заявки переключаемся на
  // «документы» прямо здесь (без перезагрузки страницы), чтобы кнопка «Приложить документы»
  // вела к форме документов той же заявки.
  const [activePhase, setActivePhase] = useState<"primary" | "documents">(phase);
  // Ответы первичного этапа — нужны на этапе документов для ветвления видимости.
  const [submittedData, setSubmittedData] = useState<ApplicationFormData | null>(null);

  // На этапе документов показываем ВСЮ форму: первичные шаги — только для чтения (их уже
  // подали), шаги документов — редактируемые. Так пользователь свободно ходит «Назад» к
  // уже пройденным шагам, а «Назад» на первом шаге этапа документов ведёт к их просмотру.
  const stageSteps = useMemo(
    () =>
      activePhase === "primary" ? primarySteps : [...primarySteps, ...documentSteps],
    [activePhase, primarySteps, documentSteps],
  );
  const stageService = useMemo(
    () => serviceForStage(service, stageSteps),
    [service, stageSteps],
  );
  const readOnlyStepIds = useMemo(
    () => (activePhase === "documents" ? primarySteps.map((s) => s.id) : undefined),
    [activePhase, primarySteps],
  );

  // Загруженные документы держим здесь, чтобы приложить их к submit и к автосейву.
  const documentsRef = useRef<ApplicationDocument[]>(initialDocuments);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<{
    status: ApplicationStatus;
    id: string;
    externalRef?: string;
    signedAt?: string;
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

  // Проверка БИН во внешнем реестре (демо-интеграция) + подготовка предзаполнения.
  // Маппинг «данные компании → поля услуги» знает про эту услугу, поэтому делаем его здесь.
  async function handleCheckBin(bin: string): Promise<BinCheckResult> {
    const result = await checkCompanyByBin(bin);
    if (!result.found) return { found: false };
    return {
      found: true,
      company: result.company,
      patch: mapCompanyToPrefill(service, result.company),
    };
  }

  async function handleSubmit(formData: ApplicationFormData) {
    setSubmitting(true);
    setErrors([]);
    const result =
      activePhase === "primary"
        ? await submitPrimary(applicationId, formData)
        : await submitDocuments(applicationId, formData, documentsRef.current);
    setSubmitting(false);

    if (result.ok && result.status) {
      // Запоминаем первичные ответы — понадобятся на этапе документов для ветвления.
      if (activePhase === "primary") setSubmittedData(formData);
      setConfirmation({
        status: result.status,
        id: result.id ?? applicationId,
        externalRef: result.externalRef,
        signedAt: result.signedAt,
      });
    } else {
      setErrors(result.errors ?? ["Не удалось отправить заявку"]);
    }
  }

  // Переход с экрана подтверждения к этапу документов — client-side, без перезагрузки.
  function goToDocuments() {
    setConfirmation(null);
    setActivePhase("documents");
  }

  if (confirmation) {
    return (
      <Confirmation
        status={confirmation.status}
        id={confirmation.id}
        externalRef={confirmation.externalRef}
        signedAt={confirmation.signedAt}
        onContinue={goToDocuments}
      />
    );
  }

  const submitLabel =
    activePhase === "documents"
      ? "Завершить подачу"
      : hasDocumentStage
        ? "Подать первичную заявку"
        : "Подать заявку";

  // На этапе документов, если мы только что перешли из первичного, подставляем первичные
  // ответы в initialData (для ветвления). initialStepId применим только к исходной фазе.
  const formInitialData =
    activePhase === "documents" && submittedData
      ? { ...initialData, ...submittedData }
      : initialData;
  // На этапе документов стартуем с первого шага документов (первичные — сзади, для просмотра).
  const formInitialStepId =
    activePhase === "documents"
      ? documentSteps[0]?.id
      : activePhase === phase
        ? initialStepId
        : undefined;

  return (
    <div className="space-y-4">
      {activePhase === "documents" && (
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
        key={activePhase}
        service={stageService}
        initialData={formInitialData}
        initialStepId={formInitialStepId}
        references={references}
        readOnlyStepIds={readOnlyStepIds}
        onStepAdvance={handleStepAdvance}
        onUploadFile={handleUploadFile}
        onCheckBin={handleCheckBin}
        onSubmit={handleSubmit}
        submitLabel={submitLabel}
        submitting={submitting}
        reviewSlot={
          service.slug
            ? (formData) => (
                <ApplicationReview
                  slug={service.slug as string}
                  phase={activePhase}
                  formData={formData}
                />
              )
            : undefined
        }
      />
    </div>
  );
}

/** Экран подтверждения после отправки этапа. */
function Confirmation({
  status,
  id,
  externalRef,
  signedAt,
  onContinue,
}: {
  status: ApplicationStatus;
  id: string;
  externalRef?: string;
  signedAt?: string;
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
            {(externalRef || signedAt) && (
              <div className="space-y-1.5 rounded-md border border-brand bg-brand-subtle p-3 text-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Обработка через интеграционную шину</span>
                  <Badge variant="outline" className="border-brand text-brand">
                    демо-интеграция
                  </Badge>
                </div>
                {signedAt && (
                  <div className="text-xs">
                    Подписано ЭЦП: {formatDateTime(signedAt)}
                  </div>
                )}
                {externalRef && (
                  <div className="text-xs">
                    Внешний номер BPM: <span className="font-semibold">{externalRef}</span>
                  </div>
                )}
              </div>
            )}
            <p>
              Заявка подписана ЭЦП и передана во внешнюю BPM-систему на рассмотрение. Следить
              за статусом можно в личном кабинете.
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
