// Novità: scrivere a mano, polaroid, lettera al futuro, copertina personalizzata, copia delle note con tutto
// uso: node _build/test/novita.js [chromium|webkit] [cartella-foto]
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const path = require('path'), fs = require('fs');
process.env.PORTA = '8993'; require('../server.js');
const MOTORE = process.argv[2] || 'chromium', FOTO = process.argv[3]; if (FOTO) fs.mkdirSync(FOTO, { recursive: true });
const URL = 'http://localhost:8993/', IMG = path.join(__dirname, '../../assets/img/icon-512.png');
let ok = 0, ko = 0;
const prova = (nome, cond, info) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nome, info === undefined ? '' : info); } };
const fissa = giorno => `(() => { const D = Date; const fisso = new D('${giorno}T10:00:00').getTime(); globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fisso])); } static now() { return fisso; } }; })()`;

(async () => {
  const b = await pw[MOTORE].launch();
  const dev = { ...pw.devices['iPhone 13'], acceptDownloads: true };
  const ctx = await b.newContext(dev);
  await ctx.addInitScript(fissa('2026-10-29'));
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  const errori = []; p.on('pageerror', e => errori.push(e.message));
  const foto = async n => FOTO && p.screenshot({ path: path.join(FOTO, MOTORE + '-' + n + '.png') });
  const attendi = ms => p.waitForTimeout(ms);
  const ls = k => p.evaluate(k => JSON.parse(localStorage.getItem('ccnds-' + k) || 'null'), k);
  // un tratto col dito (o col mouse) dentro un elemento
  const traccia = async (sel, punti) => {
    const r = await p.locator(sel).boundingBox();
    await p.mouse.move(r.x + r.width * punti[0][0], r.y + r.height * punti[0][1]); await p.mouse.down();
    for (const [x, y] of punti.slice(1)) await p.mouse.move(r.x + r.width * x, r.y + r.height * y, { steps: 6 });
    await p.mouse.up();
  };

  await p.goto(URL); await attendi(700);
  // ---------- copertina: si decora ad agenda chiusa ----------
  prova('«Decora la copertina» ad agenda chiusa', await p.isVisible('.barra-giu .decora'));
  await p.click('.barra-giu .decora'); await attendi(200);
  prova('pannello della copertina', await p.isVisible('#atelier'));
  await p.click('[data-act="at-colore"][data-c="notte"]'); await attendi(100);
  prova('colore blu notte', (await p.evaluate(() => document.getElementById('libro').style.getPropertyValue('--cop'))) === '#1c2742');
  await p.click('[data-act="at-adesivo"][data-t="cuore"]'); await attendi(150);
  prova('adesivo attaccato', await p.locator('#cop-decoro .ades').count() === 1);
  prova('adesivo scelto con i comandi', await p.isVisible('[data-act="at-ruota"]'));
  const prima = (await ls('set')).cop.adesivi[0];
  const ad = await p.$eval('#cop-decoro .ades', e => e.getBoundingClientRect().toJSON());
  const cv = await p.$eval('.cop-fronte', e => { const r = e.getBoundingClientRect(); return r.height / r.width; });
  prova('copertina con le proporzioni del telefono mentre si decora', Math.abs(cv - 1.62) < 0.08, cv);
  await p.mouse.move(ad.x + ad.width / 2, ad.y + ad.height / 2); await p.mouse.down();
  await p.mouse.move(ad.x + ad.width / 2 - 60, ad.y + ad.height / 2 - 80, { steps: 8 }); await p.mouse.up(); await attendi(150);
  const dopo = (await ls('set')).cop.adesivi[0];
  prova('adesivo trascinato', dopo.x < prima.x - 20 && dopo.y < prima.y - 20, [prima, dopo]);
  prova('dopo il trascinamento resta scelto', await p.isVisible('[data-act="at-ruota"]'));
  prova('agenda ancora chiusa mentre si decora', await p.evaluate(() => document.getElementById('app').classList.contains('chiusa')));
  await p.click('[data-act="at-ruota"]'); await p.click('[data-act="at-piu"]');
  const rit = (await ls('set')).cop.adesivi[0];
  prova('ruotato e ingrandito', rit.r === (dopo.r + 15) % 360 && rit.s > dopo.s, rit);
  await p.click('[data-act="at-ok"]');
  await p.click('[data-act="at-adesivo"][data-t="stella"]'); await p.click('[data-act="at-ok"]');
  // nome in oro: senza nome lo chiede
  await p.click('[data-act="at-oro"]'); await attendi(150);
  prova('chiede il nome per la copertina', await p.isVisible('#v-nome'));
  await p.fill('#nome-campo', 'Giulia'); await p.click('[data-act="salva-nome"]'); await attendi(150);
  prova('nome in oro sulla copertina', (await p.textContent('#cop-nome')) === 'Giulia');
  // disegno sulla copertina
  await p.click('[data-act="at-disegna"]'); await attendi(300);
  prova('lavagna sulla copertina', await p.isVisible('.lav.lav-cop .cop-copia'));
  await foto('01-lavagna-copertina');
  await p.click('.lav [data-c="bianco"]');
  await traccia('.lav canvas', [[0.2, 0.75], [0.4, 0.8], [0.6, 0.72], [0.8, 0.8]]);
  await p.click('.lav [data-l="fatto"]'); await attendi(200);
  prova('disegno sulla copertina', await p.locator('#cop-decoro .cop-tratti path').count() === 1);
  prova('tratto salvato in bianco', (await ls('set')).cop.tratti[0].c === 'bianco');
  await foto('02-copertina-decorata');
  await p.click('[data-act="at-fine"]'); await attendi(200);
  prova('pannello chiuso', await p.isHidden('#atelier'));
  await p.click('.elastico', { force: true }); await attendi(3600);
  prova('poi l\u2019agenda si apre', await p.evaluate(() => document.getElementById('app').classList.contains('aperta')));

  // ---------- pagina del giorno: a mano ----------
  await p.click('.barra-giu [data-act="oggi"]'); await attendi(1700);
  await p.click('.giorno[data-k="2026-10-30"]'); await attendi(500);
  prova('«Scrivi a mano» e «Una foto» nella pagina del giorno', await p.isVisible('[data-gp="disegna"]') && await p.isVisible('[data-gp="foto"]'));
  await p.click('.gp-aggiungi [data-gp="disegna"]'); await attendi(300);
  prova('lavagna sopra la pagina del giorno', await p.isVisible('.lav.lav-carta'));
  await traccia('.lav canvas', [[0.1, 0.3], [0.3, 0.2], [0.5, 0.4], [0.7, 0.3]]);
  await traccia('.lav canvas', [[0.2, 0.6], [0.6, 0.6]]);
  await p.click('.lav [data-l="indietro"]');
  await traccia('.lav canvas', [[0.2, 0.7], [0.7, 0.75]]);
  await p.click('.lav [data-l="fatto"]'); await attendi(200);
  prova('disegno nel giorno (2 tratti, uno tolto)', ((await ls('dis')) || {})['2026-10-30'].length === 2);
  prova('disegno mostrato nella pagina del giorno', await p.locator('.gp-disegno svg path').count() === 2);
  // ---------- polaroid ----------
  const [scelta] = await Promise.all([p.waitForEvent('filechooser'), p.click('.gp-aggiungi [data-gp="foto"]')]);
  await scelta.setFiles(IMG); await p.waitForSelector('.gp-polaroid img', { timeout: 6000 }).catch(() => {});
  prova('polaroid incollata', await p.isVisible('.gp-polaroid img'));
  await p.fill('#foto-testo', 'Il mare a novembre'); await attendi(100);
  prova('scritta sotto la foto salvata', ((await ls('foto')) || {})['2026-10-30'].testo === 'Il mare a novembre');
  await foto('03-giorno-mano-foto');
  // a tutto schermo sul telefono
  const pieno = await p.$eval('#gp-carta', e => { const r = e.getBoundingClientRect(); return r.left === 0 && r.top === 0 && Math.abs(r.right - innerWidth) < 1 && Math.abs(r.bottom - innerHeight) < 1; });
  prova('pagina del giorno a tutto schermo', pieno);
  // promemoria: visita medica con l'ora
  await p.click('[data-gp="apri-ric"]'); await attendi(150);
  prova('di default un appuntamento', (await p.getAttribute('.scelta.on', 'data-t')) === 'appuntamento');
  await p.click('[data-gp="tipo-ric"][data-t="visita"]'); await attendi(100);
  await p.fill('#ric-campo', 'Dentista'); await p.fill('#ric-ora', '10:30'); await p.click('[data-gp="aggiungi-ric"]'); await attendi(150);
  prova('visita medica con l’ora', (await p.textContent('#gp-ricordi')).includes('✚ 10:30 · Dentista') && (await p.textContent('#gp-ricordi')).includes('solo quest'));
  await p.click('[data-gp="fatto"]'); await attendi(700);
  prova('visita sulla pagina del libro', (await p.textContent('.giorno[data-k="2026-10-30"] .g-ric')).includes('10:30 · Dentista'));
  prova('sulla pagina del libro: disegno e polaroid', await p.isVisible('.giorno[data-k="2026-10-30"] .g-disegno') && await p.isVisible('.giorno[data-k="2026-10-30"] .g-polaroid img'));
  await foto('04-pagina-con-attacchi');

  // ---------- lettera al futuro ----------
  await p.click('.giorno[data-k="2026-10-29"]'); await attendi(500);
  await p.click('[data-gp="nuova-lettera"]'); await attendi(150);
  prova('modulo della lettera', await p.isVisible('#lett-campo'));
  prova('di default tra sei mesi', (await p.inputValue('#lett-data')) === '2027-04-29');
  await p.fill('#lett-campo', 'Cara me,\nricordati di quel giorno al mare.');
  await p.fill('#lett-data', '2026-11-05'); await p.dispatchEvent('#lett-data', 'change');
  await p.click('[data-gp="sigilla"]'); await attendi(200);
  const lett = (await ls('lettere')) || [];
  prova('lettera sigillata', lett.length === 1 && lett[0].apre === '2026-11-05' && lett[0].scritta === '2026-10-29', lett);
  prova('nella pagina di oggi: lettera spedita', (await p.textContent('#gp-lettere')).includes('si apre il 5 novembre 2026'));
  await p.click('[data-gp="fatto"]'); await attendi(600);
  // la ricerca non trova le lettere sigillate
  await p.click('[data-act="cerca"]'); await p.fill('#cerca-campo', 'quel giorno al mare'); await attendi(150);
  prova('lettera sigillata non si trova cercando', (await p.textContent('#cerca-ris')).includes('Niente'));
  await p.click('#v-cerca [data-act="chiudi"]');
  await p.click('[data-act="vaia"]'); await p.fill('#vaia-data', '2026-11-05'); await p.dispatchEvent('#vaia-data', 'change'); await attendi(1700);
  prova('busta della lettera sulla pagina del 5', await p.isVisible('.giorno[data-k="2026-11-05"] .lettera'));
  await p.click('.giorno[data-k="2026-11-05"] .lettera'); await attendi(200);
  prova('prima del giorno resta sigillata', (await p.textContent('#avviso-testo')).includes('Sigillata') && await p.isHidden('#v-sorpresa'));

  // ---------- copia delle note con tutto ----------
  await p.click('[data-act="vaia"]'); await p.click('[data-act="vai-pagina"][data-p="0"]'); await attendi(1700);
  // sfondo della prima pagina a scelta
  await p.click('.p-sfondo'); await attendi(200);
  prova('scelta dello sfondo: 6 motivi', await p.locator('.sfondi button').count() === 6);
  await p.click('.sfondi [data-s="fiori"]'); await attendi(150);
  if (FOTO) await p.screenshot({ path: path.join(FOTO, MOTORE + '-06-sfondi.png') });
  await p.click('#v-menu [data-act="chiudi"]'); await attendi(150);
  prova('prima pagina a fiorellini', (await p.$eval('.p-retro', e => getComputedStyle(e).backgroundImage)).split('radial-gradient').length - 1 === 5);
  await foto('07-prima-pagina-fiori');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="esporta"]')]);
  const copia = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  prova('copia: disegni, foto, lettere, copertina', copia.version === 3 && copia.dis['2026-10-30'] && copia.foto['2026-10-30'] && copia.foto['2026-10-30'].img.startsWith('data:image/jpeg') && copia.lettere.length === 1 && copia.copertina.adesivi.length === 2 && copia.sfondo === 'fiori');

  // ---------- riapro l'app il 5 novembre: la lettera si apre, la foto c'è ancora ----------
  const st = await ctx.storageState({ indexedDB: true }); await p.close();
  const ctx2 = await b.newContext({ ...dev, storageState: st }); await ctx2.addInitScript(fissa('2026-11-05'));
  const q = await ctx2.newPage(); q.setDefaultTimeout(6000); q.on('pageerror', e => errori.push(e.message));
  await q.goto(URL); await q.waitForTimeout(800);
  prova('copertina decorata dopo la riapertura', await q.locator('#cop-decoro .ades').count() === 2 && (await q.textContent('#cop-nome')) === 'Giulia');
  await q.click('.elastico', { force: true }); await q.waitForTimeout(3600);
  await q.click('.giorno[data-k="2026-11-05"]'); await q.waitForTimeout(500);
  prova('il giorno giusto: «Una lettera per te»', (await q.textContent('#gp-lettere')).includes('Una lettera per te'));
  await q.click('[data-gp="lettera"]'); await q.waitForTimeout(300);
  prova('lettera aperta e leggibile', (await q.textContent('#gp-lettere')).includes('ricordati di quel giorno al mare'));
  if (FOTO) await q.screenshot({ path: path.join(FOTO, MOTORE + '-05-lettera-aperta.png') });
  await q.click('[data-gp="fatto"]'); await q.waitForTimeout(600);
  await q.click('[data-act="vaia"]'); await q.fill('#vaia-data', '2026-10-30'); await q.dispatchEvent('#vaia-data', 'change'); await q.waitForTimeout(1700);
  prova('foto ancora lì dopo la riapertura', await q.isVisible('.giorno[data-k="2026-10-30"] .g-polaroid img'));
  const nat = await q.$eval('.giorno[data-k="2026-10-30"] .g-polaroid img', i => i.naturalWidth);
  prova('foto caricata davvero', nat > 0, nat);

  // ---------- un telefono nuovo riprende la copia ----------
  const ctx3 = await b.newContext(dev); await ctx3.addInitScript(fissa('2026-10-29'));
  const r = await ctx3.newPage(); r.setDefaultTimeout(6000); r.on('pageerror', e => errori.push(e.message));
  await r.goto(URL); await r.waitForTimeout(700); await r.click('.elastico', { force: true }); await r.waitForTimeout(3600);
  await r.click('[data-act="vaia"]'); await r.click('[data-act="vai-pagina"][data-p="0"]'); await r.waitForTimeout(1700);
  const [sc] = await Promise.all([r.waitForEvent('filechooser'), r.click('[data-act="importa"]')]);
  await sc.setFiles(await dl.path()); await r.waitForTimeout(1200);
  const rip = await r.evaluate(() => ({ dis: !!JSON.parse(localStorage.getItem('ccnds-dis') || '{}')['2026-10-30'], lett: (JSON.parse(localStorage.getItem('ccnds-lettere') || '[]')).length, cop: (JSON.parse(localStorage.getItem('ccnds-set') || '{}').cop || {}).colore }));
  prova('copia ripresa: disegno, lettera, copertina', rip.dis && rip.lett === 1 && rip.cop === 'notte', rip);
  await r.click('[data-act="vaia"]'); await r.fill('#vaia-data', '2026-10-30'); await r.dispatchEvent('#vaia-data', 'change'); await r.waitForTimeout(1700);
  prova('copia ripresa: la foto', await r.isVisible('.giorno[data-k="2026-10-30"] .g-polaroid img'));

  prova('nessun errore', !errori.length, errori);
  console.log(`\nnovità (${MOTORE}): ${ok} ok, ${ko} fallite`);
  await b.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
