-- ЕППБ — dev-сид (необязательная миграция).
-- Наполняет БД демо-данными, чтобы сразу было что показать: справочник регионов
-- и одна опубликованная услуга «Субсидирование МСБ» (из примеров ARCHITECTURE.md).
-- Использованы фиксированные id, чтобы услуга могла сослаться на справочник.
-- Идемпотентно: on conflict do nothing.

-- Справочник регионов Казахстана.
insert into public.reference_lists (id, title, options)
values (
  '11111111-1111-1111-1111-111111111111',
  'Регионы Казахстана',
  $json$[
    { "value": "astana",        "label": "г. Астана" },
    { "value": "almaty-city",   "label": "г. Алматы" },
    { "value": "shymkent",      "label": "г. Шымкент" },
    { "value": "abai",          "label": "Абайская область" },
    { "value": "akmola",        "label": "Акмолинская область" },
    { "value": "aktobe",        "label": "Актюбинская область" },
    { "value": "almaty-region", "label": "Алматинская область" },
    { "value": "atyrau",        "label": "Атырауская область" },
    { "value": "east-kz",       "label": "Восточно-Казахстанская область" },
    { "value": "zhambyl",       "label": "Жамбылская область" },
    { "value": "zhetysu",       "label": "Жетысуская область" },
    { "value": "west-kz",       "label": "Западно-Казахстанская область" },
    { "value": "karaganda",     "label": "Карагандинская область" },
    { "value": "kostanay",      "label": "Костанайская область" },
    { "value": "kyzylorda",     "label": "Кызылординская область" },
    { "value": "mangystau",     "label": "Мангистауская область" },
    { "value": "pavlodar",      "label": "Павлодарская область" },
    { "value": "north-kz",      "label": "Северо-Казахстанская область" },
    { "value": "turkistan",     "label": "Туркестанская область" },
    { "value": "ulytau",        "label": "Улытауская область" }
  ]$json$::jsonb
)
on conflict (id) do nothing;

-- Демо-услуга: многоэтапная, с ветвлением и расчётным полем.
insert into public.services (id, slug, title, description, category, organization, status, version, steps)
values (
  '22222222-2222-2222-2222-222222222222',
  'subsidii-msb',
  'Субсидирование ставки для МСБ',
  'Демо-услуга: субсидирование процентной ставки по кредиту для малого и среднего бизнеса.',
  'Субсидирование',
  'Фонд Даму',
  'published',
  1,
  $json$[
    {
      "id": "step-1",
      "title": "О заявителе",
      "order": 1,
      "fields": [
        { "id": "f-1", "key": "companyBin", "type": "bin", "label": "БИН компании", "required": true },
        { "id": "f-2", "key": "region", "type": "select", "label": "Регион", "required": true,
          "referenceId": "11111111-1111-1111-1111-111111111111" }
      ]
    },
    {
      "id": "step-2",
      "title": "Параметры кредита",
      "order": 2,
      "fields": [
        { "id": "f-3", "key": "loanAmount", "type": "number", "label": "Сумма кредита, ₸",
          "required": true, "validation": { "min": 0 } },
        { "id": "f-4", "key": "rate", "type": "number", "label": "Ставка, %", "required": true },
        { "id": "f-5", "key": "subsidyAmount", "type": "calculated", "label": "Расчётная субсидия, ₸",
          "formula": { "expression": "loanAmount * rate / 100", "dependsOn": ["loanAmount", "rate"] } },
        { "id": "f-6", "key": "pledgeDocs", "type": "file", "label": "Документы по залогу", "required": true,
          "visibilityCondition": { "field": "loanAmount", "operator": "greaterThan", "value": 50000000 } }
      ]
    }
  ]$json$::jsonb
)
on conflict (id) do nothing;
