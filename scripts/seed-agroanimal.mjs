// Seed контрольной услуги «Агробизнес животноводство» (АО «Аграрная кредитная
// корпорация»). Это НЕ хардкод формы, а КОНФИГ услуги — ровно та же JSON-структура,
// которую пишет визуальный конструктор. Форму по ней рисует общий рендерер.
//
// Скрипт кладёт услугу в таблицу services как ЧЕРНОВИК (status='draft').
// Публикуется она потом кнопкой в самом конструкторе (там срабатывает
// serviceConfigSchema — та же валидация, что у конструктора).
//
// Запуск:  node scripts/seed-agroanimal.mjs
// Идемпотентно: повторный запуск обновляет ту же строку (upsert по id).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── env из .env.local (dotenv не подключаем — читаем сами) ──────────────────
function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY в .env.local");
  process.exit(1);
}

// service_role обходит RLS — только для сервера/скриптов, не для браузера.
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SERVICE_ID = "33333333-3333-3333-3333-333333333333";
const REGIONS_REF_ID = "11111111-1111-1111-1111-111111111111"; // справочник регионов (уже в БД)

// Условие видимости документов по типу заявителя.
const ifLegal = { field: "applicantType", operator: "equals", value: "legal" };
const ifFarm = { field: "applicantType", operator: "equals", value: "farm" };
// Файл-поле для документа (лаконичный конструктор).
const fileDoc = (id, key, label, required, extra = {}) => ({
  id,
  key,
  type: "file",
  label,
  ...(required ? { required: true } : {}),
  ...extra,
});

const steps = [
  {
    id: "step-applicant",
    title: "Тип заявителя",
    order: 1,
    fields: [
      {
        id: "f-applicantType",
        key: "applicantType",
        type: "select",
        label: "Тип заявителя",
        required: true,
        options: [
          { value: "legal", label: "Юридическое лицо" },
          { value: "farm", label: "КХ/ФХ/ИП" },
        ],
      },
      { id: "f-companyBin", key: "companyBin", type: "bin", label: "БИН / ИИН", required: true, hint: "12 цифр" },
      { id: "f-applicantName", key: "applicantName", type: "text", label: "Наименование заявителя", required: true },
      { id: "f-region", key: "region", type: "select", label: "Регион", required: true, referenceId: REGIONS_REF_ID },
      { id: "f-phone", key: "phone", type: "text", label: "Контактный телефон", required: true, placeholder: "+7 ___ ___ __ __" },
    ],
  },
  {
    id: "step-loan",
    title: "Параметры кредита",
    order: 2,
    fields: [
      { id: "f-loanAmount", key: "loanAmount", type: "number", label: "Сумма кредита, ₸", required: true, validation: { min: 0 } },
      {
        id: "f-termMonths",
        key: "termMonths",
        type: "number",
        label: "Срок, мес.",
        required: true,
        validation: { min: 1, max: 36 },
        hint: "Не более 36 месяцев",
      },
      {
        id: "f-rate",
        key: "rate",
        type: "number",
        label: "Ставка, % годовых",
        defaultValue: 5,
        validation: { min: 0 },
        hint: "Прямые заёмщики — 5%; КТ/БВУ/МФО/РИЦ — 1,5% (маржа конечным ≤ 3,5%)",
      },
      { id: "f-purpose", key: "purpose", type: "textarea", label: "Цель кредита", required: true, placeholder: "Пополнение оборотных средств" },
      { id: "f-industry", key: "industry", type: "text", label: "Отрасль / вид деятельности" },
      {
        id: "f-totalOverpayment",
        key: "totalOverpayment",
        type: "calculated",
        label: "Ориентировочная переплата, ₸",
        hint: "Расчёт: сумма × ставка/100 × срок/12",
        formula: {
          expression: "loanAmount * rate / 100 * termMonths / 12",
          dependsOn: ["loanAmount", "rate", "termMonths"],
        },
      },
    ],
  },
  {
    id: "step-pledge",
    title: "Обеспечение (залог)",
    order: 3,
    fields: [
      {
        id: "f-pledgeType",
        key: "pledgeType",
        type: "select",
        label: "Вид обеспечения",
        required: true,
        options: [
          { value: "realty", label: "Недвижимость" },
          { value: "equipment", label: "Оборудование / техника" },
          { value: "goods", label: "Товары в обороте" },
          { value: "guarantee", label: "Гарантия" },
        ],
      },
      { id: "f-pledgeValue", key: "pledgeValue", type: "number", label: "Залоговая стоимость, ₸", validation: { min: 0 } },
      { id: "f-pledgeDocs", key: "pledgeDocs", type: "file", label: "Документы по залогу" },
      fileDoc("f-pledgeExtraDocs", "pledgeExtraDocs", "Доп. документы по недвижимости", false, {
        hint: "Требуется при залоговой стоимости ≥ 50 000 000 ₸",
        visibilityCondition: { field: "pledgeValue", operator: "greaterThanOrEqual", value: 50000000 },
      }),
    ],
  },
  {
    id: "step-docs",
    title: "Документы заёмщика",
    order: 4,
    fields: [
      // Юридическое лицо
      fileDoc("f-docRegistration", "docRegistration", "Свидетельство о госрегистрации + устав", true, { visibilityCondition: ifLegal }),
      fileDoc("f-docDirectorId", "docDirectorId", "Удостоверение личности первого руководителя", true, { visibilityCondition: ifLegal }),
      fileDoc("f-docFinReport", "docFinReport", "Финансовая отчётность за 2 года + последний квартал", true, { visibilityCondition: ifLegal }),
      fileDoc("f-docTaxDeclaration", "docTaxDeclaration", "Налоговая декларация", true, { visibilityCondition: ifLegal }),
      fileDoc("f-docBankRef", "docBankRef", "Справка обслуживающего банка (обороты за 12 мес.)", true, { visibilityCondition: ifLegal }),
      fileDoc("f-docTaxDebt", "docTaxDebt", "Справка об отсутствии налоговой задолженности", true, { visibilityCondition: ifLegal }),
      fileDoc("f-docBusinessPlan", "docBusinessPlan", "Бизнес-план / ТЭО", false, { visibilityCondition: ifLegal }),
      // КХ/ФХ/ИП
      fileDoc("f-docIpStatus", "docIpStatus", "Документы о статусе КХ/ФХ/ИП", true, { visibilityCondition: ifFarm }),
      fileDoc("f-docLandRight", "docLandRight", "Решение МИО о земельном участке / договор аренды", false, { visibilityCondition: ifFarm }),
      fileDoc("f-docHeadId", "docHeadId", "Удостоверение личности главы КХ/ИП", true, { visibilityCondition: ifFarm }),
      fileDoc("f-docTaxDeclarationIp", "docTaxDeclarationIp", "Налоговая декларация", true, { visibilityCondition: ifFarm }),
      fileDoc("f-docBankRefIp", "docBankRefIp", "Справка обслуживающего банка", true, { visibilityCondition: ifFarm }),
      fileDoc("f-docBusinessPlanIp", "docBusinessPlanIp", "Бизнес-план / ТЭО", false, { visibilityCondition: ifFarm }),
    ],
  },
  {
    id: "step-consent",
    title: "Согласия",
    order: 5,
    fields: [
      { id: "f-consentPersonalData", key: "consentPersonalData", type: "checkbox", label: "Согласие на сбор и обработку персональных данных", required: true },
      { id: "f-consentReliability", key: "consentReliability", type: "checkbox", label: "Подтверждаю достоверность предоставленных сведений", required: true },
    ],
  },
];

const service = {
  id: SERVICE_ID,
  slug: "agrobiznes-zhivotnovodstvo",
  title: "Агробизнес животноводство",
  description:
    "Кредитование АПК (откормочные площадки, птицефабрики). Заёмщики: прямые, " +
    "а также КТ/БВУ/МФО/РИЦ. Целевое использование — пополнение оборотных средств. " +
    "Ставка: прямые заёмщики 5% годовых; КТ/БВУ/МФО/РИЦ 1,5% (маржа конечным ≤ 3,5%). " +
    "Срок до 36 месяцев. Обеспечение — согласно залоговой политике Общества.",
  category: "Кредитование",
  organization: "АО «Аграрная кредитная корпорация»",
  status: "draft",
  version: 1,
  steps,
};

const { error } = await supabase.from("services").upsert(service, { onConflict: "id" });
if (error) {
  console.error("Ошибка upsert:", error.message);
  process.exit(1);
}

const { data } = await supabase
  .from("services")
  .select("id, title, status, steps")
  .eq("id", SERVICE_ID)
  .single();

const fieldCount = (data?.steps ?? []).reduce((n, s) => n + s.fields.length, 0);
console.log(
  `OK: «${data?.title}» [${data?.status}] — этапов ${data?.steps?.length ?? 0}, полей ${fieldCount}.`,
);
console.log(`Открыть в конструкторе: /admin/services/${SERVICE_ID}`);
