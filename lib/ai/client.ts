import "server-only";

// Ядро AI-слоя: единственная точка вызова Anthropic API из всего портала.
// SERVER-ONLY: помечен `import "server-only"`, поэтому ключ ANTHROPIC_API_KEY и сам SDK
// никогда не попадают в браузерный бандл. Все AI-функции (подбор услуги, объяснение)
// ходят к модели только через generateText().
//
// Принцип «мягкой деградации»: функция НИКОГДА не бросает исключение наружу. Любой сбой
// (нет ключа, сеть, лимиты API, пустой ответ) превращается в { ok: false, reason },
// чтобы страница не падала, а UI показал аккуратное сообщение. AI здесь — прогрессивное
// улучшение, а не критичная зависимость.

import Anthropic from "@anthropic-ai/sdk";

/**
 * Модель Claude Haiku — самая дешёвая в линейке, для экономии кредитов на конкурсном MVP.
 * Haiku 4.5 не поддерживает adaptive thinking / effort (это параметры моделей 4.6+),
 * поэтому вызываем без них, обычным (не streaming) запросом с небольшим max_tokens.
 */
export const AI_MODEL = "claude-haiku-4-5-20251001";

/**
 * Результат любой AI-операции. Дискриминированный юнион вместо исключений:
 * - `ok: true`  — есть данные;
 * - `unavailable` — AI недоступен (нет ключа, сеть, лимиты, ошибка API);
 * - `empty` — модель ответила, но пусто/не разобрали ответ.
 */
export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unavailable" | "empty" };

// Клиент создаётся лениво и один раз (переиспользуем между вызовами в рамках процесса).
let cachedClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export interface GenerateTextParams {
  /** Системный промпт — задаёт роль и правила для модели. */
  system: string;
  /** Пользовательский запрос — конкретные данные (каталог, услуга, ситуация). */
  user: string;
  /** Верхняя граница длины ответа. */
  maxTokens: number;
}

/**
 * Низкоуровневый вызов модели: system + user → текст.
 * Всю обработку ошибок держим здесь, чтобы вызывающий код был простым.
 */
export async function generateText({
  system,
  user,
  maxTokens,
}: GenerateTextParams): Promise<AiResult<string>> {
  const client = getClient();
  if (!client) {
    console.error("[ai] ANTHROPIC_API_KEY не задан — AI-функции недоступны");
    return { ok: false, reason: "unavailable" };
  }

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });

    // Ответ — массив блоков; берём только текстовые и склеиваем.
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) return { ok: false, reason: "empty" };
    return { ok: true, data: text };
  } catch (error) {
    // Сеть, 429 (лимиты), 5xx, некорректный запрос — всё сюда. Логируем на сервере,
    // наружу отдаём мягкий признак недоступности.
    console.error("[ai] сбой вызова Anthropic API:", error);
    return { ok: false, reason: "unavailable" };
  }
}
