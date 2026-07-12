import "server-only";

// Разбор JSON из ответа модели. Мы просим модель вернуть чистый JSON, но она иногда
// оборачивает его в ```json … ``` или добавляет текст вокруг. Эти хелперы аккуратно
// достают первый JSON-массив/объект и парсят его; при неудаче возвращают null (вызывающий
// код решает, что делать — показать «пусто» или «некорректная структура»).

/** Снять markdown-обёртку ```json … ``` (или просто ``` … ```), если она есть. */
function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

/** Достать подстроку от первого `open` до парного ему `close` (с учётом вложенности). */
function sliceBalanced(text: string, open: "[" | "{", close: "]" | "}"): string | null {
  const start = text.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Разобрать JSON-массив из ответа модели. Возвращает массив или null.
 * Пример входа: "```json\n[{\"a\":1}]\n```" → [{a:1}].
 */
export function parseJsonArray(text: string): unknown[] | null {
  const body = sliceBalanced(stripCodeFences(text), "[", "]");
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Разобрать JSON-объект из ответа модели. Возвращает объект (unknown) или null.
 * Используется генератором структуры услуги.
 */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const body = sliceBalanced(stripCodeFences(text), "{", "}");
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
