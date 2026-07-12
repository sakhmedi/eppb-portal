"use client";

// Встраивание внешнего материала через iframe + НАДЁЖНЫЙ запасной вариант.
// Почему фолбэк-ссылка видна всегда, а не по детекции: если внешний ресурс запрещает
// встраивание (X-Frame-Options / CSP frame-ancestors), кросс-доменную блокировку нельзя
// достоверно поймать из JS (iframe часто всё равно вызывает onload). Поэтому мы просто
// всегда показываем ссылку «открыть в новой вкладке» — пользователь не окажется в тупике.

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmbedViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Материал встроен ниже. Если он не отобразился, внешний ресурс мог запретить
          встраивание — откройте его в новой вкладке.
        </p>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href={url} target="_blank" rel="noopener noreferrer">
            Открыть в новой вкладке
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <iframe
          src={url}
          title={title}
          className="h-[75vh] w-full"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
