// caccia ai bug a tutte le larghezze: scorrimento laterale, libro e barra nello schermo, testa che non sborda,
// pagina del giorno / Personalizza / Mese nello schermo, sticker che non coprono scrittura, buste o pulsanti, errori JS
// uso: node _build/test/caccia.js  (accende da sola il server sulla porta 8995)
const path = require('path');
const { chromium, devices } = require(path.join(__dirname, '../../../hedonè progetto serio/node_modules/playwright'));
const { spawn } = require('child_process');
const URL = 'http://localhost:8995/';
const SCHERMI = [[320, 568, 1], [360, 740, 1], [375, 667, 1], [390, 844, 1], [414, 896, 1], [480, 800, 1], [600, 960, 1], [768, 1024, 1], [960, 700, 0], [1024, 768, 0], [1280, 720, 0], [1440, 900, 0], [1920, 1080, 0], [2298, 1138, 0], [2560, 1080, 0]];
const NOTE = { '2026-11-02': { text: '[x] Chiamare il dentista\n[ ] Ritirare le foto dal fotografo in centro' }, '2026-11-03': { text: 'Palestra alle 19\nPoi aperitivo con Luca e Sara al bar della piazza' },
  '2026-11-04': { text: '[x] Pagare le bollette\nCompleanno di Sara: torta!\nRegalo: il libro che voleva' }, '2026-11-05': { text: '[ ] Dentista alle 10\n[x] Spesa\nCena con Marta alle 20' },
  '2026-11-06': { text: 'Cinema: il film nuovo, quello che dicono tutti\nPrendere i biglietti online' }, '2026-11-07': { text: 'Mercatino in piazza' }, '2026-11-08': { text: 'Pranzo dalla nonna' } };
let ko = 0, ok = 0; const prova = (c, n, x) => { if (c) ok++; else { ko++; console.log('  ✗', n, x !== undefined ? JSON.stringify(x) : ''); } };
const tocca = (a, b) => a && b && a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2;

(async () => {
  const srv = spawn('node', ['_build/server.js'], { cwd: path.join(__dirname, '../..'), stdio: 'ignore', env: { ...process.env, PORTA: '8995' } });
  await new Promise(r => setTimeout(r, 900));
  const b = await chromium.launch();
  for (const [W, H, tel] of SCHERMI) {
    const n = W + 'x' + H;
    const c = await b.newContext({ viewport: { width: W, height: H }, isMobile: !!tel, hasTouch: !!tel, deviceScaleFactor: 1 }), p = await c.newPage(), err = [];
    p.on('pageerror', e => err.push(e.message)); p.on('console', m => m.type() === 'error' && err.push(m.text()));
    p.on('response', r => r.status() >= 400 && err.push(r.status() + ' ' + r.url()));
    await p.addInitScript(n => { localStorage.setItem('ccnds-set', JSON.stringify({ visto: true, sound: false })); localStorage.setItem('ccnds-notes', JSON.stringify(n)); }, NOTE);
    await p.clock.setFixedTime(new Date('2026-11-05T10:00:00'));
    await p.goto(URL); await p.waitForTimeout(800);
    await p.click('.elastico', { force: true }); await p.waitForTimeout(3600);
    // settimana
    const m = await p.evaluate(() => {
      const r = e => e && e.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      const libro = r(document.getElementById('libro')), piede = r(document.getElementById('piede'));
      const pt = [...document.querySelectorAll('#pagine .pt')].map(e => e.scrollWidth <= e.clientWidth + 1);
      const tit = [...document.querySelectorAll('#pagine .pt-tit b')].map(e => e.scrollWidth <= e.clientWidth + 1);
      // gli sticker non coprono scrittura, buste, biglietti, disegni delle feste, numeri dei giorni
      const st = [...document.querySelectorAll('#pagine .g-sticker, #pagine .sett-ramo')].map(r);
      const cose = [...document.querySelectorAll('#pagine .g-riga .t, #pagine .busta, #pagine .biglietto, #pagine .foglia, #pagine .g-illu, #pagine .g-num, #pagine .sett-titolo, #pagine .sett-sotto, #pagine .g-festa')].map(e => ({ c: e.className, r: r(e) }));
      const coperte = []; st.forEach(s => cose.forEach(x => { const q = x.r; if (s.left < q.right - 2 && q.left < s.right - 2 && s.top < q.bottom - 2 && q.top < s.bottom - 2) coperte.push(x.c); }));
      return { largo: document.documentElement.scrollWidth > W, libroDentro: libro.left >= -1 && libro.right <= W + 1 && libro.top >= -1 && piede.bottom <= H + 1, pt, tit, coperte };
    });
    prova(!m.largo, n + ' niente scorrimento laterale');
    prova(m.libroDentro, n + ' libro e barra nello schermo');
    prova(m.pt.every(Boolean), n + ' testa della pagina senza sbordare', m.pt);
    prova(m.tit.every(Boolean), n + ' titolo della testa intero', m.tit);
    prova(!m.coperte.length, n + ' sticker che non coprono niente', m.coperte);
    // pagina del giorno, anche col modulo «Ricorda questo giorno» aperto
    await p.click('.giorno[data-k="2026-11-05"]', { force: true }); await p.waitForTimeout(600);
    await p.click('[data-gp="apri-ric"]'); await p.waitForTimeout(300);
    const g = await p.evaluate(() => {
      const r = e => e && e.getBoundingClientRect(), c = r(document.getElementById('gp-carta')), s = r(document.querySelector('.gp-stk'));
      const vis = s && s.width && getComputedStyle(document.getElementById('gp-sticker')).display !== 'none';
      const cose = [...document.querySelectorAll('#gp-sx button, #gp-sx input, #gp-sx .ricordo, #gp-sx .gp-biglietto')].map(r).filter(q => q.width);
      return { dentro: c.left >= -1 && c.right <= innerWidth + 1 && c.bottom <= innerHeight + 1, copre: vis ? cose.filter(q => q.left < s.right - 2 && s.left < q.right - 2 && q.top < s.bottom - 2 && s.top < q.bottom - 2).length : 0, largo: document.documentElement.scrollWidth > innerWidth };
    });
    prova(g.dentro && !g.largo, n + ' pagina del giorno nello schermo');
    prova(!g.copre, n + ' lo sticker del giorno non copre il modulo', g.copre);
    await p.click('[data-gp="fatto"]'); await p.waitForTimeout(600);
    // Personalizza: tre schede nello schermo
    for (const t of ['carta', 'sfondo', 'copertina']) {
      if (!(await p.locator('#atelier').isVisible())) { await p.click('#pagine .pt [data-act="altro"]'); await p.waitForTimeout(300); }
      await p.click(`[data-act="at-scheda"][data-t="${t}"]`); await p.waitForTimeout(t === 'carta' ? 400 : 2900);
      const a = await p.evaluate(() => { const e = document.getElementById('atelier'), r = e.getBoundingClientRect(), te = e.querySelector('.at-testa'); return { dentro: r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, testa: !te || te.scrollWidth <= te.clientWidth + 1, largo: document.documentElement.scrollWidth > innerWidth }; });
      prova(a.dentro && !a.largo, n + ' Personalizza › ' + t + ' nello schermo', a);
      prova(a.testa, n + ' Personalizza › ' + t + ': schede intere');
    }
    await p.click('[data-act="at-fine"]'); await p.waitForTimeout(300);
    // Mese (si apre ad agenda aperta)
    await p.click('.elastico', { force: true }); await p.waitForTimeout(3600);
    await p.click('#piede [data-v="mese"]'); await p.waitForTimeout(400);
    const me = await p.evaluate(() => { const r = document.querySelector('#v-mese .foglio-basso').getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth; });
    prova(me, n + ' Mese nello schermo');
    prova(!err.length, n + ' nessun errore', err.slice(0, 3));
    await c.close();
  }
  await b.close(); srv.kill();
  console.log(`\ncaccia: ${ok} ok, ${ko} fallite`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
