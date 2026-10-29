// Percorso completo su iPhone 13 emulato: apertura, scrittura, caselle, salvataggio, poesie, ricerca, notte
// uso: node _build/test/percorso.js [cartella-foto]
const pw = require('C:/Users/Claude FK/.claude/projects/hedonè progetto serio/node_modules/playwright');
const path = require('path'), fs = require('fs');
process.env.PORTA = '8997'; require('../server.js');
const FOTO = process.argv[2]; if (FOTO) fs.mkdirSync(FOTO, { recursive: true });
const URL = 'http://localhost:8997/';
let ok = 0, ko = 0;
const prova = (nome, cond) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nome); } };

(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ ...pw.devices['iPhone 13'] });
  await ctx.addInitScript(() => { const D = Date; const fisso = new D('2026-10-29T10:00:00').getTime(); globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fisso])); } static now() { return fisso; } }; });
  const p = await ctx.newPage(); p.setDefaultTimeout(5000);
  const errori = []; p.on('pageerror', e => errori.push(e.message)); p.on('console', m => m.type() === 'error' && errori.push(m.text()));
  const foto = async n => FOTO && p.screenshot({ path: path.join(FOTO, n + '.png') });
  const attendi = ms => p.waitForTimeout(ms);

  await p.goto(URL); await attendi(800); await foto('01-copertina');
  // l'elastico non copre più il titolo
  const cop = await p.evaluate(() => { const t = document.querySelector('.cop-titolo').getBoundingClientRect(), e = document.querySelector('.elastico').getBoundingClientRect(); return { tDx: t.right, eSx: e.left }; });
  prova('titolo a sinistra dell\u2019elastico', cop.tDx <= cop.eSx + 1);

  await p.click('.elastico', { force: true }); await attendi(3600);
  prova('libro aperto', await p.evaluate(() => document.getElementById('app').classList.contains('aperta')));
  // la prima volta si apre su «Come si usa», e il suo pulsante porta a oggi
  prova('prima apertura su Come si usa', (await p.textContent('#t-titolo')) === 'Come si usa');
  await foto('02a-come-si-usa');
  await p.click('.p-prova [data-act="oggi"]'); await attendi(1700);
  prova('settimana di oggi', (await p.textContent('#t-sotto')) === 'Settimana 44');
  await foto('02-aperta');
  prova('poesia del primo giorno', (await p.textContent('.giorno[data-k="2026-10-29"]')).includes('Signore, è tempo'));

  // scrivo venerdì 30
  await p.click('.giorno[data-k="2026-10-30"]'); await attendi(500);
  prova('pagina del giorno aperta', await p.isVisible('#gp'));
  prova('fuoco sulla prima riga', await p.evaluate(() => document.activeElement && document.activeElement.dataset.i === '0'));
  const tipi = () => p.evaluate(() => [...document.querySelectorAll('#gp-righe .riga')].map(r => ({ t: r.querySelector('textarea').value, tipo: ['testo', 'punto', 'fare'].find(c => r.classList.contains(c)), ora: (r.querySelector('.ora') || {}).textContent || '' })));
  const premuto = () => p.$eval('.gp-stile [aria-pressed="true"]', b => b.dataset.s);
  await p.keyboard.type('Cena da Marta alle 20');
  await p.keyboard.press('Enter');
  prova('invio sul testo fa testo (niente quadratino)', (await tipi())[1].tipo === 'testo');
  await p.click('.gp-stile [data-s="fare"]');
  prova('«Da spuntare» acceso', await premuto() === 'fare');
  await p.keyboard.type('Comprare i fiori');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Chiamare la mamma');
  let righe = await tipi();
  prova('tre righe', righe.length === 3);
  prova('ora riconosciuta', righe[0].ora === '20:00');
  prova('riga da spuntare', righe[1].tipo === 'fare' && righe[1].t === 'Comprare i fiori');
  prova('la lista scelta continua con invio', righe[2].tipo === 'fare');
  await foto('03-scrivo');
  // due invii di fila escono dalla lista
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
  righe = await tipi();
  prova('invio su riga vuota esce dalla lista', righe.length === 4 && righe[3].tipo === 'testo' && await premuto() === 'testo');
  await p.keyboard.press('Backspace');
  // elenco puntato e ritorno al testo dalla riga 3
  await p.click('#gp-righe .riga:nth-child(3) textarea'); await p.click('.gp-stile [data-s="punto"]');
  prova('elenco puntato', (await tipi())[2].tipo === 'punto');
  await p.click('.gp-stile [data-s="testo"]');
  prova('torna testo', (await tipi())[2].tipo === 'testo');
  // spunto la prima cosa da fare
  await p.click('#gp-righe .riga.fare .spunta');
  prova('spunta in pagina', await p.evaluate(() => document.querySelectorAll('#gp-righe .riga')[1].classList.contains('fatta')));
  await attendi(600);
  prova('salvataggio automatico', await p.evaluate(() => (JSON.parse(localStorage.getItem('ccnds-notes')) || {})['2026-10-30']?.text === 'Cena da Marta alle 20\n[x] Comprare i fiori\nChiamare la mamma'));
  // ricorrenza
  await p.click('[data-gp="apri-ric"]'); await attendi(200);
  await p.fill('#ric-campo', 'Marta'); await p.click('[data-gp="aggiungi-ric"]');
  prova('ricorrenza aggiunta', (await p.textContent('#gp-ricordi')).includes('Marta'));
  await foto('04-ricorrenza');
  await p.click('[data-gp="fatto"]'); await attendi(700);
  prova('pagina chiusa', await p.isHidden('#gp'));
  const testoGiorno = await p.textContent('.giorno[data-k="2026-10-30"]');
  prova('nota sulla pagina', testoGiorno.includes('Cena da Marta') && testoGiorno.includes('20:00'));
  prova('ricorrenza sulla pagina', testoGiorno.includes('♥ Marta'));
  prova('avviso con Annulla', await p.isVisible('#avviso-annulla'));
  await foto('05-salvata');

  // il giorno dopo, con le frecce della pagina del giorno
  await p.click('.giorno[data-k="2026-10-30"]'); await attendi(450);
  prova('giorno con note: niente tastiera in automatico', await p.evaluate(() => !document.activeElement || document.activeElement.tagName !== 'TEXTAREA'));
  await p.click('[data-gp="dopo"]'); await attendi(200);
  prova('freccia al giorno dopo', (await p.textContent('#gp-num')) === '31' && (await p.textContent('#gp-prima')) === 'ven 30');
  await p.click('[data-gp="fatto"]'); await attendi(600);

  // ricarico: la nota resta
  await p.reload(); await attendi(700); await p.click('.elastico', { force: true }); await attendi(3600);
  prova('nota dopo il ricaricamento', (await p.textContent('.giorno[data-k="2026-10-30"]')).includes('Cena da Marta'));

  // vado a San Martino (poesia) con Vai a…
  await p.click('[data-act="vaia"]'); await p.fill('#vaia-data', '2026-11-11'); await attendi(1600);
  prova('San Martino con Carducci', (await p.textContent('.giorno[data-k="2026-11-11"]')).includes('La nebbia'));
  await foto('06-san-martino');
  // poesia straniera con l'originale
  await p.click('[data-act="vaia"]'); await p.fill('#vaia-data', '2026-11-22'); await attendi(1600);
  await p.click('.giorno[data-k="2026-11-22"]'); await attendi(450);
  await p.click('[data-gp="originale"]');
  prova('originale visibile', (await p.textContent('.gp-orig-testo')).includes('Fall, leaves, fall'));
  await foto('07-bronte');
  await p.click('[data-gp="fatto"]'); await attendi(600);
  prova('giorno senza scrittura non crea note', await p.evaluate(() => !(JSON.parse(localStorage.getItem('ccnds-notes')) || {})['2026-11-22']));

  // ricerca
  await p.click('[data-act="cerca"]'); await p.fill('#cerca-campo', 'neve'); await attendi(150);
  const ris = await p.$$eval('.ris', r => r.length);
  prova('ricerca nei versi', ris >= 2);
  await foto('08-ricerca');
  await p.click('.ris'); await attendi(1700);
  prova('dalla ricerca al giorno', (await p.textContent('#t-titolo')).includes('2026') || (await p.textContent('#t-titolo')).includes('2027'));

  // notte + nome
  await p.click('[data-act="menu"]'); await p.click('[data-act="notte"]'); await p.click('#v-menu', { position: { x: 20, y: 20 } });
  prova('notte accesa', await p.evaluate(() => document.getElementById('app').classList.contains('notte')));
  await foto('09-notte');
  await p.click('[data-act="menu"]'); await p.click('[data-act="nome"]'); await p.fill('#nome-campo', 'Giulia'); await p.click('[data-act="salva-nome"]');
  // segnalibro: nastro sulla pagina segnata, coda dal lato giusto quando si è altrove
  await p.click('#b-nastro'); await attendi(200);
  prova('nastro sulla pagina segnata', await p.isVisible('.nastro'));
  await foto('10-segnalibro');
  await p.click('[data-act="succ"]'); await attendi(1100);
  prova('coda del nastro a sinistra se la pagina segnata è indietro', await p.isVisible('.coda.indietro'));
  await p.click('.coda'); await attendi(1100);
  prova('dalla coda alla pagina segnata', await p.isVisible('.nastro'));
  // «Chiudi» in alto richiude l'agenda
  await p.click('.chiudi-libro'); await attendi(5000);
  prova('libro richiuso', await p.evaluate(() => document.getElementById('app').classList.contains('chiusa')));
  await p.click('.elastico', { force: true }); await attendi(1800);
  await p.click('[data-act="prec"]'); await attendi(300);

  prova('nessun errore in pagina', errori.length === 0); if (errori.length) console.log(errori);
  console.log(`\npercorso: ${ok} ok, ${ko} fallite`);
  await b.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
