import "server-only";

// Сценарий 2: «Объяснить простыми словами».
// Берём конкретную услугу и её условия (из JSON-конфига через getServiceFacts) и просим
// модель переформулировать доступным языком для предпринимателя без юробразования:
// что это, кому подходит, что понадобится, на что обратить внимание.

import type { Service } from "@/types";
import { getServiceFacts, pluralSteps } from "@/lib/service-summary";
import { generateText, type AiResult } from "./client";

const SYSTEM_PROMPT = `Ты — консультант Единого портала поддержки бизнеса. Твоя задача —
объяснить условия меры господдержки простым, человеческим языком для предпринимателя без
юридического образования.

Правила:
- Пиши по-русски, коротко и по делу (4–6 небольших абзацев или пунктов).
- Раскрой: что это за услуга простыми словами; кому она подходит; что понадобится, чтобы
  подать заявку; на что обратить внимание.
- Опирайся ТОЛЬКО на предоставленные данные об услуге. Не выдумывай условий, сумм, ставок
  или требований, которых нет в данных.
- Без канцелярита и юридических штампов. Обращайся к читателю на «вы».
- НЕ используй markdown-разметку: без символов #, *, **, без таблиц. Подзаголовки пиши
  обычным текстом (можно с двоеточием), абзацы разделяй пустой строкой.`;

/**
 * Подстраховка: даже с запретом в промпте модель иногда добавляет markdown-разметку.
 * UI показывает текст как есть (без markdown-парсера), поэтому снимаем разметку здесь,
 * чтобы пользователь не видел литеральные # и **.
 */
function stripMarkdown(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s*/, "") // заголовки #, ##…
        .replace(/\*\*(.+?)\*\*/g, "$1") // **жирный**
        .replace(/__(.+?)__/g, "$1") // __жирный__
        .replace(/`([^`]+)`/g, "$1") // `код`
        .replace(/^\s*[-*]\s+/, "• "), // маркеры списка → •
    )
    .join("\n")
    .trim();
}

export async function explainService(service: Service): Promise<AiResult<string>> {
  const facts = getServiceFacts(service);

  const parts: string[] = [
    `Название: ${service.title}`,
    service.category ? `Направление: ${service.category}` : null,
    service.organization ? `Организация: ${service.organization}` : null,
    service.description ? `Описание: ${service.description}` : null,
    `Подача проходит в ${facts.stepCount} ${pluralSteps(facts.stepCount)}${
      facts.stepTitles.length ? `: ${facts.stepTitles.join(", ")}` : ""
    }.`,
    `Пользователь заполняет полей: ${facts.inputFieldCount}.`,
  ].filter((p): p is string => Boolean(p));

  if (facts.documents.length > 0) {
    const docs = facts.documents
      .map((d) => {
        const tag = d.conditional
          ? "по ситуации"
          : d.required
            ? "обязательный"
            : "по желанию";
        return `- ${d.label} (${tag})`;
      })
      .join("\n");
    parts.push(`Документы, которые могут понадобиться:\n${docs}`);
  }

  if (facts.calculatedOutputs.length > 0) {
    parts.push(
      `Автоматически рассчитывается: ${facts.calculatedOutputs
        .map((c) => c.label)
        .join(", ")}.`,
    );
  }

  const user = `Данные об услуге:\n\n${parts.join(
    "\n",
  )}\n\nОбъясни эту услугу простыми словами.`;

  const result = await generateText({ system: SYSTEM_PROMPT, user, maxTokens: 700 });
  if (!result.ok) return result;
  return { ok: true, data: stripMarkdown(result.data) };
}
