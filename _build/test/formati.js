// Controllo grafico su più schermi: niente sforamenti, pagine fisse, pagina del giorno su PC
// uso: node _build/test/formati.js [cartella-foto]
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const path = require('path'), fs = require('fs');
process.env.PORTA = '8998'; require('../server.js');
const FOTO = process.argv[2]; if (FOTO) fs.mkdirSync(FOTO, { recursive: true });
const SCHERMI = [['iphone-se', pw.devices['iPhone SE']], ['iphone-13', pw.devices['iPhone 13']], ['android', pw.devices['Pixel 7']], ['ipad', pw.devices['iPad (gen 7)']], ['pc', { viewport: { width: 1440, height: 900 } }]];
let ok = 0, ko = 0;
const prova = (nome, cond) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nome); } };
(async () => {
  const b = await pw.chromium.launch();
  for (const [nome, disp] of SCHERMI) {
    const ctx = await b.newContext(disp), p = await ctx.newPage(); p.setDefaultTimeout(5000);
    const errori = []; p.on('pageerror', e => errori.push(e.message));
    await p.goto('http://localhost:8998/'); await p.waitForTimeout(600);
    await p.click('.elastico', { force: true }); await p.waitForTimeout(3600);
    const fuori = await p.evaluate(() => {
      const W = innerWidth, H = innerHeight, r = document.getElementById('libro').getBoundingClientRect();
      return { largo: document.documentElement.scrollWidth > W, libro: r.left < 0 || r.right > W || r.top < 0 || r.bottom > H };
    });
    prova(nome + ': niente scorrimento laterale', !fuori.largo);
    prova(nome + ': il libro sta nello schermo', !fuori.libro);
    if (FOTO) await p.screenshot({ path: path.join(FOTO, nome + '-settimana.png') });
    await p.click('.giorno[data-k="2026-11-02"]').catch(() => p.click('[data-act="succ"]'));
    await p.waitForTimeout(150);
    if (await p.isHidden('#gp')) { await p.click('[data-act="succ"]'); await p.waitForTimeout(1000); await p.click('.giorno[data-k="2026-11-02"]'); }
    await p.waitForTimeout(450);
    const gp = await p.evaluate(() => { const r = document.getElementById('gp-carta').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight + 1; });
    prova(nome + ': pagina del giorno nello schermo', gp);
    if (FOTO) await p.screenshot({ path: path.join(FOTO, nome + '-giorno.png') });
    await p.click('[data-gp="fatto"]'); await p.waitForTimeout(600);
    await p.click('[data-act="menu"]'); await p.click('[data-act="in-fondo"]'); await p.waitForTimeout(1600);
    prova(nome + ': ultima pagina', (await p.textContent('#pagine')).includes('Cose che ho scordato'));
    if (FOTO && nome === 'iphone-13') await p.screenshot({ path: path.join(FOTO, nome + '-fondo.png') });
    prova(nome + ': nessun errore', !errori.length); if (errori.length) console.log(errori);
    await ctx.close();
  }
  console.log(`\nformati: ${ok} ok, ${ko} fallite`);
  await b.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
