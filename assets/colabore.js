import { SUPABASE_URL, SUPABASE_KEY } from '/assets/config.js';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const form = document.getElementById('form-colab');
const status = document.getElementById('status');
const say = (m, erro) => { status.textContent = m; status.style.color = erro ? 'var(--vinho)' : ''; };
const LIMITE = { opiniao: 6000, poesia: 8000, cronica: 20000, arte: 3000, fotografia: 3000 };

function ajustar() {
  const t = form.tipo.value, visual = t === 'arte' || t === 'fotografia';
  document.getElementById('rotulo-texto').textContent = visual ? 'Descrição / texto que acompanha (opcional)' : t === 'poesia' ? 'Poema (as quebras de verso serão mantidas)' : 'Texto';
  document.getElementById('obrig-img').textContent = visual ? '— obrigatório, até 8' : '— opcional, até 8';
  form.texto.style.fontFamily = t === 'poesia' ? "'Lora', Georgia, serif" : '';
  contar();
}
function contar() { document.getElementById('cont-texto').textContent = `${form.texto.value.length.toLocaleString('pt-BR')} / ${LIMITE[form.tipo.value].toLocaleString('pt-BR')} caracteres`; }
form.addEventListener('change', e => e.target.name === 'tipo' && ajustar());
form.texto.addEventListener('input', contar);
ajustar();

// Reduz para no máx. 2400 px e recodifica em JPG: apaga metadados (GPS, aparelho) e economiza espaço.
async function preparar(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (form.site.value) return say('Recebido. Obrigado!');            // robô preencheu o campo oculto
  const t = form.tipo.value, visual = t === 'arte' || t === 'fotografia';
  const arquivos = [...form.imagens.files];
  const erro = !form.titulo.value.trim() ? 'Informe o título.'
    : !visual && form.texto.value.trim().length < 40 ? 'O texto está muito curto.'
    : form.texto.value.length > LIMITE[t] ? `O texto passa do limite de ${LIMITE[t].toLocaleString('pt-BR')} caracteres.`
    : visual && !arquivos.length ? 'Envie pelo menos uma imagem.'
    : arquivos.length > 8 ? 'Envie no máximo 8 imagens.'
    : arquivos.some(f => f.size > 10 * 1024 * 1024) ? 'Cada imagem pode ter até 10 MB.'
    : form.assinatura.value.trim().length < 2 ? 'Informe a assinatura.'
    : !form.aceite.checked ? 'É preciso aceitar os termos de colaboração.' : '';
  if (erro) return say(erro, true);
  const btn = form.querySelector('button'); btn.disabled = true;
  try {
    const id = crypto.randomUUID();
    const imagens = [];
    for (const [i, f] of arquivos.entries()) {
      say(`Enviando imagem ${i + 1} de ${arquivos.length}…`);
      const nome = `${id}/${i}.jpg`;
      const { error } = await sb.storage.from('colaboracoes').upload(nome, await preparar(f), { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      imagens.push(nome);
    }
    say('Enviando texto…');
    const { error } = await sb.from('colaboracoes').insert({
      id, tipo: t, titulo: form.titulo.value.trim(), texto: form.texto.value.replace(/\r/g, '').trim(),
      assinatura: form.assinatura.value.trim(), minibio: form.minibio.value.trim() || null,
      contato: form.contato.value.trim() || null, imagens, aceite: true,
    });
    if (error) throw error;
    form.reset(); ajustar();
    say('Recebido! A redação vai ler o seu trabalho. Se for aprovado, ele aparece no site e na edição do dia.');
  } catch (err) {
    console.error(err);
    say('Não foi possível enviar agora. Tente novamente em alguns minutos.', true);
  } finally { btn.disabled = false; }
});
