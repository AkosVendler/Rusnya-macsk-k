/*
 * Képernyők: minden függvény egy teljes képernyőt rajzol ki és bekösti a gombjait.
 * A logikát az RM.game végzi, a képernyők csak megjelenítenek és eseményt továbbítanak.
 */
window.RM = window.RM || {};

RM.screens = (function () {
  const { esc } = RM.util;
  const { set, header, avatar, $ } = RM.ui;
  const S = () => RM.state;

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
    set(`${header()}<h1>Szia, macska!</h1>
      <p>Minden játékos a saját fiókjával lép be a saját telefonján vagy számítógépén.</p>
      ${message ? `<div class="error">${esc(message)}</div>` : ''}
      <label><small>Felhasználónév</small><input id="username" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="pl. cirmi_12"></label>
      <label><small>Jelszó (legalább 6 karakter)</small><input id="password" type="password" autocomplete="current-password" placeholder="Jelszó"></label>
      <div id="auth-error" class="error"></div>
      <button class="btn o" id="login">Belépés</button>
      <button class="btn" id="signup">Fiók létrehozása</button>
      <small>Felhasználónév: 3–20 karakter, angol betű, szám, pont, kötőjel vagy aláhúzás. E-mail-címet nem kérünk és nem küldünk levelet. Ehhez a Supabase-ben ki kell kapcsolni az Email / Confirm email beállítást. Elfelejtett jelszóhoz jelenleg nincs visszaállítás.</small>`);
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
    set(`${header()}<h1>Szia, macska!</h1>
      <div class="card" style="background:var(--o);color:#fff"><div class="row">
        ${avatar(p)}
        <div style="flex:1"><small>Becenév</small>
          <input id="nm" maxlength="12" value="${esc(p.name)}" placeholder="Írd be a neved"></div>
      </div></div>
      <h2>Profilkép</h2>
      <div class="grid">${RM.AVATARS.map((a, i) =>
        `<div class="av ${i === p.avatar ? 'sel' : ''}" data-i="${i}" role="button" tabindex="0" aria-label="Profilkép ${i + 1}" title="Profilkép ${i + 1}" style="background:${a.color}">${a.image ? `<img src="${esc(a.image)}" alt="">` : a.emoji}</div>`).join('')}</div>
      <button class="btn o" id="create">Új szoba létrehozása</button>
      <h2>Csatlakozás</h2>
      <div class="row"><input id="code" maxlength="6" placeholder="6 jegyű szobakód" autocapitalize="characters">
        <button class="btn" id="join" style="width:auto;padding:12px 18px">Belépés</button></div>
      <div id="room-error" class="error"></div>
      <button class="btn" id="logout">Kilépés a fiókból</button>
      <small>${RM.game.MIN_PLAYERS}–${RM.game.MAX_PLAYERS} játékos · ${RM.QUESTIONS.length} kérdés.</small>`);

    document.querySelectorAll('.grid .av').forEach(el => el.onclick = () => {
      p.name = $('nm').value;
      p.avatar = +el.dataset.i;
      home();
    });
    document.querySelectorAll('.grid .av').forEach(el => el.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        el.click();
      }
    });
    const open = mode => async () => {
      p.name = $('nm').value.trim() || 'Játékos';
      try { await RM.online.openRoom(mode, $('code')?.value || ''); }
      catch (error) { $('room-error').textContent = error.message || 'Nem sikerült csatlakozni.'; }
    };
    $('create').onclick = open('create');
    $('join').onclick = open('join');
    $('logout').onclick = async () => {
      try { await RM.online.signOut(); } catch (error) { $('room-error').textContent = error.message; }
    };
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
        +1 érme: ${winners.length ? winners.map(esc).join(', ') : 'senki'}</p>
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
      <p style="font-size:22px">+${coins} érme</p>
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
        <span>${i === 0 && last ? '🏆 ' : ''}${esc(p.name)}</span><span class="c">${p.score} érme</span></div>`).join('')}</div>
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

  return { auth, home, lobby, countdown, handoff, roleScreen, questionPage, guessIntro, guess, lose, win, leaderboard, renderOnline, showMessage };
})();
