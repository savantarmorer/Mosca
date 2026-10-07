-- Mosca — esquema completo. Rodar no SQL Editor do Supabase (pode rodar de novo sem problema).
-- Depois: criar o usuário em Authentication → Users e rodar o bloco "ADMIN" no fim deste arquivo.

-- ───────────── Administradores ─────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "admins_self" on public.admins;
create policy "admins_self" on public.admins for select to authenticated using (user_id = auth.uid());

-- ───────────── Matérias ─────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null,
  linha_fina text,
  descricao text,                       -- meta description (SEO), até ~160 caracteres
  secao text not null default 'politica',
  secoes_extra text[] not null default '{}',
  kicker text,
  assinatura text not null default 'Redação Mosca',
  palavras_chave text[] not null default '{}',
  capa_url text, capa_alt text, capa_credito text,
  formato text not null default 'rich' check (formato in ('rich','html','texto')),
  conteudo text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho','publicado')),
  destaque boolean not null default false,
  publicado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
alter table public.posts enable row level security;

drop policy if exists "posts_publicos" on public.posts;
create policy "posts_publicos" on public.posts for select to anon, authenticated using (status = 'publicado');
drop policy if exists "posts_admin" on public.posts;
create policy "posts_admin" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tipos de conteúdo (opinião, charge, arte) — idempotente para quem já rodou a versão anterior.
alter table public.posts add column if not exists tipo text not null default 'reportagem';
alter table public.posts add column if not exists colunista text;
alter table public.posts add column if not exists galeria jsonb not null default '[]';
alter table public.posts add column if not exists autor_bio text;
alter table public.posts drop constraint if exists posts_tipo_check;
alter table public.posts add constraint posts_tipo_check check (tipo in ('reportagem','opiniao','editorial','charge','arte','poesia','cronica'));
alter table public.posts drop constraint if exists posts_secao_check;
alter table public.posts add constraint posts_secao_check
  check (secao in ('politica','economia','plataformas','investigacoes','documentos','opiniao','charges','cultura','poesia','literatura'));

-- ───────────── Colaborações de leitores (opinião, poesia, crônica, arte, fotografia) ─────────────
-- O público só consegue INSERIR (status pendente). Ler, aprovar e apagar: só administradores.
create table if not exists public.colaboracoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('opiniao','poesia','cronica','arte','fotografia')),
  titulo text not null check (char_length(titulo) between 2 and 200),
  texto text not null default '' check (char_length(texto) <= 40000),
  assinatura text not null check (char_length(assinatura) between 2 and 80),
  minibio text check (char_length(minibio) <= 300),
  contato text check (char_length(contato) <= 200),
  imagens jsonb not null default '[]',
  aceite boolean not null check (aceite),
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada')),
  post_id uuid references public.posts(id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.colaboracoes enable row level security;
drop policy if exists "colab_envio_publico" on public.colaboracoes;
create policy "colab_envio_publico" on public.colaboracoes for insert to anon, authenticated
  with check (status = 'pendente' and post_id is null and jsonb_array_length(imagens) <= 8);
drop policy if exists "colab_admin" on public.colaboracoes;
create policy "colab_admin" on public.colaboracoes for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('colaboracoes', 'colaboracoes', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "colab_upload_publico" on storage.objects;
create policy "colab_upload_publico" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'colaboracoes' and name ~ '^[a-f0-9-]{36}/[0-9]{1,2}\.(jpg|png|webp)$');
drop policy if exists "colab_admin_arquivos" on storage.objects;
create policy "colab_admin_arquivos" on storage.objects for all to authenticated
  using (bucket_id = 'colaboracoes' and public.is_admin()) with check (bucket_id = 'colaboracoes' and public.is_admin());

-- ───────────── E-jornal (edições diárias) ─────────────
-- Sem registro para um dia, o site monta a edição sozinho com as matérias daquele dia.
create table if not exists public.edicoes (
  data date primary key,                 -- dia da edição (horário de Brasília)
  titulo text,                           -- ex.: "Edição especial: eleições"
  itens text[] not null default '{}',    -- slugs das matérias, na ordem das páginas
  manchete text,                         -- slug da manchete da primeira página
  status text not null default 'rascunho' check (status in ('rascunho','publicada')),
  atualizado_em timestamptz not null default now()
);
alter table public.edicoes enable row level security;
drop policy if exists "edicoes_publicas" on public.edicoes;
create policy "edicoes_publicas" on public.edicoes for select to anon, authenticated using (status = 'publicada');
drop policy if exists "edicoes_admin" on public.edicoes;
create policy "edicoes_admin" on public.edicoes for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────────── Configuração (chave PGP, build hook) ─────────────
create table if not exists public.config (
  chave text primary key,
  valor text not null,
  publico boolean not null default false
);
alter table public.config enable row level security;
drop policy if exists "config_publica" on public.config;
create policy "config_publica" on public.config for select to anon, authenticated using (publico);
drop policy if exists "config_admin" on public.config;
create policy "config_admin" on public.config for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────────── Storage ─────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('denuncias', 'denuncias', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midia', 'midia', true, 15728640, array['image/jpeg','image/png','image/webp','image/avif','image/gif','application/pdf'])
on conflict (id) do update set public = true;

-- Denúncias: anônimo só grava .pgp; admin lista, baixa e apaga.
drop policy if exists "denuncias_insert_anon" on storage.objects;
create policy "denuncias_insert_anon" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'denuncias' and name ~ '^[a-z0-9-]{20,64}\.pgp$');
drop policy if exists "denuncias_admin_read" on storage.objects;
create policy "denuncias_admin_read" on storage.objects for select to authenticated
  using (bucket_id = 'denuncias' and public.is_admin());
drop policy if exists "denuncias_admin_delete" on storage.objects;
create policy "denuncias_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'denuncias' and public.is_admin());

-- Mídia: leitura pública (bucket público); escrita só admin.
drop policy if exists "midia_admin_write" on storage.objects;
create policy "midia_admin_write" on storage.objects for all to authenticated
  using (bucket_id = 'midia' and public.is_admin()) with check (bucket_id = 'midia' and public.is_admin());

-- ───────────── ADMIN ─────────────
-- Troque o e-mail e rode depois de criar o usuário em Authentication → Users:
-- insert into public.admins (user_id) select id from auth.users where email = 'SEU-EMAIL@exemplo.com' on conflict do nothing;
