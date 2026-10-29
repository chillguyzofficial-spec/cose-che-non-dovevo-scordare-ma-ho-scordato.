// Cose Che Non Dovevo Scordare — logica: libro che si sfoglia, pagina del giorno, ricorrenze, ricerca
(() => {
  'use strict';
  const D = window.AGENDA_DATI, E = window.AGENDA_EXTRA;
  const $ = s => document.querySelector(s);
  const app = $('#app'), libro = $('#libro'), pagineEl = $('#pagine'), scena = $('#scena');

  const M = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const MS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const DN = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const DT = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const TABC = ['#9c4a2a', '#ad6a2c', '#9a7e34', '#6c7739', '#4c6858', '#56598a', '#7a4766'];
  const DOOD = ['❦', '❧', '☙', '✤', '❁', '❦', '✾', '❧'];
  // "altro" resta come chiave per compatibilità con le copie esportate dall'agenda originale
  // appuntamenti e visite hanno anche l'ora; compleanni e ricorrenze tornano ogni anno
  const RIC = {
    appuntamento: { g: '◷', c: '#5b4a9b', w: 'rgba(120,100,190,.16)', n: 'Appuntamento', ora: true, ph: 'Con chi o per cosa? Es. parrucchiere' },
    visita: { g: '✚', c: '#2b6f86', w: 'rgba(70,150,180,.16)', n: 'Visita medica', ora: true, ph: 'Quale visita? Es. dentista' },
    compleanno: { g: '♥', c: '#a8402f', w: 'rgba(212,110,95,.17)', n: 'Compleanno' },
    altro: { g: '✦', c: '#46692e', w: 'rgba(110,150,80,.18)', n: 'Ricorrenza' },
    scadenza: { g: '⚑', c: '#8d5a0c', w: 'rgba(220,160,50,.2)', n: 'Scadenza' }
  };
  const CASELLA = /^\[( |x|X)\] /;

  const etichetta = (r, T) => (r.ora ? r.ora + ' · ' : '') + (r.label || T.n);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const leggi = (k, d) => { try { const v = localStorage.getItem('ccnds-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const scrivi = (k, v) => { try { localStorage.setItem('ccnds-' + k, JSON.stringify(v)); } catch (e) {} };

  // ---------- date ----------
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const daKey = k => new Date(k + 'T12:00');
  const breve = d => d.getDate() + ' ' + MS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
  const settIso = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); };
  const oggiKey = () => ymd(new Date());

  const inizio = daKey(D.INIZIO), fine = daKey(D.FINE);
  const base = new Date(inizio); base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const NG = Math.ceil((Math.round((fine - base) / 864e5) + 1) / 7) * 7;
  // doppie pagine: 0 frontespizio, 1 «Come si usa», da PRIMA le settimane, LAST il fondo
  const PRIMA = 2, LAST = NG / 7 + PRIMA;
  const giorni = [], perKey = {};
  for (let i = 0, nasc = 0; i < NG; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, 12), key = ymd(d);
    const dentro = key >= D.INIZIO && key <= D.FINE, poesia = dentro ? D.POESIE[key] || null : null, festa = D.FESTE[key] || '';
    // il biglietto del giorno: una busta coi versi, oppure un biglietto/foglia con una battuta. Si apre, non è stampato sulla pagina
    const n = String(1000 + ((i * 7919) % 9000)), frase = dentro && !poesia ? D.FRASI[key] || null : null;
    let biglietto = poesia ? { tipo: 'busta', poesia } : frase ? { tipo: 'biglietto', testo: frase, n } : null;
    if (!biglietto && dentro && !festa && (i * 7 + 3) % 17 === 0) { biglietto = { tipo: nasc % 2 ? 'biglietto' : 'foglia', testo: D.SORPRESE[nasc % D.SORPRESE.length], n }; nasc++; }
    const tema = dentro ? window.AGENDA_ILLUSTRAZIONI.temaDi(key) : null;
    const g = { i, key, d, dow: (d.getDay() + 6) % 7, dentro, poesia, festa, biglietto, tema };
    giorni.push(g); perKey[key] = g;
  }
  const oggiIdx = () => { const k = oggiKey(); return perKey[k < D.INIZIO ? D.INIZIO : k > D.FINE ? D.FINE : k].i; };
  const spreadDi = i => PRIMA + Math.floor(i / 7);

  // ---------- stato ----------
  const S = {
    fase: 'chiusa', spread: 0, flip: null, pw: 0, ph: 0,
    note: leggi('notes', {}), storia: leggi('hist', {}), ric: leggi('rem', []), letti: leggi('letti', []),
    // disegni a mano e polaroid dei giorni, lettere al futuro (le foto vere stanno nel database del browser)
    dis: leggi('dis', {}), foto: leggi('foto', {}), lettere: leggi('lettere', []), atelier: null,
    imp: Object.assign({ sound: true, night: false, bookmark: null, nome: '', tema: 'carta' }, leggi('set', {})),
    lampo: null, appena: null,
    // sul telefono in verticale si vede una pagina alla volta: pos = facciata; altrimenti pos = doppia pagina
    singolo: false, pos: 0
  };
  const maxPos = () => S.singolo ? 2 * LAST + 1 : LAST;
  const spreadDiPos = p => S.singolo ? p >> 1 : p;
  const posDiSpread = s => S.singolo ? 2 * s : s;
  // la facciata dove sta un giorno: lun-mer a sinistra, gio-dom a destra
  const posDiGiorno = g => S.singolo ? 2 * spreadDi(g.i) + (g.dow < 3 ? 0 : 1) : spreadDi(g.i);
  let flip = null, noClick = false, ptr = null, raf = 0, pronto = false;
  const setImp = p => { Object.assign(S.imp, p); scrivi('set', S.imp); };
  const PELLI = { cuoio: ['Cuoio', '#4a2c1d'], nero: ['Nero', '#1f1b19'], bosco: ['Verde bosco', '#22382a'], notte: ['Blu notte', '#1c2742'], bordeaux: ['Bordeaux', '#4b1a23'], cipria: ['Cipria', '#a3786b'] };
  const copFronte = $('.cop-fronte'), decoro = $('#cop-decoro');
  const cop = () => Object.assign({ colore: 'cuoio', oro: false, adesivi: [], tratti: [] }, S.imp.cop);
  const personalizzata = () => { const c = cop(); return c.colore !== 'cuoio' || c.oro || c.adesivi.length || c.tratti.length; };
  // le misure della copertina senza la rotazione (aperta è girata)
  const altoCop = () => copFronte.offsetWidth ? 1000 * copFronte.offsetHeight / copFronte.offsetWidth : 1500;
  // chi aveva la vecchia «modalità notte» la ritrova come carta nera
  if (S.imp.night && !leggi('set', {}).tema) setImp({ tema: 'nero', night: false });

  // ---------- misure ----------
  function misura() {
    const W = scena.clientWidth, H = scena.clientHeight;
    // telefono in verticale: una pagina alla volta, larga come lo schermo e con proporzioni da quaderno
    // mentre si decora la copertina il pannello toglie spazio: il telefono resta a una pagina, con le stesse proporzioni
    const singolo = S.atelier ? S.singolo : W < 620 && H > W * 1.15;
    if (singolo !== S.singolo) {
      const s = spreadDiPos(S.pos); S.singolo = singolo; S.pos = posDiSpread(s);
      app.classList.toggle('singolo', singolo); S.pw = 0;
      if (S.fase !== 'chiusa' || S.pos) disegna();
    }
    // su PC il libro è più grande e meno allungato
    const largo = W >= 900;
    const pw = singolo ? Math.floor(Math.min(W - 36, 480, (H - 40) / (S.atelier ? 1.62 : 1.45)))
      : Math.max(120, Math.floor(Math.min((W - 46) / 2, largo ? 520 : 440, largo ? (H - 34) / 1.45 : 1e9)));
    const ph = singolo ? Math.floor(Math.min(H - 40, pw * 1.62)) : Math.max(300, Math.floor(Math.min(H - 34, pw * 3.2)));
    if (pw === S.pw && ph === S.ph) return;
    S.pw = pw; S.ph = ph;
    libro.style.setProperty('--pw', pw + 'px'); libro.style.setProperty('--ph', ph + 'px');
    libro.style.setProperty('--fs', Math.max(10, Math.min(largo ? 20 : singolo ? 16 : 17, pw / (singolo ? 21 : 14.5), ph / 30)).toFixed(2) + 'px');
    disegnaCopertina();
    if (S.fase === 'aperta') disegna();
  }

  // ---------- suoni (morbidi, generati: niente file) ----------
  let ac = null, buf = null;
  function sveglia() { if (!S.imp.sound) return; try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {} }
  function rumore() {
    if (!buf) { buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(); s.buffer = buf; return s;
  }
  function inviluppo(g, t, punti) { g.gain.setValueAtTime(0.0001, t); punti.forEach(([dt, v], k) => k === punti.length - 1 ? g.gain.exponentialRampToValueAtTime(v, t + dt) : g.gain.linearRampToValueAtTime(v, t + dt)); }
  function suono(tipo) {
    if (!S.imp.sound || !ac) return;
    try {
      const t = ac.currentTime, out = ac.destination;
      const filtro = (tipo, f, q) => { const b = ac.createBiquadFilter(); b.type = tipo; b.frequency.value = f; if (q) b.Q.value = q; return b; };
      if (tipo === 'pagina') {
        const s = rumore(), bp = filtro('bandpass', 900, 0.6), lp = filtro('lowpass', 4200), g = ac.createGain();
        bp.frequency.linearRampToValueAtTime(2400, t + 0.45);
        inviluppo(g, t, [[0.08, 0.055], [0.2, 0.022], [0.34, 0.07], [0.6, 0.0008]]);
        s.connect(bp).connect(lp).connect(g).connect(out); s.start(t, Math.random() * 0.3); s.stop(t + 0.62);
      } else if (tipo === 'posa') {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(92, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.2);
        inviluppo(g, t, [[0.012, 0.2], [0.3, 0.001]]); o.connect(g).connect(out); o.start(t); o.stop(t + 0.32);
        const s = rumore(), g2 = ac.createGain(); inviluppo(g2, t, [[0.008, 0.09], [0.13, 0.001]]);
        s.connect(filtro('lowpass', 650)).connect(g2).connect(out); s.start(t); s.stop(t + 0.14);
      } else if (tipo === 'elastico') {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.13);
        inviluppo(g, t, [[0.006, 0.08], [0.17, 0.001]]); o.connect(g).connect(out); o.start(t); o.stop(t + 0.19);
        const s = rumore(), g2 = ac.createGain(); inviluppo(g2, t, [[0.004, 0.035], [0.05, 0.001]]);
        s.connect(filtro('highpass', 1800)).connect(g2).connect(out); s.start(t); s.stop(t + 0.06);
      } else if (tipo === 'penna') {
        [0, 0.1].forEach((dt, k) => {
          const s = rumore(), g = ac.createGain(); inviluppo(g, t + dt, [[0.02, 0.03], [0.08, 0.001]]);
          s.connect(filtro('bandpass', 3000 + k * 700, 1.5)).connect(g).connect(out); s.start(t + dt, Math.random() * 0.5); s.stop(t + dt + 0.09);
        });
      }
    } catch (e) {}
  }

  // ---------- copertina ----------
  function setFase(f) { S.fase = f; app.classList.remove('chiusa', 'sgancio', 'apertura', 'aperta', 'chiusura'); app.classList.add(f); }
  function apri() {
    if (S.fase !== 'chiusa' || !pronto) return;
    sveglia(); suono('elastico'); setFase('sgancio');
    setTimeout(() => {
      setFase('apertura'); disegna();
      setTimeout(() => suono('posa'), 950);
      // la prima volta si apre su «Come si usa», poi sempre sulla settimana di oggi
      const meta = S.imp.visto ? posDiGiorno(giorni[oggiIdx()]) : posDiSpread(1); setImp({ visto: true });
      setTimeout(() => { setFase('aperta'); disegna(); setTimeout(() => vaiPos(meta), 260); }, 1200);
    }, 430);
  }
  function chiudiLibro() {
    chiudiVeli();
    const fai = () => { setFase('chiusura'); disegna(); setTimeout(() => suono('posa'), 950); setTimeout(() => { setFase('chiusa'); disegna(); }, 1200); };
    if (S.pos !== 0) vaiPos(0, () => setTimeout(fai, 120)); else fai();
  }

  // ---------- sfogliare ----------
  // vai(doppia pagina) per chi pensa a doppie pagine; vaiPos(posizione) gira una facciata o una doppia pagina
  const vai = (to, cb) => vaiPos(posDiSpread(Math.max(0, Math.min(LAST, to))), cb);
  function vaiPos(to, cb) {
    if (flip || S.fase !== 'aperta') return;
    to = Math.max(0, Math.min(maxPos(), to));
    if (to === S.pos) { cb && cb(); return; }
    avviaFlip(to);
    animaA(1, () => { fineFlip(true); cb && cb(); });
  }
  function avviaFlip(to) { flip = { to, dir: to > S.pos ? 1 : -1, p: 0 }; S.flip = { to, dir: flip.dir }; suono('pagina'); disegna(); }
  const angoloFlip = () => { const p = flip ? flip.p : 0, dir = flip ? flip.dir : 1; return dir > 0 ? -180 * p : -180 * (1 - p); };
  function applicaFlip() {
    if (!flip) return;
    const a = angoloFlip(), A = Math.abs(a), q = r => pagineEl.querySelector(`[data-ruolo="${r}"]`);
    const F = q('F'), B = q('B'), L = q('L'), R = q('R');
    if (F) { F.style.transform = `rotateY(${a}deg)`; F.querySelector('.ombra').style.opacity = Math.min(1, A / 90) * 0.8; }
    if (B) { B.style.transform = `rotateY(${a}deg) translateX(100%) rotateY(180deg)`; B.querySelector('.ombra').style.opacity = Math.min(1, (180 - A) / 90) * 0.8; }
    const cast = Math.sin(A * Math.PI / 180) * 0.35;
    if (L) L.querySelector('.ombra').style.opacity = A > 90 ? cast : 0;
    if (R) R.querySelector('.ombra').style.opacity = A < 90 ? cast : 0;
  }
  function animaA(target, fatto) {
    cancelAnimationFrame(raf);
    const da = flip.p, dur = Math.max(160, 720 * Math.abs(target - da)), ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    let t0 = null;
    const passo = now => {
      if (!flip) return; if (t0 === null) t0 = now;
      const k = Math.min(1, (now - t0) / dur); flip.p = da + (target - da) * ease(k); applicaFlip();
      if (k < 1) raf = requestAnimationFrame(passo); else fatto && fatto();
    };
    raf = requestAnimationFrame(() => { applicaFlip(); raf = requestAnimationFrame(passo); });
  }
  function fineFlip(commit) { const f = flip; flip = null; S.flip = null; if (commit && f) { S.pos = f.to; S.spread = spreadDiPos(f.to); } disegna(); }
  const sopprimi = () => { noClick = true; clearTimeout(sopprimi.t); sopprimi.t = setTimeout(() => { noClick = false; }, 80); };

  libro.addEventListener('pointerdown', e => { if (!$('#gp').hidden || S.atelier) return; ptr = { x: e.clientX, y: e.clientY, t: performance.now(), drag: false }; });
  libro.addEventListener('pointermove', e => {
    const P = ptr; if (!P) return;
    const dx = e.clientX - P.x, dy = e.clientY - P.y;
    if (S.fase === 'chiusa') { if (dx < -40 && Math.abs(dx) > Math.abs(dy)) { ptr = null; sopprimi(); apri(); } return; }
    if (S.fase !== 'aperta') return;
    if (!P.drag) {
      if (flip || Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      const to = S.pos + (dx < 0 ? 1 : -1); if (to < 0 || to > maxPos()) { ptr = null; return; }
      P.drag = true; avviaFlip(to); try { libro.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (!flip) return;
    flip.p = Math.max(0, Math.min(1, (-dx * flip.dir) / (S.pw * 1.1))); applicaFlip(); P.dx = dx;
  });
  const suSu = () => {
    const P = ptr; ptr = null; if (!P || !P.drag || !flip) return;
    sopprimi(); cancelAnimationFrame(raf);
    // basta un trascinamento corto (un quinto della pagina) o un gesto veloce per girarla
    const svelto = performance.now() - P.t < 450 && Math.abs(P.dx || 0) > 30, ok = flip.p > 0.2 || svelto;
    animaA(ok ? 1 : 0, () => fineFlip(ok));
  };
  libro.addEventListener('pointerup', suSu); libro.addEventListener('pointercancel', suSu);

  function vaiGiorno(key, lampo = true) {
    const g = perKey[key]; if (!g) return;
    chiudiVeli();
    setTimeout(() => vaiPos(posDiGiorno(g), () => {
      if (!lampo) return;
      S.lampo = key; disegna(); clearTimeout(vaiGiorno.t); vaiGiorno.t = setTimeout(() => { S.lampo = null; disegna(); }, 1800);
    }), 60);
  }

  // ---------- dati derivati ----------
  const ricDi = key => S.ric.filter(r => r.date === key || (r.yearly && r.date.slice(5) === key.slice(5)));
  function oraIn(t) {
    const m = /(?:^|\s)(?:alle|ore|h)\s*(\d{1,2})(?:[:.,](\d{2}))?(?!\d)/i.exec(t) || /(?:^|\D)(\d{1,2})[:.](\d{2})(?!\d)/.exec(t);
    if (!m) return '';
    const h = +m[1], mi = m[2] ? +m[2] : 0;
    return h > 23 || mi > 59 ? '' : String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
  }
  function numeri() {
    const N = S.note, keys = Object.keys(N).filter(k => N[k] && (N[k].text || '').trim()).sort(), set = new Set(keys);
    let lunga = 0, serie = 0, prima = null;
    for (const k of keys) { const t = daKey(k); serie = prima && Math.round((t - prima) / 864e5) === 1 ? serie + 1 : 1; lunga = Math.max(lunga, serie); prima = t; }
    let ora = 0; const d = new Date(); d.setHours(12); if (!set.has(ymd(d))) d.setDate(d.getDate() - 1);
    while (set.has(ymd(d))) { ora++; d.setDate(d.getDate() - 1); }
    let tot = 0, fatte = 0; keys.forEach(k => N[k].text.split('\n').forEach(l => { const c = CASELLA.exec(l); if (c) { tot++; if (c[1] !== ' ') fatte++; } }));
    const frase = !keys.length ? 'Le pagine aspettano, senza fretta.' : lunga >= 7 ? 'Una settimana intera senza saltare un giorno.' : 'Ogni pagina scritta è una cosa salvata.';
    return { scritti: keys.length, lunga, ora, caselle: fatte + ' / ' + tot, frase };
  }
  function prossime() {
    const t = oggiKey();
    return S.ric.map(r => {
      let date = r.date;
      if (r.yearly) { const md = r.date.slice(5); date = t.slice(0, 4) + '-' + md; if (date < t) date = (+t.slice(0, 4) + 1) + '-' + md; }
      return { r, date };
    }).filter(x => x.date >= t).sort((a, b) => a.date < b.date ? -1 : 1).slice(0, 6).map(({ r, date }) => {
      const T = RIC[r.type] || RIC.altro;
      return `<div style="font-family:var(--mano);font-weight:600;line-height:1.3;color:${T.c}">${T.g} ${breve(daKey(date))} · ${esc(etichetta(r, T))}${r.yearly ? ' (ogni anno)' : ''}</div>`;
    });
  }
  function scordate() {
    const t = oggiKey(), mie = [];
    for (const k of Object.keys(S.note).sort()) {
      if (k >= t || mie.length >= 9) continue;
      (S.note[k].text || '').split('\n').forEach(l => {
        if (mie.length >= 9) return;
        if (/^\[ \] /.test(l) && l.slice(4).trim()) mie.push('«' + l.slice(4).trim() + '», ' + breve(daKey(k)));
        else if (/scord|dimentic/i.test(l)) mie.push('«' + l.replace(CASELLA, '').trim() + '», ' + breve(daKey(k)));
      });
    }
    return mie;
  }

  // ---------- pagine del libro ----------
  function rigaPagina(key, l, i) {
    const c = CASELLA.exec(l), punto = !c && l.startsWith('• '), fatta = c && c[1] !== ' ', testo = c ? l.slice(4) : punto ? l.slice(2) : l, ora = oraIn(testo);
    return `<div class="g-riga${fatta ? ' fatta' : ''}">` +
      (c ? `<span class="g-casella" data-act="spunta" data-k="${key}" data-i="${i}"><span>${fatta ? '✓' : ''}</span></span>` : '') +
      (punto ? '<span class="g-punto">•</span>' : '') +
      (ora ? `<span class="g-ora">${ora}</span>` : '') +
      `<span class="t">${testo ? esc(testo) : '&nbsp;'}</span></div>`;
  }
  function giornoHTML(g, L, j) {
    const n = S.note[g.key], rics = ricDi(g.key), r = rics[0], T = r ? RIC[r.type] || RIC.altro : null;
    const righe = n && n.text ? n.text.split('\n') : [], scritto = righe.some(x => x.replace(CASELLA, '').trim());
    // sulla pagina c'è solo ciò che la persona ha scritto; versi e battute stanno nel biglietto da aprire
    const corpo = scritto ? `<div class="g-note${S.appena === g.key ? ' appena' : ''}">${righe.map((l, i) => rigaPagina(g.key, l, i)).join('')}</div>` : '';
    const mese = g.d.getDate() === 1 || (j === 0 && L) ? MS[g.d.getMonth()] : '';
    const sfondo = S.lampo === g.key || !T ? '' : `--wash:${T.w};`;
    const sp = g.biglietto, tm = g.tema, letto = sp && S.letti.includes(g.key) ? ' letto' : '';
    // i giorni di festa hanno la carta del loro colore e un piccolo disegno
    return `<div class="giorno${g.dentro ? '' : ' fuori'}${S.lampo === g.key ? ' lampo' : ''}${tm ? ' festivo' : ''}${sfondo ? ' con-ric' : ''}" data-act="giorno" data-k="${g.key}" style="flex:${L ? 1 : j < 5 ? 1 : 0.8};${sfondo}${tm ? `--rgb:${tm.rgb}` : ''}">` +
      (tm ? `<span class="g-illu">${tm.svg}</span>` : '') +
      `<div class="g-testa"><span class="g-num${oggiKey() === g.key ? ' oggi' : ''}">${g.d.getDate()}</span><span class="g-nome">${DN[g.dow]}</span><span class="g-mese">${mese}</span></div>` +
      (g.festa ? `<div class="g-festa">${esc(g.festa)}</div>` : '') +
      (r ? `<div class="g-ric" style="color:${T.c}">${T.g} ${esc(etichetta(r, T))}${rics.length > 1 ? ' +' + (rics.length - 1) : ''}</div>` : '') +
      `<div class="g-corpo">${corpo}</div>` + attacchi(g) +
      (sp && sp.tipo === 'busta' ? `<span class="busta${letto}" data-act="sorpresa" data-k="${g.key}" role="button" aria-label="Una busta con un verso per oggi"></span>` : '') +
      (sp && sp.tipo === 'foglia' ? `<span class="foglia${letto}" data-act="sorpresa" data-k="${g.key}" role="button" aria-label="Qualcosa tra le pagine">❦</span>` : '') +
      (sp && sp.tipo === 'biglietto' ? `<span class="biglietto${letto}" data-act="sorpresa" data-k="${g.key}" role="button" aria-label="Un biglietto tra le pagine">N° ${sp.n}</span>` : '') +
      `</div>`;
  }
  // sulla pagina: la lettera che si apre oggi, il disegno e la polaroid del giorno, piccoli in un angolo
  const ALTO_DIS = 750, fotoURL = {}, fotoBlob = {}, fotoDati = {};
  function attacchi(g) {
    const ds = S.dis[g.key], u = S.foto[g.key] && fotoURL[g.key], lt = S.lettere.filter(l => l.apre === g.key);
    if (!ds && !u && !lt.length) return '';
    return `<span class="g-attacchi${g.biglietto ? ' spostati' : ''}">` +
      lt.map(l => `<span class="lettera${l.aperta ? ' letto' : ''}" data-act="lettera" data-id="${l.id}" role="button" aria-label="Una lettera dal passato"></span>`).join('') +
      (ds ? `<span class="g-disegno">${E.trattiSVG(ds, ALTO_DIS)}</span>` : '') +
      (u ? `<span class="g-polaroid" style="--r:${S.foto[g.key].r || 0}deg"><img src="${u}" alt=""></span>` : '') + '</span>';
  }
  function settimana(w, L) {
    const d0 = giorni[w * 7].d, d6 = giorni[w * 7 + 6].d;
    let titolo, sotto;
    if (L) { titolo = d0.getMonth() === d6.getMonth() ? M[d0.getMonth()] : M[d0.getMonth()] + ' · ' + M[d6.getMonth()]; sotto = d0.getFullYear() === d6.getFullYear() ? String(d0.getFullYear()) : d0.getFullYear() + ' – ' + d6.getFullYear(); }
    else { titolo = 'Settimana ' + settIso(d0); sotto = d0.getDate() + ' ' + MS[d0.getMonth()] + ' – ' + d6.getDate() + ' ' + MS[d6.getMonth()]; }
    const js = L ? [0, 1, 2] : [3, 4, 5, 6];
    return `<div class="sett"><div class="sett-testa"><div class="sett-titolo">${titolo}</div><div class="sett-sotto">${sotto}</div><span class="ghirigoro">${DOOD[(w * 3 + (L ? 0 : 1)) % DOOD.length]}</span></div>` +
      `<div class="giorni">${js.map(j => giornoHTML(giorni[w * 7 + j], L, j)).join('')}</div></div>`;
  }
  function linguette(w, L) {
    const js = L ? [0, 1, 2] : [3, 4, 5, 6];
    return `<div class="linguette">${js.map(j => { const g = giorni[w * 7 + j]; return `<div style="flex:${L ? 1 : j < 5 ? 1 : 0.8};min-height:0;padding-top:${g.dow * 0.5}em"><div class="linguetta" data-act="giorno" data-k="${g.key}" style="background:${TABC[g.dow]}">${DT[g.dow]}</div></div>`; }).join('')}</div>`;
  }
  const nome = () => (S.imp.nome || '').trim(), tel = () => (S.imp.tel || '').trim();
  // uno scarabocchio a penna sul frontespizio: un ricciolo con una stellina
  const SCARABOCCHIO = `<svg class="p-scarabocchio" viewBox="0 0 120 70" aria-hidden="true"><path d="M8 52c10-2 18-12 16-20s-12-6-12 2 12 14 24 10 22-20 20-28-12-6-12 4 10 24 26 24 20-8 26-14"/><path d="M98 14l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z"/><path d="M14 62c22 3 50 2 78-3"/></svg>`;
  function paginaFissa(s, L) {
    // copertina interna: «Se ritrovata» e il taschino con la copia delle note
    if (s === 0 && L) return `<div class="p-retro"><div class="p-cartiglio"><div class="p-ritrovata">Se ritrovata</div><div class="p-piccolo">restituire a</div><button class="p-riga" data-act="nome"><small>nome</small><span>${nome() ? esc(nome()) : ''}</span></button><button class="p-riga" data-act="nome"><small>tel.</small><span>${tel() ? esc(tel()) : ''}</span></button><div class="p-grazie">Grazie. Non sapevo più di averla.</div></div>${SCARABOCCHIO}` +
      `<div class="taschino"><div class="taschino-h">Nel taschino</div><button data-act="esporta">Salva una copia delle note</button><button data-act="importa">Riprendi una copia</button><button data-act="installa">Tienila sul telefono</button></div></div>`;
    if (s === 0) return `<div class="p-centro"><div class="p-occhiello">Agenda settimanale</div><div class="p-fregio">❦</div><div class="p-titolo">Cose Che Non Dovevo Scordare</div><div class="p-sotto">(Ma Ho Scordato)</div><div class="p-filo"></div>` +
      `<div class="p-piccolo">${breve(inizio).replace(/ (\d\d)$/, ' 20$1')}<br>${breve(fine).replace(/ (\d\d)$/, ' 20$1')}</div><div style="flex:1"></div>` +
      `<div class="p-occhiello" style="font-size:.6em">Questa agenda appartiene a</div><button class="p-nome${nome() ? '' : ' vuoto'}" data-act="nome">${nome() ? esc(nome()) : 'tocca e scrivi il tuo nome'}</button>` +
      `<div class="p-piccolo">Come si usa: alla pagina dopo ›</div></div>`;
    if (s === 1) {
      const voce = (n, t, d) => `<div class="g-voce"><b>${n}</b><span><strong>${t}</strong>${d}</span></div>`;
      if (L) return `<div class="p-guida"><div class="p-h">Come si usa</div>` +
        voce('I', 'Sfogliare', 'Con le frecce in basso, toccando gli angoli delle pagine o trascinandole.') +
        voce('II', 'Scrivere', 'Tocca un giorno: si apre la sua pagina. Si salva da sola, «Fatto» la richiude.') +
        voce('III', 'Liste', 'Sopra le righe scegli Testo, Elenco o Da spuntare.') +
        voce('IV', 'Orari', 'Scrivi «alle 20» e l’ora finisce a margine.') +
        voce('V', 'A mano e foto', '«Scrivi a mano» per disegnare col dito, «Una foto» per incollarla come una polaroid.') + `</div>`;
      return `<div class="p-guida"><div class="p-h">Piccole cose</div>` +
        voce('VI', 'Da ricordare', '«Ricorda questo giorno»: appuntamenti, visite, compleanni, scadenze.') +
        voce('VII', 'Buste e biglietti', 'Tra le pagine, buste e biglietti da aprire: un verso o una battuta.') +
        voce('VIII', 'Lettere al futuro', 'Scrivila, sigillala: si apre solo nel giorno che scegli.') +
        `<div class="p-pref"><button data-act="suoni" role="switch" aria-checked="${!!S.imp.sound}"><i></i>Suoni della carta</button>` +
        `<div class="p-temi" role="radiogroup" aria-label="Carta"><span>Carta</span>${[['carta', 'Classica'], ['nero', 'Nera'], ['avorio', 'Avorio']].map(([t, n]) => `<button data-act="tema" data-t="${t}" role="radio" aria-checked="${S.imp.tema === t}">${n}</button>`).join('')}</div></div>` +
        `<div class="p-prova"><button data-act="oggi">Vai a oggi ›</button><button data-act="atelier">Decora la copertina ›</button></div></div>`;
    }
    if (L) {
      const mie = scordate();
      return `<div class="p-elenco"><div class="p-h">Cose che ho scordato</div><div class="p-nota">Le caselle rimaste vuote nei giorni passati.<br>Nessun rimprovero: solo un promemoria.</div>` +
        (mie.length ? `<div class="p-voci mie">${mie.map(t => `<div class="v"><b>✗</b><span>${esc(t)}</span></div>`).join('')}</div>` : `<div class="p-voci" style="color:var(--muted)">Per ora niente. Ottimo segno.</div>`) + `</div>`;
    }
    const st = numeri(), pr = prossime();
    return `<div class="p-elenco"><div class="p-h">Il mio anno, in numeri</div><div class="p-numeri">` +
      `<b>${st.scritti}</b><span>giorni in cui ho scritto</span><b>${st.lunga}</b><span>giorni di fila, la serie più lunga</span><b>${st.ora}</b><span>giorni di fila, la serie attuale</span><b>${st.caselle}</b><span>caselle spuntate</span></div>` +
      `<div style="font-family:var(--mano);color:var(--ink2);margin-top:.9em">${st.frase}</div><div class="p-sez">Giorni da ricordare</div>` +
      (pr.length ? pr.join('') : `<div style="font-family:var(--mano);color:var(--muted)">Nessuno ancora. Si aggiungono dalla pagina di un giorno.</div>`) + `</div>`;
  }
  const OMBRE = {
    F: 'linear-gradient(to left,rgba(40,24,10,.5),rgba(40,24,10,.12) 55%,rgba(255,246,226,.22))',
    B: 'linear-gradient(to right,rgba(40,24,10,.5),rgba(40,24,10,.12) 55%,rgba(255,246,226,.22))',
    L: 'linear-gradient(to left,rgba(40,24,10,.7),transparent 75%)',
    R: 'linear-gradient(to right,rgba(40,24,10,.7),transparent 75%)'
  };
  function pagina(s, lato, ruolo) {
    const L = lato === 'sx', statica = ruolo === 'L' || ruolo === 'R';
    let tr = 'none';
    if (!statica) { const a = angoloFlip(); tr = ruolo === 'F' ? `rotateY(${a}deg)` : `rotateY(${a}deg) translateX(100%) rotateY(180deg)`; }
    const vis = ruolo === 'L' && S.fase !== 'aperta' && S.fase !== 'chiusura' ? 'hidden' : 'visible';
    const aperto = statica && !S.flip && S.fase === 'aperta';
    // angoli da toccare: in doppia pagina uno per lato; con una pagina sola entrambi sulla stessa
    const angolo = (dir, cls) => `<button class="angolo${cls}" data-act="angolo" data-dir="${dir}" aria-label="${dir < 0 ? 'Pagina precedente' : 'Pagina successiva'}"><span></span></button>`;
    const angoli = !aperto ? '' : S.singolo ? (S.pos > 0 ? angolo(-1, ' a-sx') : '') + (S.pos < maxPos() ? angolo(1, ' a-dx') : '')
      : !((s === 0 && L) || (s === LAST && !L)) ? angolo(L ? -1 : 1, '') : '';
    const sett = s >= PRIMA && s < LAST;
    return `<div class="pg ${lato}" data-ruolo="${ruolo}" style="left:${ruolo === 'L' || S.singolo ? 0 : '50%'};z-index:${statica ? 1 : 5};transform:${tr};visibility:${vis}">` +
      (sett && !S.singolo ? linguette(s - PRIMA, L) : '') +
      `<div class="carta">${sett ? settimana(s - PRIMA, L) : paginaFissa(s, L)}<div class="piega"></div>` + angoli +
      `<div class="ombra" style="background:${OMBRE[ruolo]}"></div></div></div>`;
  }

  function disegna() {
    S.spread = spreadDiPos(S.pos);
    const c = S.spread, f = S.flip;
    let slot;
    if (S.singolo) {
      // una pagina alla volta: sotto quella che arriva (o resta), sopra quella che gira attorno al dorso
      const fac = p => [p >> 1, p % 2 ? 'dx' : 'sx'], [cs, cl] = fac(S.pos);
      if (!f) slot = [pagina(cs, cl, 'R')];
      else { const [ts, tl] = fac(f.to); slot = f.dir > 0 ? [pagina(ts, tl, 'R'), pagina(cs, cl, 'F')] : [pagina(cs, cl, 'R'), pagina(ts, tl, 'F')]; }
    }
    else if (!f) slot = [pagina(c, 'sx', 'L'), pagina(c, 'dx', 'R')];
    else if (f.dir > 0) slot = [pagina(c, 'sx', 'L'), pagina(f.to, 'dx', 'R'), pagina(c, 'dx', 'F'), pagina(f.to, 'sx', 'B')];
    else slot = [pagina(f.to, 'sx', 'L'), pagina(c, 'dx', 'R'), pagina(f.to, 'dx', 'F'), pagina(c, 'sx', 'B')];
    pagineEl.innerHTML = slot.join('');
    // se la scrittura non ci sta: si taglia a righe intere e finisce con «…» (aprendo il giorno si legge tutta)
    pagineEl.querySelectorAll('.g-corpo').forEach(c => {
      if (!c.firstElementChild) return;
      const lh = parseFloat(getComputedStyle(c).lineHeight), h = Math.floor(c.clientHeight / lh) * lh;
      c.style.maxHeight = h + 'px';
      c.classList.toggle('troppo', c.scrollHeight > h + 2);
    });
    $('#mz-sx').style.width = (1 + 6 * c / LAST).toFixed(1) + 'px';
    $('#mz-dx').style.width = (1 + 6 * (1 - c / LAST)).toFixed(1) + 'px';
    const bm = S.imp.bookmark, aperto = S.fase === 'aperta' && !f;
    // il nastro esce dalla cucitura; se la pagina segnata è un'altra, la coda spunta dal lato dove si trova
    $('#segnalibro').innerHTML = aperto && bm === c ? '<div class="nastro" aria-hidden="true"><span></span></div>'
      : aperto && bm != null ? `<button class="coda ${bm > c ? 'avanti' : 'indietro'}" data-act="al-nastro" aria-label="Vai alla pagina segnata"><span></span></button>` : '';
    const bn = $('#b-nastro'); bn.classList.toggle('acceso', bm === c); bn.lastElementChild.textContent = bm === c ? 'Togli' : 'Segna';
    let tt = 'Cose Che Non Dovevo Scordare', ts = 'Frontespizio';
    if (c >= PRIMA && c < LAST) { const d0 = giorni[(c - PRIMA) * 7].d, d3 = giorni[(c - PRIMA) * 7 + 3].d; tt = M[d3.getMonth()] + ' ' + d3.getFullYear(); ts = 'Settimana ' + settIso(d0); }
    else if (c === 1) { tt = 'Come si usa'; ts = 'Prima di cominciare'; }
    else if (c === LAST) { tt = 'In fondo all’agenda'; ts = 'Cose scordate e numeri'; }
    $('#t-titolo').textContent = tt; $('#t-sotto').textContent = ts;
    // il tema sta sulla radice, così vale anche per la pagina del giorno e i fogli
    const rad = document.documentElement;
    rad.classList.toggle('t-nero', S.imp.tema === 'nero'); rad.classList.toggle('t-avorio', S.imp.tema === 'avorio');
    document.querySelector('meta[name="theme-color"]').content = S.imp.tema === 'nero' ? '#000000' : '#3a2216';
  }

  // ---------- veli (menu, vai a, nome, ricerca, sorpresa) ----------
  let installa = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installa = e; });
  const veli = ['#v-menu', '#v-vaia', '#v-nome', '#v-cerca', '#v-sorpresa'];
  function chiudiVeli() { veli.forEach(v => { $(v).hidden = true; }); }
  function apriVelo(v) { chiudiVeli(); $(v).hidden = false; }

  function infoInstalla() {
    if (installa) { installa.prompt(); installa = null; chiudiVeli(); return; }
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    apriVelo('#v-menu');
    $('#menu').innerHTML = `<div class="maniglia"></div><div class="dentro"><div class="h-foglio">Tienila sul telefono</div>` +
      `<div class="nota-p" style="font-size:14px;color:var(--ink)">${ios ? 'Tocca <b>Condividi</b> (il quadrato con la freccia) e poi <b>Aggiungi alla schermata Home</b>.' : 'Apri il menu del browser (<b>⋮</b>) e scegli <b>Installa app</b> o <b>Aggiungi a schermata Home</b>.'}</div>` +
      `<div class="nota-p">Così si apre come un’app, funziona anche senza rete e il telefono non cancella le note. Le note restano solo su questo telefono: ogni tanto salvane una copia dal menu.</div>` +
      `<div class="fila" style="justify-content:flex-end"><button class="btn pieno" data-act="chiudi">Ho capito</button></div></div>`;
  }
  function vaiA() {
    const mesi = [];
    for (let d = new Date(inizio.getFullYear(), inizio.getMonth(), 1, 12); d <= fine; d.setMonth(d.getMonth() + 1)) {
      const key = d < inizio ? D.INIZIO : ymd(d);
      const qui = S.spread >= PRIMA && S.spread < LAST && giorni[(S.spread - PRIMA) * 7 + 3].d.getMonth() === d.getMonth() && giorni[(S.spread - PRIMA) * 7 + 3].d.getFullYear() === d.getFullYear();
      mesi.push(`<button class="mese${qui ? ' qui' : ''}" data-act="vai-giorno" data-k="${key}">${M[d.getMonth()].slice(0, 3)}<br><small>${d.getFullYear()}</small></button>`);
    }
    $('#mesi').innerHTML = mesi.join('');
    const c = $('#vaia-data'); c.min = D.INIZIO; c.max = D.FINE; c.value = '';
    apriVelo('#v-vaia');
  }
  $('#vaia-data').addEventListener('change', e => { const v = e.target.value; if (v && perKey[v] && perKey[v].dentro) vaiGiorno(v); });
  function chiediNome() { const c = $('#nome-campo'); c.value = nome(); $('#tel-campo').value = tel(); apriVelo('#v-nome'); setTimeout(() => c.focus(), 60); }
  function salvaNome() {
    setImp({ nome: $('#nome-campo').value.trim(), tel: $('#tel-campo').value.trim() });
    if (S.atelier && S.atelier.oro) { S.atelier.oro = false; setImp({ cop: { ...cop(), oro: !!nome() } }); disegnaAtelier(); }
    chiudiVeli(); disegna(); disegnaCopertina();
  }
  $('#nome-campo').addEventListener('keydown', e => { if (e.key === 'Enter') $('#tel-campo').focus(); });
  $('#tel-campo').addEventListener('keydown', e => { if (e.key === 'Enter') salvaNome(); });

  function cerca() {
    const q = $('#cerca-campo').value.trim().toLowerCase(), out = [];
    let msg = '';
    if (q.length < 2) msg = 'Scrivi almeno due lettere.';
    else {
      for (const g of giorni) {
        if (!g.dentro) continue;
        const n = S.note[g.key], fonti = [];
        if (n && n.text) fonti.push(['Mia nota', n.text.replace(/^\[[ xX]\] /gm, '').replace(/\n/g, ' · '), 'var(--ink2)']);
        // si cercano solo i biglietti già aperti: quelli chiusi restano una sorpresa
        if (g.biglietto && S.letti.includes(g.key)) fonti.push([g.poesia ? g.poesia.autore : 'Biglietto', (g.poesia ? g.poesia.testo : g.biglietto.testo).replace(/\n/g, ' / '), 'var(--ink)']);
        S.lettere.forEach(l => { if (l.apre === g.key && l.aperta) fonti.push(['Lettera', l.testo.replace(/\n/g, ' · '), 'var(--ink2)']); });
        if (S.foto[g.key] && S.foto[g.key].testo) fonti.push(['Foto', S.foto[g.key].testo, 'var(--ink2)']);
        for (const [fonte, t, col] of fonti) {
          const i = t.toLowerCase().indexOf(q); if (i < 0) continue;
          const s0 = Math.max(0, i - 30), e0 = i + q.length;
          out.push(`<button class="ris" data-act="vai-giorno" data-k="${g.key}"><small>${breve(g.d)} · ${esc(fonte)}</small><div style="color:${col}">${s0 > 0 ? '…' : ''}${esc(t.slice(s0, i))}<mark>${esc(t.slice(i, e0))}</mark>${esc(t.slice(e0, e0 + 60))}${e0 + 60 < t.length ? '…' : ''}</div></button>`);
        }
        if (out.length >= 80) break;
      }
      msg = out.length ? (out.length >= 80 ? 'Primi 80 risultati.' : out.length + (out.length === 1 ? ' risultato' : ' risultati')) : 'Niente. O me lo sono scordato.';
    }
    $('#cerca-ris').innerHTML = out.join('') + `<div class="cerca-msg">${msg}</div>`;
  }
  $('#cerca-campo').addEventListener('input', cerca);
  function apriCerca() { apriVelo('#v-cerca'); cerca(); setTimeout(() => $('#cerca-campo').focus(), 40); }

  // un biglietto aperto resta aperto (la busta mostra il sigillo rotto)
  function segnaLetto(key) { if (S.letti.includes(key)) return; S.letti = [...S.letti, key]; scrivi('letti', S.letti); }
  function sorpresa(key) {
    const g = perKey[key], sp = g && g.biglietto; if (!sp) return;
    const p = sp.poesia, f = sp.tipo === 'foglia';
    $('#sorpresa').innerHTML = p
      ? `<div class="cartolina busta-c" data-act="chiudi"><div class="glifo">❦</div><div class="verso">${esc(p.testo)}</div><cite>${esc(p.autore)} · ${esc(p.opera)}</cite>${p.originale ? `<div class="orig">${esc(p.originale)}</div>` : ''}<small>${breve(g.d)} · tocca per richiudere</small></div>`
      : `<div class="cartolina ${f ? 'foglia-c' : 'biglietto-c'}" data-act="chiudi"><div class="glifo">${f ? '❦' : '✂'}</div><div class="frase">${esc(sp.testo)}</div><small>${breve(g.d)} · tocca per richiudere</small></div>`;
    apriVelo('#v-sorpresa'); suono('pagina'); segnaLetto(key); disegna();
  }
  // il biglietto dentro la pagina del giorno: piegato finché non lo tocchi
  function bigliettoGiorno(g, aperto) {
    const sp = g.biglietto; if (!sp) return '';
    if (!aperto) return `<button class="gp-biglietto tipo-${sp.tipo}" data-gp="apri-biglietto"><span class="gp-b-ico" aria-hidden="true"></span><span class="gp-b-testo"><b>${sp.poesia ? 'Un verso per oggi' : 'Un biglietto per oggi'}</b><small>Tocca per aprirlo</small></span></button>`;
    const p = sp.poesia;
    return `<div class="gp-aperto">` + (p ? `<div class="gp-poesia">${esc(p.testo)}<cite>${esc(p.autore)} · ${esc(p.opera)}</cite></div>` +
      (p.originale ? `<button class="gp-orig" data-gp="originale">Testo originale</button><div class="gp-orig-testo" hidden>${esc(p.originale)}</div>` : '')
      : `<div class="gp-frase">${esc(sp.testo)}</div>`) + `</div>`;
  }

  // ---------- avviso con Annulla ----------
  function avviso(msg, annulla) {
    clearTimeout(avviso.t);
    $('#avviso-testo').textContent = msg;
    const b = $('#avviso-annulla'); b.hidden = !annulla; b.onclick = () => { $('#avviso').hidden = true; annulla && annulla(); };
    $('#avviso').hidden = false; avviso.t = setTimeout(() => { $('#avviso').hidden = true; }, 4200);
  }

  // ---------- copia delle note ----------
  function esporta() {
    const foto = {}; Object.keys(S.foto).forEach(k => { if (fotoDati[k]) foto[k] = { ...S.foto[k], img: fotoDati[k] }; });
    const dati = { app: 'cose-che-non-dovevo-scordare', version: 3, exported: new Date().toISOString(), notes: S.note, hist: S.storia, rem: S.ric, bookmark: S.imp.bookmark, nome: S.imp.nome, tel: S.imp.tel,
      dis: S.dis, foto, lettere: S.lettere, letti: S.letti, copertina: S.imp.cop || null };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' }));
    a.download = 'note-agenda-' + oggiKey() + '.json'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    chiudiVeli(); avviso('Copia salvata');
  }
  $('#file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result); if (!d || typeof d.notes !== 'object') throw 0;
        S.note = { ...S.note, ...d.notes }; S.storia = { ...S.storia, ...(d.hist || {}) };
        if (Array.isArray(d.rem)) S.ric = [...S.ric.filter(x => !d.rem.some(y => y.id === x.id)), ...d.rem];
        if (d.nome && !nome()) setImp({ nome: d.nome, tel: d.tel || '' });
        if (d.dis && typeof d.dis === 'object') { S.dis = { ...S.dis, ...d.dis }; scrivi('dis', S.dis); }
        if (Array.isArray(d.lettere)) { S.lettere = [...S.lettere.filter(x => !d.lettere.some(y => y.id === x.id)), ...d.lettere]; scrivi('lettere', S.lettere); }
        if (Array.isArray(d.letti)) { S.letti = [...new Set([...S.letti, ...d.letti])]; scrivi('letti', S.letti); }
        if (d.copertina && !personalizzata()) { setImp({ cop: d.copertina }); disegnaCopertina(); }
        if (d.foto && typeof d.foto === 'object') Object.keys(d.foto).forEach(k => { const { img, ...meta } = d.foto[k]; if (img) E.daDataURL(img).then(b => salvaFoto(k, b, meta)).catch(() => {}); });
        scrivi('notes', S.note); scrivi('hist', S.storia); scrivi('rem', S.ric);
        chiudiVeli(); disegna(); avviso('Note riprese: ' + Object.keys(d.notes).length);
      } catch (_) { avviso('Questo file non è una copia dell’agenda'); }
    };
    r.readAsText(f); e.target.value = '';
  });

  // ---------- spuntare dalla pagina ----------
  function spunta(key, idx) {
    const n = S.note[key]; if (!n) return;
    const righe = n.text.split('\n'), l = righe[idx];
    if (/^\[ \] /.test(l)) righe[idx] = '[x] ' + l.slice(4); else if (/^\[[xX]\] /.test(l)) righe[idx] = '[ ] ' + l.slice(4); else return;
    S.note = { ...S.note, [key]: { ...n, text: righe.join('\n') } }; scrivi('notes', S.note); disegna();
  }

  // =====================================================================
  // ---------- pagina del giorno: data grande e poesia, righe col margine, si salva da sola ----------
  // =====================================================================
  const gp = $('#gp'), carta = $('#gp-carta'), righeEl = $('#gp-righe');
  const GP = { key: null, righe: [], orig: '', origT: 0, timer: 0, forma: null, versioni: false };
  const GG = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
  const daTesto = t => { const r = (t || '').split('\n').map(l => { const c = CASELLA.exec(l); return c ? { t: l.slice(4), c: c[1] !== ' ' } : l.startsWith('• ') ? { t: l.slice(2), c: 'p' } : { t: l, c: null }; }); return r.length ? r : [{ t: '', c: null }]; };
  // c: null = testo, 'p' = elenco puntato, false/true = da spuntare (non spuntata/spuntata)
  const aTesto = righe => { const r = righe.slice(); while (r.length && !r[r.length - 1].t.trim()) r.pop(); return r.map(x => (x.c === null ? '' : x.c === 'p' ? '• ' : x.c ? '[x] ' : '[ ] ') + x.t.replace(/\s+$/, '')).join('\n'); };
  const tipoDi = c => c === null ? 'testo' : c === 'p' ? 'punto' : 'fare';
  let chiestoPersist = false;

  function caricaGiorno(key) {
    const g = perKey[key];
    GP.key = key; GP.orig = (S.note[key] && S.note[key].text) || ''; GP.origT = S.note[key] ? S.note[key].t : 0;
    GP.righe = daTesto(GP.orig); GP.forma = null; GP.versioni = false;
    $('#gp-num').textContent = g.d.getDate();
    $('#gp-breve').textContent = DN[g.dow] + ' ' + g.d.getDate() + ' ' + M[g.d.getMonth()].toLowerCase();
    gp.classList.remove('scrive');
    $('#gp-titolo').textContent = DN[g.dow];
    $('#gp-mese').textContent = M[g.d.getMonth()].toLowerCase() + ' ' + g.d.getFullYear();
    $('#gp-sett').textContent = 'settimana ' + settIso(g.d);
    $('#gp-festa').textContent = g.festa;
    const tm = g.tema;
    carta.classList.toggle('festivo', !!tm); carta.style.setProperty('--rgb', tm ? tm.rgb : '0,0,0');
    $('#gp-illu').innerHTML = tm ? tm.svg : '';
    $('#gp-poesia').innerHTML = bigliettoGiorno(g, S.letti.includes(key));
    const pr = giorni[g.i - 1], ds = giorni[g.i + 1];
    const bp = $('[data-gp="prima"]'), bd = $('[data-gp="dopo"]');
    bp.disabled = !pr || !pr.dentro; bd.disabled = !ds || !ds.dentro;
    $('#gp-prima').textContent = pr ? GG[pr.dow] + ' ' + pr.d.getDate() : '';
    $('#gp-dopo').textContent = ds ? GG[ds.dow] + ' ' + ds.d.getDate() : '';
    $('#gp-salvato').textContent = '';
    GP.lettera = null;
    disegnaRicordi(); disegnaLettere(); disegnaVersioni(); disegnaRighe(null); disegnaExtra();
    ['#gp-scorri', '#gp-sx', '#gp-dx'].forEach(s => { $(s).scrollTop = 0; });
  }

  function disegnaRicordi() {
    const mie = ricDi(GP.key), F = GP.forma;
    let h = mie.length ? '<div class="gp-h">Da ricordare</div>' : '';
    h += mie.map(r => { const T = RIC[r.type] || RIC.altro; return `<div class="ricordo" style="color:${T.c}"><span>${T.g} ${esc(etichetta(r, T))}</span><small>${r.yearly ? 'ogni anno' : 'solo quest’anno'}</small><button data-gp="togli-ric" data-id="${r.id}" aria-label="Togli ${esc(r.label || T.n)}">×</button></div>`; }).join('');
    if (F) {
      const ph = RIC[F.type].ph || (F.type === 'compleanno' ? 'Di chi? Es. Marta' : F.type === 'scadenza' ? 'Cosa scade? Es. bollo auto' : 'Cosa ricordi? Es. anniversario');
      h += `<div class="gp-forma"><div class="gp-h">Ricorda questo giorno</div>` +
        `<div class="scelte" role="radiogroup">${Object.keys(RIC).map(k => `<button class="scelta${F.type === k ? ' on' : ''}" data-gp="tipo-ric" data-t="${k}" role="radio" aria-checked="${F.type === k}" style="--c:${RIC[k].c}"><b>${RIC[k].g}</b>${RIC[k].n}</button>`).join('')}</div>` +
        `<input class="campo" id="ric-campo" value="${esc(F.label)}" placeholder="${ph}" maxlength="60">` +
        (RIC[F.type].ora ? `<label class="ric-ora"><span>Alle</span><input type="time" class="campo" id="ric-ora" value="${F.ora || ''}" aria-label="Ora"><small>se serve</small></label>` : '') +
        `<button class="anno${F.yearly ? ' on' : ''}" data-gp="ogni-anno" role="checkbox" aria-checked="${F.yearly}"><span></span>Torna ogni anno</button>` +
        `<div class="fila fine"><button class="btn" data-gp="chiudi-ric">Annulla</button><button class="btn pieno" data-gp="aggiungi-ric">Aggiungi</button></div></div>`;
    } else h += `<button class="gp-link" data-gp="apri-ric"><b>+</b>Ricorda questo giorno</button>`;
    $('#gp-ricordi').innerHTML = h;
    const c = $('#ric-campo');
    if (c) { c.addEventListener('input', () => { F.label = c.value; }); c.addEventListener('keydown', e => { if (e.key === 'Enter') aggiungiRic(); }); }
    const o = $('#ric-ora'); if (o) o.addEventListener('input', () => { F.ora = o.value; });
  }
  function aggiungiRic() {
    const F = GP.forma; if (!F) return;
    S.ric = [...S.ric, { id: Date.now().toString(36), date: GP.key, type: F.type, label: F.label.trim(), yearly: F.yearly, ...(RIC[F.type].ora && F.ora ? { ora: F.ora } : {}) }];
    scrivi('rem', S.ric); GP.forma = null; disegnaRicordi();
    $('#gp-salvato').textContent = 'Ricordo aggiunto';
  }
  // ---------- lettere al futuro: si sigillano e si aprono solo dal giorno scelto ----------
  const lungo = d => d.getDate() + ' ' + M[d.getMonth()].toLowerCase() + ' ' + d.getFullYear();
  const tra = k => { const n = Math.round((daKey(k) - daKey(oggiKey())) / 864e5); return n === 1 ? 'domani' : 'tra ' + n + ' giorni'; };
  const domani = () => { const d = daKey(oggiKey()); d.setDate(d.getDate() + 1); return ymd(d); };
  function segnaAperta(id) { S.lettere = S.lettere.map(x => x.id === id ? { ...x, aperta: true } : x); scrivi('lettere', S.lettere); }
  // dalla pagina del libro: chiusa avvisa quando si apre, dal giorno giusto si legge
  function apriLettera(id) {
    const l = S.lettere.find(x => x.id === id); if (!l) return;
    if (oggiKey() < l.apre) { avviso('Sigillata: si apre il ' + lungo(daKey(l.apre)) + ', ' + tra(l.apre)); return; }
    $('#sorpresa').innerHTML = `<div class="cartolina lettera-c" data-act="chiudi"><div class="glifo">✉</div><div class="frase">${esc(l.testo)}</div><small>Scritta il ${lungo(daKey(l.scritta))} · tocca per richiudere</small></div>`;
    apriVelo('#v-sorpresa'); suono('pagina'); segnaAperta(id); disegna();
  }
  function disegnaLettere() {
    const k = GP.key, oggi = oggiKey(), F = GP.lettera;
    let h = S.lettere.filter(l => l.apre === k).map(l => {
      const puo = oggi >= l.apre;
      if (puo && l.aperta) return `<div class="gp-aperto"><div class="gp-frase gp-lettera">${esc(l.testo)}<small>Scritta il ${lungo(daKey(l.scritta))}</small></div></div>`;
      return `<button class="gp-biglietto tipo-lettera" data-gp="lettera" data-id="${l.id}"><span class="gp-b-ico" aria-hidden="true"></span><span class="gp-b-testo"><b>${puo ? 'Una lettera per te' : 'Una lettera sigillata'}</b><small>${puo ? 'Scritta il ' + breve(daKey(l.scritta)) + ' · tocca per aprirla' : 'Si apre il ' + lungo(daKey(l.apre))}</small></span></button>`;
    }).join('');
    h += S.lettere.filter(l => l.scritta === k && l.apre !== k).map(l => `<div class="gp-spedita">✉ Lettera sigillata: si apre il ${lungo(daKey(l.apre))}</div>`).join('');
    if (F) h += `<div class="gp-forma"><div class="gp-h">Una lettera al futuro</div>` +
      `<textarea class="campo gp-lettera-campo" id="lett-campo" rows="5" maxlength="3000" placeholder="Cara me di quel giorno…">${esc(F.testo)}</textarea>` +
      `<label class="gp-h" for="lett-data" style="margin:0">Si apre il</label><input type="date" class="campo" id="lett-data" min="${domani()}" max="${D.FINE}" value="${F.apre}">` +
      `<div class="nota-p">Fino a quel giorno resta sigillata: nemmeno tu potrai leggerla.</div>` +
      `<div class="fila fine"><button class="btn" data-gp="chiudi-lettera">Annulla</button><button class="btn pieno" data-gp="sigilla">Sigilla</button></div></div>`;
    else if (oggi < D.FINE) h += `<button class="gp-link" data-gp="nuova-lettera"><b>✉</b>Una lettera al futuro</button>`;
    $('#gp-lettere').innerHTML = h;
    const t = $('#lett-campo'), d = $('#lett-data');
    if (t) { t.addEventListener('input', () => { F.testo = t.value; }); d.addEventListener('change', () => { F.apre = d.value; }); }
  }
  function nuovaLettera() {
    const oggi = oggiKey(), d = daKey(oggi); d.setMonth(d.getMonth() + 6);
    // dalla pagina di un giorno futuro la lettera è per quel giorno, altrimenti tra sei mesi
    GP.lettera = { testo: '', apre: GP.key > oggi ? GP.key : ymd(d) > D.FINE ? D.FINE : ymd(d) };
    disegnaLettere(); setTimeout(() => { const c = $('#lett-campo'); if (c) { c.focus({ preventScroll: true }); c.scrollIntoView({ block: 'nearest' }); } }, 30);
  }
  function sigilla() {
    const F = GP.lettera; if (!F) return;
    if (!F.testo.trim()) { $('#lett-campo').focus(); return; }
    if (!(F.apre > oggiKey() && F.apre <= D.FINE)) { avviso('Scegli un giorno da domani al ' + lungo(fine)); return; }
    S.lettere = [...S.lettere, { id: Date.now().toString(36), scritta: oggiKey(), apre: F.apre, testo: F.testo.trim() }]; scrivi('lettere', S.lettere);
    GP.lettera = null; disegnaLettere(); suono('penna');
    avviso('Lettera sigillata: si apre il ' + lungo(daKey(F.apre)));
  }

  // ---------- a mano e polaroid, sotto le righe ----------
  function disegnaExtra() {
    const k = GP.key, ds = S.dis[k], f = S.foto[k], u = f && fotoURL[k];
    $('#gp-extra').innerHTML =
      (u ? `<figure class="gp-polaroid" style="--r:${f.r || 0}deg"><img src="${u}" alt="La foto di questo giorno"><figcaption><input id="foto-testo" maxlength="60" placeholder="Scrivi sotto la foto…" value="${esc(f.testo || '')}" aria-label="Scritta sotto la foto"></figcaption><button class="gp-togli" data-gp="togli-foto" aria-label="Togli la foto">×</button></figure>` : '') +
      (ds ? `<div class="gp-disegno"><button class="gp-disegno-apri" data-gp="disegna" aria-label="Continua a scrivere a mano">${E.trattiSVG(ds, ALTO_DIS)}</button><button class="gp-togli" data-gp="togli-disegno" aria-label="Togli la scrittura a mano">×</button></div>` : '') +
      `<div class="gp-aggiungi"><button class="gp-link" data-gp="disegna"><b>✎</b>${ds ? 'Continua a mano' : 'Scrivi a mano'}</button><button class="gp-link" data-gp="foto"><b>◫</b>${u ? 'Cambia la foto' : 'Una foto'}</button></div>`;
    const c = $('#foto-testo');
    if (c) c.addEventListener('input', () => { S.foto = { ...S.foto, [k]: { ...S.foto[k], testo: c.value } }; scrivi('foto', S.foto); });
  }
  function scriviAMano() {
    const k = GP.key; if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    E.lavagna({ titolo: 'Scrivi a mano', alto: ALTO_DIS, tratti: S.dis[k] || [], colori: ['blu', 'nero', 'rosso', 'verde'], classe: 'lav-carta', fatto: T => {
      const d = { ...S.dis }; if (T.length) d[k] = T; else delete d[k];
      S.dis = d; scrivi('dis', d); if (GP.key === k) disegnaExtra(); disegna(); if (T.length) suono('penna');
    } });
  }
  // la foto ridotta va nel database del browser (come testo, il formato che tutti i browser conservano);
  // nelle note solo la scritta e l'inclinazione della polaroid
  function salvaFoto(k, blob, meta) {
    return E.aDataURL(blob).then(u => E.media.metti('foto-' + k, u).then(() => u)).then(u => {
      if (fotoURL[k]) URL.revokeObjectURL(fotoURL[k]);
      fotoBlob[k] = blob; fotoURL[k] = URL.createObjectURL(blob); fotoDati[k] = u;
      S.foto = { ...S.foto, [k]: { testo: '', r: Math.round(Math.random() * 8 - 4), ...S.foto[k], ...meta, t: Date.now() } }; scrivi('foto', S.foto);
      if (GP.key === k) disegnaExtra(); disegna();
    });
  }
  $('#foto-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0], k = $('#foto-file').dataset.k; e.target.value = ''; if (!f || !k) return;
    E.riduci(f).then(b => salvaFoto(k, b, {})).then(() => avviso('Foto incollata')).catch(() => avviso('Questa foto non si riesce a incollare'));
  });
  function togliFoto(k) {
    const meta = S.foto[k], blob = fotoBlob[k]; if (!meta) return;
    const f = { ...S.foto }; delete f[k]; S.foto = f; scrivi('foto', f); E.media.togli('foto-' + k).catch(() => {});
    disegnaExtra(); disegna();
    avviso('Foto tolta', () => { if (blob) salvaFoto(k, blob, meta); });
  }
  function togliDisegno(k) {
    const prima = S.dis[k]; if (!prima) return;
    const d = { ...S.dis }; delete d[k]; S.dis = d; scrivi('dis', d); disegnaExtra(); disegna();
    avviso('Scrittura a mano tolta', () => { S.dis = { ...S.dis, [k]: prima }; scrivi('dis', S.dis); if (GP.key === k) disegnaExtra(); disegna(); });
  }

  function disegnaVersioni() {
    const h = S.storia[GP.key] || [], el = $('#gp-versioni');
    if (!h.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<button class="gp-link piano" data-gp="versioni">${GP.versioni ? 'Nascondi le pagine precedenti' : 'Pagine precedenti (' + h.length + ')'}</button>` +
      (GP.versioni ? h.map((v, i) => `<div class="versione"><div><small>${new Date(v.t).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small><span>${esc(v.text.replace(/^\[[ xX]\] /gm, '').replace(/\n/g, ' · '))}</span></div><button class="piccolo-btn" data-gp="ripristina" data-i="${i}">Riprendi</button></div>`).join('') + '<div class="nota-p" style="margin-top:6px">Riprendi una versione: sostituisce la pagina, e quella di adesso resta qui.</div>' : '');
  }

  function adatta(ta) { const lh = parseFloat(getComputedStyle(ta).lineHeight) || 36; ta.style.height = lh + 'px'; ta.style.height = Math.max(lh, Math.ceil((ta.scrollHeight - 2) / lh) * lh) + 'px'; }
  function disegnaRighe(fuoco) {
    const vuota = GP.righe.every(r => !r.t);
    righeEl.innerHTML = GP.righe.map((r, i) => {
      const ora = oraIn(r.t), fare = r.c === true || r.c === false;
      return `<div class="riga ${tipoDi(r.c)}${r.c === true ? ' fatta' : ''}">` +
        (fare ? `<button class="spunta" data-gp="spunta" data-i="${i}" tabindex="-1" aria-label="${r.c ? 'Togli la spunta' : 'Spunta'}"><span></span></button>` : '') +
        (r.c === 'p' ? '<span class="punto-segno" aria-hidden="true">•</span>' : '') +
        `<textarea rows="1" data-i="${i}" enterkeyhint="enter" autocapitalize="sentences" aria-label="Riga ${i + 1}"${vuota && i === 0 ? ' placeholder="Scrivi qui…"' : ''}>${esc(r.t)}</textarea>` +
        (ora ? `<span class="ora">${ora}</span>` : '') + `</div>`;
    }).join('');
    righeEl.querySelectorAll('textarea').forEach(adatta);
    if (fuoco) fuocoRiga(fuoco.i, fuoco.pos, fuoco.scorri !== false);
    aggiornaStile();
  }
  // la scelta Testo / Elenco / Da spuntare mostra il tipo della riga su cui stai scrivendo
  function aggiornaStile() {
    const r = GP.righe[GP.ultimo >= 0 && GP.ultimo < GP.righe.length ? GP.ultimo : GP.righe.length - 1], t = r ? tipoDi(r.c) : 'testo';
    document.querySelectorAll('.gp-stile button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === t)));
  }
  function fuocoRiga(i, pos, scorri = true) {
    const ta = righeEl.querySelector(`textarea[data-i="${i}"]`); if (!ta) return;
    ta.focus({ preventScroll: true });
    const p = pos == null ? ta.value.length : Math.min(pos, ta.value.length); ta.setSelectionRange(p, p);
    if (scorri) ta.scrollIntoView({ block: 'nearest' });
  }
  function schedula() { clearTimeout(GP.timer); $('#gp-salvato').textContent = ''; GP.timer = setTimeout(salvaGiorno, 450); }
  function salvaGiorno() {
    clearTimeout(GP.timer); if (!GP.key) return;
    const t = aTesto(GP.righe), cur = (S.note[GP.key] && S.note[GP.key].text) || '';
    if (t === cur) return;
    const note = { ...S.note };
    if (t.replace(/^\[[ xX]\] /gm, '').trim()) note[GP.key] = { text: t, t: Date.now() }; else delete note[GP.key];
    S.note = note; scrivi('notes', note);
    $('#gp-salvato').textContent = '✓ Salvato';
    if (!chiestoPersist && navigator.storage && navigator.storage.persist) { chiestoPersist = true; navigator.storage.persist().catch(() => {}); }
  }
  // chiude il lavoro sul giorno: salva e mette la versione precedente tra le pagine precedenti
  function concludiGiorno() {
    salvaGiorno();
    const ora = (S.note[GP.key] && S.note[GP.key].text) || '', prima = GP.orig;
    if (ora === prima) return null;
    if (prima) { S.storia = { ...S.storia, [GP.key]: [{ t: GP.origT || Date.now(), text: prima }, ...(S.storia[GP.key] || [])].slice(0, 8) }; scrivi('hist', S.storia); }
    return { key: GP.key, prima };
  }

  function apriGiorno(key, el) {
    if (noClick || flip || S.fase !== 'aperta') return;
    const g = perKey[key]; if (!g || !g.dentro) return;
    caricaGiorno(key);
    gp.hidden = false; posizionaGp();
    // si apre dal riquadro del giorno toccato
    carta.classList.remove('anima'); carta.style.transform = ''; carta.style.opacity = '';
    const f = carta.getBoundingClientRect(), r = el && el.getBoundingClientRect();
    if (r && r.width) { carta.style.transform = `translate(${r.left - f.left}px,${r.top - f.top}px) scale(${r.width / f.width},${r.height / f.height})`; carta.style.opacity = '0.35'; }
    void carta.offsetWidth;
    carta.classList.add('anima'); carta.style.transform = 'none'; carta.style.opacity = '1'; gp.classList.add('su');
    suono('pagina');
    // giorno vuoto: si scrive subito (il fuoco va dato dentro il tocco, se no iPhone non apre la tastiera)
    if (!GP.orig) fuocoRiga(0, 0, false);
  }
  function chiudiGiorno() {
    if (gp.hidden) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const fatto = concludiGiorno(), key = GP.key, g = perKey[key], stessa = posDiGiorno(g) === S.pos;
    if (fatto) S.appena = key;
    if (stessa) disegna();
    const el = stessa && pagineEl.querySelector(`.giorno[data-k="${key}"]`), f = carta.getBoundingClientRect(), r = el && el.getBoundingClientRect();
    carta.style.transform = r ? `translate(${r.left - f.left}px,${r.top - f.top}px) scale(${r.width / f.width},${r.height / f.height})` : 'translateY(40px)';
    carta.style.opacity = '0'; gp.classList.remove('su');
    setTimeout(() => {
      gp.hidden = true; GP.key = null;
      if (!stessa) vaiGiorno(key, false);
      setTimeout(() => { if (S.appena === key) S.appena = null; }, 1400);
    }, 340);
    if (fatto) {
      suono('penna');
      avviso(fatto.prima ? 'Modifica salvata' : 'Nota salvata', () => {
        const n = { ...S.note }; if (fatto.prima) n[key] = { text: fatto.prima, t: Date.now() }; else delete n[key];
        S.note = n; scrivi('notes', n);
        if (fatto.prima && S.storia[key]) { S.storia = { ...S.storia, [key]: S.storia[key].slice(1) }; scrivi('hist', S.storia); }
        disegna(); avviso('Modifica annullata');
      });
    }
  }
  function cambiaGiorno(dir) {
    const g = perKey[GP.key], nuovo = giorni[g.i + dir]; if (!nuovo || !nuovo.dentro) return;
    concludiGiorno(); disegna(); caricaGiorno(nuovo.key);
    suono('pagina');
  }
  // la pagina del giorno segue la parte visibile dello schermo (sopra la tastiera)
  // la tastiera è aperta quando la parte visibile è molto più bassa di quella piena (misurata a ogni larghezza nuova)
  const pieno = { w: 0, h: 0 };
  function posizionaGp() {
    const vv = window.visualViewport; if (!vv) return;
    if (vv.width !== pieno.w) { pieno.w = vv.width; pieno.h = 0; }
    pieno.h = Math.max(pieno.h, vv.height);
    if (gp.hidden) return;
    gp.style.height = vv.height + 'px'; gp.style.top = vv.offsetTop + 'px';
    gp.classList.toggle('tastiera', vv.height < pieno.h * 0.8);
  }
  posizionaGp();
  if (window.visualViewport) { visualViewport.addEventListener('resize', posizionaGp); visualViewport.addEventListener('scroll', posizionaGp); }
  addEventListener('pagehide', () => { if (!gp.hidden) salvaGiorno(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !gp.hidden) salvaGiorno(); });

  // scrittura: invio = riga nuova, «- » = casella, cancella a inizio riga = toglie casella o unisce
  righeEl.addEventListener('input', e => {
    const ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
    const i = +ta.dataset.i, r = GP.righe[i], v = ta.value;
    gp.classList.add('scrive');
    if (v.includes('\n')) {
      const parti = v.split('\n');
      if (r.c !== null && !parti[0].trim() && parti.length === 2 && !parti[1]) { r.c = null; r.t = ''; disegnaRighe({ i, pos: 0 }); schedula(); return; }
      r.t = parti[0];
      // la lista continua solo se l'hai scelta (Elenco o Da spuntare); il testo resta testo
      const nuove = parti.slice(1).map(t => ({ t, c: r.c === 'p' ? 'p' : r.c !== null ? false : null }));
      GP.righe.splice(i + 1, 0, ...nuove);
      disegnaRighe(nuove.length > 1 ? { i: i + nuove.length, pos: null } : { i: i + 1, pos: 0 }); schedula(); return;
    }
    r.t = v; adatta(ta);
    const ora = oraIn(v), riga = ta.parentNode; let tag = riga.querySelector('.ora');
    if (ora && !tag) { tag = document.createElement('span'); tag.className = 'ora'; riga.appendChild(tag); }
    if (tag) { if (ora) tag.textContent = ora; else tag.remove(); }
    schedula();
  });
  righeEl.addEventListener('beforeinput', e => {
    const ta = e.target; if (ta.tagName !== 'TEXTAREA' || e.inputType !== 'deleteContentBackward' || ta.selectionStart !== 0 || ta.selectionEnd !== 0) return;
    const i = +ta.dataset.i, r = GP.righe[i];
    if (r.c !== null) { e.preventDefault(); r.c = null; disegnaRighe({ i, pos: 0 }); schedula(); }
    else if (i > 0) { e.preventDefault(); const p = GP.righe[i - 1], pos = p.t.length; p.t += r.t; GP.righe.splice(i, 1); disegnaRighe({ i: i - 1, pos }); schedula(); }
  });
  righeEl.addEventListener('keydown', e => {
    const ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
    const i = +ta.dataset.i;
    if (e.key === 'ArrowUp' && ta.selectionStart === 0 && i > 0) { e.preventDefault(); fuocoRiga(i - 1, null); }
    else if (e.key === 'ArrowDown' && ta.selectionStart === ta.value.length && i < GP.righe.length - 1) { e.preventDefault(); fuocoRiga(i + 1, 0); }
  });
  righeEl.addEventListener('click', e => { if (e.target === righeEl) fuocoRiga(GP.righe.length - 1, null); });

  righeEl.addEventListener('focusin', e => { if (e.target.tagName === 'TEXTAREA') { GP.ultimo = +e.target.dataset.i; aggiornaStile(); } });
  // appena inizi a scrivere la parte alta si chiude in una riga con la data (le righe restano in vista sopra la tastiera);
  // non all'apertura, così il biglietto e i ricordi del giorno si vedono
  righeEl.addEventListener('focusout', () => setTimeout(() => { if (!righeEl.contains(document.activeElement)) gp.classList.remove('scrive'); }, 120));
  // la scelta del tipo di riga e la spunta non tolgono il fuoco (la tastiera resta aperta)
  carta.addEventListener('pointerdown', e => { if (e.target.closest('.gp-stile button, .spunta')) e.preventDefault(); });

  function stile(s) {
    let i = GP.ultimo;
    if (i < 0 || i >= GP.righe.length) i = GP.righe.length - 1;
    const r = GP.righe[i], ta = righeEl.querySelector(`textarea[data-i="${i}"]`);
    const pos = ta && document.activeElement === ta ? ta.selectionStart : null;
    r.c = s === 'testo' ? null : s === 'punto' ? 'p' : (r.c === true ? true : false);
    GP.ultimo = i; disegnaRighe({ i, pos }); schedula();
  }
  function spunta(i) {
    const r = GP.righe[i]; if (!r) return;
    r.c = !r.c; const riga = righeEl.children[i];
    riga.classList.toggle('fatta', r.c); riga.querySelector('.spunta').setAttribute('aria-label', r.c ? 'Togli la spunta' : 'Spunta');
    schedula();
  }

  carta.addEventListener('click', e => {
    const b = e.target.closest('[data-gp]'); if (!b) return;
    const a = b.dataset.gp;
    if (a === 'fatto') chiudiGiorno();
    else if (a === 'smetti') { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); gp.classList.remove('scrive'); }
    else if (a === 'prima') cambiaGiorno(-1);
    else if (a === 'dopo') cambiaGiorno(1);
    else if (a === 'spunta') spunta(+b.dataset.i);
    else if (a === 'stile') stile(b.dataset.s);
    else if (a === 'apri-ric') { GP.forma = { type: 'appuntamento', label: '', yearly: false, ora: '' }; disegnaRicordi(); setTimeout(() => { const c = $('#ric-campo'); if (c) { c.focus({ preventScroll: true }); c.scrollIntoView({ block: 'nearest' }); } }, 30); }
    else if (a === 'chiudi-ric') { GP.forma = null; disegnaRicordi(); }
    else if (a === 'tipo-ric') { GP.forma.type = b.dataset.t; GP.forma.yearly = b.dataset.t === 'compleanno' || b.dataset.t === 'altro'; disegnaRicordi(); }
    else if (a === 'ogni-anno') { GP.forma.yearly = !GP.forma.yearly; disegnaRicordi(); }
    else if (a === 'aggiungi-ric') aggiungiRic();
    else if (a === 'togli-ric') { S.ric = S.ric.filter(r => r.id !== b.dataset.id); scrivi('rem', S.ric); disegnaRicordi(); }
    else if (a === 'versioni') { GP.versioni = !GP.versioni; disegnaVersioni(); }
    else if (a === 'ripristina') {
      const v = (S.storia[GP.key] || [])[+b.dataset.i]; if (!v) return;
      concludiGiorno(); GP.orig = (S.note[GP.key] && S.note[GP.key].text) || ''; GP.origT = Date.now();
      GP.righe = daTesto(v.text); disegnaRighe(null); salvaGiorno(); disegnaVersioni();
    }
    else if (a === 'apri-biglietto') { const g = perKey[GP.key]; segnaLetto(GP.key); $('#gp-poesia').innerHTML = bigliettoGiorno(g, true); $('#gp-poesia').firstElementChild.classList.add('si-apre'); suono('pagina'); }
    else if (a === 'nuova-lettera') nuovaLettera();
    else if (a === 'chiudi-lettera') { GP.lettera = null; disegnaLettere(); }
    else if (a === 'sigilla') sigilla();
    else if (a === 'lettera') {
      const l = S.lettere.find(x => x.id === b.dataset.id); if (!l) return;
      if (oggiKey() < l.apre) { avviso('Sigillata: si apre il ' + lungo(daKey(l.apre)) + ', ' + tra(l.apre)); return; }
      segnaAperta(l.id); disegnaLettere(); suono('pagina'); const el = $('#gp-lettere .gp-aperto'); if (el) el.classList.add('si-apre');
    }
    else if (a === 'disegna') scriviAMano();
    else if (a === 'foto') { $('#foto-file').dataset.k = GP.key; $('#foto-file').click(); }
    else if (a === 'togli-foto') togliFoto(GP.key);
    else if (a === 'togli-disegno') togliDisegno(GP.key);
    else if (a === 'originale') { const t = b.nextElementSibling; t.hidden = !t.hidden; b.textContent = t.hidden ? 'Testo originale' : 'Nascondi l’originale'; }
  });

  // ---------- tocchi (un solo ascoltatore per tutta l'app) ----------
  document.addEventListener('click', e => {
    const velo = e.target.closest('.velo');
    if (velo && e.target === velo && velo.hasAttribute('data-chiudi')) { chiudiVeli(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, k = b.dataset.k;
    if (noClick && b.closest('#libro')) return;
    sveglia();
    switch (a) {
      case 'apri': e.stopPropagation(); if (S.atelier) { if (S.atelier.sel != null && !e.target.closest('.ades')) { S.atelier.sel = null; disegnaAtelier(); disegnaCopertina(); } } else apri(); break;
      case 'lettera': e.stopPropagation(); apriLettera(b.dataset.id); break;
      case 'atelier': chiudiVeli(); atelier(); break;
      case 'at-fine': S.atelier = null; disegnaAtelier(); disegnaCopertina(); break;
      case 'at-colore': setImp({ cop: { ...cop(), colore: b.dataset.c } }); disegnaAtelier(); disegnaCopertina(); break;
      case 'at-adesivo': attacca(b.dataset.t); break;
      case 'at-ruota': case 'at-piu': case 'at-meno': ritocca(a); break;
      case 'at-togli': { const c = cop(), i = S.atelier.sel; setImp({ cop: { ...c, adesivi: c.adesivi.filter((_, j) => j !== i) } }); S.atelier.sel = null; disegnaAtelier(); disegnaCopertina(); break; }
      case 'at-ok': S.atelier.sel = null; disegnaAtelier(); disegnaCopertina(); break;
      case 'at-disegna': disegnaCopertinaAMano(); break;
      case 'at-oro': { const c = cop(); if (!c.oro && !nome()) { S.atelier.oro = true; chiediNome(); } else { setImp({ cop: { ...c, oro: !c.oro } }); disegnaAtelier(); disegnaCopertina(); } break; }
      case 'at-pulisci': { const prima = cop(); setImp({ cop: { ...prima, adesivi: [], tratti: [] } }); S.atelier.sel = null; disegnaAtelier(); disegnaCopertina(); avviso('Copertina pulita', () => { setImp({ cop: prima }); disegnaAtelier(); disegnaCopertina(); }); break; }
      case 'giorno': apriGiorno(k, b.classList.contains('giorno') ? b : pagineEl.querySelector(`.giorno[data-k="${k}"]`)); break;
      case 'spunta': e.stopPropagation(); spunta(k, +b.dataset.i); break;
      case 'sorpresa': e.stopPropagation(); sorpresa(k); break;
      case 'angolo': vaiPos(S.pos + +b.dataset.dir); break;
      case 'prec': vaiPos(S.pos - 1); break;
      case 'succ': vaiPos(S.pos + 1); break;
      case 'oggi': vaiGiorno(giorni[oggiIdx()].key); break;
      case 'vaia': vaiA(); break;
      case 'vai-giorno': vaiGiorno(k); break;
      case 'nastro': { const on = S.imp.bookmark === S.spread; setImp({ bookmark: on ? null : S.spread }); chiudiVeli(); disegna(); avviso(on ? 'Segnalibro tolto' : 'Segnalibro su questa pagina'); break; }
      case 'al-nastro': chiudiVeli(); if (S.imp.bookmark != null) vai(S.imp.bookmark); break;
      case 'vai-pagina': chiudiVeli(); vai(k === 'fondo' || b.dataset.p === 'fondo' ? LAST : +b.dataset.p); break;
      case 'cerca': apriCerca(); break;
      case 'nome': chiediNome(); break;
      case 'salva-nome': salvaNome(); break;
      case 'suoni': setImp({ sound: !S.imp.sound }); sveglia(); disegna(); avviso(S.imp.sound ? 'Suoni accesi' : 'Suoni spenti'); break;
      case 'tema': setImp({ tema: b.dataset.t }); disegna(); break;
      case 'in-fondo': chiudiVeli(); vai(LAST); break;
      case 'installa': infoInstalla(); break;
      case 'esporta': esporta(); break;
      case 'importa': $('#file').click(); break;
      case 'chiudi-libro': chiudiLibro(); break;
      case 'chiudi': chiudiVeli(); break;
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!gp.hidden) chiudiGiorno(); else chiudiVeli(); return; }
    if (!gp.hidden || veli.some(v => !$(v).hidden)) return;
    if (e.key === 'ArrowRight') vaiPos(S.pos + 1);
    if (e.key === 'ArrowLeft') vaiPos(S.pos - 1);
  });

  // ---------- avvio ----------
  const romano = n => [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');
  $('#cop-anni').textContent = romano(inizio.getFullYear()) + ' · ' + romano(fine.getFullYear());
  // ---------- copertina personalizzata: colore, adesivi, disegno a mano, nome in oro ----------
  function disegnaCopertina() {
    const c = cop(), A = S.atelier, p = PELLI[c.colore];
    if (p && c.colore !== 'cuoio') { libro.style.setProperty('--cop', p[1]); libro.style.setProperty('--pelle', p[1]); }
    else { libro.style.removeProperty('--cop'); libro.style.removeProperty('--pelle'); }
    $('#cop-nome').textContent = c.oro ? nome() : '';
    decoro.innerHTML = (c.tratti.length ? E.trattiSVG(c.tratti, altoCop(), 'cop-tratti') : '') +
      c.adesivi.map((a, i) => `<span class="ades${A && A.sel === i ? ' scelto' : ''}" data-i="${i}" style="--x:${a.x};--y:${a.y};--s:${a.s};--r:${a.r}deg">${E.adesivoSVG(a.t)}</span>`).join('');
  }
  function disegnaAtelier() {
    const c = cop(), A = S.atelier, el = $('#atelier');
    el.hidden = !A; app.classList.toggle('atelier-on', !!A); if (!A) return;
    const a = A.sel != null && c.adesivi[A.sel];
    el.innerHTML = `<div class="at-testa"><b>${a ? 'Trascinalo dove vuoi' : 'La tua copertina'}</b><button class="btn pieno" data-act="${a ? 'at-ok' : 'at-fine'}">${a ? 'Ok' : 'Fatto'}</button></div>` +
      (a ? `<div class="at-riga at-sel"><button class="btn" data-act="at-ruota">↻ Ruota</button><button class="btn" data-act="at-piu" aria-label="Più grande">＋</button><button class="btn" data-act="at-meno" aria-label="Più piccolo">－</button><button class="btn" data-act="at-togli">Togli</button></div>`
        : `<div class="at-riga at-colori" role="radiogroup" aria-label="Colore della copertina">${Object.keys(PELLI).map(k => `<button data-act="at-colore" data-c="${k}" role="radio" aria-checked="${c.colore === k}" aria-label="${PELLI[k][0]}" style="--c:${PELLI[k][1]}"></button>`).join('')}</div>` +
          `<div class="at-riga at-adesivi" aria-label="Adesivi">${Object.keys(E.ADESIVI).map(t => `<button data-act="at-adesivo" data-t="${t}" aria-label="Attacca: ${E.ADESIVI[t][0]}">${E.adesivoSVG(t)}</button>`).join('')}</div>` +
          `<div class="at-riga"><button class="btn" data-act="at-disegna">✎ Disegna</button><button class="btn" data-act="at-oro" role="switch" aria-checked="${!!c.oro}">${c.oro ? '✓ ' : ''}Nome in oro</button>${c.tratti.length || c.adesivi.length ? '<button class="btn" data-act="at-pulisci">Togli tutto</button>' : ''}</div>`);
  }
  function atelier() {
    if (S.atelier) return;
    // ad agenda aperta prima si richiude, poi si decora
    if (S.fase !== 'chiusa') { if (S.fase === 'aperta') chiudiLibro(); const t0 = Date.now(), aspetta = () => S.fase === 'chiusa' ? atelier() : Date.now() - t0 < 5000 && setTimeout(aspetta, 150); setTimeout(aspetta, 150); return; }
    S.atelier = { sel: null }; disegnaAtelier(); disegnaCopertina();
  }
  function attacca(t) {
    const c = cop(), h = altoCop(), n = c.adesivi.length;
    setImp({ cop: { ...c, adesivi: [...c.adesivi, { t, x: Math.round(380 + Math.random() * 240), y: Math.round(h * (0.3 + Math.random() * 0.4)), s: 230, r: Math.round(Math.random() * 24 - 12) }] } });
    S.atelier.sel = n; disegnaAtelier(); disegnaCopertina(); suono('penna');
  }
  function ritocca(a) {
    const c = cop(), i = S.atelier.sel, x = c.adesivi[i]; if (!x) return;
    const nuovo = a === 'at-ruota' ? { ...x, r: (x.r + 15) % 360 } : { ...x, s: Math.max(90, Math.min(600, Math.round(x.s * (a === 'at-piu' ? 1.18 : 0.85)))) };
    setImp({ cop: { ...c, adesivi: c.adesivi.map((y, j) => j === i ? nuovo : y) } }); disegnaCopertina();
  }
  // gli adesivi si trascinano col dito o col mouse
  decoro.addEventListener('pointerdown', e => {
    const el = e.target.closest('.ades'); if (!el || !S.atelier) return;
    e.preventDefault(); e.stopPropagation();
    const i = +el.dataset.i, a = cop().adesivi[i]; if (!a) return;
    const cambiato = S.atelier.sel !== i; S.atelier.sel = i;
    decoro.querySelectorAll('.ades').forEach(x => x.classList.toggle('scelto', x === el));
    if (cambiato) disegnaAtelier();
    S.atelier.drag = { el, x0: e.clientX, y0: e.clientY, ax: a.x, ay: a.y, nx: a.x, ny: a.y, k: 1000 / copFronte.getBoundingClientRect().width };
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  });
  decoro.addEventListener('pointermove', e => {
    const d = S.atelier && S.atelier.drag; if (!d) return;
    d.nx = Math.round(Math.max(0, Math.min(1000, d.ax + (e.clientX - d.x0) * d.k))); d.ny = Math.round(Math.max(0, Math.min(altoCop(), d.ay + (e.clientY - d.y0) * d.k)));
    d.el.style.setProperty('--x', d.nx); d.el.style.setProperty('--y', d.ny);
  });
  const lascia = () => {
    const d = S.atelier && S.atelier.drag; if (!d) return; S.atelier.drag = null;
    const c = cop(), i = S.atelier.sel; setImp({ cop: { ...c, adesivi: c.adesivi.map((y, j) => j === i ? { ...y, x: d.nx, y: d.ny } : y) } });
  };
  decoro.addEventListener('pointerup', lascia); decoro.addEventListener('pointercancel', lascia);
  function disegnaCopertinaAMano() {
    // sotto la lavagna c'è la copertina com'è adesso (senza il disegno, che si ridisegna sopra)
    const copia = copFronte.cloneNode(true); copia.removeAttribute('data-act'); copia.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    copia.querySelectorAll('.cop-tratti,.ades.scelto').forEach(x => x.classList.remove('scelto'));
    copia.querySelectorAll('.cop-tratti').forEach(x => x.remove());
    copia.classList.add('cop-copia'); copia.style.fontSize = `calc(${(parseFloat(getComputedStyle(libro).fontSize) / copFronte.getBoundingClientRect().width * 1000).toFixed(3)}px * var(--k))`;
    E.lavagna({ titolo: 'Disegna sulla copertina', alto: altoCop(), tratti: cop().tratti, colori: ['oro', 'bianco', 'rosso', 'rosa', 'nero'], sotto: copia.outerHTML, classe: 'lav-cop', fatto: T => { setImp({ cop: { ...cop(), tratti: T } }); disegnaAtelier(); disegnaCopertina(); } });
  }
  // le foto salvate: dal database del browser, poi si ridisegna
  E.media.tutti().then(tutte => {
    const ks = Object.keys(tutte).filter(id => id.startsWith('foto-') && typeof tutte[id] === 'string');
    return Promise.all(ks.map(id => E.daDataURL(tutte[id]).then(b => { const k = id.slice(5); fotoBlob[k] = b; fotoURL[k] = URL.createObjectURL(b); fotoDati[k] = tutte[id]; })));
  }).then(() => { disegna(); if (GP.key) disegnaExtra(); }).catch(() => {});

  misura(); disegna(); disegnaCopertina();
  if (window.ResizeObserver) new ResizeObserver(misura).observe(scena); else addEventListener('resize', misura);
  const via = () => { pronto = true; $('#sugg').textContent = 'Tocca l’elastico per aprire'; };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(via, via);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
