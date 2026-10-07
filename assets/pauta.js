import { SUPABASE_URL, SUPABASE_KEY } from '/assets/config.js';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const form = document.getElementById('form-pauta');
const status = document.getElementById('status');
const say = (m, erro) => { status.textContent = m; status.style.color = erro ? 'var(--vinho)' : ''; };
const contar = () => (document.getElementById('cont-texto').textContent = `${form.texto.value.length.toLocaleString('pt-BR')} / 8.000 caracteres`);
form.texto.addEventListener('input', contar); contar();

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (form.site.value) return say('Recebido. Obrigado!');           // robô preencheu o campo oculto
  const erro = form.titulo.value.trim().length < 5 ? 'Diga em poucas palavras qual é o assunto.'
    : form.texto.value.trim().length < 30 ? 'Conte um pouco mais sobre o caso (pelo menos algumas frases).'
    : !form.aceite.checked ? 'Marque a caixa de concordância para enviar.' : '';
  if (erro) return say(erro, true);
  const btn = form.querySelector('button'); btn.disabled = true;
  const extras = [
    form.local.value.trim() && `Local: ${form.local.value.trim()}`,
    form.links.value.trim() && `Links e fontes:\n${form.links.value.trim()}`,
  ].filter(Boolean).join('\n\n');
  try {
    const { error } = await sb.from('colaboracoes').insert({
      tipo: 'pauta', titulo: form.titulo.value.trim(),
      texto: (form.texto.value.trim() + (extras ? `\n\n— — —\n${extras}` : '')).replace(/\r/g, ''),
      assinatura: form.assinatura.value.trim() || 'Leitor(a)', contato: form.contato.value.trim() || null,
      imagens: [], aceite: true,
    });
    if (error) throw error;
    form.reset(); contar();
    say('Sugestão recebida! A redação vai avaliar. Obrigado por ajudar a fiscalizar o poder.');
  } catch (err) {
    console.error(err);
    say('Não foi possível enviar agora. Tente novamente em alguns minutos.', true);
  } finally { btn.disabled = false; }
});
