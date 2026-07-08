// Хост-страница конструктора: грузит услугу и справочники на сервере,
// отдаёт их в клиентский ServiceConstructor.

import { notFound } from "next/navigation";
import { getServiceById, listReferenceLists, referencesToMap } from "@/lib/services";
import { ServiceConstructor } from "@/components/constructor/service-constructor";

export default async function ServiceEditorPage({ params }: { params: { id: string } }) {
  const [service, refs] = await Promise.all([
    getServiceById(params.id),
    listReferenceLists(),
  ]);

  if (!service) notFound();

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Конструктор услуги</h1>
      <ServiceConstructor
        initialService={service}
        references={referencesToMap(refs)}
        referenceLists={refs.map((r) => ({ id: r.id, title: r.title }))}
      />
    </main>
  );
}
