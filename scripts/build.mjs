// Gera o site estático: capa, seções, matérias, sitemaps e RSS.
// Fontes: content/posts/*.json (matérias locais) + matérias publicadas no Supabase.
import fs from 'node:fs';
import path from 'node:path';
import { SUPABASE_URL, SUPABASE_KEY } from '../assets/config.js';

const SITE = 'https://mosca.news';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SECOES = {
  politica: { nome: 'Política', desc: 'Reportagens e análises sobre poder político, governo, Congresso e eleições no Brasil.' },
  economia: { nome: 'Economia', desc: 'Análises sobre elite financeira, contratos, concentração de renda e interesses econômicos por trás das decisões públicas.' },
  plataformas: { nome: 'Plataformas & Poder', desc: 'Investigações sobre big techs, algoritmos, moderação de conteúdo e o alcance de vozes políticas nas redes.' },
  investigacoes: { nome: 'Investigações', desc: 'Reportagens investigativas da Mosca, baseadas em documentos, dados públicos e registros verificáveis.' },
  documentos: { nome: 'Documentos', desc: 'Acervo de documentos-fonte, transcrições e registros usados nas reportagens da Mosca.' },
};

const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = u => (!u ? '' : /^https?:/.test(u) ? u : SITE + u);
const tz = { timeZone: 'America/Sao_Paulo' };
const dataCurta = d => new Date(d).toLocaleDateString('pt-BR', { ...tz, day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').replace(/ de /g, ' ');
const hora = d => new Date(d).toLocaleTimeString('pt-BR', { ...tz, hour: '2-digit', minute: '2-digit' });
const dataLonga = d => new Date(d).toLocaleDateString('pt-BR', { ...tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const iso = d => new Date(d).toISOString();
const ldJson = o => JSON.stringify(o).replace(/</g, '\\u003c');
const write = (rel, html) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

function corpoHtml(p) {
  if (p.formato !== 'texto') return p.conteudo;
  return p.conteudo.split(/\n\s*\n/).map(par => par.trim()).filter(Boolean)
    .map(par => `<p>${esc(par).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, '<br>')}</p>`).join('\n');
}
const textoPuro = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const minutos = p => Math.max(1, Math.round(textoPuro(corpoHtml(p)).split(' ').length / 200));
const url = p => `/${p.secao}/${p.slug}/`;

// ───────── carregar matérias ─────────
async function carregar() {
  const locais = fs.readdirSync(path.join(ROOT, 'content/posts')).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'content/posts', f), 'utf8')));
  let remotos = [];
  if (SUPABASE_URL && SUPABASE_KEY && !process.env.MOSCA_OFFLINE) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/posts?status=eq.publicado&select=*&order=publicado_em.desc`, { headers: { apikey: SUPABASE_KEY } });
    if (r.ok) remotos = await r.json();
    else if (r.status === 404 || r.status === 400) console.warn(`Supabase: tabela posts indisponível (${r.status}); rode supabase/schema.sql.`);
    else throw new Error(`Supabase respondeu ${r.status} — build interrompido para não publicar o site sem as matérias.`);
  }
  const porSlug = new Map();
  for (const p of [...locais, ...remotos]) if (p.status === 'publicado' && SECOES[p.secao]) porSlug.set(p.slug, p);
  return [...porSlug.values()].sort((a, b) => new Date(b.publicado_em) - new Date(a.publicado_em));
}

// ───────── pedaços comuns ─────────
const FONTES = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@700;900&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">`;

function head({ titulo, desc, caminho, index = true, tipo = 'website', imagem = '/assets/img/og-default.jpg', imgW = 1200, imgH = 630, imgAlt = '', extra = '', ld = [] }) {
  const u = SITE + caminho;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${u}">
<meta name="robots" content="${index ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,follow'}">
<meta name="theme-color" content="#F9F8F6">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Mosca" href="/feed.xml">
<meta property="og:site_name" content="Mosca"><meta property="og:locale" content="pt_BR"><meta property="og:type" content="${tipo}">
<meta property="og:title" content="${esc(titulo.replace(/ \| Mosca$/, ''))}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${u}">
<meta property="og:image" content="${abs(imagem)}">${imgW ? `<meta property="og:image:width" content="${imgW}"><meta property="og:image:height" content="${imgH}">` : ''}${imgAlt ? `<meta property="og:image:alt" content="${esc(imgAlt)}">` : ''}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(titulo.replace(/ \| Mosca$/, ''))}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${abs(imagem)}">
${extra}
${FONTES}
<link rel="stylesheet" href="/assets/tailwind.css">
<link rel="stylesheet" href="/assets/mosca.css">
<script type="application/ld+json">${ldJson(ld)}</script>
</head>
<body class="antialiased">`;
}

const ORG = { '@type': 'NewsMediaOrganization', name: 'Mosca', url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/assets/logo.png', width: 512, height: 512 }, publishingPrinciples: SITE + '/linha-editorial/', correctionsPolicy: SITE + '/linha-editorial/#correcoes' };
const crumbs = list => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, ...(u ? { item: SITE + u } : {}) })) });

const TOPO = `<header class="border-b fio">
  <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
    <a href="/" class="display font-black text-3xl">Mosca<span class="text-[color:var(--vinho)]">.</span></a>
    <a href="/denuncia/" class="sans text-xs font-semibold uppercase tracking-wider text-[color:var(--vinho)]">Envie uma pauta ▸</a>
  </div>
</header>`;
const NAV = `<nav aria-label="Seções" class="sans text-xs font-semibold uppercase tracking-wider border-y fio fio-duplo py-2 flex flex-wrap justify-center gap-x-6 gap-y-1">
    ${Object.entries(SECOES).map(([s, v]) => `<a href="/${s}/" class="hover:text-[color:var(--vinho)]">${esc(v.nome)}</a>`).join('\n    ')}
    <a href="/denuncia/" class="text-[color:var(--vinho)]">Envie uma pauta ▸</a>
  </nav>`;
const RODAPE = `<footer class="max-w-6xl mx-auto px-4 border-t fio fio-duplo py-6 sans text-xs text-[color:var(--cinza)] flex flex-wrap gap-4 justify-between">
  <span>© ${new Date().getFullYear()} Mosca. Jornalismo independente.</span>
  <nav aria-label="Rodapé" class="flex flex-wrap gap-4">${Object.entries(SECOES).map(([s, v]) => `<a href="/${s}/">${esc(v.nome)}</a>`).join('')}<a href="/linha-editorial/">Linha editorial</a><a href="/denuncia/">Canal anônimo</a><a href="/feed.xml">RSS</a></nav>
</footer>
</body>
</html>
`;

const img = (p, cls, prioridade) => p.capa_url ? `<img class="foto ${cls}" src="${esc(p.capa_url)}"${p.capa_largura ? ` width="${p.capa_largura}" height="${p.capa_altura}"` : ''} alt="${esc(p.capa_alt || '')}" ${prioridade ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>` : '';
const kicker = p => esc(p.kicker || SECOES[p.secao].nome);

// ───────── matéria ─────────
function materia(p, todos) {
  const s = SECOES[p.secao];
  const desc = p.descricao || p.linha_fina || textoPuro(corpoHtml(p)).slice(0, 155);
  const relacionadas = todos.filter(o => o !== p && (o.secao === p.secao || (o.secoes_extra || []).includes(p.secao))).slice(0, 3);
  const og = p.og_imagem || p.capa_url || '/assets/img/og-default.jpg';
  const imagens = [...new Set([p.og_imagem, p.capa_url].filter(Boolean).map(abs))];
  const ld = [{
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': SITE + url(p) },
    headline: (p.titulo_seo || p.titulo).slice(0, 110), alternativeHeadline: p.linha_fina || undefined, description: desc,
    image: imagens.length ? imagens : [SITE + '/assets/img/og-default.jpg'],
    datePublished: iso(p.publicado_em), dateModified: iso(p.atualizado_em || p.publicado_em),
    articleSection: s.nome, inLanguage: 'pt-BR', keywords: p.palavras_chave || [], wordCount: textoPuro(corpoHtml(p)).split(' ').length,
    author: { '@type': 'Organization', name: p.assinatura || 'Redação Mosca', url: SITE + '/' },
    publisher: ORG, isAccessibleForFree: true,
  }, crumbs([['Início', '/'], [s.nome, `/${p.secao}/`], [p.titulo, null]])];
  const extra = [
    `<meta property="article:published_time" content="${iso(p.publicado_em)}">`,
    `<meta property="article:modified_time" content="${iso(p.atualizado_em || p.publicado_em)}">`,
    `<meta property="article:section" content="${esc(s.nome)}">`,
    ...(p.palavras_chave || []).map(k => `<meta property="article:tag" content="${esc(k)}">`),
    (p.palavras_chave || []).length ? `<meta name="news_keywords" content="${esc(p.palavras_chave.join(', '))}">` : '',
  ].filter(Boolean).join('\n');
  return head({ titulo: `${p.titulo_seo || p.titulo} | Mosca`, desc, caminho: url(p), tipo: 'article', imagem: og, imgW: p.og_imagem ? 1200 : p.capa_largura, imgH: p.og_imagem ? 630 : p.capa_altura, imgAlt: p.capa_alt, extra, ld }) + `
${TOPO}
<main>
<article class="max-w-[720px] mx-auto px-4 pt-8 pb-16">
  <nav aria-label="Trilha" class="sans text-[11px] uppercase tracking-wider text-[color:var(--cinza)]"><a href="/">Início</a> / <a href="/${p.secao}/">${esc(s.nome)}</a></nav>
  <header class="mt-4">
    <p class="kicker">${kicker(p)}</p>
    <h1 class="display font-black text-4xl md:text-5xl leading-[1.06] mt-2">${esc(p.titulo)}</h1>
    ${p.linha_fina ? `<p class="text-xl leading-relaxed mt-4 text-[#333]">${esc(p.linha_fina)}</p>` : ''}
    <div class="sans text-xs border-y fio mt-6 py-2 flex flex-wrap gap-x-5 gap-y-1">
      <span class="font-semibold">${esc(p.assinatura || 'Redação Mosca')}</span>
      <time datetime="${iso(p.publicado_em)}">${dataCurta(p.publicado_em)} · ${hora(p.publicado_em).replace(':', 'h')}</time>
      <a href="/${p.secao}/">${esc(s.nome)}</a>
      <span class="text-[color:var(--cinza)]">${minutos(p)} min de leitura</span>
    </div>
  </header>
  ${p.capa_url ? `<figure class="grao mt-6 -mx-4 sm:mx-0">
    ${img(p, 'w-full', true)}
    ${p.capa_credito ? `<figcaption class="sans text-[11px] text-[color:var(--cinza)] mt-1 px-4 sm:px-0">${esc(p.capa_credito)}</figcaption>` : ''}
  </figure>` : ''}
  <div class="corpo mt-8">
${corpoHtml(p)}
  </div>
  ${p.atualizado_em && new Date(p.atualizado_em) - new Date(p.publicado_em) > 3600e3 ? `<p class="sans text-xs text-[color:var(--cinza)] mt-8">Atualizado em <time datetime="${iso(p.atualizado_em)}">${dataCurta(p.atualizado_em)}, ${hora(p.atualizado_em)}</time>.</p>` : ''}
  ${relacionadas.length ? `<aside class="border-t fio mt-12 pt-5" aria-label="Leia também">
    <h2 class="sans text-xs font-bold uppercase tracking-[.2em]">Leia também</h2>
    <ul class="mt-3 space-y-3">${relacionadas.map(o => `<li><a class="display font-bold text-lg leading-snug hover:underline" href="${url(o)}">${esc(o.titulo)}</a></li>`).join('')}</ul>
  </aside>` : ''}
  <aside class="border fio p-5 mt-10">
    <p class="kicker">Canal anônimo</p>
    <p class="mt-1">Tem documentos ou informações sobre este tema? <a href="/denuncia/" class="text-[color:var(--vinho)] underline">Envie com segurança</a>.</p>
  </aside>
</article>
</main>
${RODAPE}`;
}

// ───────── capa ─────────
function capa(posts) {
  const [manchete, ...resto] = [...posts.filter(p => p.destaque), ...posts.filter(p => !p.destaque)];
  const foco = resto.slice(0, 2), mais = resto.slice(2, 8);
  const agora = new Date();
  const card = (p, grande) => `<a class="manchete block" href="${url(p)}"><p class="kicker">${kicker(p)}</p><h3 class="display font-bold ${grande ? 'text-2xl' : 'text-xl'} leading-tight mt-1">${esc(p.titulo)}</h3>${grande && p.linha_fina ? `<p class="mt-2 text-[15px] leading-relaxed">${esc(p.linha_fina)}</p>` : ''}</a>`;
  return head({
    titulo: 'Mosca — Jornalismo investigativo independente', desc: 'Mosca: jornalismo investigativo independente. Denúncias, análises de conjuntura e documentos sobre poder político e econômico no Brasil.', caminho: '/',
    ld: [{ '@context': 'https://schema.org', ...ORG, inLanguage: 'pt-BR' }, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Mosca', url: SITE + '/', inLanguage: 'pt-BR' }],
  }) + `
<header class="max-w-6xl mx-auto px-4">
  <div class="sans text-[11px] uppercase tracking-widest flex justify-between py-2 border-b fio text-[color:var(--cinza)]">
    <span>${dataLonga(agora)}</span><span class="hidden sm:inline">Brasília</span>
  </div>
  <div class="py-6 text-center">
    <a href="/" class="display font-black text-6xl md:text-7xl tracking-tight">Mosca<span class="text-[color:var(--vinho)]">.</span></a>
    <h1 class="sr-only">Mosca — Jornalismo investigativo independente</h1>
    <p class="italic text-sm mt-1 text-[color:var(--cinza)]">O incômodo necessário. Jornalismo independente, sem dono e sem patrocinador.</p>
  </div>
  ${NAV}
</header>
<main class="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
  <div class="lg:col-span-8 lg:border-r fio lg:pr-8">
  ${manchete ? `<article>
    <a class="manchete block" href="${url(manchete)}">
      <p class="kicker">${kicker(manchete)}</p>
      <h2 class="display font-black text-4xl md:text-5xl leading-[1.05] mt-2">${esc(manchete.titulo)}</h2>
      ${manchete.capa_url ? `<figure class="grao mt-5">${img(manchete, 'w-full aspect-[3/2] object-cover', true)}${manchete.capa_credito ? `<figcaption class="sans text-[11px] text-[color:var(--cinza)] mt-1">${esc(manchete.capa_credito)}</figcaption>` : ''}</figure>` : ''}
      ${manchete.linha_fina ? `<p class="text-lg leading-relaxed mt-4">${esc(manchete.linha_fina)}</p>` : ''}
    </a>
    <p class="sans text-[11px] uppercase tracking-wider mt-3 text-[color:var(--cinza)]">${esc(manchete.assinatura || 'Redação Mosca')} · ${dataCurta(manchete.publicado_em)} · ${minutos(manchete)} min de leitura</p>
  </article>` : '<p class="italic">Nenhuma matéria publicada ainda.</p>'}
  ${foco.length ? `<section aria-labelledby="em-foco" class="mt-10 border-t fio pt-4">
    <h2 id="em-foco" class="sans text-xs font-bold uppercase tracking-[.2em] mb-5">Em Foco</h2>
    <div class="grid md:grid-cols-5 gap-6">
      <div class="md:col-span-3 ${foco[1] ? 'md:border-r fio md:pr-6' : ''}">${card(foco[0], true)}</div>
      ${foco[1] ? `<div class="md:col-span-2">${card(foco[1], false)}</div>` : ''}
    </div>
  </section>` : ''}
  ${mais.length ? `<section class="mt-10 border-t fio pt-4"><h2 class="sans text-xs font-bold uppercase tracking-[.2em] mb-2">Mais reportagens</h2>
    <ul class="divide-y divide-[#d6d3cc]">${mais.map(p => `<li class="py-4">${card(p, false)}</li>`).join('')}</ul></section>` : ''}
  </div>
  <aside class="lg:col-span-4 space-y-8" aria-label="Últimas atualizações">
    <section>
      <h2 class="sans text-xs font-bold uppercase tracking-[.2em] border-b fio pb-2">Últimas Atualizações</h2>
      <ol class="mt-3 divide-y divide-[#d6d3cc]">
        ${posts.slice(0, 8).map(p => `<li class="py-3 grid grid-cols-[3.6rem_1fr] gap-2"><time class="mono text-xs text-[color:var(--vinho)]" datetime="${iso(p.publicado_em)}">${new Date(p.publicado_em).toDateString() === agora.toDateString() ? hora(p.publicado_em) : dataCurta(p.publicado_em).split(' ').slice(0, 2).join(' ')}</time><a href="${url(p)}" class="text-[15px] leading-snug hover:underline">${esc(p.titulo)}</a></li>`).join('\n        ')}
      </ol>
    </section>
    <section class="border fio p-5">
      <p class="kicker">Canal seguro</p>
      <h2 class="display font-bold text-xl mt-1">Envie uma pauta ou vazamento</h2>
      <p class="text-sm mt-2 leading-relaxed">O conteúdo é criptografado no seu aparelho e não pedimos identificação. Documentos são analisados pela redação antes de qualquer publicação.</p>
      <a href="/denuncia/" class="sans inline-block mt-4 text-xs font-semibold uppercase tracking-wider border-b border-[color:var(--vinho)] text-[color:var(--vinho)] hover:opacity-70">Acessar canal anônimo →</a>
    </section>
  </aside>
</main>
${RODAPE}`;
}

// ───────── seção ─────────
function secao(slug, posts) {
  const s = SECOES[slug];
  const lista = posts.filter(p => p.secao === slug || (p.secoes_extra || []).includes(slug));
  const ld = [crumbs([['Início', '/'], [s.nome, null]])];
  if (lista.length) ld.push({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: lista.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + url(p) })) });
  return [lista.length, head({ titulo: `${s.nome} | Mosca`, desc: s.desc, caminho: `/${slug}/`, index: lista.length > 0, ld }) + `
${TOPO}
<main class="max-w-6xl mx-auto px-4 py-10">
<nav aria-label="Trilha" class="sans text-[11px] uppercase tracking-wider text-[color:var(--cinza)]"><a href="/">Início</a> / <span>${esc(s.nome)}</span></nav>
<header class="border-b fio fio-duplo pt-4 pb-4 mt-3"><h1 class="display font-black text-5xl">${esc(s.nome)}</h1><p class="mt-2 text-lg text-[#333] max-w-2xl">${esc(s.desc)}</p></header>
<ol class="max-w-3xl">${lista.length ? lista.map(p => `<li class="py-6 border-b border-[#d6d3cc] grid sm:grid-cols-[1fr_180px] gap-5"><div><a class="manchete block" href="${url(p)}"><p class="kicker">${kicker(p)}</p><h2 class="display font-bold text-2xl md:text-3xl leading-tight mt-1">${esc(p.titulo)}</h2>${p.linha_fina ? `<p class="mt-2 leading-relaxed">${esc(p.linha_fina)}</p>` : ''}</a><p class="sans text-[11px] uppercase tracking-wider mt-2 text-[color:var(--cinza)]"><time datetime="${iso(p.publicado_em)}">${dataCurta(p.publicado_em)}</time> · ${esc(p.assinatura || 'Redação Mosca')}</p></div>${p.capa_url ? `<a href="${url(p)}" class="grao hidden sm:block self-start" tabindex="-1" aria-hidden="true">${img(p, 'w-full aspect-[4/3] object-cover', false)}</a>` : ''}</li>`).join('') : '<li class="py-6 text-[color:var(--cinza)] italic">Nenhuma publicação nesta seção ainda.</li>'}</ol>
</main>
${RODAPE}`];
}

// ───────── execução ─────────
const posts = await carregar();
for (const s of Object.keys(SECOES)) fs.rmSync(path.join(ROOT, s), { recursive: true, force: true });
write('index.html', capa(posts));
const indexaveis = ['/'];
for (const s of Object.keys(SECOES)) { const [n, html] = secao(s, posts); write(`${s}/index.html`, html); if (n) indexaveis.push(`/${s}/`); }
for (const p of posts) write(`${p.secao}/${p.slug}/index.html`, materia(p, posts));

const hoje = iso(new Date());
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${indexaveis.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${posts[0] ? iso(posts[0].atualizado_em || posts[0].publicado_em) : hoje}</lastmod></url>`).join('\n')}
${posts.map(p => `  <url><loc>${SITE}${url(p)}</loc><lastmod>${iso(p.atualizado_em || p.publicado_em)}</lastmod>${p.capa_url ? `<image:image><image:loc>${esc(abs(p.capa_url))}</image:loc></image:image>` : ''}</url>`).join('\n')}
  <url><loc>${SITE}/linha-editorial/</loc></url>
  <url><loc>${SITE}/denuncia/</loc></url>
</urlset>
`);
// Google News: só matérias das últimas 48 h.
const recentes = posts.filter(p => Date.now() - new Date(p.publicado_em) < 48 * 3600e3);
write('news-sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recentes.map(p => `  <url><loc>${SITE}${url(p)}</loc><news:news><news:publication><news:name>Mosca</news:name><news:language>pt</news:language></news:publication><news:publication_date>${iso(p.publicado_em)}</news:publication_date><news:title>${esc(p.titulo)}</news:title></news:news></url>`).join('\n')}
</urlset>
`);
write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>Mosca</title><link>${SITE}/</link><description>Jornalismo investigativo independente.</description><language>pt-BR</language>
<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${posts.slice(0, 30).map(p => `<item><title>${esc(p.titulo)}</title><link>${SITE}${url(p)}</link><guid isPermaLink="true">${SITE}${url(p)}</guid><pubDate>${new Date(p.publicado_em).toUTCString()}</pubDate><category>${esc(SECOES[p.secao].nome)}</category><description>${esc(p.descricao || p.linha_fina || '')}</description></item>`).join('\n')}
</channel></rss>
`);
console.log(`Mosca: ${posts.length} matéria(s) publicada(s), ${recentes.length} no news-sitemap.`);
