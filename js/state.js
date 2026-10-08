/* A játék egyetlen állapot-objektuma + profil mentése a böngészőbe. */
window.RM = window.RM || {};

RM.state = {
  profile: { name: '', avatar: 0 },   // a saját profilod (localStorage-ban él)
  players: [],                        // [{ name, avatar, score }]
  round: 0,                           // hányadik kör (0-tól)
  usedQuestions: [],                  // már feltett kérdések indexei
  question: null,                     // [kérdés, helyes válasz]
  guesserIdx: 0,                      // fekete macska
  whiteIdx: 0,                        // fehér macska
  fakes: {},                          // { játékosIndex: hamis válasz }
  cards: [],                          // válaszkártyák: { text, real, who, out }
  turn: 0,                            // melyik játékos jön a szerepkörök körében
  stage: 'auth',                      // közös online játékfázis
  roomCode: '',
  roomId: '',
  hostId: '',
  userId: '',
  isHost: false,

  loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem('rm_profile'));
      if (saved) this.profile = saved;
    } catch (e) { /* nincs mentett profil */ }
  },

  saveProfile() {
    try { localStorage.setItem('rm_profile', JSON.stringify(this.profile)); } catch (e) { /* privát mód */ }
  },
};
