-- Canal anônimo da Mosca — rodar uma vez em SQL Editor do Supabase.
-- O site só consegue GRAVAR arquivos já criptografados. Ninguém com a chave pública lê nada.

insert into storage.buckets (id, name, public, file_size_limit)
values ('denuncias', 'denuncias', false, 52428800)        -- privado, máx. 50 MB por envio
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Anônimos podem apenas inserir objetos .pgp na raiz do bucket.
drop policy if exists "denuncias_insert_anon" on storage.objects;
create policy "denuncias_insert_anon" on storage.objects
  for insert to anon
  with check (bucket_id = 'denuncias' and name ~ '^[a-z0-9-]{20,64}\.pgp$');

-- Sem políticas de select/update/delete para anon: leitura só pelo painel (service_role).
