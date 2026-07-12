import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Бейдж «Сгенерировано AI». Ставится рядом с любым ответом модели — честность перед
 * пользователем и жюри: сразу видно, что текст создан AI, а не написан сотрудником.
 */
export function AiBadge({
  className,
  children = "Сгенерировано AI",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      {children}
    </span>
  );
}
