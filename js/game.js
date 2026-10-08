/*
 * Játéklogika (nincs benne HTML, a megjelenítést az RM.screens végzi).
 *
 * Egy kör menete:
 *   newRound → countdown → [minden játékos: handoff → szerep → kérdés/válasz] → guessIntro → guess
 *   → (kiesés: lose | siker: win) → leaderboard → következő kör / vége
 */
window.RM = window.RM || {};

RM.game = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 8,

  start() {
    const s = RM.state;
    s.gameId = crypto.randomUUID();
    s.lastResult = '';
    s.players.forEach(p => (p.score = 0));
    s.round = 0;
    s.usedQuestions = [];
    this.newRound();
  },

  /** Arány, amennyire a furcsa tények a klasszikus kérdések elé kerülnek. */
  FUN_RATIO: 0.8,

  /** Kérdés-index választás: többnyire furcsa tény, és nem ismétlünk, amíg van új. */
  pickQuestion() {
    const s = RM.state, F = RM.FUN_COUNT, N = RM.QUESTIONS.length;
    const fresh = (from, to) => {
      const r = [];
      for (let i = from; i < to; i++) if (!s.usedQuestions.includes(i)) r.push(i);
      return r;
    };
    let pool = Math.random() < this.FUN_RATIO ? fresh(0, F) : fresh(F, N);
    if (!pool.length) pool = fresh(0, N);
    if (!pool.length) { s.usedQuestions = []; pool = fresh(0, N); }
    const qi = pool[Math.floor(Math.random() * pool.length)];
    s.usedQuestions.push(qi);
    return qi;
  },

  newRound() {
    const s = RM.state, n = s.players.length;

    s.question = RM.QUESTIONS[this.pickQuestion()];

    // szerepek: a találgató körönként forog, a fehér macska véletlen
    s.guesserIdx = s.round % n;
    const others = RM.util.shuffle(s.players.map((_, i) => i).filter(i => i !== s.guesserIdx));
    s.whiteIdx = others[0];

    s.fakes = {};
    s.cards = [];
    s.turn = 0;
    s.lastResult = '';
    s.stage = 'countdown';
    if (RM.online) RM.online.save();
    RM.screens.countdown(() => this.nextTurn());
  },

  /** 'guesser' | 'white' | 'liar' */
  roleOf(i) {
    const s = RM.state;
    return i === s.guesserIdx ? 'guesser' : i === s.whiteIdx ? 'white' : 'liar';
  },

  nextTurn() {
    const s = RM.state;
    if (s.turn >= s.players.length) {
      this.buildCards();
      s.stage = 'guessIntro';
      if (RM.online) RM.online.save();
      return RM.online ? RM.screens.renderOnline() : RM.screens.guessIntro();
    }
    s.stage = 'turn';
    if (RM.online) RM.online.save();
    if (RM.online) RM.screens.renderOnline();
    else RM.screens.handoff(s.turn);
  },

  endTurn() {
    RM.state.turn++;
    this.nextTurn();
  },

  /** Hamis válasz beküldése. Hibaüzenetet ad vissza, vagy null-t, ha rendben. */
  submitFake(i, text) {
    const s = RM.state, { normalize } = RM.util;
    if (!text) return 'Írj be valamit!';
    if (normalize(text) === normalize(s.question[1])) return 'Ez a valódi válasz! Írj egy másikat.';
    if (Object.values(s.fakes).some(f => normalize(f) === normalize(text))) return 'Ezt már valaki beírta.';
    s.fakes[i] = text;
    return null;
  },

  buildCards() {
    const s = RM.state;
    s.cards = RM.util.shuffle([
      { text: s.question[1], real: true },
      ...Object.entries(s.fakes).map(([i, text]) => ({ text, who: +i })),
    ]);
  },

  /** A találgató rákoppintott egy kártyára. */
  pickCard(index) {
    const s = RM.state, card = s.cards[index];
    if (card.out) return;

    if (card.real) return this.guesserLoses();

    card.out = true; // hamis válasz lebukott
    const remainingFakes = s.cards.filter(c => !c.real && !c.out).length;
    if (remainingFakes === 0) return this.guesserWins();
    s.stage = 'guess';
    if (RM.online) RM.online.save();
    RM.screens.guess();
  },

  /** A valódi választ jelölte meg → kiesik; akik nem buktak le, +1 érmét kapnak. */
  guesserLoses() {
    const s = RM.state;
    s.stage = 'lose';
    s.lastResult = 'lose';
    const exposed = new Set(s.cards.filter(c => c.out).map(c => c.who));
    const winners = [];
    s.players.forEach((p, i) => {
      if (i !== s.guesserIdx && !exposed.has(i)) { p.score++; winners.push(p.name); }
    });
    if (RM.online) RM.online.save();
    RM.screens.lose(winners);
  },

  /** Minden hamisat kiszűrt → annyi konzervpontot kap, ahány hamis válasz volt. */
  guesserWins() {
    const s = RM.state, coins = Object.keys(s.fakes).length;
    s.players[s.guesserIdx].score += coins;
    s.stage = 'win';
    s.lastResult = 'win';
    if (RM.online) RM.online.save();
    RM.screens.win(coins);
  },

  isLastRound: () => RM.state.round >= RM.state.players.length - 1,

  async afterLeaderboard() {
    const s = RM.state;
    if (!s.isHost) return;
    if (RM.online) {
      try { await RM.online.recordRoundStats(); }
      catch (error) { console.warn('A körstatisztikát a szoba többi játékosa még szinkronizálhatja:', error); }
    }
    if (this.isLastRound()) {
      s.players.forEach(p => (p.score = 0));
      s.round = 0;
      s.gameId = crypto.randomUUID();
      s.usedQuestions = [];
    }
    else s.round++;
    this.newRound();
  },
};
