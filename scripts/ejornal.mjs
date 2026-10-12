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
  // ── Paginação com continuação: cada texto corre pelas páginas que precisar, inteiro. ──
  const OPINIOES = new Set(['opiniao', 'editorial']);
  const SECAO_EJ = p => ({ opiniao: 'Opinião', editorial: 'Opinião', arte: 'Arte & Cultura', poesia: 'Poesia', cronica: 'Crônicas & Contos' }[p.tipo] || SECOES[p.secao]?.nome || '');
  // Parágrafos em texto simples (poemas mantêm as quebras de verso com ⏎).
  function paragrafos(p) {
    const html = p.tipo === 'poesia' ? corpoHtml(p).replace(/<br\s*\/?>/gi, ' ⏎ ') : corpoHtml(p);
    return html.split(/<\/(?:p|h2|h3|h4|li|blockquote|div)>/i).map(textoPuro).filter(Boolean);
  }
  // Capacidade aproximada de cada página, em "palavras" (para poemas, em versos).
  function capacidades(p) {
    if (p.tipo === 'poesia') return { primeira: 28, demais: 31, poema: true };
    const imagens = (p.capa_url ? 1 : 0) + (p.tipo === 'arte' ? Math.min((p.galeria || []).length, 2) : 0);
    const primeira = imagens ? (p.tipo === 'arte' ? 230 : 300) : 700;
    return { primeira, demais: 820 };
  }
  // Divide os parágrafos em fatias por página, quebrando parágrafo longo na palavra.
  function fatiar(p) {
    const cap = capacidades(p), fatias = [[]];
    const custo = t => cap.poema ? t.split('⏎').length + 1 : t.split(' ').length + 6; // +6 ≈ respiro entre parágrafos
    const pars = paragrafos(p);
    // Distribui o que sobra da 1ª página por igual entre as continuações (evita página com 3 linhas).
    const total = pars.reduce((n, t) => n + custo(t), 0);
    // Se sobraria só um pedacinho para a página seguinte, divide melhor entre as duas.
    if (total > cap.primeira && total - cap.primeira < cap.demais * 0.2) cap.primeira = Math.ceil(total * (cap.poema ? 0.55 : 0.6));
    const resto = total - cap.primeira;
    const demais = resto > 0 ? Math.min(cap.demais, Math.ceil(resto / Math.ceil(resto / cap.demais) * 1.12) + (cap.poema ? 3 : 40)) : cap.demais;
    let usado = 0, limite = cap.primeira;
    for (let par of pars) {
      while (par) {
        const c = custo(par);
        if (usado + c <= limite) { fatias.at(-1).push(par); usado += c; par = ''; break; }
        const sobra = limite - usado;
        if (!cap.poema && sobra > 40) {           // completa a página com parte do parágrafo
          const w = par.split(' '), n = sobra - 6;
          fatias.at(-1).push(w.slice(0, n).join(' ')); par = w.slice(n).join(' ');
        } else if (cap.poema && sobra > 4 && fatias.at(-1).length === 0) {
          const v = par.split('⏎'); fatias.at(-1).push(v.slice(0, sobra - 1).join('⏎')); par = v.slice(sobra - 1).join('⏎');
        }
        fatias.push([]); usado = 0; limite = demais;
      }
    }
    return fatias.filter((f, i) => f.length || i === 0);
  }
  function paginar(ed) {
    const pags = [{ tipo: 'capa', itens: [ed.manchete], partes: [] }];
    const ordem = [
      ...ed.itens.filter(p => p.tipo === 'reportagem'),
      ...ed.itens.filter(p => p.tipo === 'editorial'), ...ed.itens.filter(p => p.tipo === 'opiniao'),
      ...ed.itens.filter(p => ['arte', 'cronica', 'poesia'].includes(p.tipo)),
    ];
    for (const p of ordem) {
      const fatias = fatiar(p);
      fatias.forEach((blocos, i) => pags.push({ tipo: 'materia', itens: [p], parte: i, total: fatias.length, blocos }));
    }
    const charges = ed.itens.filter(p => p.tipo === 'charge');
    for (let i = 0; i < charges.length; i += 2) pags.push({ tipo: 'charges', itens: charges.slice(i, i + 2) });
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

  const paragrafoHtml = t => `<p>${esc(t).replace(/\s*⏎\s*/g, '<br>')}</p>`;
  function folhaMateria(ed, g, pags) {
    const p = g.itens[0], primeira = g.parte === 0, ultima = g.parte === g.total - 1;
    const prox = pags[pags.indexOf(g) + 1];
    const autor = p.tipo === 'editorial' ? 'Editorial' : p.colunista ? (p.tipo === 'opiniao' ? 'Por ' : '') + p.colunista : p.assinatura || 'Redação Mosca';
    const imgs = primeira && p.tipo === 'arte' ? (p.galeria || []).slice(0, 2) : [];
    const colunas = p.tipo === 'poesia' ? 'ej-c1' : 'ej-c3';
    const fim = ultima
      ? `<p class="ej-continua ej-fim">■ <a href="${url(p)}">Leia online e compartilhe ▸</a></p>`
      : `<p class="ej-continua">Continua na pág. ${prox.numero} ▸</p>`;
    return `<section class="folha" aria-label="Página ${g.numero}">
  ${cabecalhoInterno(ed, g.numero, SECAO_EJ(p))}
  <article class="ej-materia ${p.tipo === 'poesia' ? 'ej-poema' : ''} ${OPINIOES.has(p.tipo) ? 'ej-opiniao-texto' : ''}">
    ${primeira ? `<p class="ej-chapeu">${chapeu(p)}</p>
    <h2 class="ej-h-materia ${p.tipo === 'editorial' ? 'ej-italico' : ''}">${esc(p.titulo)}</h2>
    ${p.linha_fina ? `<p class="ej-linhafina">${esc(p.linha_fina)}</p>` : ''}
    <p class="ej-assinatura">${esc(autor)}</p>
    ${p.tipo === 'arte' ? `<div class="ej-galeria">${[p.capa_url && { url: p._img?.src || p.capa_url, alt: p.capa_alt }, ...imgs].filter(Boolean).slice(0, 3).map(i => `<img src="${esc(i.url)}" alt="${esc(i.alt || '')}" loading="lazy">`).join('')}</div>` : foto(p, 'ej-foto-materia')}`
    : `<p class="ej-continuacao"><span>Continuação da pág. ${pags[pags.indexOf(g) - 1].numero}</span> ${esc(p.titulo)}</p>`}
    <div class="ej-colunas ${colunas} ${primeira && p.tipo !== 'poesia' ? 'ej-capitular' : ''} ej-flex">${g.blocos.map(paragrafoHtml).join('')}</div>
    ${fim}
  </article>
</section>`;
  }

  function folhaCharges(ed, g) {
    return `<section class="folha" aria-label="Página ${g.numero}">
  ${cabecalhoInterno(ed, g.numero, 'Charges')}
  <div class="ej-charges">${g.itens.map(p => `<figure>${p.capa_url ? `<img src="${esc(p._img?.src || p.capa_url)}" alt="${esc(p.capa_alt || '')}" loading="lazy">` : ''}<figcaption><b>${esc(p.titulo)}</b>${p.colunista ? ` — ${esc(p.colunista)}` : ''}</figcaption></figure>`).join('')}</div>
</section>`;
  }

  function folhaContracapa(ed, g, pags) {
    return `<section class="folha" aria-label="Página ${g.numero}">
  ${cabecalhoInterno(ed, g.numero, 'Expediente')}
  <div class="ej-contra">
    <div>
      <h2 class="ej-h-sub">Nesta edição</h2>
      <ol class="ej-indice">${[...new Set(pags.filter(x => x.tipo !== 'capa' && x.tipo !== 'contracapa').flatMap(x => x.itens))].map(p => `<li><span>${esc(p.titulo)}</span><b>${paginaDe(pags, p)}</b></li>`).join('')}</ol>
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
    return envolver(pags.map(g => g.tipo === 'capa' ? folhaCapa(ed, pags) : g.tipo === 'materia' ? folhaMateria(ed, g, pags)
      : g.tipo === 'charges' ? folhaCharges(ed, g) : folhaContracapa(ed, g, pags)).join('\n'));
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
