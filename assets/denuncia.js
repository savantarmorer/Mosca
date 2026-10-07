import * as openpgp from '/assets/vendor/openpgp.min.mjs';
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, PGP_PUBLIC_KEY } from '/assets/denuncia-config.js';

const MAX = 40 * 1024 * 1024;
const form = document.getElementById('form-denuncia');
const status = document.getElementById('status');
const say = (msg, erro) => { status.textContent = msg; status.style.color = erro ? 'var(--vinho)' : ''; };

if (!SUPABASE_ANON_KEY || !PGP_PUBLIC_KEY) {
  form.querySelector('button').disabled = true;
  say('Canal em configuração. Volte em breve.', true);
}

const codigo = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('').match(/.{8}/g).join('-');

// Recodifica imagens via canvas para descartar EXIF (GPS, aparelho, autor).
async function limpar(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return new Uint8Array(await file.arrayBuffer());
  const bmp = await createImageBitmap(file);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  c.getContext('2d').drawImage(bmp, 0, 0);
  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  return new Uint8Array(await blob.arrayBuffer());
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button');
  const files = [...form.arquivos.files];
  if (files.reduce((s, f) => s + f.size, 0) > MAX) return say('Arquivos acima de 40 MB. Divida em mais de um envio.', true);
  btn.disabled = true;
  try {
    say('Criptografando no seu aparelho…');
    const anexos = [];
    for (const f of files) {
      const bytes = await limpar(f);
      let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      anexos.push({ nome: f.name.replace(/[^\w.\- ]/g, '_'), tipo: f.type, base64: btoa(bin) });
    }
    const id = codigo();
    const payload = JSON.stringify({ codigo: id, relato: form.relato.value, anexos });
    const encryptionKeys = await openpgp.readKey({ armoredKey: PGP_PUBLIC_KEY });
    const cifrado = await openpgp.encrypt({ message: await openpgp.createMessage({ text: payload }), encryptionKeys, format: 'binary' });

    say('Enviando…');
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${id}.pgp`, {
      method: 'POST', referrerPolicy: 'no-referrer', credentials: 'omit',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' },
      body: cifrado,
    });
    if (!r.ok) throw new Error(r.status);
    form.reset();
    say(`Recebido. Seu código: ${id}. Guarde-o se quiser se referir a este envio no futuro.`);
  } catch (err) {
    say('Falha no envio. Tente novamente em alguns minutos.', true);
  } finally { btn.disabled = false; }
});
