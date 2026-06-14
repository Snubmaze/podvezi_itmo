-- Привязка аккаунта к номеру ИСУ вместо telegram_id (см. architecture.md 5.1).
-- telegram_id становится метаданными последнего входа (не ключ): снимаем
-- UNIQUE и NOT NULL. Ключ аккаунта — users.isu_number (UNIQUE уже есть).

alter table public.users drop constraint if exists users_telegram_id_key;
alter table public.users alter column telegram_id drop not null;
