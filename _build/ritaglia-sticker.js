// ritaglia gli sticker dalle tavole di ChatGPT (fondo di carta beige, sticker col bordo bianco)
// uso: node _build/ritaglia-sticker.js   → design-source/sticker-2026-10-31/ritagli/<tavola>-NN.png (trasparenti) + elenco in console
// il fondo si toglie partendo dai bordi (così il beige dentro uno sticker resta), poi ogni pezzo staccato è uno sticker
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(__dirname, '../../hedonè progetto serio/node_modules/playwright'));
const SORG = path.join(__dirname, '../design-source/sticker-2026-10-31'), DEST = path.join(__dirname, '../design-source/sticker-2026-10-31/ritagli');

(async () => {
  fs.mkdirSync(DEST, { recursive: true });
  const b = await chromium.launch(), p = await b.newPage();
  await p.setContent('<body></body>');
  for (const f of fs.readdirSync(SORG).filter(f => /^tavola-.*\.png$/.test(f))) {
    const nome = f.replace(/^tavola-|\.png$/g, '');
    const src = 'data:image/png;base64,' + fs.readFileSync(path.join(SORG, f)).toString('base64');
    const pezzi = await p.evaluate(async src => {
      const im = new Image(); im.src = src; await im.decode();
      const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, W, H).data;
      // colore del fondo: mediana dei pixel del bordo
      const bordo = [];
      for (let i = 0; i < W; i += 3) bordo.push(i, (H - 1) * W + i);
      for (let j = 0; j < H; j += 3) bordo.push(j * W, j * W + W - 1);
      const med = k => { const v = bordo.map(i => d[i * 4 + k]).sort((a, b) => a - b); return v[v.length >> 1]; };
      const bg = [med(0), med(1), med(2)];
      // fondo = simile al beige (non bianco: il bordo degli sticker è più chiaro), raggiunto dai bordi
      // tavole già trasparenti (angoli vuoti): il fondo è dove non c'è colore, e si tiene la loro trasparenza
      const trasp = d[3] < 20 && d[(W * H - 1) * 4 + 3] < 20;
      const simile = trasp ? i => d[i * 4 + 3] < 128 : i => { const r = d[i * 4], g = d[i * 4 + 1], bl = d[i * 4 + 2]; const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(bl - bg[2]); const luce = r + g + bl, luceBg = bg[0] + bg[1] + bg[2]; return dist < 46 && luce < luceBg + 30; };
      const fondo = new Uint8Array(W * H), coda = new Int32Array(W * H); let t = 0, h = 0;
      if (trasp) for (let i = 0; i < W * H; i++) if (simile(i)) fondo[i] = 1;
      for (const i of bordo) if (!fondo[i] && simile(i)) { fondo[i] = 1; coda[t++] = i; }
      while (h < t) { const i = coda[h++], px = i % W, py = (i / W) | 0;
        for (const n of [px > 0 ? i - 1 : -1, px < W - 1 ? i + 1 : -1, py > 0 ? i - W : -1, py < H - 1 ? i + W : -1]) if (n >= 0 && !fondo[n] && simile(n)) { fondo[n] = 1; coda[t++] = n; } }
      // sticker che si toccano: si assottigliano le forme (distanza dal fondo) così i punti di contatto sottili si staccano,
      // si contano i nuclei rimasti e poi ogni pixel torna al nucleo più vicino
      const dist = new Uint16Array(W * H);
      for (let i = 0; i < W * H; i++) dist[i] = fondo[i] ? 0 : 60000;
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const i = y * W + xx; if (!dist[i]) continue;
        let m = dist[i]; if (xx > 0) m = Math.min(m, dist[i - 1] + 3); if (y > 0) { m = Math.min(m, dist[i - W] + 3); if (xx > 0) m = Math.min(m, dist[i - W - 1] + 4); if (xx < W - 1) m = Math.min(m, dist[i - W + 1] + 4); } dist[i] = m; }
      for (let y = H - 1; y >= 0; y--) for (let xx = W - 1; xx >= 0; xx--) { const i = y * W + xx; if (!dist[i]) continue;
        let m = dist[i]; if (xx < W - 1) m = Math.min(m, dist[i + 1] + 3); if (y < H - 1) { m = Math.min(m, dist[i + W] + 3); if (xx < W - 1) m = Math.min(m, dist[i + W + 1] + 4); if (xx > 0) m = Math.min(m, dist[i + W - 1] + 4); } dist[i] = m; }
      const R = 3 * (trasp ? 26 : 14), nucleo = new Int32Array(W * H).fill(-1); let nn = 0; const area = [];
      for (let i = 0; i < W * H; i++) {
        if (dist[i] <= R || nucleo[i] >= 0) continue;
        t = 0; h = 0; coda[t++] = i; nucleo[i] = nn; let n = 0;
        while (h < t) { const k = coda[h++], px = k % W, py = (k / W) | 0; n++;
          for (const q of [px > 0 ? k - 1 : -1, px < W - 1 ? k + 1 : -1, py > 0 ? k - W : -1, py < H - 1 ? k + W : -1]) if (q >= 0 && dist[q] > R && nucleo[q] < 0) { nucleo[q] = nn; coda[t++] = q; } }
        area.push(n); nn++;
      }
      // i nuclei minuscoli non contano; dagli altri ci si allarga su tutto lo sticker
      t = 0; h = 0;
      for (let i = 0; i < W * H; i++) { if (nucleo[i] >= 0 && area[nucleo[i]] < 2500) nucleo[i] = -1; else if (nucleo[i] >= 0) coda[t++] = i; }
      while (h < t) { const k = coda[h++], px = k % W, py = (k / W) | 0;
        for (const q of [px > 0 ? k - 1 : -1, px < W - 1 ? k + 1 : -1, py > 0 ? k - W : -1, py < H - 1 ? k + W : -1]) if (q >= 0 && !fondo[q] && nucleo[q] < 0) { nucleo[q] = nucleo[k]; coda[t++] = q; } }
      // pezzi: stesso nucleo e contigui (8 vicini); i pixel senza nucleo (stelline, scarabocchi) fanno pezzi a sé
      const et = new Int32Array(W * H).fill(-1), box = [];
      const stesso = (a, q) => nucleo[a] === nucleo[q];
      for (let i = 0; i < W * H; i++) {
        if (fondo[i] || et[i] >= 0) continue;
        const id = box.length; let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; t = 0; h = 0; coda[t++] = i; et[i] = id;
        while (h < t) { const k = coda[h++], px = k % W, py = (k / W) | 0; n++;
          if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; const q = qy * W + qx; if (!fondo[q] && et[q] < 0 && stesso(k, q)) { et[q] = id; coda[t++] = q; } } }
        box.push({ ids: [id], n, x0, y0, x1, y1 });
      }
      let grandi = box.filter(b => b.n > 900);
      // gli sticker veri sono grandi; i pezzetti piccoli vicini si attaccano al più vicino, gli altri si scartano
      const veri = grandi.filter(b => b.n > 9000), piccoli = grandi.filter(b => b.n <= 9000);
      for (const s of piccoli) {
        let meglio = null, dm = 40;
        for (const v of veri) { const dx = Math.max(v.x0 - s.x1, s.x0 - v.x1, 0), dy = Math.max(v.y0 - s.y1, s.y0 - v.y1, 0), dd = Math.hypot(dx, dy); if (dd < dm) { dm = dd; meglio = v; } }
        if (meglio) { meglio.ids.push(...s.ids); meglio.n += s.n; meglio.x0 = Math.min(meglio.x0, s.x0); meglio.y0 = Math.min(meglio.y0, s.y0); meglio.x1 = Math.max(meglio.x1, s.x1); meglio.y1 = Math.max(meglio.y1, s.y1); }
      }
      veri.sort((a, b) => (Math.round(a.y0 / 200) - Math.round(b.y0 / 200)) || a.x0 - b.x0);
      return veri.map(v => {
        const pad = 3, X = Math.max(0, v.x0 - pad), Y = Math.max(0, v.y0 - pad), w = Math.min(W - 1, v.x1 + pad) - X + 1, hh = Math.min(H - 1, v.y1 + pad) - Y + 1;
        const o = document.createElement('canvas'); o.width = w; o.height = hh; const ox = o.getContext('2d'), od = ox.createImageData(w, hh), tieni = new Set(v.ids);
        for (let yy = 0; yy < hh; yy++) for (let xx = 0; xx < w; xx++) {
          const i = (Y + yy) * W + X + xx, j = (yy * w + xx) * 4;
          od.data[j] = d[i * 4]; od.data[j + 1] = d[i * 4 + 1]; od.data[j + 2] = d[i * 4 + 2];
          // dentro lo sticker opaco; sul bordo, se tocca il fondo, un filo di sfumatura per non avere scalini
          let a = tieni.has(et[i]) ? 255 : 0;
          if (a && trasp) a = d[i * 4 + 3];
          // tavole su fondo beige: via un pixel tutto intorno e contorno sfumato (niente avanzi di fondo frastagliati)
          else if (a) a = dist[i] <= 3 ? 0 : dist[i] <= 6 ? 110 : dist[i] <= 9 ? 210 : 255;
          od.data[j + 3] = a;
        }
        ox.putImageData(od, 0, 0);
        return { x: v.x0, y: v.y0, w, h: hh, url: o.toDataURL('image/png') };
      });
    }, src);
    pezzi.forEach((s, k) => fs.writeFileSync(path.join(DEST, `${nome}-${String(k + 1).padStart(2, '0')}.png`), Buffer.from(s.url.split(',')[1], 'base64')));
    console.log(nome + ':', pezzi.length, 'sticker', pezzi.map((s, k) => `${k + 1}(${s.w}x${s.h})`).join(' '));
  }
  await b.close();
})();
