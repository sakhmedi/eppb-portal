// Безопасный вычислитель формул для расчётных полей.
//
// Зачем свой, а не eval(): eval выполнит ЛЮБОЙ код из строки — это дыра в
// безопасности. Мы же разбираем выражение сами и считаем только арифметику.
//
// Что поддерживаем:
//   - числа: 42, 3.14
//   - имена полей: loanAmount (значение берётся из данных заявки)
//   - операторы: + - * / %  и скобки ( )
//   - унарный минус: -x
//   - функции: min, max, round, floor, ceil, abs  — напр. max(a, b), round(x)
//
// Пример: evaluateFormula("loanAmount * rate / 100", data)

import type { ApplicationData, Service } from "@/types";
import { isEmptyValue } from "./logic";

/** Ошибка синтаксиса формулы (битое выражение — это баг конфига услуги). */
export class FormulaError extends Error {}

/** Внутренний сигнал «сейчас посчитать нельзя» (не хватает данных). Не наружу. */
class NotComputable extends Error {}

/** Разрешённые функции. Ключ — имя в формуле, значение — реализация. */
const FUNCTIONS: Record<string, (args: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  abs: (a) => Math.abs(a[0]),
  round: (a) => Math.round(a[0]),
  floor: (a) => Math.floor(a[0]),
  ceil: (a) => Math.ceil(a[0]),
};

// ── 1. Токенизатор: строка → список «кусочков» (токенов) ────────────────────

type Token =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "%" }
  | { t: "lparen" }
  | { t: "rparen" }
  | { t: "comma" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isIdentStart = (c: string) => /[a-zA-Z_]/.test(c);
  const isIdentPart = (c: string) => /[a-zA-Z0-9_]/.test(c);

  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (isDigit(c) || (c === "." && isDigit(input[i + 1]))) {
      let j = i + 1;
      while (j < input.length && (isDigit(input[j]) || input[j] === ".")) j++;
      const num = Number(input.slice(i, j));
      if (Number.isNaN(num)) {
        throw new FormulaError(`Некорректное число: "${input.slice(i, j)}"`);
      }
      tokens.push({ t: "num", v: num });
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < input.length && isIdentPart(input[j])) j++;
      tokens.push({ t: "id", v: input.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%") {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ t: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ t: "rparen" });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ t: "comma" });
      i++;
      continue;
    }
    throw new FormulaError(`Недопустимый символ: "${c}"`);
  }
  return tokens;
}

// ── 2. Парсер: токены → дерево (AST) с учётом приоритета операций ────────────

type Node =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "unary"; op: "+" | "-"; arg: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/" | "%"; left: Node; right: Node }
  | { k: "call"; name: string; args: Node[] };

function parse(tokens: Token[]): Node {
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const next = (): Token | undefined => tokens[pos++];

  // expression := term (('+' | '-') term)*
  function expression(): Node {
    let node = term();
    for (;;) {
      const tok = peek();
      if (tok?.t === "op" && (tok.v === "+" || tok.v === "-")) {
        next();
        node = { k: "bin", op: tok.v, left: node, right: term() };
      } else break;
    }
    return node;
  }

  // term := factor (('*' | '/' | '%') factor)*
  function term(): Node {
    let node = factor();
    for (;;) {
      const tok = peek();
      if (tok?.t === "op" && (tok.v === "*" || tok.v === "/" || tok.v === "%")) {
        next();
        node = { k: "bin", op: tok.v, left: node, right: factor() };
      } else break;
    }
    return node;
  }

  // factor := ('+' | '-') factor | primary
  function factor(): Node {
    const tok = peek();
    if (tok?.t === "op" && (tok.v === "+" || tok.v === "-")) {
      next();
      return { k: "unary", op: tok.v, arg: factor() };
    }
    return primary();
  }

  // primary := number | ident | ident '(' args ')' | '(' expression ')'
  function primary(): Node {
    const tok = next();
    if (!tok) throw new FormulaError("Неожиданный конец выражения");

    if (tok.t === "num") return { k: "num", v: tok.v };

    if (tok.t === "id") {
      if (peek()?.t === "lparen") {
        if (!(tok.v in FUNCTIONS)) {
          throw new FormulaError(`Неизвестная функция: "${tok.v}"`);
        }
        next(); // съедаем '('
        const args: Node[] = [];
        if (peek()?.t !== "rparen") {
          args.push(expression());
          while (peek()?.t === "comma") {
            next();
            args.push(expression());
          }
        }
        if (next()?.t !== "rparen") {
          throw new FormulaError(`Не закрыта скобка в вызове "${tok.v}(...)"`);
        }
        return { k: "call", name: tok.v, args };
      }
      return { k: "var", name: tok.v };
    }

    if (tok.t === "lparen") {
      const node = expression();
      if (next()?.t !== "rparen") throw new FormulaError("Не закрыта скобка");
      return node;
    }

    throw new FormulaError("Ожидалось число, поле или скобка");
  }

  const root = expression();
  if (pos !== tokens.length) throw new FormulaError("Лишние символы в выражении");
  return root;
}

/** Разобрать выражение в дерево. Бросает FormulaError при синтаксической ошибке. */
export function parseFormula(expression: string): Node {
  return parse(tokenize(expression));
}

// ── 3. Вычисление дерева с подстановкой значений полей ───────────────────────

function evalNode(node: Node, data: ApplicationData): number {
  switch (node.k) {
    case "num":
      return node.v;
    case "var": {
      const raw = data[node.name];
      if (isEmptyValue(raw)) throw new NotComputable();
      const num = Number(raw);
      if (Number.isNaN(num)) throw new NotComputable();
      return num;
    }
    case "unary": {
      const v = evalNode(node.arg, data);
      return node.op === "-" ? -v : v;
    }
    case "bin": {
      const l = evalNode(node.left, data);
      const r = evalNode(node.right, data);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          if (r === 0) throw new NotComputable(); // деление на ноль — не считаем
          return l / r;
        case "%":
          if (r === 0) throw new NotComputable();
          return l % r;
        default:
          throw new FormulaError("Неизвестный оператор");
      }
    }
    case "call":
      return FUNCTIONS[node.name](node.args.map((a) => evalNode(a, data)));
  }
}

/**
 * Посчитать формулу по данным заявки.
 * Возвращает число либо null, если посчитать нельзя (нет данных, деление на 0).
 * Бросает FormulaError только при синтаксической ошибке (это баг конфига).
 */
export function evaluateFormula(
  expression: string,
  data: ApplicationData,
): number | null {
  const ast = parseFormula(expression);
  try {
    const result = evalNode(ast, data);
    return Number.isFinite(result) ? result : null;
  } catch (e) {
    if (e instanceof NotComputable) return null;
    throw e;
  }
}

/** Собрать имена полей, которые использует выражение (без имён функций). */
export function extractFormulaIdentifiers(expression: string): string[] {
  const found = new Set<string>();
  const walk = (node: Node) => {
    switch (node.k) {
      case "var":
        found.add(node.name);
        break;
      case "unary":
        walk(node.arg);
        break;
      case "bin":
        walk(node.left);
        walk(node.right);
        break;
      case "call":
        node.args.forEach(walk);
        break;
    }
  };
  walk(parseFormula(expression));
  return Array.from(found);
}

/**
 * Пересчитать ВСЕ расчётные поля услуги по данным заявки.
 * Делает несколько проходов, чтобы формулы могли зависеть друг от друга
 * (напр. total → subsidy → net). Возвращает новую копию данных, вход не меняет.
 */
export function applyCalculations(
  service: Service,
  data: ApplicationData,
): ApplicationData {
  const calculated = service.steps
    .flatMap((step) => step.fields)
    .filter((f) => f.calculated)
    .map((f) => ({ name: f.name, expression: f.calculated!.expression }));

  const out: ApplicationData = { ...data };
  let changed = true;
  let pass = 0;
  // Ограничиваем число проходов на случай циклических зависимостей.
  while (changed && pass <= calculated.length) {
    changed = false;
    for (const { name, expression } of calculated) {
      const value = evaluateFormula(expression, out);
      if (out[name] !== value) {
        out[name] = value;
        changed = true;
      }
    }
    pass++;
  }
  return out;
}
