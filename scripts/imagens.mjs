// Gera versões otimizadas da capa de cada matéria (AVIF/WebP em vários tamanhos)
// e a imagem de compartilhamento 1200×630 em JPG.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const LARGURAS = [480, 800, 1200];

async function origem(ROOT, url) {
  if (url.startsWith('/')) return fs.readFileSync(path.join(ROOT, url));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export async function processarCapa(ROOT, p) {
  if (!p.capa_url) return null;
  const dir = path.join(ROOT, 'assets/gen');
  fs.mkdirSync(dir, { recursive: true });
  try {
    const buf = await origem(ROOT, p.capa_url);
    const meta = await sharp(buf).metadata();
    const larguras = LARGURAS.filter(w => w < meta.width).concat(Math.min(meta.width, 1600)).filter((w, i, a) => a.indexOf(w) === i);
    const fontes = { avif: [], webp: [] };
    for (const w of larguras) {
      for (const fmt of ['avif', 'webp']) {
        const nome = `${p.slug}-${w}.${fmt}`;
        const arq = path.join(dir, nome);
        if (!fs.existsSync(arq)) await sharp(buf).resize({ width: w }).toFormat(fmt, { quality: fmt === 'avif' ? 55 : 78 }).toFile(arq);
        fontes[fmt].push(`/assets/gen/${nome} ${w}w`);
      }
    }
    const og = `/assets/gen/${p.slug}-og.jpg`;
    if (!fs.existsSync(path.join(ROOT, og))) {
      await sharp(buf).resize(1200, 630, { fit: 'cover', position: 'attention' }).grayscale().linear(1.12, -12).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(ROOT, og));
    }
    const maior = larguras.at(-1);
    return {
      avif: fontes.avif.join(', '), webp: fontes.webp.join(', '),
      src: `/assets/gen/${p.slug}-${maior}.webp`,
      largura: maior, altura: Math.round(meta.height * maior / meta.width),
      og,
    };
  } catch (e) {
    console.warn(`Capa de "${p.slug}" não processada (${e.message}); usando a original.`);
    return null;
  }
}
