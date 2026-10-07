import * as openpgp from '/assets/vendor/openpgp.min.mjs';
import { SUPABASE_URL, SUPABASE_KEY } from '/assets/config.js';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SECOES = { politica: 'Política', economia: 'Economia', plataformas: 'Plataformas & Poder', investigacoes: 'Investigações', documentos: 'Documentos' };

let toastT;
function toast(msg, erro) {
  const t = $('#toast');
  t.textContent = msg; t.style.background = erro ? 'var(--vinho)' : ''; t.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), erro ? 8000 : 4000);
}
const falha = (e, ctx) => { console.error(ctx, e); toast(`${ctx}: ${e?.message || e}`, true); };

// ───────── sessão ─────────
async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return mostrarLogin();
  const { data: admin, error } = await sb.rpc('is_admin');
  if (error || !admin) {
    await sb.auth.signOut();
    return mostrarLogin(error ? 'Banco não configurado: rode supabase/schema.sql.' : 'Este usuário não é administrador.');
  }
  $('#usuario').textContent = session.user.email;
  $('#sessao').classList.replace('hidden', 'flex');
  $('#tela-login').classList.add('hidden');
  $('#tela-painel').classList.remove('hidden');
  abrirAba(location.hash.slice(1) || 'materias');
}
function mostrarLogin(msg = '') {
  $('#tela-painel').classList.add('hidden');
  $('#sessao').classList.replace('flex', 'hidden');
  $('#tela-login').classList.remove('hidden');
  $('#login-msg').textContent = msg;
}
$('#form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button');
  btn.disabled = true; $('#login-msg').textContent = '';
  const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.senha.value });
  btn.disabled = false;
  if (error) return ($('#login-msg').textContent = error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
  f.reset(); iniciar();
});
$('#sair').addEventListener('click', async () => { await sb.auth.signOut(); chavePrivada = null; mostrarLogin(); });

// ───────── abas ─────────
function abrirAba(nome) {
  if (!['materias', 'denuncias', 'config'].includes(nome)) nome = 'materias';
  $$('.aba').forEach(b => b.setAttribute('aria-selected', b.dataset.aba === nome));
  ['materias', 'denuncias', 'config'].forEach(a => $(`#aba-${a}`).classList.toggle('hidden', a !== nome));
  history.replaceState(null, '', '#' + nome);
  ({ materias: listarMaterias, denuncias: listarDenuncias, config: carregarConfig })[nome]();
}
$$('.aba').forEach(b => b.addEventListener('click', () => abrirAba(b.dataset.aba)));

// ───────── build hook ─────────
async function config(chave) {
  const { data } = await sb.from('config').select('valor').eq('chave', chave).maybeSingle();
  return data?.valor || null;
}
async function atualizarSite() {
  const hook = await config('build_hook');
  if (!hook) return toast('Salvo. Configure o build hook (aba Configuração) para o site atualizar sozinho.');
  await fetch(hook, { method: 'POST', mode: 'no-cors' }).catch(() => {});
  toast('Salvo. O site será atualizado em cerca de 1 minuto.');
}

// ───────── matérias: lista ─────────
async function listarMaterias() {
  $('#editor').classList.add('hidden'); $('#lista-materias').classList.remove('hidden');
  const { data, error } = await sb.from('posts').select('id,slug,titulo,status,secao,publicado_em,atualizado_em').order('atualizado_em', { ascending: false });
  if (error) return falha(error, 'Erro ao carregar matérias');
  $('#tbody-materias').innerHTML = data.length ? data.map(p => `<tr>
    <td><button class="text-left display font-bold text-lg leading-snug hover:underline" data-editar="${p.id}">${esc(p.titulo)}</button><div class="sans text-[11px] text-[color:var(--cinza)]">${esc(SECOES[p.secao])}</div></td>
    <td class="sans text-[11px] uppercase tracking-wider ${p.status === 'publicado' ? 'text-[color:var(--vinho)]' : ''}">${p.status}</td>
    <td class="sans text-xs">${new Date(p.publicado_em || p.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
    <td class="sans text-xs text-right space-x-3"><button class="btn-link" data-editar="${p.id}">Editar</button>${p.status === 'publicado' ? `<a class="btn-link" target="_blank" rel="noopener" href="/${p.secao}/${p.slug}/">Ver</a>` : ''}</td>
  </tr>`).join('') : '<tr><td colspan="4" class="italic text-[color:var(--cinza)]">Nenhuma matéria ainda. A matéria 001 fica no repositório (content/posts).</td></tr>';
  $$('[data-editar]').forEach(b => b.addEventListener('click', () => abrirEditor(b.dataset.editar)));
}
$('#nova').addEventListener('click', () => abrirEditor(null));
$('#voltar').addEventListener('click', listarMaterias);

// ───────── editor ─────────
const quill = new Quill('#quill', {
  theme: 'snow',
  placeholder: 'Escreva a matéria…',
  modules: {
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['link', 'blockquote', 'code-block'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['image', 'video'],
        ['clean'],
      ],
      handlers: { image: () => escolherArquivo('image/*', async f => inserirNoTexto('image', await enviarMidia(f))) },
    },
  },
});
const form = $('#editor');
let atual = null, slugManual = false;

function escolherArquivo(accept, cb) {
  const i = Object.assign(document.createElement('input'), { type: 'file', accept });
  i.onchange = () => i.files[0] && cb(i.files[0]).catch(e => falha(e, 'Falha no upload'));
  i.click();
}
async function enviarMidia(file) {
  if (file.size > 15 * 1024 * 1024) throw new Error('arquivo acima de 15 MB');
  toast('Enviando arquivo…');
  const base = file.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]+/g, '-');
  const nome = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID().slice(0, 8)}-${base}`;
  const { error } = await sb.storage.from('midia').upload(nome, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) throw error;
  toast('Arquivo enviado.');
  return sb.storage.from('midia').getPublicUrl(nome).data.publicUrl;
}
function inserirNoTexto(tipo, valor, texto) {
  const r = quill.getSelection(true);
  if (tipo === 'image') quill.insertEmbed(r.index, 'image', valor, 'user');
  else quill.insertText(r.index, texto, { link: valor }, 'user');
}
$('#anexar-doc').addEventListener('click', () => escolherArquivo('.pdf,application/pdf,.txt,.csv,.doc,.docx,.xls,.xlsx', async f => {
  const url = await enviarMidia(f);
  inserirNoTexto('link', url, prompt('Texto do link:', f.name.replace(/\.[^.]+$/, '')) || f.name);
}));
$('#inserir-citacao').addEventListener('click', () => {
  const r = quill.getSelection(true);
  quill.formatLine(r.index, Math.max(r.length, 1), 'blockquote', true, 'user');
});

// Troca entre editor visual / HTML / texto simples sem perder conteúdo.
const htmlParaTexto = h => { const d = document.createElement('div'); d.innerHTML = h.replace(/<\/(p|h[1-6]|li|blockquote)>/g, '\n\n').replace(/<br\s*\/?>/g, '\n'); return d.textContent.replace(/\n{3,}/g, '\n\n').trim(); };
const textoParaHtml = t => t.split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
let formatoAtual = 'rich';
function lerConteudo() {
  return formatoAtual === 'rich' ? (quill.getText().trim() || quill.root.querySelector('img,iframe') ? quill.root.innerHTML : '')
    : formatoAtual === 'html' ? $('#box-html').value : $('#box-texto').value;
}
function definirFormato(novo, conteudo) {
  const html = conteudo ?? (formatoAtual === 'texto' ? textoParaHtml(lerConteudo()) : lerConteudo());
  if (conteudo == null && novo === formatoAtual) return;
  if (novo === 'rich') quill.clipboard.dangerouslyPasteHTML(html);
  if (novo === 'html') $('#box-html').value = html;
  if (novo === 'texto') $('#box-texto').value = conteudo != null ? conteudo : htmlParaTexto(html);
  formatoAtual = novo;
  form.formato.value = novo;
  $('#box-rich').classList.toggle('hidden', novo !== 'rich');
  $('#box-html').classList.toggle('hidden', novo !== 'html');
  $('#box-texto').classList.toggle('hidden', novo !== 'texto');
}
$$('input[name=formato]').forEach(r => r.addEventListener('change', () => {
  if (formatoAtual === 'html' && r.value === 'rich' && !confirm('O editor visual pode descartar HTML que ele não reconhece (classes, estilos, iframes). Continuar?')) return (form.formato.value = 'html');
  definirFormato(r.value);
}));

const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 10).join('-');
const localISO = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

function atualizarSEO() {
  if (!slugManual) form.slug.value = slugify(form.titulo.value);
  const desc = form.descricao.value || form.linha_fina.value;
  $('#url-final').textContent = `https://mosca.news/${form.secao.value}/${form.slug.value}/`;
  $('#cont-desc').textContent = `(${form.descricao.value.length}/160)`;
  $('#cont-desc').style.color = form.descricao.value.length > 160 ? 'var(--vinho)' : '';
  $('#g-secao').textContent = `${form.secao.value} › ${form.slug.value}`;
  $('#g-titulo').textContent = `${form.titulo.value || 'Título da matéria'} | Mosca`.slice(0, 70);
  $('#g-desc').textContent = (desc || 'A descrição aparece aqui. Use até 160 caracteres com as palavras que o leitor buscaria.').slice(0, 160);
}
form.slug.addEventListener('input', () => { slugManual = true; atualizarSEO(); });
['titulo', 'descricao', 'linha_fina', 'secao'].forEach(n => form[n].addEventListener('input', atualizarSEO));

function mostrarCapa(url) {
  form.capa_url.value = url || '';
  $('#capa-prev').src = url || '';
  $('#capa-prev').classList.toggle('hidden', !url);
}
$('#capa-arquivo').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { mostrarCapa(await enviarMidia(f)); } catch (err) { falha(err, 'Falha no upload da capa'); }
  e.target.value = '';
});
$('#capa-remover').addEventListener('click', () => mostrarCapa(''));

async function abrirEditor(id) {
  let p = { secao: 'politica', assinatura: 'Redação Mosca', formato: 'rich', conteudo: '', status: 'rascunho', secoes_extra: [], palavras_chave: [] };
  if (id) {
    const { data, error } = await sb.from('posts').select('*').eq('id', id).single();
    if (error) return falha(error, 'Erro ao abrir matéria');
    p = data;
  }
  atual = p; slugManual = !!id;
  form.reset();
  for (const k of ['kicker', 'titulo', 'linha_fina', 'secao', 'assinatura', 'capa_alt', 'capa_credito', 'slug', 'descricao']) form[k].value = p[k] || '';
  if (!form.assinatura.value) form.assinatura.value = 'Redação Mosca';
  form.palavras_chave.value = (p.palavras_chave || []).join(', ');
  form.destaque.checked = !!p.destaque;
  form.publicado_em.value = p.publicado_em ? localISO(p.publicado_em) : '';
  $$('#secoes-extra input').forEach(c => (c.checked = (p.secoes_extra || []).includes(c.value)));
  mostrarCapa(p.capa_url);
  quill.setContents([]); $('#box-html').value = ''; $('#box-texto').value = '';
  definirFormato(p.formato || 'rich', p.conteudo || '');
  $('#ed-status').textContent = p.status === 'publicado' ? '● Publicada' : '○ Rascunho';
  $('#despublicar').classList.toggle('hidden', p.status !== 'publicado');
  $('#excluir').classList.toggle('hidden', !id);
  atualizarSEO();
  $('#lista-materias').classList.add('hidden'); form.classList.remove('hidden');
  window.scrollTo(0, 0);
}

function coletar(status) {
  const lista = v => v.split(',').map(s => s.trim()).filter(Boolean);
  const publicado_em = form.publicado_em.value ? new Date(form.publicado_em.value).toISOString()
    : status === 'publicado' ? (atual.publicado_em || new Date().toISOString()) : atual.publicado_em || null;
  return {
    kicker: form.kicker.value.trim() || null,
    titulo: form.titulo.value.trim(),
    linha_fina: form.linha_fina.value.trim() || null,
    descricao: form.descricao.value.trim() || null,
    secao: form.secao.value,
    secoes_extra: $$('#secoes-extra input:checked').map(c => c.value).filter(v => v !== form.secao.value),
    assinatura: form.assinatura.value,
    palavras_chave: lista(form.palavras_chave.value),
    capa_url: form.capa_url.value || null,
    capa_alt: form.capa_alt.value.trim() || null,
    capa_credito: form.capa_credito.value.trim() || null,
    formato: formatoAtual,
    conteudo: lerConteudo(),
    destaque: form.destaque.checked,
    slug: form.slug.value,
    status, publicado_em,
    atualizado_em: new Date().toISOString(),
  };
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const acao = e.submitter?.dataset.acao || 'rascunho';
  const status = acao === 'publicar' ? 'publicado' : acao === 'despublicar' ? 'rascunho' : atual.status === 'publicado' ? 'publicado' : 'rascunho';
  const dados = coletar(status);
  if (status === 'publicado') {
    const faltando = [!dados.conteudo && 'texto', dados.capa_url && !dados.capa_alt && 'texto alternativo da capa'].filter(Boolean);
    if (faltando.length) return toast(`Antes de publicar, preencha: ${faltando.join(', ')}.`, true);
  }
  $$('#editor button').forEach(b => (b.disabled = true));
  try {
    if (dados.destaque) await sb.from('posts').update({ destaque: false }).eq('destaque', true).neq('id', atual.id || '00000000-0000-0000-0000-000000000000');
    const q = atual.id ? sb.from('posts').update(dados).eq('id', atual.id).select().single() : sb.from('posts').insert(dados).select().single();
    const { data, error } = await q;
    if (error) throw error.code === '23505' ? new Error('já existe uma matéria com este endereço (slug)') : error;
    atual = data;
    $('#ed-status').textContent = data.status === 'publicado' ? '● Publicada' : '○ Rascunho';
    $('#despublicar').classList.toggle('hidden', data.status !== 'publicado');
    $('#excluir').classList.remove('hidden');
    if (acao !== 'rascunho' || data.status === 'publicado') await atualizarSite(); else toast('Rascunho salvo.');
  } catch (err) { falha(err, 'Não foi possível salvar'); }
  $$('#editor button').forEach(b => (b.disabled = false));
});

$('#excluir').addEventListener('click', async () => {
  if (!atual?.id || !confirm(`Excluir definitivamente “${atual.titulo}”?`)) return;
  const { error } = await sb.from('posts').delete().eq('id', atual.id);
  if (error) return falha(error, 'Erro ao excluir');
  if (atual.status === 'publicado') await atualizarSite(); else toast('Matéria excluída.');
  listarMaterias();
});

$('#previa').addEventListener('click', () => {
  const d = coletar(atual.status);
  const corpo = d.formato === 'texto' ? textoParaHtml(d.conteudo) : d.conteudo;
  const w = window.open('', '_blank');
  if (!w) return toast('Permita pop-ups para ver a prévia.', true);
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia — ${esc(d.titulo)}</title>
<link rel="stylesheet" href="/assets/tailwind.css"><link rel="stylesheet" href="/assets/mosca.css"></head><body class="antialiased">
<p class="sans text-xs text-center py-2 bg-[color:var(--vinho)] text-white">PRÉVIA — não publicada</p>
<article class="max-w-[720px] mx-auto px-4 pt-8 pb-16"><p class="kicker">${esc(d.kicker || SECOES[d.secao])}</p>
<h1 class="display font-black text-4xl md:text-5xl leading-[1.06] mt-2">${esc(d.titulo)}</h1>
${d.linha_fina ? `<p class="text-xl leading-relaxed mt-4 text-[#333]">${esc(d.linha_fina)}</p>` : ''}
<div class="sans text-xs border-y fio mt-6 py-2">${esc(d.assinatura)}</div>
${d.capa_url ? `<figure class="grao mt-6"><img class="foto w-full" src="${esc(d.capa_url)}" alt="${esc(d.capa_alt || '')}"><figcaption class="sans text-[11px] mt-1">${esc(d.capa_credito || '')}</figcaption></figure>` : ''}
<div class="corpo mt-8">${corpo}</div></article></body></html>`);
  w.document.close();
});

// ───────── denúncias ─────────
let chavePrivada = null;
async function desbloquearChave() {
  if (chavePrivada) return chavePrivada;
  const armored = await config('pgp_privada');
  if (!armored) throw new Error('chave não configurada (aba Configuração)');
  const senha = prompt('Senha da chave da redação:');
  if (!senha) throw new Error('senha não informada');
  chavePrivada = await openpgp.decryptKey({ privateKey: await openpgp.readPrivateKey({ armoredKey: armored }), passphrase: senha });
  return chavePrivada;
}
async function listarDenuncias() {
  $('#denuncia-aberta').classList.add('hidden');
  const { data, error } = await sb.storage.from('denuncias').list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return falha(error, 'Erro ao listar denúncias');
  const itens = data.filter(o => o.name.endsWith('.pgp'));
  $('#lista-denuncias').innerHTML = itens.length ? itens.map(o => `<li class="py-3 flex flex-wrap items-center justify-between gap-3">
    <span><span class="mono text-sm">${esc(o.name.replace('.pgp', ''))}</span> <span class="sans text-xs text-[color:var(--cinza)] ml-2">${new Date(o.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · ${(o.metadata?.size / 1024).toFixed(0)} KB</span></span>
    <span class="sans text-xs space-x-3"><button class="btn-link" data-abrir="${esc(o.name)}">Abrir</button><button class="btn-link text-[color:var(--vinho)]" data-apagar="${esc(o.name)}">Apagar</button></span></li>`).join('')
    : '<li class="py-4 italic text-[color:var(--cinza)]">Nenhuma denúncia recebida.</li>';
  $$('[data-abrir]').forEach(b => b.addEventListener('click', () => abrirDenuncia(b.dataset.abrir)));
  $$('[data-apagar]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Apagar definitivamente esta denúncia?')) return;
    const { error } = await sb.storage.from('denuncias').remove([b.dataset.apagar]);
    error ? falha(error, 'Erro ao apagar') : listarDenuncias();
  }));
}
async function abrirDenuncia(nome) {
  try {
    const chave = await desbloquearChave();
    const { data: blob, error } = await sb.storage.from('denuncias').download(nome);
    if (error) throw error;
    const { data } = await openpgp.decrypt({ message: await openpgp.readMessage({ binaryMessage: new Uint8Array(await blob.arrayBuffer()) }), decryptionKeys: chave });
    const d = JSON.parse(data);
    const box = $('#denuncia-aberta');
    box.innerHTML = `<p class="kicker">Denúncia ${esc(d.codigo)}</p><div class="mt-3 whitespace-pre-wrap leading-relaxed">${esc(d.relato)}</div>
      ${d.anexos.length ? `<h3 class="sans text-xs font-bold uppercase tracking-[.2em] mt-6">Anexos</h3><ul class="mt-2 space-y-1 sans text-sm" id="anexos"></ul>` : ''}`;
    for (const a of d.anexos) {
      const bin = atob(a.base64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const li = document.createElement('li');
      li.innerHTML = `<a class="btn-link" download="${esc(a.nome)}" href="${URL.createObjectURL(new Blob([u8], { type: a.tipo || 'application/octet-stream' }))}">${esc(a.nome)}</a>`;
      box.querySelector('#anexos').append(li);
    }
    box.classList.remove('hidden'); box.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    if (/passphrase|decrypt/i.test(e.message)) chavePrivada = null;
    falha(e, 'Não foi possível abrir');
  }
}

// ───────── configuração ─────────
async function carregarConfig() {
  const temChave = !!(await config('pgp_publica'));
  $('#pgp-status').innerHTML = temChave ? '<b>✓ Canal ativo.</b> As denúncias são criptografadas com a chave da redação.' : '<b>Canal desativado:</b> gere a chave para começar a receber denúncias.';
  $('#pgp-gerar').classList.toggle('hidden', temChave);
  $('#pgp-backup').classList.toggle('hidden', !temChave);
  $('#hook-url').value = (await config('build_hook')) || '';
}
function baixar(nome, texto) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([texto], { type: 'text/plain' })), download: nome });
  a.click(); URL.revokeObjectURL(a.href);
}
$('#pgp-gerar-btn').addEventListener('click', async e => {
  const s1 = $('#pgp-senha1').value, s2 = $('#pgp-senha2').value;
  if (s1.length < 12) return toast('Use uma senha com pelo menos 12 caracteres.', true);
  if (s1 !== s2) return toast('As senhas não conferem.', true);
  e.target.disabled = true;
  try {
    const { publicKey, privateKey } = await openpgp.generateKey({ type: 'ecc', curve: 'curve25519', userIDs: [{ name: 'Redação Mosca', email: 'redacao@mosca.news' }], passphrase: s1, format: 'armored' });
    const { error } = await sb.from('config').upsert([
      { chave: 'pgp_publica', valor: publicKey, publico: true },
      { chave: 'pgp_privada', valor: privateKey, publico: false },
    ]);
    if (error) throw error;
    baixar('mosca-chave-privada.asc', privateKey);
    $('#pgp-senha1').value = $('#pgp-senha2').value = '';
    toast('Canal ativado. Guarde o arquivo baixado e a senha em local seguro.');
    carregarConfig();
  } catch (err) { falha(err, 'Erro ao gerar chave'); }
  e.target.disabled = false;
});
$('#pgp-backup').addEventListener('click', async () => baixar('mosca-chave-privada.asc', await config('pgp_privada')));
$('#hook-salvar').addEventListener('click', async () => {
  const v = $('#hook-url').value.trim();
  if (v && !/^https:\/\/api\.netlify\.com\/build_hooks\/\w+$/.test(v)) return toast('URL inválida. Deve começar com https://api.netlify.com/build_hooks/', true);
  const { error } = v ? await sb.from('config').upsert({ chave: 'build_hook', valor: v, publico: false }) : await sb.from('config').delete().eq('chave', 'build_hook');
  error ? falha(error, 'Erro ao salvar') : toast('Build hook salvo.');
});
$('#hook-agora').addEventListener('click', atualizarSite);

sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') mostrarLogin(); });
iniciar();
