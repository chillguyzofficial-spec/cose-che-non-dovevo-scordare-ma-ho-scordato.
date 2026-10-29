// Illustrazioni a tratto dei giorni di festa (disegnate qui, nessuna immagine esterna) e carta colorata per tema.
// rgb = colore del tema (tratto, etichetta e tinta leggera della carta)
(() => {
  const S = 'M24 6 V42 M20 9 L24 13 L28 9 M20 39 L24 35 L28 39';
  const DISEGNI = {
    agrifoglio: '<path d="M24 27 L20 24 L17 25 L15 21 L11 21 L11 17 L7 15 L10 12 L9 9 Q18 12 24 27Z"/><path d="M24 27 L28 24 L31 25 L33 21 L37 21 L37 17 L41 15 L38 12 L39 9 Q30 12 24 27Z"/><path d="M24 27 Q16 17 9 9 M24 27 Q32 17 39 9"/><circle cx="21" cy="31" r="3" fill="currentColor" stroke="none"/><circle cx="27.5" cy="31" r="3" fill="currentColor" stroke="none"/><circle cx="24.2" cy="36.5" r="3" fill="currentColor" stroke="none"/>',
    stelle: '<path d="M24 6 C25 16 27 20 38 22 C27 24 25 28 24 40 C23 28 21 24 10 22 C21 20 23 16 24 6Z"/><path d="M38 6 V13 M34.5 9.5 H41.5 M10 34 V40 M7 37 H13"/><circle cx="40" cy="34" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none"/>',
    zucca: '<path d="M24 15 C14 15 8 21 8 29 C8 37 14 42 24 42 C34 42 40 37 40 29 C40 21 34 15 24 15Z"/><path d="M24 15 C18 21 18 36 24 42 M24 15 C30 21 30 36 24 42"/><path d="M24 15 C24 11 26 8.5 29 7.5 M26 11.5 C30 12.5 33 10.5 34 7.5"/>',
    candela: '<path d="M19 22 H29 V40 H19Z"/><path d="M24 8 C27.5 12.5 28.5 16 24 19 C19.5 16 20.5 12.5 24 8Z"/><path d="M24 19 V22 M14 40.5 H34 M19 26 C21 26 21 29.5 23 29.5"/>',
    cuore: '<path d="M24 39 C12 31 7 25 7 18 C7 13 11 9 16 9 C20 9 22 11 24 14 C26 11 28 9 32 9 C37 9 41 13 41 18 C41 25 36 31 24 39Z"/><path d="M15 16 C15.5 14 17 13 19 13"/>',
    mimosa: '<path d="M9 41 C17 33 25 22 37 9 M17 33 C15 29 14 27 12 25 M24 25 C24 21 25 19 27 16 M30 18 C33 18 35 20 38 22"/>' +
      [[12, 25], [10, 28], [14.5, 22.5], [27, 16], [25, 13.5], [29.5, 13.5], [38, 22], [40.5, 19.5], [36, 25], [37, 9], [34.5, 7.5], [39.5, 11.5], [21, 30], [31, 23]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="currentColor" stroke="none"/>`).join(''),
    alloro: '<path d="M12 41 C20 31 28 20 36 7"/><path d="M17 34 C12 33 9 30 8 26 C13 26 16 29 17 34Z M24 25 C19 24 16 21 15 17 C20 17 23 20 24 25Z M31 15.5 C27 13.5 25 10.5 25 6.5 C29 7.5 31 11.5 31 15.5Z M20 30 C25 31 28 34 29 38 C24 38 21 35 20 30Z M27 20.5 C32 21.5 35 24.5 36 28.5 C31 28.5 28 25.5 27 20.5Z"/>',
    fiore: '<circle cx="24" cy="12" r="5"/><circle cx="31.6" cy="17.5" r="5"/><circle cx="28.7" cy="26.5" r="5"/><circle cx="19.3" cy="26.5" r="5"/><circle cx="16.4" cy="17.5" r="5"/><circle cx="24" cy="20" r="3" fill="currentColor" stroke="none"/><path d="M24 31 C24 35 23.5 38.5 22.5 42.5 M23 36 C27 33 31 33 33 34 C30 37 27 38 23 36Z"/>',
    sole: '<circle cx="24" cy="24" r="7.5"/><path d="M24 6 V11 M24 37 V42 M6 24 H11 M37 24 H42 M11.3 11.3 L14.8 14.8 M33.2 33.2 L36.7 36.7 M11.3 36.7 L14.8 33.2 M33.2 14.8 L36.7 11.3"/>',
    cadente: '<path d="M31 6.5 L33 11.6 L38.4 12 L34.3 15.5 L35.6 20.8 L31 18 L26.4 20.8 L27.7 15.5 L23.6 12 L29 11.6Z"/><path d="M26 20 L8 38 M23.5 15.5 L11 28 M33 23 L22 41"/>',
    foglia: '<path d="M9 39 C9 23 19 10 39 9 C39 28 27 39 9 39Z"/><path d="M9 39 C17 31 25 22 34 14 M15 33 L15 26 M20 28 L21 20 M25.5 22.5 L27.5 16 M15 33 L22.5 33 M20 28 L28 27.5 M25.5 22.5 L32.5 21.5"/>',
    fiocco: [0, 60, 120].map(r => `<path transform="rotate(${r} 24 24)" d="${S}"/>`).join('') + '<circle cx="24" cy="24" r="2" fill="currentColor" stroke="none"/>',
    uovo: '<path d="M24 7 C16 7 11 19 11 28 C11 36 17 41 24 41 C31 41 37 36 37 28 C37 19 32 7 24 7Z"/><path d="M12 26 L16 22 L20 26 L24 22 L28 26 L32 22 L36 26 M14 32.5 H34"/><circle cx="19" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="28.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/>'
  };
  const T = {
    natale: ['agrifoglio', '163,48,47'], capodanno: ['stelle', '160,122,28'], halloween: ['zucca', '179,90,26'],
    ricordo: ['candela', '93,84,112'], autunno: ['foglia', '154,90,28'], inverno: ['fiocco', '61,90,134'],
    amore: ['cuore', '168,64,79'], mimosa: ['mimosa', '168,134,15'], festa: ['alloro', '79,107,58'],
    primavera: ['fiore', '85,122,46'], mamma: ['fiore', '168,64,95'], pasqua: ['uovo', '106,138,58'],
    estate: ['sole', '184,134,11'], stelle: ['cadente', '52,80,138']
  };
  const FISSE = {
    '12-24': 'natale', '12-25': 'natale', '12-26': 'natale', '12-31': 'capodanno', '01-01': 'capodanno', '01-06': 'capodanno',
    '10-31': 'halloween', '11-01': 'ricordo', '11-02': 'ricordo', '11-11': 'autunno', '09-23': 'autunno',
    '12-08': 'inverno', '12-13': 'inverno', '12-21': 'inverno', '02-14': 'amore', '03-08': 'mimosa', '03-19': 'festa',
    '03-21': 'primavera', '04-25': 'festa', '05-01': 'festa', '06-02': 'festa', '06-21': 'estate', '08-15': 'estate', '08-10': 'stelle'
  };
  // feste mobili (anno per anno)
  const MOBILI = { '2027-02-09': 'capodanno', '2027-03-28': 'pasqua', '2027-03-29': 'pasqua', '2027-05-09': 'mamma' };
  const svg = nome => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DISEGNI[nome]}</svg>`;
  window.AGENDA_ILLUSTRAZIONI = {
    temaDi(key) {
      const t = MOBILI[key] || FISSE[key.slice(5)]; if (!t) return null;
      return { id: t, rgb: T[t][1], svg: svg(T[t][0]) };
    }
  };
})();
