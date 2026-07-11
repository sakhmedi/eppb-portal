// Подписанные ссылки на скачивание документов заявки из приватного бакета Storage.
// Общая логика для кабинета пользователя (session-клиент, RLS «свои файлы») и админки
// (сервис-ролевой клиент, обходит owner-only storage-политику — чужие файлы иначе не подписать).

import type { ApplicationDocument } from "@/types";

export const APPLICATION_BUCKET = "application-documents";

/** Документ заявки со ссылкой на скачивание (null, если подписать не удалось). */
export interface DocumentLink {
  id: string;
  fileName: string;
  uploadedAt: string;
  url: string | null;
}

/**
 * Минимальная форма Supabase-клиента, нужная для подписи ссылок. Так и session-клиент
 * (@supabase/ssr), и сервис-ролевой (@supabase/supabase-js) подходят без конфликта типов.
 */
interface StorageSigner {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null }>;
    };
  };
}

/** Подписать все документы заявки (ссылки живут ttl секунд, по умолчанию 10 минут). */
export async function signDocuments(
  supabase: StorageSigner,
  documents: ApplicationDocument[],
  ttl = 600,
): Promise<DocumentLink[]> {
  return Promise.all(
    documents.map(async (doc) => {
      const { data } = await supabase.storage
        .from(APPLICATION_BUCKET)
        .createSignedUrl(doc.storagePath, ttl);
      return {
        id: doc.id,
        fileName: doc.fileName,
        uploadedAt: doc.uploadedAt,
        url: data?.signedUrl ?? null,
      };
    }),
  );
}
