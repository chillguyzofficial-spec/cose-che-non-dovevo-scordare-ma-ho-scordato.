// Cose Che Non Dovevo Scordare — logica: libro che si sfoglia, pagina del giorno, ricorrenze, ricerca
(() => {
  'use strict';
  const D = window.AGENDA_DATI;
  const $ = s => document.querySelector(s);
  const app = $('#app'), libro = $('#libro'), pagineEl = $('#pagine'), scena = $('#scena');

  const M = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const MS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const DN = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const DT = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const TABC = ['#9c4a2a', '#ad6a2c', '#9a7e34', '#6c7739', '#4c6858', '#56598a', '#7a4766'];
  const DOOD = ['❦', '❧', '☙', '✤', '❁', '❦', '✾', '❧'];
  // "altro" resta come chiave per compatibilità con le copie esportate dall'agenda originale
  const RIC = {
    compleanno: { g: '♥', c: '#a8402f', w: 'rgba(212,110,95,.17)', n: 'Compleanno' },
    altro: { g: '✦', c: '#46692e', w: 'rgba(110,150,80,.18)', n: 'Ricorrenza' },
    scadenza: { g: '⚑', c: '#8d5a0c', w: 'rgba(220,160,50,.2)', n: 'Scadenza' }
  };
  const CASELLA = /^\[( |x|X)\] /;

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
  const LAST = NG / 7 + 1;
  const giorni = [], perKey = {};
  for (let i = 0, nasc = 0; i < NG; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, 12), key = ymd(d);
    const dentro = key >= D.INIZIO && key <= D.FINE, poesia = dentro ? D.POESIE[key] || null : null, festa = D.FESTE[key] || '';
    let sorpresa = null;
    if (dentro && !poesia && !festa && (i * 7 + 3) % 11 === 0) { sorpresa = { tipo: nasc % 2 ? 'biglietto' : 'foglia', testo: D.SORPRESE[nasc % D.SORPRESE.length], n: String(1000 + ((i * 7919) % 9000)) }; nasc++; }
    const g = { i, key, d, dow: (d.getDay() + 6) % 7, dentro, poesia, festa, sorpresa };
    giorni.push(g); perKey[key] = g;
  }
  const oggiIdx = () => { const k = oggiKey(); return perKey[k < D.INIZIO ? D.INIZIO : k > D.FINE ? D.FINE : k].i; };
  const spreadDi = i => 1 + Math.floor(i / 7);

  // ---------- stato ----------
  const S = {
    fase: 'chiusa', spread: 0, flip: null, pw: 0, ph: 0,
    note: leggi('notes', {}), storia: leggi('hist', {}), ric: leggi('rem', []),
    imp: Object.assign({ sound: true, night: false, bookmark: null, nome: '' }, leggi('set', {})),
    lampo: null, appena: null
  };
  let flip = null, noClick = false, ptr = null, raf = 0, pronto = false;
  const setImp = p => { Object.assign(S.imp, p); scrivi('set', S.imp); };

  // ---------- misure ----------
  function misura() {
    const W = scena.clientWidth, H = scena.clientHeight;
    const pw = Math.max(120, Math.floor(Math.min((W - 46) / 2, 440)));
    const ph = Math.max(300, Math.floor(Math.min(H - 34, pw * 3.2)));
    if (pw === S.pw && ph === S.ph) return;
    S.pw = pw; S.ph = ph;
    libro.style.setProperty('--pw', pw + 'px'); libro.style.setProperty('--ph', ph + 'px');
    libro.style.setProperty('--fs', Math.max(10, Math.min(17, pw / 14.5, ph / 30)).toFixed(2) + 'px');
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
      setTimeout(() => { setFase('aperta'); disegna(); setTimeout(() => vai(spreadDi(oggiIdx())), 260); }, 1200);
    }, 430);
  }
  function chiudiLibro() {
    chiudiVeli();
    const fai = () => { setFase('chiusura'); disegna(); setTimeout(() => suono('posa'), 950); setTimeout(() => { setFase('chiusa'); disegna(); }, 1200); };
    if (S.spread !== 0) vai(0, () => setTimeout(fai, 120)); else fai();
  }

  // ---------- sfogliare ----------
  function vai(to, cb) {
    if (flip || S.fase !== 'aperta') return;
    to = Math.max(0, Math.min(LAST, to));
    if (to === S.spread) { cb && cb(); return; }
    avviaFlip(to);
    animaA(1, () => { fineFlip(true); cb && cb(); });
  }
  function avviaFlip(to) { flip = { to, dir: to > S.spread ? 1 : -1, p: 0 }; S.flip = { to, dir: flip.dir }; suono('pagina'); disegna(); }
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
  function fineFlip(commit) { const f = flip; flip = null; S.flip = null; if (commit && f) S.spread = f.to; disegna(); }
  const sopprimi = () => { noClick = true; clearTimeout(sopprimi.t); sopprimi.t = setTimeout(() => { noClick = false; }, 80); };

  libro.addEventListener('pointerdown', e => { if (!$('#gp').hidden) return; ptr = { x: e.clientX, y: e.clientY, t: performance.now(), drag: false }; });
  libro.addEventListener('pointermove', e => {
    const P = ptr; if (!P) return;
    const dx = e.clientX - P.x, dy = e.clientY - P.y;
    if (S.fase === 'chiusa') { if (dx < -40 && Math.abs(dx) > Math.abs(dy)) { ptr = null; sopprimi(); apri(); } return; }
    if (S.fase !== 'aperta') return;
    if (!P.drag) {
      if (flip || Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      const to = S.spread + (dx < 0 ? 1 : -1); if (to < 0 || to > LAST) { ptr = null; return; }
      P.drag = true; avviaFlip(to); try { libro.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (!flip) return;
    flip.p = Math.max(0, Math.min(1, (-dx * flip.dir) / (S.pw * 1.5))); applicaFlip(); P.dx = dx;
  });
  const suSu = () => {
    const P = ptr; ptr = null; if (!P || !P.drag || !flip) return;
    sopprimi(); cancelAnimationFrame(raf);
    const svelto = performance.now() - P.t < 320 && Math.abs(P.dx || 0) > 30, ok = flip.p > 0.33 || svelto;
    animaA(ok ? 1 : 0, () => fineFlip(ok));
  };
  libro.addEventListener('pointerup', suSu); libro.addEventListener('pointercancel', suSu);

  function vaiGiorno(key, lampo = true) {
    const g = perKey[key]; if (!g) return;
    chiudiVeli();
    setTimeout(() => vai(spreadDi(g.i), () => {
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
      return `<div style="font-family:var(--mano);font-weight:600;line-height:1.3;color:${T.c}">${T.g} ${breve(daKey(date))} · ${esc(r.label || T.n)}${r.yearly ? ' (ogni anno)' : ''}</div>`;
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
    const c = CASELLA.exec(l), fatta = c && c[1] !== ' ', testo = c ? l.slice(4) : l, ora = oraIn(testo);
    return `<div class="g-riga${fatta ? ' fatta' : ''}">` +
      (c ? `<span class="g-casella" data-act="spunta" data-k="${key}" data-i="${i}"><span>${fatta ? '✓' : ''}</span></span>` : '') +
      (ora ? `<span class="g-ora">${ora}</span>` : '') +
      `<span class="t">${testo ? esc(testo) : '&nbsp;'}</span></div>`;
  }
  function giornoHTML(g, L, j) {
    const n = S.note[g.key], rics = ricDi(g.key), r = rics[0], T = r ? RIC[r.type] || RIC.altro : null;
    const righe = n && n.text ? n.text.split('\n') : [], scritto = righe.some(x => x.replace(CASELLA, '').trim());
    let corpo = '';
    if (scritto) {
      corpo = `<div class="g-note${S.appena === g.key ? ' appena' : ''}">${righe.map((l, i) => rigaPagina(g.key, l, i)).join('')}</div>`;
      if (g.poesia) corpo += `<div class="g-poesia dopo">${esc(g.poesia.testo)}</div>`;
    } else if (g.poesia) corpo = `<div class="g-poesia">${esc(g.poesia.testo)}</div><span class="g-autore">${esc(g.poesia.autore)}</span>`;
    const mese = g.d.getDate() === 1 || (j === 0 && L) ? MS[g.d.getMonth()] : '';
    const sfondo = S.lampo === g.key ? '' : T ? `background:${T.w}` : '';
    const sp = g.sorpresa;
    return `<div class="giorno${g.dentro ? '' : ' fuori'}${S.lampo === g.key ? ' lampo' : ''}" data-act="giorno" data-k="${g.key}" style="flex:${L ? 1 : j < 5 ? 1 : 0.8};${sfondo}">` +
      `<div class="g-testa"><span class="g-num${oggiKey() === g.key ? ' oggi' : ''}">${g.d.getDate()}</span><span class="g-nome">${DN[g.dow]}</span><span class="g-mese">${mese}</span></div>` +
      (g.festa ? `<div class="g-festa">${esc(g.festa)}</div>` : '') +
      (r ? `<div class="g-ric" style="color:${T.c}">${T.g} ${esc(r.label || T.n)}${rics.length > 1 ? ' +' + (rics.length - 1) : ''}</div>` : '') +
      `<div class="g-corpo">${corpo}</div>` +
      (sp && sp.tipo === 'foglia' ? `<span class="foglia" data-act="sorpresa" data-k="${g.key}" role="button" aria-label="Qualcosa tra le pagine">❦</span>` : '') +
      (sp && sp.tipo === 'biglietto' ? `<span class="biglietto" data-act="sorpresa" data-k="${g.key}" role="button" aria-label="Un biglietto tra le pagine">N° ${sp.n}</span>` : '') +
      `</div>`;
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
  const nome = () => (S.imp.nome || '').trim();
  function paginaFissa(s, L) {
    if (s === 0 && L) return `<div class="p-retro"><div class="p-cartiglio"><div style="font-family:var(--fellsc);font-size:.95em;letter-spacing:.06em">Se ritrovata</div><div class="p-piccolo" style="margin:.5em 0">restituire a</div><div style="font-family:var(--mano);font-size:1.4em;color:var(--ink2);border-bottom:1px solid var(--rule)">${nome() ? esc(nome()) : '&nbsp;'}</div><div style="font-family:var(--mano);font-size:.95em;margin-top:.6em;line-height:1.25">Grazie. Non sapevo più di averla.</div></div></div>`;
    if (s === 0) return `<div class="p-centro"><div class="p-occhiello">Agenda settimanale</div><div class="p-fregio">❦</div><div class="p-titolo">Cose Che Non Dovevo Scordare</div><div class="p-sotto">(Ma Ho Scordato)</div><div class="p-filo"></div>` +
      `<div class="p-piccolo">${breve(inizio).replace(/ (\d\d)$/, ' 20$1')}<br>${breve(fine).replace(/ (\d\d)$/, ' 20$1')}</div><div style="flex:1"></div>` +
      `<div class="p-occhiello" style="font-size:.6em">Questa agenda appartiene a</div><button class="p-nome${nome() ? '' : ' vuoto'}" data-act="nome">${nome() ? esc(nome()) : 'tocca e scrivi il tuo nome'}</button>` +
      `<div class="p-piccolo">Sfoglia con le frecce in basso<br>o toccando gli angoli.<br>Tocca un giorno per scrivere.</div></div>`;
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
    const bordo = statica && !S.flip && S.fase === 'aperta' && !((s === 0 && L) || (s === LAST && !L));
    const sett = s > 0 && s < LAST;
    return `<div class="pg ${lato}" data-ruolo="${ruolo}" style="left:${ruolo === 'L' ? 0 : '50%'};z-index:${statica ? 1 : 5};transform:${tr};visibility:${vis}">` +
      (sett ? linguette(s - 1, L) : '') +
      `<div class="carta">${sett ? settimana(s - 1, L) : paginaFissa(s, L)}<div class="piega"></div>` +
      (bordo ? `<button class="angolo" data-act="angolo" data-dir="${L ? -1 : 1}" aria-label="${L ? 'Pagina precedente' : 'Pagina successiva'}"><span></span></button>` : '') +
      `<div class="ombra" style="background:${OMBRE[ruolo]}"></div></div></div>`;
  }

  function disegna() {
    const c = S.spread, f = S.flip;
    let slot;
    if (!f) slot = [pagina(c, 'sx', 'L'), pagina(c, 'dx', 'R')];
    else if (f.dir > 0) slot = [pagina(c, 'sx', 'L'), pagina(f.to, 'dx', 'R'), pagina(c, 'dx', 'F'), pagina(f.to, 'sx', 'B')];
    else slot = [pagina(f.to, 'sx', 'L'), pagina(c, 'dx', 'R'), pagina(f.to, 'dx', 'F'), pagina(c, 'sx', 'B')];
    pagineEl.innerHTML = slot.join('');
    $('#mz-sx').style.width = (1 + 6 * c / LAST).toFixed(1) + 'px';
    $('#mz-dx').style.width = (1 + 6 * (1 - c / LAST)).toFixed(1) + 'px';
    const bm = S.imp.bookmark, aperto = S.fase === 'aperta' && !f;
    $('#segnalibro').innerHTML = aperto && bm === c ? '<div class="nastro"></div>' : aperto && bm != null ? '<button class="coda" data-act="al-nastro" aria-label="Vai al nastro"><span></span></button>' : '';
    const bn = $('#b-nastro'); bn.classList.toggle('acceso', bm === c); bn.lastElementChild.textContent = bm === c ? 'Togli' : 'Nastro';
    let tt = 'Cose Che Non Dovevo Scordare', ts = 'Frontespizio';
    if (c > 0 && c < LAST) { const d0 = giorni[(c - 1) * 7].d, d3 = giorni[(c - 1) * 7 + 3].d; tt = M[d3.getMonth()] + ' ' + d3.getFullYear(); ts = 'Settimana ' + settIso(d0); }
    else if (c === LAST) { tt = 'In fondo all’agenda'; ts = 'Cose scordate e numeri'; }
    $('#t-titolo').textContent = tt; $('#t-sotto').textContent = ts;
    app.classList.toggle('notte', !!S.imp.night);
  }

  // ---------- veli (menu, vai a, nome, ricerca, sorpresa) ----------
  let installa = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installa = e; });
  const veli = ['#v-menu', '#v-vaia', '#v-nome', '#v-cerca', '#v-sorpresa'];
  function chiudiVeli() { veli.forEach(v => { $(v).hidden = true; }); }
  function apriVelo(v) { chiudiVeli(); $(v).hidden = false; }

  function menu() {
    const bm = S.imp.bookmark, c = S.spread;
    const voci = [
      ['suoni', 'Suoni', S.imp.sound ? 'Attivi' : 'Spenti'],
      ['notte', 'Modalità notte', S.imp.night ? 'Accesa' : 'Spenta'],
      ['nome', 'Il mio nome', nome() || 'da scrivere'],
      ['nastro', bm === c ? 'Togli il nastro da qui' : 'Metti il nastro qui', ''],
      ['al-nastro', 'Vai al nastro', bm == null ? 'nessuno' : ''],
      ['in-fondo', 'Cose scordate e numeri', ''],
      ['installa', 'Tienila sul telefono', ''],
      ['esporta', 'Salva una copia delle note', 'file'],
      ['importa', 'Riprendi una copia', 'file'],
      ['chiudi-libro', 'Chiudi l’agenda', '']
    ];
    $('#menu').innerHTML = '<div class="maniglia"></div>' + voci.map(([a, l, v]) => `<button class="voce" data-act="${a}"><span>${l}</span><small>${esc(v)}</small></button>`).join('');
    apriVelo('#v-menu');
  }
  function infoInstalla() {
    if (installa) { installa.prompt(); installa = null; chiudiVeli(); return; }
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    $('#menu').innerHTML = `<div class="maniglia"></div><div class="dentro"><div class="h-foglio">Tienila sul telefono</div>` +
      `<div class="nota-p" style="font-size:14px;color:var(--ink)">${ios ? 'Tocca <b>Condividi</b> (il quadrato con la freccia) e poi <b>Aggiungi alla schermata Home</b>.' : 'Apri il menu del browser (<b>⋮</b>) e scegli <b>Installa app</b> o <b>Aggiungi a schermata Home</b>.'}</div>` +
      `<div class="nota-p">Così si apre come un’app, funziona anche senza rete e il telefono non cancella le note. Le note restano solo su questo telefono: ogni tanto salvane una copia dal menu.</div>` +
      `<div class="fila" style="justify-content:flex-end"><button class="btn pieno" data-act="chiudi">Ho capito</button></div></div>`;
  }
  function vaiA() {
    const mesi = [];
    for (let d = new Date(inizio.getFullYear(), inizio.getMonth(), 1, 12); d <= fine; d.setMonth(d.getMonth() + 1)) {
      const key = d < inizio ? D.INIZIO : ymd(d);
      const qui = S.spread > 0 && S.spread < LAST && giorni[(S.spread - 1) * 7 + 3].d.getMonth() === d.getMonth() && giorni[(S.spread - 1) * 7 + 3].d.getFullYear() === d.getFullYear();
      mesi.push(`<button class="mese${qui ? ' qui' : ''}" data-act="vai-giorno" data-k="${key}">${M[d.getMonth()].slice(0, 3)}<br><small>${d.getFullYear()}</small></button>`);
    }
    $('#mesi').innerHTML = mesi.join('');
    const c = $('#vaia-data'); c.min = D.INIZIO; c.max = D.FINE; c.value = '';
    apriVelo('#v-vaia');
  }
  $('#vaia-data').addEventListener('change', e => { const v = e.target.value; if (v && perKey[v] && perKey[v].dentro) vaiGiorno(v); });
  function chiediNome() { const c = $('#nome-campo'); c.value = nome(); apriVelo('#v-nome'); setTimeout(() => c.focus(), 60); }
  function salvaNome() { setImp({ nome: $('#nome-campo').value.trim() }); chiudiVeli(); disegna(); }
  $('#nome-campo').addEventListener('keydown', e => { if (e.key === 'Enter') salvaNome(); });

  function cerca() {
    const q = $('#cerca-campo').value.trim().toLowerCase(), out = [];
    let msg = '';
    if (q.length < 2) msg = 'Scrivi almeno due lettere.';
    else {
      for (const g of giorni) {
        if (!g.dentro) continue;
        const n = S.note[g.key], fonti = [];
        if (n && n.text) fonti.push(['Mia nota', n.text.replace(/^\[[ xX]\] /gm, '').replace(/\n/g, ' · '), 'var(--ink2)']);
        if (g.poesia) fonti.push([g.poesia.autore, g.poesia.testo.replace(/\n/g, ' / '), 'var(--ink)']);
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

  function sorpresa(key) {
    const g = perKey[key], sp = g && g.sorpresa; if (!sp) return;
    const f = sp.tipo === 'foglia';
    $('#sorpresa').innerHTML = `<div class="cartolina ${f ? 'foglia-c' : 'biglietto-c'}" data-act="chiudi"><div class="glifo">${f ? '❦' : '✂'}</div><div class="frase">${esc(sp.testo)}</div><small>${breve(g.d)} · tocca per richiudere</small></div>`;
    apriVelo('#v-sorpresa'); suono('pagina');
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
    const dati = { app: 'cose-che-non-dovevo-scordare', version: 2, exported: new Date().toISOString(), notes: S.note, hist: S.storia, rem: S.ric, bookmark: S.imp.bookmark, nome: S.imp.nome };
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
        if (d.nome && !nome()) setImp({ nome: d.nome });
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
  // ---------- pagina del giorno: si scrive su righe vere, si salva da sola ----------
  // =====================================================================
  const gp = $('#gp'), carta = $('#gp-carta'), righeEl = $('#gp-righe'), pannello = $('#gp-pannello');
  const GP = { key: null, righe: [], orig: '', timer: 0, ultimo: -1, pann: null, forma: { type: 'compleanno', label: '', yearly: true } };
  const daTesto = t => { const r = (t || '').split('\n').map(l => { const c = CASELLA.exec(l); return c ? { t: l.slice(4), c: c[1] !== ' ' } : { t: l, c: null }; }); return r.length ? r : [{ t: '', c: null }]; };
  const aTesto = righe => { const r = righe.slice(); while (r.length && !r[r.length - 1].t.trim()) r.pop(); return r.map(x => (x.c === null ? '' : x.c ? '[x] ' : '[ ] ') + x.t.replace(/\s+$/, '')).join('\n'); };
  let chiestoPersist = false;

  function caricaGiorno(key) {
    const g = perKey[key];
    GP.key = key; GP.orig = (S.note[key] && S.note[key].text) || ''; GP.righe = daTesto(GP.orig); GP.ultimo = -1; GP.pann = null;
    $('#gp-nome').textContent = DN[g.dow];
    $('#gp-data').textContent = g.d.getDate() + ' ' + M[g.d.getMonth()].toLowerCase() + ' ' + g.d.getFullYear() + ' · settimana ' + settIso(g.d);
    $('#gp-festa').textContent = g.festa; $('#gp-festa').hidden = !g.festa;
    const p = g.poesia;
    $('#gp-poesia').innerHTML = p ? `<div class="gp-poesia">${esc(p.testo)}<cite>${esc(p.autore)} · ${esc(p.opera)}${p.originale ? ' · traduzione nostra' : ''}</cite></div>` +
      (p.originale ? `<button class="gp-orig" data-gp="originale">Testo originale</button><div class="gp-orig-testo" hidden>${esc(p.originale)}</div>` : '') : '';
    $('[data-gp="prima"]').disabled = key <= D.INIZIO; $('[data-gp="dopo"]').disabled = key >= D.FINE;
    $('#gp-salvato').textContent = '';
    disegnaRic(); disegnaRighe(null); chiudiPannello(); contaVersioni();
    $('#gp-scorri').scrollTop = 0;
  }
  function disegnaRic() {
    $('#gp-ric').innerHTML = ricDi(GP.key).map(r => { const T = RIC[r.type] || RIC.altro; return `<span style="color:${T.c}">${T.g} ${esc(r.label || T.n)}</span>`; }).join('');
  }
  function contaVersioni() { const n = (S.storia[GP.key] || []).length; $('#gp-b-versioni').textContent = 'Versioni' + (n ? ' (' + n + ')' : ''); }
  function adatta(ta) { ta.style.height = '36px'; ta.style.height = Math.max(36, Math.ceil((ta.scrollHeight - 2) / 36) * 36) + 'px'; }
  function disegnaRighe(fuoco) {
    const sola = GP.righe.length === 1 && !GP.righe[0].t;
    righeEl.innerHTML = GP.righe.map((r, i) => {
      const ora = oraIn(r.t);
      return `<div class="riga${r.c === true ? ' fatta' : ''}">` +
        (r.c !== null ? `<button class="casella" data-gp="spunta" data-i="${i}" aria-label="${r.c ? 'Togli la spunta' : 'Spunta'}"><span></span></button>` : '') +
        `<textarea rows="1" data-i="${i}" enterkeyhint="enter" autocapitalize="sentences" aria-label="Riga ${i + 1}"${sola && i === 0 ? ' placeholder="Scrivi qui…"' : ''}>${esc(r.t)}</textarea>` +
        (ora ? `<span class="ora">${ora}</span>` : '') + `</div>`;
    }).join('');
    righeEl.querySelectorAll('textarea').forEach(adatta);
    if (fuoco) fuocoRiga(fuoco.i, fuoco.pos);
  }
  function fuocoRiga(i, pos) {
    const ta = righeEl.querySelector(`textarea[data-i="${i}"]`); if (!ta) return;
    ta.focus({ preventScroll: true });
    const p = pos == null ? ta.value.length : Math.min(pos, ta.value.length); ta.setSelectionRange(p, p);
    const r = ta.getBoundingClientRect(), s = $('#gp-scorri').getBoundingClientRect();
    if (r.bottom > s.bottom - 8 || r.top < s.top) ta.scrollIntoView({ block: 'nearest' });
  }
  function schedula() { clearTimeout(GP.timer); $('#gp-salvato').textContent = ''; GP.timer = setTimeout(salvaGiorno, 450); }
  function salvaGiorno() {
    clearTimeout(GP.timer); if (!GP.key) return;
    const t = aTesto(GP.righe), cur = (S.note[GP.key] && S.note[GP.key].text) || '';
    if (t === cur) return;
    const note = { ...S.note };
    if (t.replace(/^\[[ xX]\] /gm, '').trim()) note[GP.key] = { text: t, t: Date.now() }; else delete note[GP.key];
    S.note = note; scrivi('notes', note);
    $('#gp-salvato').textContent = 'Salvato';
    if (!chiestoPersist && navigator.storage && navigator.storage.persist) { chiestoPersist = true; navigator.storage.persist().catch(() => {}); }
  }
  // chiude il lavoro sul giorno: salva e mette la versione precedente nella cronologia
  function concludiGiorno() {
    salvaGiorno();
    const ora = (S.note[GP.key] && S.note[GP.key].text) || '', prima = GP.orig;
    if (ora === prima) return null;
    if (prima) { const prev = S.note[GP.key] ? S.note[GP.key].t : Date.now(); S.storia = { ...S.storia, [GP.key]: [{ t: (GP.origT || prev), text: prima }, ...(S.storia[GP.key] || [])].slice(0, 8) }; scrivi('hist', S.storia); }
    return { key: GP.key, prima };
  }

  function apriGiorno(key, el) {
    if (noClick || flip || S.fase !== 'aperta') return;
    const g = perKey[key]; if (!g || !g.dentro) return;
    caricaGiorno(key); GP.origT = S.note[key] ? S.note[key].t : 0;
    gp.hidden = false; posizionaGp();
    // si apre dal riquadro del giorno toccato
    carta.classList.remove('anima'); carta.style.transform = ''; carta.style.opacity = '';
    const f = carta.getBoundingClientRect(), r = el && el.getBoundingClientRect();
    if (r && r.width) { carta.style.transform = `translate(${r.left - f.left}px,${r.top - f.top}px) scale(${r.width / f.width},${r.height / f.height})`; carta.style.opacity = '0.35'; }
    void carta.offsetWidth;
    carta.classList.add('anima'); carta.style.transform = 'none'; carta.style.opacity = '1'; gp.classList.add('su');
    suono('pagina');
    // giorno vuoto: si scrive subito (il fuoco va dato dentro il tocco, se no iPhone non apre la tastiera)
    if (!GP.orig) fuocoRiga(0, 0);
  }
  function chiudiGiorno() {
    if (gp.hidden) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const fatto = concludiGiorno(), key = GP.key, g = perKey[key], stessa = spreadDi(g.i) === S.spread;
    if (fatto) S.appena = key;
    if (stessa) disegna();
    const el = stessa && pagineEl.querySelector(`.giorno[data-k="${key}"]`), f = carta.getBoundingClientRect(), r = el && el.getBoundingClientRect();
    carta.style.transform = r ? `translate(${r.left - f.left}px,${r.top - f.top}px) scale(${r.width / f.width},${r.height / f.height})` : 'translateY(40px)';
    carta.style.opacity = '0'; gp.classList.remove('su');
    setTimeout(() => {
      gp.hidden = true; GP.key = null;
      if (!stessa) vaiGiorno(key, false);
      setTimeout(() => { if (S.appena === key) { S.appena = null; } }, 1400);
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
    concludiGiorno(); disegna(); caricaGiorno(nuovo.key); GP.origT = S.note[nuovo.key] ? S.note[nuovo.key].t : 0;
    suono('pagina');
  }
  // la pagina del giorno segue la parte visibile dello schermo (sopra la tastiera)
  function posizionaGp() {
    const vv = window.visualViewport; if (!vv || gp.hidden) return;
    gp.style.height = vv.height + 'px'; gp.style.top = vv.offsetTop + 'px';
  }
  if (window.visualViewport) { visualViewport.addEventListener('resize', posizionaGp); visualViewport.addEventListener('scroll', posizionaGp); }

  // scrittura: invio = riga nuova, «- » = casella, cancella a inizio riga = toglie casella o unisce
  righeEl.addEventListener('input', e => {
    const ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
    const i = +ta.dataset.i, r = GP.righe[i], v = ta.value;
    if (v.includes('\n')) {
      const parti = v.split('\n');
      if (r.c !== null && !parti[0].trim() && parti.length === 2 && !parti[1]) { r.c = null; r.t = ''; disegnaRighe({ i, pos: 0 }); schedula(); return; }
      r.t = parti[0];
      const nuove = parti.slice(1).map(t => ({ t, c: r.c !== null ? false : null }));
      GP.righe.splice(i + 1, 0, ...nuove);
      disegnaRighe(nuove.length > 1 ? { i: i + nuove.length, pos: null } : { i: i + 1, pos: 0 }); schedula(); return;
    }
    const m = r.c === null && /^(?:\[\s?\]|-|\*|•)\s/.exec(v);
    if (m) { r.c = false; r.t = v.slice(m[0].length); disegnaRighe({ i, pos: 0 }); schedula(); return; }
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
  righeEl.addEventListener('focusin', e => { if (e.target.tagName === 'TEXTAREA') GP.ultimo = +e.target.dataset.i; });
  righeEl.addEventListener('click', e => { if (e.target === righeEl) fuocoRiga(GP.righe.length - 1, null); });

  // i pulsanti in basso non tolgono il fuoco (la tastiera resta aperta)
  carta.addEventListener('pointerdown', e => { if (e.target.closest('.att, .casella')) e.preventDefault(); });

  function casella() {
    let i = GP.ultimo;
    if (i < 0 || i >= GP.righe.length) { const u = GP.righe[GP.righe.length - 1]; if (u.t) GP.righe.push({ t: '', c: false }); else u.c = false; i = GP.righe.length - 1; }
    else GP.righe[i].c = GP.righe[i].c === null ? false : null;
    const ta = righeEl.querySelector(`textarea[data-i="${i}"]`);
    disegnaRighe({ i, pos: ta ? ta.selectionStart : null }); schedula();
  }
  function chiudiPannello() { GP.pann = null; pannello.hidden = true; pannello.innerHTML = ''; document.querySelectorAll('.gp-attrezzi .att').forEach(b => b.classList.remove('on')); }
  function apriPannello(tipo) {
    if (GP.pann === tipo) { chiudiPannello(); return; }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    GP.pann = tipo; pannello.hidden = false;
    document.querySelectorAll('.gp-attrezzi .att').forEach(b => b.classList.toggle('on', b.dataset.gp === (tipo === 'ric' ? 'ricorrenza' : 'versioni')));
    if (tipo === 'ric') disegnaPannelloRic(); else disegnaVersioni();
  }
  function disegnaPannelloRic() {
    const F = GP.forma, mie = ricDi(GP.key);
    pannello.innerHTML =
      mie.map(r => { const T = RIC[r.type] || RIC.altro; return `<div class="fila" style="font-family:var(--mano);font-weight:600;font-size:19px;color:${T.c}"><span style="flex:1">${T.g} ${esc(r.label || T.n)}${r.yearly ? ' · ogni anno' : ''}</span><button class="piccolo-btn" data-gp="togli-ric" data-id="${r.id}">Togli</button></div>`; }).join('') +
      `<div class="fila">${Object.keys(RIC).map(k => `<button class="chip${F.type === k ? ' on' : ''}" data-gp="tipo-ric" data-t="${k}" style="color:${RIC[k].c}">${RIC[k].g} ${RIC[k].n}</button>`).join('')}` +
      `<button class="chip${F.yearly ? ' on' : ''}" data-gp="ogni-anno">${F.yearly ? '✓ Ogni anno' : 'Solo quest’anno'}</button></div>` +
      `<div class="fila" style="flex-wrap:nowrap"><input class="campo" id="ric-campo" value="${esc(F.label)}" placeholder="Es. Marta, bollo auto…" style="height:42px"><button class="btn pieno" data-gp="aggiungi-ric" style="flex:none">Aggiungi</button></div>`;
    const c = $('#ric-campo'); c.addEventListener('input', () => { F.label = c.value; }); c.addEventListener('keydown', e => { if (e.key === 'Enter') aggiungiRic(); });
  }
  function aggiungiRic() {
    const F = GP.forma;
    S.ric = [...S.ric, { id: Date.now().toString(36), date: GP.key, type: F.type, label: F.label.trim(), yearly: F.yearly }];
    scrivi('rem', S.ric); F.label = ''; disegnaRic(); disegnaPannelloRic();
  }
  function disegnaVersioni() {
    const h = S.storia[GP.key] || [];
    pannello.innerHTML = h.length
      ? h.map((v, i) => `<div class="versione"><div><small>${new Date(v.t).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small><span>${esc(v.text.replace(/^\[[ xX]\] /gm, '').replace(/\n/g, ' · '))}</span></div><button class="piccolo-btn" data-gp="ripristina" data-i="${i}">Riprendi</button></div>`).join('') + '<div class="nota-p">Riprendi una versione: sostituisce la pagina, e la versione di adesso resta qui.</div>'
      : '<div class="nota-p">Nessuna versione precedente. Ogni volta che cambi la pagina, quella di prima si conserva qui.</div>';
  }

  carta.addEventListener('click', e => {
    const b = e.target.closest('[data-gp]'); if (!b) return;
    const a = b.dataset.gp;
    if (a === 'fatto') chiudiGiorno();
    else if (a === 'prima') cambiaGiorno(-1);
    else if (a === 'dopo') cambiaGiorno(1);
    else if (a === 'casella') casella();
    else if (a === 'spunta') { const i = +b.dataset.i, r = GP.righe[i]; r.c = !r.c; b.parentNode.classList.toggle('fatta', r.c); b.setAttribute('aria-label', r.c ? 'Togli la spunta' : 'Spunta'); schedula(); }
    else if (a === 'ricorrenza') apriPannello('ric');
    else if (a === 'versioni') apriPannello('ver');
    else if (a === 'tipo-ric') { GP.forma.type = b.dataset.t; if (b.dataset.t === 'compleanno') GP.forma.yearly = true; disegnaPannelloRic(); }
    else if (a === 'ogni-anno') { GP.forma.yearly = !GP.forma.yearly; disegnaPannelloRic(); }
    else if (a === 'aggiungi-ric') aggiungiRic();
    else if (a === 'togli-ric') { S.ric = S.ric.filter(r => r.id !== b.dataset.id); scrivi('rem', S.ric); disegnaRic(); disegnaPannelloRic(); }
    else if (a === 'ripristina') {
      const v = (S.storia[GP.key] || [])[+b.dataset.i]; if (!v) return;
      concludiGiorno(); GP.orig = (S.note[GP.key] && S.note[GP.key].text) || ''; GP.origT = Date.now();
      GP.righe = daTesto(v.text); disegnaRighe(null); salvaGiorno(); contaVersioni(); disegnaVersioni();
    }
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
      case 'apri': e.stopPropagation(); apri(); break;
      case 'giorno': apriGiorno(k, b.classList.contains('giorno') ? b : pagineEl.querySelector(`.giorno[data-k="${k}"]`)); break;
      case 'spunta': e.stopPropagation(); spunta(k, +b.dataset.i); break;
      case 'sorpresa': e.stopPropagation(); sorpresa(k); break;
      case 'angolo': vai(S.spread + +b.dataset.dir); break;
      case 'prec': vai(S.spread - 1); break;
      case 'succ': vai(S.spread + 1); break;
      case 'oggi': vaiGiorno(giorni[oggiIdx()].key); break;
      case 'vaia': vaiA(); break;
      case 'vai-giorno': vaiGiorno(k); break;
      case 'nastro': { const on = S.imp.bookmark === S.spread; setImp({ bookmark: on ? null : S.spread }); chiudiVeli(); disegna(); avviso(on ? 'Nastro tolto' : 'Nastro messo su questa pagina'); break; }
      case 'al-nastro': chiudiVeli(); if (S.imp.bookmark != null) vai(S.imp.bookmark); break;
      case 'menu': menu(); break;
      case 'cerca': apriCerca(); break;
      case 'nome': chiediNome(); break;
      case 'salva-nome': salvaNome(); break;
      case 'suoni': setImp({ sound: !S.imp.sound }); sveglia(); menu(); break;
      case 'notte': setImp({ night: !S.imp.night }); disegna(); menu(); break;
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
    if (e.key === 'ArrowRight') vai(S.spread + 1);
    if (e.key === 'ArrowLeft') vai(S.spread - 1);
  });

  // ---------- avvio ----------
  const romano = n => [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');
  $('#cop-anni').textContent = romano(inizio.getFullYear()) + ' · ' + romano(fine.getFullYear());
  misura(); disegna();
  if (window.ResizeObserver) new ResizeObserver(misura).observe(scena); else addEventListener('resize', misura);
  const via = () => { pronto = true; $('#sugg').textContent = 'Tocca l’elastico per aprire'; };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(via, via);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
