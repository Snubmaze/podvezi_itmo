-- Попутчик ИТМО — шаг 2: Storage.
-- Приватный bucket driver-documents для документов водителя (ВУ, СТС).
-- Конвенция путей: "<user_id>/<document_type>/<filename>" — первый сегмент
-- пути = id владельца, по нему строится RLS.

insert into storage.buckets (id, name, public)
values ('driver-documents', 'driver-documents', false)
on conflict (id) do nothing;

-- RLS на storage.objects включён Supabase по умолчанию; добавляем политики
-- только для этого bucket. Доступ — владелец (первый сегмент пути) или админ.

create policy driver_documents_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy driver_documents_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy driver_documents_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'driver-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy driver_documents_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
