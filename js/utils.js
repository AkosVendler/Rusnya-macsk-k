/* Általános segédfüggvények és a képernyő-kezelő (RM.ui). */
window.RM = window.RM || {};

RM.util = {
  /** HTML-escape, hogy a játékosok által beírt szöveg ne törje meg az oldalt. */
  esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),

  /** Összehasonlításhoz: kisbetű, ékezet/szóköz/írásjel nélkül. */
  normalize: s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\s.,\-]/g, ''),

  /** Fisher–Yates keverés (új tömböt ad vissza). */
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};

RM.ui = {
  root: () => document.getElementById('app'),

  /** Kicseréli a teljes képernyőt. opts: { full: középre igazít, bg, fg: háttér/szövegszín } */
  set(html, opts = {}) {
    const el = RM.ui.root();
    el.className = opts.full ? 'full' : '';
    // a háttérszín a teljes oldalra kerül, így asztali nézetben is kitölti a képernyőt
    document.body.style.background = opts.bg || '';
    document.body.style.color = opts.fg || '';
    el.innerHTML = html;
    window.scrollTo(0, 0);
  },

  header: () => '<div class="logo">RUSNYA<br>MACSKÁK</div>',

  avatar(p, extraClass = '') {
    const item = RM.AVATARS[p.avatar] || RM.AVATARS[0];
    const face = item.image
      ? `<img src="${RM.util.esc(item.image)}" alt="" aria-hidden="true">`
      : item.emoji;
    return `<div class="av ${extraClass}" style="background:${item.color}">${face}</div>`;
  },

  /** Rövidítés: elem lekérése a legutóbb kirajzolt képernyőn. */
  $: id => document.getElementById(id),
};
