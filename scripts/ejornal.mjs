// E-jornal: edições diárias com cara de jornal impresso (capa, páginas internas, opinião, cultura, expediente).
// Cada página é um "container" CSS: tudo é medido em cqw, então a mesma marcação serve para tela, miniatura e PDF.

export const diaSP = d => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const anoRomano = d => ROMANOS[new Date(d).getFullYear() - 2026] || String(new Date(d).getFullYear() - 2025);

// Monta a lista de edições: uma por dia com publicação; a redação pode reordenar/escolher pelo /admin.
export function montarEdicoes(posts, personalizadas) {
  const porSlug = new Map(posts.map(p => [p.slug, p]));
  const dias = new Map();
  for (const p of [...posts].sort((a, b) => new Date(a.publicado_em) - new Date(b.publicado_em))) {
    const d = diaSP(p.publicado_em);
    if (!dias.has(d)) dias.set(d, []);
    dias.get(d).push(p);
  }
  for (const e of personalizadas) if (!dias.has(e.data)) dias.set(e.data, []);
  const ordemTipo = { reportagem: 0, editorial: 1, opiniao: 2, charge: 3, arte: 4, cronica: 5, poesia: 6 };
  return [...dias.keys()].sort().map((data, i) => {
    const pers = personalizadas.find(e => e.data === data);
    let itens, manchete;
    if (pers && pers.itens?.length) {
      itens = pers.itens.map(s => porSlug.get(s)).filter(Boolean);
      manchete = porSlug.get(pers.manchete);
    } else {
      itens = [...dias.get(data)].sort((a, b) => (ordemTipo[a.tipo] - ordemTipo[b.tipo]) || (b.destaque - a.destaque) || (new Date(b.publicado_em) - new Date(a.publicado_em)));
    }
    const reportagens = itens.filter(p => p.tipo === 'reportagem');
    manchete = manchete && itens.includes(manchete) ? manchete : reportagens[0] || itens[0];
    return { data, numero: i + 1, titulo: pers?.titulo || null, itens, manchete };
  }).filter(e => e.itens.length);
}

export function criarEjornal(h) {
  const { esc, url, SECOES, textoPuro, corpoHtml, SITE } = h;
  const dataExtenso = d => new Date(d + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Corta o texto em parágrafos simples até o limite de palavras (sem quebrar HTML).
  function trecho(p, limite) {
    const html = p.tipo === 'poesia' ? corpoHtml(p).replace(/<br\s*\/?>/gi, ' \u23CE ') : corpoHtml(p);
    const blocos = html.split(/<\/(?:p|h2|h3|li|blockquote)>/i).map(textoPuro).filter(Boolean);
    const saida = []; let n = 0, cortado = false;
    for (const b of blocos) {
      const palavras = b.split(' ');
      if (n + palavras.length > limite) {
        const resto = limite - n;
        if (resto > 15) saida.push(palavras.slice(0, resto).join(' ') + '…');
        cortado = true; break;
      }
      saida.push(b); n += palavras.length;
    }
    return { html: saida.map(t => `<p>${esc(t).replace(/\s*\u23CE\s*/g, '<br>')}</p>`).join(''), cortado };
  }
  const foto = (p, cls = '') => p.capa_url ? `<figure class="ej-foto ${cls}"><img src="${esc(p._img?.src || p.capa_url)}" alt="${esc(p.capa_alt || '')}" loading="lazy" decoding="async">${p.capa_credito ? `<figcaption>${esc(p.capa_credito)}</figcaption>` : ''}</figure>` : '';
  const chapeu = p => esc(p.kicker || SECOES[p.secao]?.nome || '');
  const continua = (p, cortado) => cortado ? `<p class="ej-continua">Continua em <a href="${url(p)}">mosca.news${url(p)}</a></p>` : `<p class="ej-continua"><a href="${url(p)}">Leia online ▸</a></p>`;

  function cabecalhoInterno(ed, n, secao) {
    return `<header class="ej-cab"><span>${n}</span><span class="ej-cab-secao">${esc(secao)}</span><span>Mosca · ${esc(dataExtenso(ed.data))}</span></header>`;
  }

  // Distribui itens em páginas e devolve [{tipo, itens, numero}]
  function paginar(ed) {
    const pags = [{ tipo: 'capa', itens: [ed.manchete] }];
    const rep = ed.itens.filter(p => p.tipo === 'reportagem');
    const opi = ed.itens.filter(p => ['editorial', 'opiniao', 'charge'].includes(p.tipo));
    const arte = ed.itens.filter(p => ['arte', 'poesia', 'cronica'].includes(p.tipo));
    for (const p of rep) pags.push({ tipo: 'materia', itens: [p] });
    if (opi.length) pags.push({ tipo: 'opiniao', itens: opi });
    for (let i = 0; i < arte.length; i += 2) pags.push({ tipo: 'cultura', itens: arte.slice(i, i + 2) });
    pags.push({ tipo: 'contracapa', itens: [] });
    pags.forEach((g, i) => (g.numero = i + 1));
    return pags;
  }
  const paginaDe = (pags, p) => pags.find(g => g.tipo !== 'capa' && g.itens.includes(p))?.numero;

  function folhaCapa(ed, pags, { mini = false } = {}) {
    const m = ed.manchete;
    const outras = ed.itens.filter(p => p !== m).slice(0, 4);
    const charge = ed.itens.find(p => p.tipo === 'charge');
    const t = trecho(m, m.capa_url ? 70 : 170);
    const pm = paginaDe(pags, m);
    return `<section class="folha ej-capa" ${mini ? 'aria-hidden="true"' : 'aria-label="Primeira página"'}>
  <div class="ej-capa-topo"><span>Ano ${anoRomano(ed.data + 'T12:00:00-03:00')} · Nº ${ed.numero}</span><span>${esc(dataExtenso(ed.data))}</span><span>Edição digital · Brasília</span></div>
  <div class="ej-titulo">Mosca<span>.</span></div>
  <div class="ej-lema">O incômodo necessário · Jornalismo independente${ed.titulo ? ` · <b>${esc(ed.titulo)}</b>` : ''}</div>
  <div class="ej-corpo-capa">
    <article class="ej-manchete">
      <p class="ej-chapeu">${chapeu(m)}</p>
      <h1 class="ej-h-manchete">${esc(m.titulo)}</h1>
      ${m.linha_fina ? `<p class="ej-linhafina">${esc(m.linha_fina)}</p>` : ''}
      ${foto(m, 'ej-foto-capa')}
      <div class="ej-colunas ej-c3 ej-flex">${t.html}</div>${pm ? `<p class="ej-continua">Continua na pág. ${pm} ▸</p>` : continua(m, t.cortado)}
    </article>
    ${outras.length || charge ? `<aside class="ej-chamadas">
      ${outras.filter(p => p !== charge).slice(0, charge ? 3 : 4).map(p => `<div class="ej-chamada"><p class="ej-chapeu">${chapeu(p)}</p><h2>${esc(p.titulo)}</h2>${p.linha_fina ? `<p>${esc(p.linha_fina)}</p>` : ''}<p class="ej-pag">pág. ${paginaDe(pags, p)}</p></div>`).join('')}
      ${charge ? `<div class="ej-chamada ej-charge-mini"><p class="ej-chapeu">Charge do dia</p>${charge.capa_url ? `<img src="${esc(charge._img?.src || charge.capa_url)}" alt="${esc(charge.capa_alt || '')}" loading="lazy">` : ''}<p class="ej-pag">pág. ${paginaDe(pags, charge)}</p></div>` : ''}
    </aside>` : ''}
  </div>
  <footer class="ej-rodape-capa">mosca.news · Envie documentos com segurança em mosca.news/denuncia</footer>
</section>`;
  }

  function folhaMateria(ed, g) {
    const p = g.itens[0];
    const t = trecho(p, p.capa_url ? 430 : 720);
    return `<section class="folha" aria-label="Página ${g.numero}">
  ${cabecalhoInterno(ed, g.numero, SECOES[p.secao]?.nome || '')}
  <article class="ej-materia">
    <p class="ej-chapeu">${chapeu(p)}</p>
    <h2 class="ej-h-materia">${esc(p.titulo)}</h2>
    ${p.linha_fina ? `<p class="ej-linhafina">${esc(p.linha_fina)}</p>` : ''}
    <p class="ej-assinatura">${esc(p.assinatura || 'Redação Mosca')}</p>
    ${foto(p, 'ej-foto-materia')}
    <div class="ej-colunas ej-c3 ej-capitular ej-flex">${t.html}</div>${continua(p, t.cortado)}
  </article>
</section>`;
  }

  function folhaOpiniao(ed, g) {
    const editorial = g.itens.find(p => p.tipo === 'editorial');
    const charge = g.itens.find(p => p.tipo === 'charge');
    const colunas = g.itens.filter(p => p.tipo === 'opiniao').slice(0, 3);
    const bloco = (p, limite, cls) => { const t = trecho(p, limite); return `<article class="${cls}"><p class="ej-chapeu">${p.tipo === 'editorial' ? 'Editorial' : esc(p.colunista || 'Opinião')}</p><h3>${esc(p.titulo)}</h3><div class="ej-colunas ${cls === 'ej-editorial' ? 'ej-c2' : 'ej-c1'} ej-flex">${t.html}</div>${continua(p, t.cortado)}</article>`; };
    return `<section class="folha" aria-label="Página ${g.numero}">
  ${cabecalhoInterno(ed, g.numero, 'Opinião')}
  <div class="ej-opiniao">
    <div class="ej-opi-esq">
      ${editorial ? bloco(editorial, colunas.length ? 300 : 650, 'ej-editorial') : ''}
      ${colunas.length ? `<div class="ej-colunistas">${colunas.map(p => bloco(p, editorial ? 170 : 420, 'ej-coluna')).join('')}</div>` : ''}
    </div>
    ${charge ? `<aside class="ej-opi-dir"><p class="ej-chapeu">Charge</p>${charge.capa_url ? `<img src="${esc(charge._img?.src || charge.capa_url)}" alt="${esc(charge.capa_alt || '')}" loading="lazy">` : ''}<p class="ej-legenda"><b>${esc(charge.titulo)}</b>${charge.colunista ? ` — ${esc(charge.colunista)}` : ''}</p></aside>` : ''}
  </div>
</section>`;
  }

  function folhaCultura(ed, g) {
    return `<section class="folha" aria-label="Página ${g.numero}">
  ${cabecalhoInterno(ed, g.numero, g.itens.every(p => p.tipo === 'poesia') ? 'Poesia' : g.itens.every(p => p.tipo === 'arte') ? 'Arte & Cultura' : 'Cultura & Letras')}
  <div class="ej-cultura">${g.itens.map(p => {
    const t = trecho(p, g.itens.length > 1 ? 150 : 380);
    const imgs = [p.capa_url && { url: p._img?.src || p.capa_url, alt: p.capa_alt }, ...(p.galeria || [])].filter(Boolean).slice(0, 3);
    return `<article class="${p.tipo === 'poesia' ? 'ej-poema' : ''}"><p class="ej-chapeu">${chapeu(p)}${p.colunista ? ` · ${esc(p.colunista)}` : ''}</p><h2 class="ej-h-materia">${esc(p.titulo)}</h2>${p.linha_fina ? `<p class="ej-linhafina">${esc(p.linha_fina)}</p>` : ''}
      ${imgs.length ? `<div class="ej-galeria">` : '<!--'}${imgs.map(i => `<img src="${esc(i.url)}" alt="${esc(i.alt || '')}" loading="lazy">`).join('')}${imgs.length ? '</div>' : '-->'}
      <div class="ej-colunas ${p.tipo === 'poesia' ? 'ej-c1' : 'ej-c3'} ej-flex">${t.html}</div>${continua(p, t.cortado)}</article>`;
  }).join('')}</div>
</section>`;
  }

  function folhaContracapa(ed, g, pags) {
    return `<section class="folha" aria-label="Página ${g.numero}">
  ${cabecalhoInterno(ed, g.numero, 'Expediente')}
  <div class="ej-contra">
    <div>
      <h2 class="ej-h-sub">Nesta edição</h2>
      <ol class="ej-indice">${pags.filter(x => x.tipo !== 'capa' && x.tipo !== 'contracapa').flatMap(x => x.itens.map(p => `<li><span>${esc(p.titulo)}</span><b>${x.numero}</b></li>`)).join('')}</ol>
      <div class="ej-caixa"><p class="ej-chapeu">Canal anônimo</p><h3>Tem documentos? Envie com segurança.</h3><p>O conteúdo é criptografado no seu aparelho antes do envio e não pedimos identificação.</p><p class="ej-url">mosca.news/denuncia</p></div>
    </div>
    <div class="ej-expediente">
      <div class="ej-titulo ej-titulo-p">Mosca<span>.</span></div>
      <p>Jornalismo investigativo independente, sem dono e sem patrocinador.</p>
      <dl><dt>Edição</dt><dd>Ano ${anoRomano(ed.data + 'T12:00:00-03:00')}, nº ${ed.numero} — ${esc(dataExtenso(ed.data))}</dd>
      <dt>Redação</dt><dd>Redação Mosca. As reportagens não levam nome de autor para proteger quem apura.</dd>
      <dt>Contato</dt><dd>redacao@mosca.news</dd>
      <dt>Princípios</dt><dd>mosca.news/linha-editorial</dd>
      <dt>Correções</dt><dd>Publicadas no fim de cada matéria, com data.</dd></dl>
    </div>
  </div>
</section>`;
  }

  // O conteúdo vai num invólucro (.fi): unidades cqw só medem a página a partir dos filhos dela.
  const envolver = html => html.replace(/(<section class="folha[^>]*>)/g, '$1<div class="fi">').replace(/<\/section>/g, '</div></section>');

  function folhas(ed) {
    const pags = paginar(ed);
    return envolver(pags.map(g => g.tipo === 'capa' ? folhaCapa(ed, pags) : g.tipo === 'materia' ? folhaMateria(ed, g)
      : g.tipo === 'opiniao' ? folhaOpiniao(ed, g) : g.tipo === 'cultura' ? folhaCultura(ed, g) : folhaContracapa(ed, g, pags)).join('\n'));
  }

  const miniCapa = ed => `<div class="ej-mini">${envolver(folhaCapa(ed, paginar(ed), { mini: true }))}</div>`;

  function paginaEdicao(ed, anterior, proxima) {
    const titulo = `E-jornal Mosca — Edição nº ${ed.numero}, ${dataExtenso(ed.data)}`;
    return h.head({ titulo, desc: `Leia a edição nº ${ed.numero} do Mosca em formato de jornal: ${ed.manchete.titulo}.`, caminho: `/edicao/${ed.data}/`, index: false,
      imagem: ed.manchete._img?.og || '/assets/img/og-default.jpg', extra: '<link rel="stylesheet" href="/assets/ejornal.css">',
      ld: [{ '@context': 'https://schema.org', '@type': 'PublicationIssue', issueNumber: String(ed.numero), datePublished: ed.data, name: titulo, isPartOf: { '@type': 'Newspaper', name: 'Mosca', url: SITE + '/', inLanguage: 'pt-BR' } }] }) + `
<div class="ej-barra">
  <a href="/" class="ej-voltar">← Mosca</a>
  <span class="ej-info">Edição nº ${ed.numero} · ${esc(dataExtenso(ed.data))}</span>
  <nav class="ej-ctrl" aria-label="Navegação da edição">
    ${anterior ? `<a href="/edicao/${anterior.data}/" title="Edição anterior">« Ed. ${anterior.numero}</a>` : ''}
    <button type="button" data-ej="ant" aria-label="Página anterior">‹</button>
    <span data-ej="pag" aria-live="polite">1</span>
    <button type="button" data-ej="prox" aria-label="Próxima página">›</button>
    ${proxima ? `<a href="/edicao/${proxima.data}/" title="Próxima edição">Ed. ${proxima.numero} »</a>` : ''}
    <button type="button" data-ej="tela" title="Tela cheia">⛶</button>
    <button type="button" data-ej="pdf" title="Baixar em PDF">PDF</button>
    <a href="/edicoes/">Edições</a>
  </nav>
</div>
<main class="ej-mesa"><div class="ej-viewer" tabindex="0" aria-roledescription="jornal">
  <div class="ej-espaco" aria-hidden="true"></div>
${folhas(ed)}
</div></main>
<script src="/assets/ejornal.js" defer></script>
</body></html>
`;
  }

  function paginaArquivo(eds) {
    return h.head({ titulo: 'Edições do e-jornal | Mosca', desc: 'Todas as edições do Mosca em formato de jornal impresso digital.', caminho: '/edicoes/', index: eds.length > 1, extra: '<link rel="stylesheet" href="/assets/ejornal.css">',
      ld: [h.crumbs([['Início', '/'], ['Edições', null]])] }) + `
${h.TOPO}
<main class="max-w-6xl mx-auto px-4 py-10">
<nav aria-label="Trilha" class="sans text-[11px] uppercase tracking-wider text-[color:var(--cinza)]"><a href="/">Início</a> / <span>Edições</span></nav>
<header class="border-b fio fio-duplo pt-4 pb-4 mt-3"><p class="kicker">E-jornal</p><h1 class="display font-black text-5xl mt-1">Edições</h1><p class="mt-2 text-lg text-[#333]">O Mosca em formato de jornal: folheie página por página ou baixe em PDF.</p></header>
<ol class="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">${[...eds].reverse().map(ed => `<li><a href="/edicao/${ed.data}/" class="block group">${miniCapa(ed)}<p class="sans text-xs font-semibold uppercase tracking-wider mt-3 group-hover:text-[color:var(--vinho)]">Nº ${ed.numero} · ${esc(h.dataCurta(ed.data + 'T12:00:00-03:00'))}</p></a></li>`).join('')}</ol>
</main>
${h.RODAPE}`;
  }

  return { paginaEdicao, paginaArquivo, miniCapa, dataExtenso };
}
