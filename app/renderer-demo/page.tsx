// Временная демо-страница: проверка движка рендерера без БД.
// JSON услуги — это пример subsidii-msb из ARCHITECTURE.md, РАСШИРЕННЫЙ так,
// чтобы показать все типы полей и оба вида ветвления:
//   - ветвление ПОЛЯ  (pledgeDocs виден при большой сумме кредита);
//   - ветвление ШАГА  (шаг «Залог» виден, если отмечен чекбокс hasCollateral);
//   - расчётное поле  (subsidyAmount = loanAmount * rate / 100, считается вживую).
// Справочник регионов захардкожен (значения — из supabase/migrations/..._seed.sql).

import type { Service, ReferenceOption } from "@/types";
import { FormRenderer } from "@/components/renderer/form-renderer";

const REGIONS_REF_ID = "11111111-1111-1111-1111-111111111111";

const regions: ReferenceOption[] = [
  { value: "astana", label: "г. Астана" },
  { value: "almaty-city", label: "г. Алматы" },
  { value: "shymkent", label: "г. Шымкент" },
  { value: "karaganda", label: "Карагандинская область" },
  { value: "atyrau", label: "Атырауская область" },
];

const demoService: Service = {
  id: "svc-subsidy-demo",
  slug: "subsidii-msb",
  title: "Субсидирование ставки для МСБ (демо рендерера)",
  organization: "Фонд Даму",
  status: "published",
  version: 1,
  createdAt: "2026-07-08T09:00:00Z",
  updatedAt: "2026-07-08T09:00:00Z",
  steps: [
    {
      id: "step-1",
      title: "О заявителе",
      order: 1,
      fields: [
        { id: "f-1", key: "companyBin", type: "bin", label: "БИН компании", required: true,
          hint: "12 цифр" },
        { id: "f-2", key: "region", type: "select", label: "Регион", required: true,
          referenceId: REGIONS_REF_ID },
        {
          id: "f-3", key: "businessType", type: "radio", label: "Тип бизнеса", required: true,
          options: [
            { value: "ip", label: "ИП" },
            { value: "too", label: "ТОО" },
            { value: "farm", label: "Крестьянское хозяйство" },
          ],
        },
        { id: "f-4", key: "hasCollateral", type: "checkbox",
          label: "Есть залоговое имущество" },
      ],
    },
    {
      id: "step-2",
      title: "Параметры кредита",
      order: 2,
      fields: [
        { id: "f-5", key: "loanAmount", type: "number", label: "Сумма кредита, ₸",
          required: true, validation: { min: 0 } },
        { id: "f-6", key: "rate", type: "number", label: "Ставка, %", required: true,
          validation: { min: 0, max: 100 } },
        { id: "f-7", key: "subsidyAmount", type: "calculated", label: "Расчётная субсидия, ₸",
          formula: { expression: "loanAmount * rate / 100", dependsOn: ["loanAmount", "rate"] } },
        {
          id: "f-8", key: "pledgeDocs", type: "file", label: "Документы по залогу", required: true,
          hint: "Появляется при сумме кредита больше 50 000 000 ₸",
          visibilityCondition: { field: "loanAmount", operator: "greaterThan", value: 50000000 },
        },
      ],
    },
    {
      id: "step-3",
      title: "Залог",
      order: 3,
      // Ветвление ШАГА: весь шаг показывается, только если отмечен чекбокс.
      visibilityCondition: { field: "hasCollateral", operator: "equals", value: true },
      fields: [
        { id: "f-9", key: "collateralValue", type: "number", label: "Оценочная стоимость залога, ₸",
          required: true, validation: { min: 0 } },
        { id: "f-10", key: "collateralDesc", type: "textarea", label: "Описание залога",
          placeholder: "Что передаётся в залог" },
        { id: "f-11", key: "appraisalDate", type: "date", label: "Дата оценки" },
      ],
    },
  ],
};

export default function RendererDemoPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Демо рендерера форм</h1>
        <p className="text-muted-foreground">
          Услуга собрана из JSON и превращена в пошаговую форму. Отметьте «Есть
          залоговое имущество» — появится третий шаг; введите сумму больше 50 млн —
          появится загрузка документов; введите сумму и ставку — субсидия посчитается
          сама. Блок внизу показывает текущие данные формы.
        </p>
      </div>

      <FormRenderer service={demoService} references={{ [REGIONS_REF_ID]: regions }} debug />
    </main>
  );
}
