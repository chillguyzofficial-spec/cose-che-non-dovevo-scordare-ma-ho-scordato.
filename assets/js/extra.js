// Cose Che Non Dovevo Scordare — aggiunte: archivio delle foto, lavagna per scrivere a mano, adesivi
(() => {
  'use strict';

  // ---------- archivio delle foto: nel database del browser (molto più spazio delle note) ----------
  const DB = 'ccnds-media', ST = 'media';
  let dbp = null;
  const apriDb = () => dbp || (dbp = new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  }));
  const fai = (modo, op) => apriDb().then(db => new Promise((ok, ko) => {
    const t = db.transaction(ST, modo), r = op(t.objectStore(ST));
    t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error);
  }));
  const media = {
    metti: (k, blob) => fai('readwrite', s => s.put(blob, k)),
    togli: k => fai('readwrite', s => s.delete(k)),
    tutti: () => apriDb().then(db => new Promise((ok, ko) => {
      const out = {}, t = db.transaction(ST), c = t.objectStore(ST).openCursor();
      c.onsuccess = () => { const x = c.result; if (x) { out[x.key] = x.value; x.continue(); } };
      t.oncomplete = () => ok(out); t.onerror = () => ko(t.error);
    }))
  };

  // una foto del telefono pesa diversi MB: la riduciamo a 1000 px di lato, in JPEG
  function riduci(file, lato = 1000, q = 0.8) {
    return new Promise((ok, ko) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, lato / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(b => b ? ok(b) : ko(new Error('foto')), 'image/jpeg', q);
      };
      img.onerror = () => { URL.revokeObjectURL(u); ko(new Error('foto')); };
      img.src = u;
    });
  }
  const aDataURL = blob => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
  const daDataURL = u => fetch(u).then(r => r.blob());

  // ---------- tratti a mano: punti in millesimi della larghezza (x 0-1000, y nella stessa unità) ----------
  function percorso(p) {
    if (p.length < 4) return `M${p[0]} ${p[1]}l0 0`;
    let d = `M${p[0]} ${p[1]}`;
    for (let i = 2; i < p.length - 2; i += 2) d += `Q${p[i]} ${p[i + 1]} ${(p[i] + p[i + 2]) / 2} ${(p[i + 1] + p[i + 3]) / 2}`;
    return d + `L${p[p.length - 2]} ${p[p.length - 1]}`;
  }
  const trattiSVG = (tratti, alto, cls = '') => `<svg class="tratti ${cls}" viewBox="0 0 1000 ${Math.round(alto)}" preserveAspectRatio="xMinYMin meet" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    tratti.map(t => `<path class="tr-${t.c}" stroke-width="${t.w}" d="${percorso(t.p)}"/>`).join('') + '</svg>';

  // ---------- lavagna: un foglio dove si scrive col dito o col mouse ----------
  const NOMI = { blu: 'Inchiostro blu', nero: 'Nero', rosso: 'Rosso', verde: 'Verde', oro: 'Oro', bianco: 'Bianco', rosa: 'Rosa' };
  function colore(c) { const s = document.createElement('i'); s.className = 'tr-' + c; s.style.display = 'none'; document.body.appendChild(s); const v = getComputedStyle(s).stroke; s.remove(); return v; }

  function lavagna({ titolo, alto, tratti, colori, sotto = '', classe = '', fatto }) {
    const el = document.createElement('div'); el.className = 'lav ' + classe; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', titolo);
    el.innerHTML = `<div class="lav-su"><button class="btn" data-l="annulla">Annulla</button><div class="lav-titolo">${titolo}</div><button class="btn pieno" data-l="fatto">Fatto</button></div>` +
      `<div class="lav-area"><div class="lav-foglio">${sotto}<canvas></canvas></div></div>` +
      `<div class="lav-giu"><div class="lav-colori" role="radiogroup" aria-label="Colore">${colori.map((c, i) => `<button class="lav-col" data-l="col" data-c="${c}" role="radio" aria-checked="${!i}" aria-label="${NOMI[c] || c}"><i class="pz-${c}"></i></button>`).join('')}</div>` +
      `<div class="lav-strumenti"><button data-l="punta" data-w="7" aria-pressed="true">Fine</button><button data-l="punta" data-w="16" aria-pressed="false">Grosso</button><button data-l="indietro" aria-label="Togli l'ultimo tratto">↶</button><button data-l="pulisci">Cancella tutto</button></div></div>`;
    document.body.appendChild(el);
    const foglio = el.querySelector('.lav-foglio'), cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    const T = tratti.map(t => ({ ...t, p: t.p.slice() }));
    let col = colori[0], w = 7, k = 1, ora = null;
    const tinte = {}; colori.forEach(c => { tinte[c] = colore(c); });
    function misura() {
      const a = el.querySelector('.lav-area'), W = a.clientWidth - 16, H = a.clientHeight - 16;
      const lw = Math.floor(Math.min(W, H * 1000 / alto)), lh = Math.floor(lw * alto / 1000);
      foglio.style.width = lw + 'px'; foglio.style.height = lh + 'px';
      const dpr = Math.min(2, devicePixelRatio || 1); cv.width = lw * dpr; cv.height = lh * dpr;
      k = lw / 1000; foglio.style.setProperty('--k', k); ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0); ridisegna();
    }
    function traccia(t) { ctx.strokeStyle = tinte[t.c] || colore(t.c); ctx.lineWidth = t.w; ctx.lineCap = ctx.lineJoin = 'round'; ctx.stroke(new Path2D(percorso(t.p))); }
    function ridisegna() { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore(); T.forEach(traccia); }
    const punto = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / k), Math.round((e.clientY - r.top) / k)]; };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      ora = { c: col, w, p: punto(e) }; T.push(ora); traccia(ora);
    });
    cv.addEventListener('pointermove', e => {
      if (!ora) return;
      for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) {
        const [x, y] = punto(ev), n = ora.p.length;
        // punti troppo vicini non servono: il tratto resta leggero da salvare
        if (Math.hypot(x - ora.p[n - 2], y - ora.p[n - 1]) < 3) continue;
        ctx.strokeStyle = tinte[ora.c]; ctx.lineWidth = ora.w; ctx.lineCap = ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(ora.p[n - 2], ora.p[n - 1]); ctx.lineTo(x, y); ctx.stroke();
        ora.p.push(x, y);
      }
    });
    const fine = () => { if (ora) { ora = null; ridisegna(); } };
    cv.addEventListener('pointerup', fine); cv.addEventListener('pointercancel', fine);
    const chiudi = () => { removeEventListener('resize', misura); el.remove(); };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-l]'); if (!b) return;
      const a = b.dataset.l;
      if (a === 'annulla') chiudi();
      else if (a === 'fatto') { chiudi(); fatto(T); }
      else if (a === 'col') { col = b.dataset.c; el.querySelectorAll('.lav-col').forEach(x => x.setAttribute('aria-checked', String(x === b))); }
      else if (a === 'punta') { w = +b.dataset.w; el.querySelectorAll('[data-l="punta"]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
      else if (a === 'indietro') { T.pop(); ridisegna(); }
      else if (a === 'pulisci') { T.length = 0; ridisegna(); }
    });
    addEventListener('resize', misura);
    misura(); requestAnimationFrame(misura);
    return el;
  }

  // ---------- adesivi: disegnati da noi, con il bordino bianco degli adesivi veri ----------
  const stella = (cx, cy, R, r, n = 5, rot = -90) => Array.from({ length: n * 2 }, (_, i) => { const a = (rot + i * 180 / n) * Math.PI / 180, q = i % 2 ? r : R; return (cx + q * Math.cos(a)).toFixed(1) + ',' + (cy + q * Math.sin(a)).toFixed(1); }).join(' ');
  const petali = (n, R, r, c) => Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n; return `<circle cx="${(50 + R * Math.cos(a)).toFixed(1)}" cy="${(50 + R * Math.sin(a)).toFixed(1)}" r="${r}" fill="${c}"/>`; }).join('');
  const raggi = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4, p = (d, s) => (50 + d * Math.cos(a + s)).toFixed(1) + ',' + (50 + d * Math.sin(a + s)).toFixed(1); return `<polygon points="${p(46, 0)} ${p(30, .22)} ${p(30, -.22)}" fill="#f0a830"/>`; }).join('');
  const ADESIVI = {
    cuore: ['Cuore', '<path d="M50 88C18 66 6 47 11 30c5-17 26-22 39-5 13-17 34-12 39 5 5 17-7 36-39 58z" fill="#d6534a"/><ellipse cx="31" cy="34" rx="8" ry="5" fill="#fff" opacity=".35" stroke="none" transform="rotate(-30 31 34)"/>'],
    stella: ['Stella', `<polygon points="${stella(50, 53, 44, 19)}" fill="#f2c14e"/>`],
    luna: ['Luna', '<path d="M60 10A40 40 0 1 0 90 70 32 32 0 1 1 60 10z" fill="#f3dd94"/><circle cx="38" cy="58" r="4" fill="#e2c46f" stroke="none"/><circle cx="50" cy="76" r="3" fill="#e2c46f" stroke="none"/>'],
    fiore: ['Fiore', petali(6, 22, 15, '#f19cb4') + '<circle cx="50" cy="50" r="13" fill="#f7cd4b"/>'],
    sole: ['Sole', raggi + '<circle cx="50" cy="50" r="23" fill="#f6b93b"/>'],
    foglia: ['Foglia', '<path d="M16 84C14 44 42 16 86 14c2 42-24 70-70 70z" fill="#6f9c4c"/><path d="M18 82C40 60 58 42 78 22" stroke="#4c7631" stroke-width="3" fill="none" paint-order="normal"/>'],
    nuvola: ['Nuvola', '<path d="M26 76a17 17 0 0 1 1-34 23 23 0 0 1 44-7 19 19 0 0 1 5 41z" fill="#e3edf6"/>'],
    ciliegie: ['Ciliegie', '<path d="M30 66C34 42 46 24 66 14M70 62C68 40 66 26 66 14" stroke="#5e7d2c" stroke-width="4" fill="none" paint-order="normal"/><path d="M66 14c10-6 22-4 26 2-8 6-18 6-26-2z" fill="#79a443"/><circle cx="28" cy="72" r="15" fill="#c43a31"/><circle cx="70" cy="70" r="15" fill="#c43a31"/>'],
    arcobaleno: ['Arcobaleno', '<path d="M12 78a38 38 0 0 1 76 0" stroke="#fff" stroke-width="36" fill="none"/><path d="M18 78a32 32 0 0 1 64 0" stroke="#e46a5e" stroke-width="8" fill="none" paint-order="normal"/><path d="M26 78a24 24 0 0 1 48 0" stroke="#f2c14e" stroke-width="8" fill="none" paint-order="normal"/><path d="M34 78a16 16 0 0 1 32 0" stroke="#6fa6d6" stroke-width="8" fill="none" paint-order="normal"/>'],
    tazza: ['Tazza', '<path d="M72 46h6a12 12 0 0 1 0 24h-7" stroke="#d9c3a5" stroke-width="7" fill="none"/><path d="M18 40h56v22a22 22 0 0 1-22 22H40a22 22 0 0 1-22-22z" fill="#d9c3a5"/><path d="M36 30c-4-6 4-10 0-18M50 30c-4-6 4-10 0-18" stroke="#b9a58a" stroke-width="3.5" fill="none" stroke-linecap="round" paint-order="normal"/>'],
    fiocco: ['Fiocco', '<path d="M50 50L14 28c-6 10-6 34 0 44zM50 50l36-22c6 10 6 34 0 44z" fill="#e47e9e"/><path d="M48 52L34 90l10-4 6 8 4-40z" fill="#d36a8b"/><circle cx="50" cy="50" r="9" fill="#c95a7c"/>'],
    scintilla: ['Scintilla', '<path d="M50 8c4 26 14 36 40 42-26 6-36 16-40 42-4-26-14-36-40-42 26-6 36-16 40-42z" fill="#f2c14e"/>']
  };
  const adesivoSVG = (t, cls = '') => ADESIVI[t] ? `<svg class="adesivo ${cls}" viewBox="0 0 100 100" aria-hidden="true"><g stroke="#fff" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${ADESIVI[t][1]}</g></svg>` : '';

  window.AGENDA_EXTRA = { media, riduci, aDataURL, daDataURL, percorso, trattiSVG, lavagna, ADESIVI, adesivoSVG };
})();
