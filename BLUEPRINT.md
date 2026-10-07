# Mosca — Blueprint

## Estrutura
```
scripts/build.mjs        Gera capa, seções, matérias, sitemaps e RSS a cada deploy (Netlify)
content/posts/*.json     Matérias guardadas no repositório (ex.: 001)
admin/                   Painel da redação (login Supabase, editor, denúncias, configuração)
scripts/ejornal.mjs      E-jornal: edições diárias em formato de jornal (/edicao/AAAA-MM-DD/, /edicoes/)
denuncia/                Canal anônimo (criptografia PGP no navegador → Supabase Storage)
supabase/schema.sql      Tabelas, permissões (RLS) e buckets — rodar no SQL Editor
assets/config.js         URL e chave publishable do Supabase (públicas)
tools/abrir-denuncia.mjs Abre denúncias fora do navegador, com a chave privada
```
Rodar localmente: `npm install && npm run dev` (http://localhost:8080).
Fluxo de publicação: /admin → Publicar → Supabase → build hook do Netlify → `scripts/build.mjs` gera as páginas estáticas.
## Linha editorial
- **Missão:** fiscalizar o poder político e econômico — elite financeira, pautas conservadoras, plataformas e seus interesses. A seleção de pauta é declaradamente crítica; a apuração, não.
- **Regra de ouro:** toda afirmação de fato tem fonte verificável (documento, dado público, registro reproduzível) linkada no texto. Opinião vai rotulada como "Análise".
- **Outro lado obrigatório:** todo citado é procurado com prazo razoável; a resposta (ou a ausência) é publicada.
- **Tom:** sóbrio, sem adjetivos de militância, sem caixa-alta. Títulos com pergunta quando o fato ainda está em apuração ("ocultam?"), afirmativos só com prova.
- **Correções** visíveis, datadas, no rodapé da matéria (`/linha-editorial#correcoes`).
- **Anonimato:** "Redação Mosca" / "Investigação Anônima" como assinatura. Isso protege repórteres, mas aumenta o ônus de documentação — anônimo + sem fonte = não publica.

## Matéria 001 — "Redes sociais ocultam perfil oficial de Lula?"
- **Ângulo:** poder privado das plataformas sobre o alcance de uma autoridade eleita; falta de transparência das regras de recomendação.
- **Antes de publicar, preencher todos os trechos `[A VERIFICAR]`:** quais redes, período, testes reproduzíveis (contas limpas, comparação com perfis de outros políticos inclusive da oposição), capturas datadas, perguntas às empresas e à Secom, respostas.
- Se os testes não confirmarem a ocultação, a pauta vira "Por que o perfil de Lula parece sumir das buscas" — a verificação é a notícia.

## SEO aplicado
| Item | Onde |
|---|---|
| HTML5 semântico (`header/nav/main/article/aside/figure/time`) | todas as páginas |
| `NewsArticle` + `BreadcrumbList` + `NewsMediaOrganization` (JSON-LD) | artigo / home |
| Title ≤ 60c, meta description ≤ 160c, canonical, `max-image-preview:large` | todas |
| Open Graph + Twitter Card (1200×630 recomendado em produção) | todas |
| URL `/categoria/slug-com-palavra-chave` | artigo |
| `news-sitemap.xml` (Google News) + `sitemap.xml` + robots | raiz |
| Alt-text descritivo, `width/height` (evita CLS), `fetchpriority` no LCP | imagens |
| Palavras-chave alvo: "perfil oficial de Lula", "Lula redes sociais", "shadowban Lula", "alcance perfil presidente", "algoritmo política" | title/H1/description |
| Links internos: bloco de documentos + links para regulação de plataformas | artigo |

## Canal anônimo — requisitos de backend
O formulário estático **não é anônimo sozinho**. Em produção:
1. Preferir **SecureDrop** ou **GlobaLeaks** (auditados) servindo também um endereço `.onion`.
2. Servidor sem logs de acesso (nginx `access_log off`), sem CDN que registre IP, sem analytics, sem fontes/scripts externos nessa página (hospedar fontes localmente, remover o CDN do Tailwind).
3. Remover metadados (mat2/exiftool) no servidor e criptografar arquivos em repouso com chave PGP da redação.
4. Devolver ao fonte um código aleatório para retorno, sem e-mail.
