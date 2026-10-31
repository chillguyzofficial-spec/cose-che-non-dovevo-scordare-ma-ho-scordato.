// dai ritagli (node _build/ritaglia-sticker.js) ai file usati nell'agenda: WebP trasparenti, al massimo 400 px
// scelti senza doppioni (una sola macchina fotografica, una sola pila di libri...), senza la statua (è il David di
// Michelangelo: immagine tutelata, niente uso commerciale) e senza scritte in inglese
// uso: node _build/sticker-scelti.js
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(__dirname, '../../hedonè progetto serio/node_modules/playwright'));
const RIT = path.join(__dirname, '../design-source/sticker-2026-10-31/ritagli'), DEST = path.join(__dirname, '../assets/img/sticker');

const SCELTI = {
  // 31/10 sera: autunno ed estate dalle tavole trasparenti nuove (arancio, giallo), i vecchi ritagli tagliati male via;
  // primavera e inverno dalle tavole di prima (e qualcosa dalla blu); niente statua, niente bocche coi canini, niente doppioni di soggetto
  primavera: { ramo: 'primavera-02', pettirosso: 'primavera-06', margherita: 'primavera-07', farfalla: 'primavera-09', bicicletta: 'primavera-04', picnic: 'primavera-10', serra: 'primavera-12', polaroid2: 'primavera-11' },
  estate: { sole: 'giallo-01', ibisco: 'giallo-02', stella: 'giallo-05', palma: 'giallo-03', anguria: 'giallo-14', barca: 'giallo-09', gelato: 'giallo-15', onda: 'giallo-04', ananas: 'giallo-19', tramonto: 'giallo-10', conchiglia: 'giallo-08', cocktail: 'giallo-11', limoni: 'giallo-21', ombrellone: 'giallo-12', sdraio: 'giallo-16', macchina: 'giallo-13', cocco: 'giallo-20', salvagente: 'giallo-18', conchiglia2: 'giallo-06', infradito: 'giallo-22' },
  autunno: { acero: 'arancio-01', zucca: 'arancio-04', ginkgo: 'arancio-03', funghi: 'arancio-06', tazza: 'arancio-07', quercia: 'arancio-02', castagna: 'arancio-09', candela: 'arancio-11', pigna: 'arancio-08', lanterna: 'arancio-12', foglie: 'arancio-10', libri: 'arancio-13', torta: 'arancio-14', arancia: 'arancio-15', cannella: 'arancio-17', bacche: 'arancio-19', foglia: 'arancio-20' },
  inverno: { neve: 'inverno-10', lupo: 'inverno-05', cioccolata: 'inverno-06', luna: 'blu-02', baita: 'inverno-07', maschera: 'inverno-04', rosa: 'blu-11', civetta: 'inverno-11', libri: 'inverno-09', rametto: 'blu-13' },
  copertina: { cuore: 'bianconero-01', palla: 'bianconero-05', cassetta: 'bianconero-08', gatto: 'bianconero-10', dadi: 'bianconero-11', spirale: 'bianconero-12', rosa: 'bianconero-14', pellicola: 'bianconero-16', saturno: 'bianconero-17', stella: 'bianconero-19',
    libro: 'vintage-03', 'macchina-scrivere': 'vintage-04', ceralacca: 'vintage-06', chiave: 'vintage-07', falena: 'vintage-09', mongolfiera: 'vintage-10', lettere: 'vintage-12', luna: 'vintage-14', serratura: 'vintage-16', lampione: 'vintage-18', fiocco: 'vintage-20' }
};

(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.setContent('<body></body>');
  const elenco = {};
  for (const [gruppo, voci] of Object.entries(SCELTI)) {
    fs.mkdirSync(path.join(DEST, gruppo), { recursive: true });
    elenco[gruppo] = {};
    for (const [nome, sorg] of Object.entries(voci)) {
      const src = 'data:image/png;base64,' + fs.readFileSync(path.join(RIT, sorg + '.png')).toString('base64');
      const r = await p.evaluate(async ({ src, max }) => {
        const im = new Image(); im.src = src; await im.decode();
        const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
        // via i pezzetti staccati dallo sticker (frammenti di fondo, righe vaganti): restano solo le parti grandi
        const id = x.getImageData(0, 0, w, h), d = id.data, et = new Int32Array(w * h).fill(-1), aree = [], coda = new Int32Array(w * h);
        for (let i = 0; i < w * h; i++) { if (d[i * 4 + 3] < 40 || et[i] >= 0) continue; let t = 0, hh = 0, n = 0; coda[t++] = i; et[i] = aree.length;
          while (hh < t) { const k = coda[hh++], px = k % w; n++; for (const q of [px > 0 ? k - 1 : -1, px < w - 1 ? k + 1 : -1, k - w, k + w]) if (q >= 0 && q < w * h && et[q] < 0 && d[q * 4 + 3] >= 40) { et[q] = aree.length; coda[t++] = q; } }
          aree.push(n); }
        const grande = Math.max(0, ...aree);
        for (let i = 0; i < w * h; i++) if (et[i] >= 0 ? aree[et[i]] < grande * 0.06 : d[i * 4 + 3] < 40) d[i * 4 + 3] = 0;
        x.putImageData(id, 0, 0);
        // stretto sul contenuto: niente margini vuoti dove c'erano i pezzetti tolti
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] >= 40) { const px = i % w, py = (i / w) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
        const o = document.createElement('canvas'); o.width = x1 - x0 + 3; o.height = y1 - y0 + 3; o.getContext('2d').drawImage(c, x0 - 1, y0 - 1, o.width, o.height, 0, 0, o.width, o.height);
        return { w: o.width, h: o.height, url: o.toDataURL('image/webp', 0.86) };
      }, { src, max: nome === 'ramo' || nome === 'polaroid' ? 480 : 400 });
      fs.writeFileSync(path.join(DEST, gruppo, nome + '.webp'), Buffer.from(r.url.split(',')[1], 'base64'));
      elenco[gruppo][nome] = [r.w, r.h];
    }
  }
  await b.close();
  // le misure servono alla pagina (proporzioni giuste prima che l'immagine arrivi)
  fs.writeFileSync(path.join(__dirname, '../assets/js/sticker.js'), '// generato da _build/sticker-scelti.js: sticker per stagione e per la copertina, con le misure [larghezza, altezza]\nself.STICKER = ' + JSON.stringify(elenco) + ';\n');
  console.log(Object.entries(elenco).map(([g, v]) => g + ': ' + Object.keys(v).length).join(' · '));
})();
