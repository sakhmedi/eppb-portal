-- ЕППБ — двухфазная подача заявки.
-- Добавляем статус 'awaiting_documents' между 'draft' и 'submitted':
--   draft → (подана первичная заявка) → awaiting_documents → (догружены документы) → submitted.
-- Так пользователь подаёт первичную заявку (получает номер), а документы и согласия
-- предоставляет позже, вернувшись из личного кабинета.

-- 1) Расширяем перечень допустимых статусов.
alter table public.applications drop constraint applications_status_check;
alter table public.applications
  add constraint applications_status_check
  check (status in ('draft', 'awaiting_documents', 'submitted', 'in_review', 'approved', 'rejected'));

-- 2) Разрешаем владельцу править заявку не только в 'draft', но и в 'awaiting_documents'
--    (чтобы догрузить документы/согласия). Иммутабельность уже поданных первичных данных
--    обеспечивается на уровне server action (submitDocuments мёржит ТОЛЬКО ключи полей
--    этапа документов): column-level запрет в RLS выразить неудобно, поэтому граница
--    «что можно менять» проходит в коде, а RLS отвечает лишь за «чья это строка и в каком
--    статусе её вообще можно трогать».
drop policy "applications: update own draft or admin" on public.applications;

create policy "applications: update own editable or admin"
  on public.applications for update
  using (
    (user_id = auth.uid() and status in ('draft', 'awaiting_documents'))
    or public.is_admin()
  )
  with check (user_id = auth.uid() or public.is_admin());
