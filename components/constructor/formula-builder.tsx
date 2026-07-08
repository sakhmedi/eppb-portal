"use client";

// Простой конструктор формулы для расчётного поля.
// Аналитик вставляет поля-множители кнопками-чипами и/или пишет выражение
// вроде "loanAmount * rate / 100". Мы:
//   - на лету проверяем синтаксис (тот же парсер, что и в движке — без eval);
//   - сами вычисляем dependsOn (какие поля участвуют) — руками указывать не нужно;
//   - подсвечиваем ссылки на несуществующие поля.

import type { CalculatedFormula, Field } from "@/types";
import { extractFormulaIdentifiers, FormulaError } from "@/lib/formula";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface FormulaBuilderProps {
  formula: CalculatedFormula | undefined;
  /** Поля, которые можно использовать в формуле (числовые и расчётные). */
  availableFields: Field[];
  onChange: (formula: CalculatedFormula | undefined) => void;
}

export function FormulaBuilder({ formula, availableFields, onChange }: FormulaBuilderProps) {
  const expression = formula?.expression ?? "";
  const knownKeys = new Set(availableFields.map((f) => f.key));

  function setExpression(expr: string) {
    if (!expr.trim()) {
      onChange(undefined);
      return;
    }
    // dependsOn выводим автоматически из выражения (только известные поля).
    let deps: string[] = formula?.dependsOn ?? [];
    try {
      deps = extractFormulaIdentifiers(expr).filter((k) => knownKeys.has(k));
    } catch {
      // выражение пока не разбирается — оставим прежние зависимости
    }
    onChange({ expression: expr, dependsOn: deps });
  }

  function insert(key: string) {
    const sep = expression && !expression.trimEnd().endsWith("(") ? " " : "";
    setExpression((expression + sep + key).trimStart());
  }

  // Живая проверка выражения.
  let parseError: string | null = null;
  let unknownRefs: string[] = [];
  if (expression.trim()) {
    try {
      unknownRefs = extractFormulaIdentifiers(expression).filter((k) => !knownKeys.has(k));
    } catch (e) {
      parseError = e instanceof FormulaError ? e.message : "Ошибка в формуле";
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="formula-expr">Формула</Label>
      <Input
        id="formula-expr"
        value={expression}
        placeholder="напр. loanAmount * rate / 100"
        onChange={(e) => setExpression(e.target.value)}
      />

      {availableFields.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Вставить поле:</span>
          {availableFields.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => insert(f.key)}
              className="rounded-md border bg-secondary px-2 py-0.5 text-xs hover:bg-secondary/70"
              title={f.label}
            >
              {f.key}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Доступно: + − * / %, скобки, функции min, max, round, floor, ceil, abs.
      </p>

      {parseError && <p className="text-sm text-destructive">Ошибка: {parseError}</p>}
      {!parseError && unknownRefs.length > 0 && (
        <p className="text-sm text-destructive">
          Неизвестные поля: {unknownRefs.join(", ")}
        </p>
      )}
      {!parseError && expression.trim() && formula && formula.dependsOn.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Зависит от:</span>
          {formula.dependsOn.map((d) => (
            <Badge key={d} variant="secondary">
              {d}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
