/* Supabase authentication and shared room synchronization. */
window.RM = window.RM || {};

RM.online = (() => {
  const GAME_FIELDS = ['players', 'round', 'usedQuestions', 'question', 'guesserIdx', 'whiteIdx', 'fakes', 'cards', 'turn', 'stage', 'gameId', 'lastResult'];
  let client = null;
  let pollId = null;
  let lastFingerprint = '';
  let busy = false;
  const recordedRounds = new Set();
  const ACTIVE_ROOM_KEY = 'rm_active_room';
  const USERNAME_EMAIL_DOMAIN = 'accounts.rusnyamacskak.invalid';

  const configured = () => {
    const c = RM.SUPABASE_CONFIG || {};
    return c.url && c.anonKey && !c.url.includes('YOUR_') && !c.anonKey.includes('YOUR_');
  };

  function snapshotState() {
    const s = RM.state;
    return Object.fromEntries(GAME_FIELDS.map(key => [key, s[key]]));
  }

  function applyRoom(payload, redraw = true) {
    if (!payload) return;
    const s = RM.state;
    const incoming = payload.state || {};
    const scores = new Map((incoming.players || []).map(p => [p.user_id, p.score || 0]));
    const members = (payload.members || []).slice().sort((a, b) => a.seat - b.seat);
    const players = members.map(m => ({
      user_id: m.user_id,
      name: m.name,
      avatar: Number(m.avatar) || 0,
      score: scores.get(m.user_id) || 0,
    }));
    const fingerprint = JSON.stringify({ state: incoming, members });
    s.roomId = payload.id;
    s.roomCode = payload.code;
    s.hostId = payload.host_id;
    s.isHost = payload.host_id === s.userId;
    for (const key of GAME_FIELDS) {
      if (key === 'players') s.players = players;
      else if (Object.prototype.hasOwnProperty.call(incoming, key)) s[key] = incoming[key];
    }
    const changed = fingerprint !== lastFingerprint;
    lastFingerprint = fingerprint;
    if (redraw && changed && RM.screens) RM.screens.renderOnline();
    if (s.gameId && (s.stage === 'win' || s.stage === 'lose' || (s.stage === 'leaderboard' && s.lastResult))) {
      recordRoundStats().catch(error => console.warn('A körstatisztika mentése sikertelen:', error));
    }
  }

  function clearRoomState() {
    stopPolling();
    lastFingerprint = '';
    try { localStorage.removeItem(ACTIVE_ROOM_KEY); } catch { /* a munkamenet ettől még lezárható */ }
    const s = RM.state;
    s.roomCode = '';
    s.roomId = '';
    s.hostId = '';
    s.isHost = false;
    s.players = [];
  }

  function isRoomUnavailable(error) {
    return error?.code === 'P0001'
      && /szoba nem található|nem vagy a tagja/i.test(error.message || '');
  }

  function handleRoomError(error) {
    if (!isRoomUnavailable(error)) {
      console.error('Szoba frissítése sikertelen:', error);
      return;
    }
    clearRoomState();
    RM.screens.showMessage('A szoba már nem elérhető', 'A gazda bezárta, vagy már nem vagy a szoba tagja.');
  }

  async function restoreActiveRoom() {
    let code = '';
    try { code = localStorage.getItem(ACTIVE_ROOM_KEY) || ''; } catch { /* tárolás tiltva */ }
    if (!code) return false;
    try {
      const { data, error } = await client.rpc('get_game_room', { p_code: code });
      if (error) throw error;
      lastFingerprint = '';
      applyRoom(data, false);
      startPolling();
      if (RM.state.stage === 'lobby') RM.screens.lobby();
      else RM.screens.renderOnline();
    } catch (error) {
      if (isRoomUnavailable(error)) {
        clearRoomState();
        RM.screens.showMessage('A szoba már nem elérhető', 'A szobát bezárták, vagy már nem vagy a tagja.');
      } else {
        console.error('Nem sikerült visszalépni a korábbi szobába:', error);
        RM.screens.home();
      }
    }
    return true;
  }

  async function fetchRoom(redraw = true) {
    const { data, error } = await client.rpc('get_game_room', { p_code: RM.state.roomCode });
    if (error) throw error;
    applyRoom(data, redraw);
    return data;
  }

  function startPolling() {
    stopPolling();
    pollId = setInterval(async () => {
      if (!client || busy || !RM.state.roomCode) return;
      try { await fetchRoom(); }
      catch (error) { handleRoomError(error); }
    }, 1200);
  }

  function stopPolling() {
    if (pollId) clearInterval(pollId);
    pollId = null;
  }

  async function save() {
    if (!client || !RM.state.roomCode) return;
    busy = true;
    try {
      const { error } = await client.rpc('save_game_room', {
        p_code: RM.state.roomCode,
        p_state: snapshotState(),
      });
      if (error) throw error;
      lastFingerprint = JSON.stringify({
        state: snapshotState(),
        members: RM.state.players.map((p, seat) => ({
          user_id: p.user_id, name: p.name, avatar: p.avatar, seat,
        })),
      });
    } catch (error) {
      console.error('Játék mentése sikertelen:', error);
      RM.screens.showMessage('Nem sikerült menteni', error.message || 'Ellenőrizd az internetkapcsolatot.');
    } finally {
      busy = false;
    }
  }

  function setUser(user) {
    const s = RM.state;
    s.userId = user?.id || '';
    if (!user) return;
    const metadata = user.user_metadata || {};
    if (metadata.display_name) s.profile.name = metadata.display_name;
    if (Number.isInteger(metadata.avatar) && RM.AVATARS[metadata.avatar]?.image) s.profile.avatar = metadata.avatar;
    s.loadProfile();
    if (metadata.display_name) s.profile.name = metadata.display_name;
    if (Number.isInteger(metadata.avatar) && RM.AVATARS[metadata.avatar]?.image) s.profile.avatar = metadata.avatar;
  }

  async function init() {
    try {
      await RM.loadSupabaseConfig();
    } catch (error) {
      RM.screens.auth(error.message);
      return;
    }
    if (!configured()) {
      RM.screens.auth('A Supabase beállításai hiányoznak a .env fájlból.');
      return;
    }
    client = window.supabase.createClient(RM.SUPABASE_CONFIG.url, RM.SUPABASE_CONFIG.anonKey);
    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await refreshStats().catch(error => console.warn('A statisztikákat nem sikerült betölteni:', error));
      if (!await restoreActiveRoom()) RM.screens.home();
    } else {
      RM.screens.auth();
    }
    client.auth.onAuthStateChange((event, sessionNow) => {
      if (event === 'SIGNED_OUT') {
        clearRoomState();
        RM.screens.auth();
      } else if (event === 'SIGNED_IN' && sessionNow?.user) {
        setUser(sessionNow.user);
        refreshStats()
          .catch(error => console.warn('A statisztikákat nem sikerült betölteni:', error))
          .finally(() => restoreActiveRoom().then(restored => { if (!restored) RM.screens.home(); }));
      }
    });
  }

  async function authenticate(mode, username, password) {
    if (!configured() || !client) throw new Error('A Supabase beállításai nem töltődtek be a .env fájlból.');
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^(?!.*\.\.)[a-z0-9](?:[a-z0-9._-]{1,18}[a-z0-9])$/.test(normalizedUsername)) {
      throw new Error('A felhasználónév 3–20 karakter legyen, angol betűkkel, számokkal, ponttal, kötőjellel vagy aláhúzással; betűvel vagy számmal kezdődjön és végződjön.');
    }
    if (password.length < 6) throw new Error('A jelszó legalább 6 karakter legyen.');
    // Supabase email/jelszó hitelesítését használjuk, de a fiókhoz belső címet generálunk.
    // A játékosnak nem kell és nem is kell megadnia valódi e-mail-címet.
    const authEmail = `${normalizedUsername}@${USERNAME_EMAIL_DOMAIN}`;
    const result = mode === 'signup'
      ? await client.auth.signUp({
          email: authEmail,
          password,
          options: { data: { display_name: normalizedUsername, avatar: 0 } },
        })
      : await client.auth.signInWithPassword({ email: authEmail, password });
    if (result.error) throw result.error;
    if (result.data.user) setUser(result.data.user);
    if (mode === 'signup' && !result.data.session) {
      return 'A Supabase nem adott bejelentkezett munkamenetet. Kapcsold ki az Authentication → Providers → Email → Confirm email beállítást, hogy ne próbáljon megerősítő e-mailt küldeni, majd próbáld újra.';
    }
    await refreshStats();
    if (!await restoreActiveRoom()) RM.screens.home();
    return '';
  }

  async function saveProfile() {
    const s = RM.state;
    s.profile.name = s.profile.name.trim().slice(0, 12) || 'Játékos';
    s.saveProfile();
    const { data, error } = await client.auth.updateUser({
      data: { display_name: s.profile.name, avatar: s.profile.avatar },
    });
    if (error) throw error;
    if (data.user) setUser(data.user);
  }

  async function refreshStats() {
    if (!client || !RM.state.userId) return RM.state.stats;
    const { data, error } = await client.rpc('get_my_game_stats');
    if (error) throw error;
    RM.state.stats = {
      roundsPlayed: Number(data.rounds_played) || 0,
      roundsWon: Number(data.rounds_won) || 0,
      lies: Number(data.lies_submitted) || 0,
      detective: Number(data.detective_rounds) || 0,
      cans: Number(data.cans_earned) || 0,
    };
    return RM.state.stats;
  }

  async function recordRoundStats() {
    const s = RM.state;
    if (!client || !s.roomCode || !s.gameId || !(s.stage === 'win' || s.stage === 'lose' || (s.stage === 'leaderboard' && s.lastResult))) return;
    const key = `${s.gameId}:${s.round}`;
    if (recordedRounds.has(key)) return;
    recordedRounds.add(key);
    const { data, error } = await client.rpc('record_game_round', {
      p_room_code: s.roomCode,
      p_game_id: s.gameId,
      p_round: s.round,
    });
    if (error) {
      recordedRounds.delete(key);
      throw error;
    }
    s.stats = {
      roundsPlayed: Number(data.rounds_played) || 0,
      roundsWon: Number(data.rounds_won) || 0,
      lies: Number(data.lies_submitted) || 0,
      detective: Number(data.detective_rounds) || 0,
      cans: Number(data.cans_earned) || 0,
    };
    const homeCans = document.getElementById('home-cans');
    if (homeCans) homeCans.textContent = String(s.stats.cans);
  }

  async function openRoom(mode, code = '') {
    await saveProfile();
    const s = RM.state;
    const args = { p_name: s.profile.name, p_avatar: s.profile.avatar };
    let result;
    if (mode === 'create') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      args.p_code = Array.from(bytes, b => chars[b % chars.length]).join('');
      result = await client.rpc('create_game_room', args);
    } else {
      args.p_code = code.trim().toUpperCase();
      result = await client.rpc('join_game_room', args);
    }
    if (result.error) throw result.error;
    lastFingerprint = '';
    applyRoom(result.data, false);
    try { localStorage.setItem(ACTIVE_ROOM_KEY, RM.state.roomCode); } catch { /* a szoba ettől még használható */ }
    startPolling();
    if (RM.state.stage === 'lobby') RM.screens.lobby();
    else RM.screens.renderOnline();
  }

  async function signOut() {
    stopPolling();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function closeRoom() {
    const code = RM.state.roomCode;
    if (!code) return;
    const { error } = await client.rpc('close_game_room', { p_code: code });
    if (error) throw error;
    clearRoomState();
    RM.screens.home();
  }

  function leaveRoom() {
    clearRoomState();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && client && RM.state.roomCode) {
      fetchRoom().catch(handleRoomError);
    }
  });
  window.addEventListener('pageshow', () => {
    if (client && RM.state.roomCode) fetchRoom().catch(handleRoomError);
  });

  return {
    init, authenticate, openRoom, save, saveProfile, refreshStats, recordRoundStats, signOut, leaveRoom, closeRoom,
    get configured() { return configured(); },
    get client() { return client; },
    refresh: fetchRoom,
  };
})();
