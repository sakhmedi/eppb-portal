import "server-only";

// Имитация сетевой задержки внешнего вызова, чтобы демо выглядело реалистично
// (реальные вызовы к шине/реестрам не мгновенны).

/** Подождать случайное «сетевое» время (по умолчанию ~400–900 мс). */
export function simulateNetworkDelay(minMs = 400, maxMs = 900): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
