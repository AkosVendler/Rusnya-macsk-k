/*
 * Képernyők: minden függvény egy teljes képernyőt rajzol ki és bekösti a gombjait.
 * A logikát az RM.game végzi, a képernyők csak megjelenítenek és eseményt továbbítanak.
 */
window.RM = window.RM || {};

RM.screens = (function () {
  const { esc } = RM.util;
  const { set, header, avatar, $ } = RM.ui;
  const S = () => RM.state;
  try { document.documentElement.dataset.theme = localStorage.getItem('rm_theme') || 'light'; }
  catch { document.documentElement.dataset.theme = 'light'; }

  /** Szerepek megjelenése: [név, háttér, szöveg, leírás] */
  const ROLES = {
    guesser: ['FEKETE MACSKA', '#0a0b10', '#fff',
      'Te vagy a találgató. A többiek válaszai közül ki kell szűrnöd a hamisakat – de ha a valódit választod, kiesel!'],
    white: ['FEHÉR MACSKA', '#fff', '#0a0b10',
      'Te tudod a helyes választ. Az automatikusan bekerül a kártyák közé.'],
    liar: ['RUSNYA MACSKA', '#ff5a1f', '#fff',
      'Találj ki egy hihető, hamis választ! Ha nem buksz le, érmét kapsz.'],
  };

  const questionBox = () => `<div class="q">${esc(S().question[0])}</div>`;

  /* ---------- Fiók, profil és online szobalobby ---------- */

  function auth(message = '') {
    set(`${header()}<section class="auth-panel"><h1>Szia, macska!</h1>
      <p>Minden játékos a saját fiókjával lép be a saját telefonján vagy számítógépén.</p>
      ${message ? `<div class="error">${esc(message)}</div>` : ''}
      <label><small>Felhasználónév</small><input id="username" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="pl. cirmi_12"></label>
      <label><small>Jelszó (legalább 6 karakter)</small><input id="password" type="password" autocomplete="current-password" placeholder="Jelszó"></label>
      <div id="auth-error" class="error"></div>
      <button class="btn o" id="login">Belépés</button>
      <button class="btn" id="signup">Fiók létrehozása</button>
      <small>Felhasználónév: 3–20 karakter, angol betű, szám, pont, kötőjel vagy aláhúzás. E-mail-címet nem kérünk és nem küldünk levelet. Ehhez a Supabase-ben ki kell kapcsolni az Email / Confirm email beállítást. Elfelejtett jelszóhoz jelenleg nincs visszaállítás.</small></section>`);
    const run = mode => async () => {
      const username = $('username').value.trim(), password = $('password').value;
      try {
        const result = await RM.online.authenticate(mode, username, password);
        if (result) $('auth-error').textContent = result;
      } catch (error) { $('auth-error').textContent = error.message || 'Nem sikerült belépni.'; }
    };
    $('login').onclick = run('login');
    $('signup').onclick = run('signup');
  }

  function home() {
    const s = S(), p = s.profile;
    const displayName = p.name.trim() || 'Játékos';
    set(`${header()}<section class="home-layout">
      <div class="home-hero panel">
        <span class="eyebrow">A cicák partijátéka · ${RM.game.MIN_PLAYERS}–${RM.game.MAX_PLAYERS} játékos</span>
        <h1>Szia, ${esc(displayName)}!</h1>
        <p>Blöffölj, szúrj ki a többiekkel, és találd meg az egyetlen igaz választ!</p>
        <img class="hero-art" src="assets/create lobby.jpg" alt="Négy macska együtt játszik a telefonján">
        <div class="hero-sticker">KÉSZEN<br>ÁLLSZ? <span>🐾</span></div>
      </div>
      <div class="home-controls panel">
        <div class="profile-summary card"><div class="row">${avatar(p)}<div><span class="eyebrow">JÁTÉKOS</span><strong>${esc(displayName)}</strong></div><button class="profile-edit" id="profile-edit" aria-label="Profil beállítása">✎</button></div></div>
        <div class="can-balance"><span class="can-icon" aria-hidden="true">🥫</span><div><small>ÖSSZEGYŰJTÖTT KONZERV</small><strong id="home-cans">${Number(s.stats?.cans || 0)}</strong></div><span class="can-label">PONT</span></div>
        <button class="btn o" id="create">Új szoba létrehozása <span>→</span></button>
        <div class="join-block"><h2>Van szobakódod?</h2>
          <div class="row"><input id="code" maxlength="6" placeholder="6 jegyű kód" autocapitalize="characters">
            <button class="btn" id="join" style="width:auto">Belépés</button></div>
        </div>
        <div id="room-error" class="error"></div>
        <nav class="home-nav" aria-label="Főmenü">
          <button class="nav-tile" id="settings"><span class="nav-icon">⚙</span><span>Beállítások</span><b>→</b></button>
          <button class="nav-tile store-tile" id="store"><span class="nav-icon">✦</span><span><small>KÉSZÜL</small>Bolt</span><b>→</b></button>
        </nav>
        <small>${RM.QUESTIONS.length} kérdés vár rátok</small>
      </div>
    </section>`);

    const open = mode => async () => {
      try { await RM.online.openRoom(mode, $('code')?.value || ''); }
      catch (error) { $('room-error').textContent = error.message || 'Nem sikerült csatlakozni.'; }
    };
    $('create').onclick = open('create');
    $('join').onclick = open('join');
    $('profile-edit').onclick = settings;
    $('settings').onclick = settings;
    $('store').onclick = store;
  }

  function settings() {
    const s = S(), p = s.profile;
    let theme = 'light';
    try { theme = localStorage.getItem('rm_theme') || 'light'; } catch { /* alapértelmezett téma */ }
    document.documentElement.dataset.theme = theme;
    set(`${header()}<section class="settings-layout">
      <div class="settings-title"><span class="eyebrow">SAJÁT FIÓK</span><h1>Beállítások</h1><p>Állítsd be a játékosprofilodat és a megjelenést.</p></div>
      <div class="panel settings-panel">
        <div class="settings-section">
          <span class="eyebrow">JÁTÉKOS PROFIL</span>
          <label><small>Becenév</small><input id="setting-name" maxlength="12" value="${esc(p.name)}" placeholder="Írd be a neved"></label>
          <div class="settings-avatar-heading"><h2>Profilkép</h2><small>Csak macskaképek választhatók</small></div>
          <div class="grid settings-avatars">${RM.AVATARS.map((item, i) =>
            `<div class="av ${i === p.avatar ? 'sel' : ''}" data-i="${i}" role="button" tabindex="0" aria-label="Macskakép ${i + 1}" style="background:${item.color}"><img src="${esc(item.image)}" alt=""></div>`).join('')}</div>
        </div>
        <div class="settings-section stats-section">
          <h2>Statisztikák</h2>
          <div class="stats-grid">
            <article class="stat-card stat-wins"><strong id="stat-wins">${Number(s.stats?.roundsWon || 0)}</strong><span>Nyert körök</span></article>
            <article class="stat-card stat-lies"><strong id="stat-lies">${Number(s.stats?.lies || 0)}</strong><span>Hazugságok</span></article>
            <article class="stat-card stat-detective"><strong id="stat-detective">${Number(s.stats?.detective || 0)}</strong><span>Detektív</span></article>
          </div>
          <small class="stats-caption">Hazugságok: beadott hamis válaszok · Detektív: találgató körök</small>
          <div class="stats-cans"><span aria-hidden="true">🥫</span><span>Összegyűjtött konzervpont</span><strong id="stat-cans">${Number(s.stats?.cans || 0)}</strong></div>
        </div>
        <div class="settings-section appearance-row">
          <div><span class="eyebrow">MEGJELENÉS</span><h2>Téma</h2><small>Válassz világos vagy sötét felületet.</small></div>
          <button class="theme-toggle" id="theme-toggle" aria-pressed="${theme === 'dark'}">${theme === 'dark' ? '☾ Sötét' : '☀ Világos'}</button>
        </div>
        <div id="settings-error" class="error"></div>
        <div class="settings-actions"><button class="btn o" id="save-settings">Mentés</button><button class="btn w" id="logout">Kilépés a fiókból</button></div>
      </div>
      <button class="text-btn back-home" id="back-home">← Vissza a főmenübe</button>
    </section>`);
    document.querySelectorAll('.settings-avatars .av').forEach(el => {
      el.onclick = () => { p.avatar = Number(el.dataset.i); settings(); };
      el.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.click(); }
      };
    });
    $('theme-toggle').onclick = () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('rm_theme', theme); } catch { /* téma csak az aktuális lapon */ }
      document.documentElement.dataset.theme = theme;
      settings();
    };
    $('save-settings').onclick = async () => {
      p.name = $('setting-name').value.trim() || 'Játékos';
      try { await RM.online.saveProfile(); home(); }
      catch (error) { $('settings-error').textContent = error.message || 'Nem sikerült menteni a profilt.'; }
    };
    $('logout').onclick = async () => {
      try { await RM.online.signOut(); } catch (error) { $('settings-error').textContent = error.message; }
    };
    $('back-home').onclick = home;
    RM.online.refreshStats().then(stats => {
      if (!stats) return;
      const counters = { 'stat-wins': stats.roundsWon, 'stat-lies': stats.lies, 'stat-detective': stats.detective, 'stat-cans': stats.cans };
      for (const [id, value] of Object.entries(counters)) {
        const counter = $(id);
        if (counter) counter.textContent = String(value);
      }
    }).catch(error => console.warn('A statisztikákat nem sikerült betölteni:', error));
  }

  function store() {
    set(`${header()}<section class="store-layout">
      <div class="store-hero panel">
        <span class="eyebrow">HAMAROSAN ÉRKEZIK</span>
        <div class="store-symbol" aria-hidden="true">✦</div>
        <h1>A macskabolt</h1>
        <p>Új kinézetek, cicás extrák és meglepetések készülnek. Most még csak a játék és a jó blöff számít!</p>
        <div class="coming-soon">BOLT <span>HAMAROSAN</span></div>
      </div>
      <div class="store-preview panel">
        <span class="eyebrow">TERVEZETT KÍNÁLAT</span>
        <article class="store-item"><span class="item-art avatar-art"><img src="assets/cats-04.webp" alt=""></span><div><h2>Új macskaportrék</h2><small>További képek a profilodhoz</small></div><b>HAMAROSAN</b></article>
        <article class="store-item"><span class="item-art theme-art">✦</span><div><h2>Játékterem-témák</h2><small>Szabd személyre a játékot</small></div><b>HAMAROSAN</b></article>
        <div class="store-note"><strong>🐾 Játékérmék</strong><small>Az érmék jelenleg csak a meccsek pontszámát jelzik. Vásárlás még nincs.</small></div>
        <button class="btn o" id="store-home">Vissza a főmenübe</button>
      </div>
    </section>`);
    $('store-home').onclick = home;
  }

  function lobby() {
    const s = S(), P = s.players;
    const canStart = s.isHost && P.length >= RM.game.MIN_PLAYERS && P.length <= RM.game.MAX_PLAYERS;
    set(`${header()}<h2>Szobalobby</h2>
      <small>A barátaid a saját eszközükön a kóddal csatlakozhatnak:</small>
      <div class="card code" style="text-align:center;letter-spacing:.14em">${esc(s.roomCode)}</div>
      <button class="btn w" id="copy">Szobakód másolása</button>
      <h2>Játékosok (${P.length}/${RM.game.MAX_PLAYERS})</h2>
      <div class="list cols">${P.map(p => `<div class="pl">${avatar(p)}${esc(p.name)}${p.user_id === s.hostId ? '<small> · gazda</small>' : ''}</div>`).join('')}</div>
      ${s.isHost ? `<button class="btn o" id="st" ${canStart ? '' : 'disabled'}>Indítás</button>
        <small>${P.length < RM.game.MIN_PLAYERS ? `Még legalább ${RM.game.MIN_PLAYERS - P.length} játékos kell.` : 'Te vagy a szoba gazdája.'}</small>` : '<p>Várakozás a szoba gazdájára…</p>'}
      <button class="btn" id="hm">${s.isHost ? 'Szoba bezárása' : 'Kilépés a szobából'}</button>`);
    $('copy').onclick = async () => {
      try { await navigator.clipboard.writeText(s.roomCode); $('copy').textContent = 'Kimásolva!'; }
      catch { $('copy').textContent = `Kód: ${s.roomCode}`; }
    };
    if (s.isHost) $('st').onclick = () => RM.game.start();
    $('hm').onclick = async () => {
      if (!S().isHost) {
        RM.online.leaveRoom();
        home();
        return;
      }
      if (!window.confirm('Biztosan bezárod a szobát? Minden játékos kilép belőle.')) return;
      try { await RM.online.closeRoom(); }
      catch (error) { RM.screens.showMessage('Nem sikerült bezárni a szobát', error.message || 'Ellenőrizd az internetkapcsolatot.'); }
    };
  }

  function waiting(text) {
    set(`${header()}<div class="sp"></div><div class="center-col"><div class="big">🐈</div>
      <h1>${esc(text)}</h1><small>A játék automatikusan frissül, amint a következő játékos lép.</small></div>
      <div class="sp"></div><div class="card" style="text-align:center">Szobakód: ${esc(S().roomCode)}</div>`);
  }

  function renderOnline() {
    const s = S();
    if (!s.roomCode) return;
    const myIndex = s.players.findIndex(p => p.user_id === s.userId);
    if (s.stage === 'lobby') return lobby();
    if (s.stage === 'countdown') return s.isHost ? countdown(() => RM.game.nextTurn()) : waiting('A játék mindjárt indul');
    if (s.stage === 'turn') return myIndex === s.turn ? roleScreen(myIndex) : waiting(`${s.players[s.turn]?.name || 'A játékos'} válaszol`);
    if (s.stage === 'guessIntro') return myIndex === s.guesserIdx ? guessIntro() : waiting(`${s.players[s.guesserIdx]?.name} következik`);
    if (s.stage === 'guess') return myIndex === s.guesserIdx ? guess() : waiting(`${s.players[s.guesserIdx]?.name} tippel`);
    if (s.stage === 'lose') {
      const exposed = new Set(s.cards.filter(c => c.out).map(c => c.who));
      return lose(s.players.filter((p, i) => i !== s.guesserIdx && !exposed.has(i)).map(p => p.name));
    }
    if (s.stage === 'win') return win(Object.keys(s.fakes).length);
    if (s.stage === 'leaderboard') return leaderboard();
    lobby();
  }

  function showMessage(title, message) {
    window.alert(`${title}\n${message}`);
    if (S().roomCode) renderOnline();
    else home();
  }

  /* ---------- Egy kör képernyői ---------- */

  function countdown(done) {
    let c = 3;
    (function tick() {
      const s = S();
      set(`${header()}<h1>${s.round === 0 ? 'Kezdődik a játék' : (s.round + 1) + '. kör'}</h1><div class="big">${c}</div>`,
        { full: true, bg: '#9560c4', fg: '#fff' });
      if (c-- === 0) { if (S().isHost || !RM.online) done(); }
      else setTimeout(tick, 800);
    })();
  }

  /** "Add át a telefont" képernyő, hogy a többiek ne lássák a szerepet. */
  function handoff(i) {
    const p = S().players[i];
    set(`${header()}<div class="sp"></div>
      <div class="center-col">${avatar(p)}<h1>Add át a telefont:<br>${esc(p.name)}</h1><small>A többiek ne nézzenek!</small></div>
      <div class="sp"></div><button class="btn" id="ok">Én vagyok</button>`);
    $('ok').onclick = () => roleScreen(i);
  }

  function roleScreen(i) {
    const role = RM.game.roleOf(i), [name, bg, fg, text] = ROLES[role];
    set(`${header()}<small style="color:inherit">A szereped</small>
      <div class="big" style="font-size:54px">${name}</div>
      <p class="role-text">${text}</p>
      <button class="btn ${role === 'white' ? '' : 'w'}" id="ok">Kérdés megtekintése</button>`,
      { full: true, bg, fg });
    $('ok').onclick = () => questionPage(i);
  }

  function questionPage(i) {
    const s = S(), role = RM.game.roleOf(i);
    let body;
    if (role === 'guesser') {
      body = `<p>Nézd meg a kérdést, aztán add tovább a telefont!</p><button class="btn" id="ok">Rendben</button>`;
    } else if (role === 'white') {
      body = `<h2>A helyes válasz</h2>
        <div class="card" style="background:var(--g);color:#fff;font-size:34px;text-align:center">${esc(s.question[1])}</div>
        <button class="btn" id="ok">Elküld</button>`;
    } else {
      body = `<h2>Add meg a válaszod</h2><small>Hihető hamis válasz legyen!</small>
        <input id="fa" maxlength="30" placeholder="Hamis válasz">
        <div id="er" class="error"></div>
        <button class="btn o" id="ok">Elküld</button>`;
    }
    set(`${header()}${questionBox()}${body}`);

    $('ok').onclick = () => {
      if (role === 'liar') {
        const error = RM.game.submitFake(i, $('fa').value.trim());
        if (error) { $('er').textContent = error; return; }
      }
      RM.game.endTurn();
    };
  }

  /* ---------- Találgatás ---------- */

  function guessIntro() {
    const g = S().players[S().guesserIdx];
    set(`${header()}<div class="sp"></div>
      <div class="center-col">${avatar(g)}<h1>${esc(g.name)}, te jössz!</h1><small>Készülj a találgatásra!</small></div>
      <div class="sp"></div><button class="btn" id="ok">Kezdhetem</button>`);
    $('ok').onclick = () => {
      S().stage = 'guess';
      if (RM.online) RM.online.save();
      guess();
    };
  }

  function guess() {
    const s = S();
    set(`${header()}${questionBox()}
      <small>Koppints a hamisnak gondolt kártyára! Ha a valódit találod el, kiesel.</small>
      <div class="list cols">${s.cards.map((c, i) => `<button class="ans ${c.out ? 'x' : ''}" data-i="${i}">${esc(c.text)}
        ${c.out ? `<br><small>${esc(s.players[c.who].name)} hamis válasza</small>` : ''}</button>`).join('')}</div>`);
    document.querySelectorAll('.ans').forEach(el => el.onclick = () => RM.game.pickCard(+el.dataset.i));
  }

  /* ---------- Eredmények ---------- */

  const answerCard = () => `<div class="card" style="background:#fff;color:#0a0b10;font-size:32px">${esc(S().question[1])}</div>`;

  function lose(winners) {
    const s = S();
    set(`${header()}<div class="big" style="font-size:72px">OOPS...</div>
      <h2>Ez volt a helyes válasz</h2>${answerCard()}
      <p style="font-size:20px">${esc(s.players[s.guesserIdx].name)} kiesett.<br>
        🥫 +1 konzerv: ${winners.length ? winners.map(esc).join(', ') : 'senki'}</p>
      <button class="btn" id="ok">Eredménytábla</button>`, { full: true, bg: '#ff5a1f', fg: '#fff' });
    $('ok').onclick = () => {
      S().stage = 'leaderboard';
      if (RM.online) RM.online.save();
      leaderboard();
    };
  }

  function win(coins) {
    const s = S();
    set(`${header()}<div class="big" style="font-size:64px">NYERTÉL!</div>
      <h2>${esc(s.players[s.guesserIdx].name)} lebuktatta mindenkit</h2>${answerCard()}
      <p style="font-size:22px">🥫 +${coins} konzervpont</p>
      <button class="btn" id="ok">Eredménytábla</button>`, { full: true, bg: '#0fcb6b', fg: '#fff' });
    $('ok').onclick = () => {
      S().stage = 'leaderboard';
      if (RM.online) RM.online.save();
      leaderboard();
    };
  }

  function leaderboard() {
    const last = RM.game.isLastRound();
    const ranked = [...S().players].sort((a, b) => b.score - a.score);
    set(`${header()}<h1>${last ? 'Végeredmény' : 'Eredménytábla'}</h1>
      <div class="list leaderboard">${ranked.map((p, i) => `<div class="pl">${avatar(p)}
        <span>${i === 0 && last ? '🏆 ' : ''}${esc(p.name)}</span><span class="c score-cans">🥫 ${p.score}</span></div>`).join('')}</div>
      <div class="sp"></div>
      <button class="btn o" id="ok" ${S().isHost ? '' : 'disabled'}>${S().isHost ? (last ? 'Új játék' : 'Következő kör') : 'Várakozás a gazdára'}</button>
      ${last ? `<button class="btn" id="hm">${S().isHost ? 'Szoba bezárása' : 'Kilépés a szobából'}</button>` : ''}`);
    $('ok').onclick = () => RM.game.afterLeaderboard();
    if (last) $('hm').onclick = async () => {
      if (!S().isHost) {
        RM.online.leaveRoom();
        home();
        return;
      }
      if (!window.confirm('Biztosan bezárod a szobát? Minden játékos kilép belőle.')) return;
      try { await RM.online.closeRoom(); }
      catch (error) { RM.screens.showMessage('Nem sikerült bezárni a szobát', error.message || 'Ellenőrizd az internetkapcsolatot.'); }
    };
  }

  return { auth, home, settings, store, lobby, countdown, handoff, roleScreen, questionPage, guessIntro, guess, lose, win, leaderboard, renderOnline, showMessage };
})();
