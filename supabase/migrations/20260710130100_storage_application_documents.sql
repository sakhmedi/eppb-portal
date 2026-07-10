-- ЕППБ — приватный бакет для документов заявок и RLS-политики к нему.
-- Файлы поля type="file" загружаются сюда с клиента; путь строится как
--   <user_id>/<application_id>/<fieldKey>/<имя файла>
-- Первый сегмент пути = id владельца, по нему политики и проверяют доступ.

-- Бакет (приватный: файлы отдаются только владельцу/через подписанные ссылки).
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

-- Владелец может читать свои файлы (первый сегмент пути = его uid).
create policy "app-docs: read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Владелец может загружать файлы только в свою «папку».
create policy "app-docs: insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Владелец может заменять/удалять свои файлы (перезагрузка документа).
create policy "app-docs: update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "app-docs: delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
