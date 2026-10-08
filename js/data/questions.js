/*
 * Klasszikus (általános műveltség) kérdések – ezek a ritkább, "unalmasabb" kérdések.
 * A furcsa tények a facts.js-ben vannak. A kettő együtt adja a RM.QUESTIONS tömböt:
 * az első RM.FUN_COUNT elem furcsa tény, a többi klasszikus.
 * Formátum: ["kérdés", "helyes válasz"]
 */
(function () {
  // [esemény, évszám]
  const EVENTS = [
    ["a mohácsi vész", "1526"],
    ["a honfoglalás (hagyományos dátum)", "895"],
    ["Szent István koronázása", "1000"],
    ["Mátyás királlyá választása", "1458"],
    ["a nándorfehérvári diadal", "1456"],
    ["a Rákóczi-szabadságharc kezdete", "1703"],
    ["a magyar forradalom és szabadságharc kezdete", "1848"],
    ["a kiegyezés", "1867"],
    ["a trianoni békeszerződés aláírása", "1920"],
    ["Magyarország EU-csatlakozása", "2004"],
    ["a berlini fal leomlása", "1989"],
    ["az első holdra szállás", "1969"],
    ["a Titanic elsüllyedése", "1912"],
    ["Kolumbusz első amerikai útja", "1492"],
    ["a francia forradalom kezdete", "1789"],
    ["az első világháború kezdete", "1914"],
    ["a második világháború vége Európában", "1945"],
    ["a Rubik-kocka feltalálása", "1974"],
    ["az első iPhone bemutatása", "2007"],
    ["a csernobili baleset", "1986"],
    ["Budapest egyesítése", "1873"],
    ["az Eiffel-torony átadása", "1889"],
    ["az első műhold (Szputnyik) fellövése", "1957"],
    ["Gagarin űrrepülése", "1961"],
    ["a budapesti földalatti megnyitása", "1896"]
  ];

  // [kérdés, válasz]
  const TRIVIA = [
    ["Hány húr van a hegedűn?", "4"],
    ["Melyik bolygó van a legközelebb a Naphoz?", "Merkúr"],
    ["Melyik a Naprendszer legnagyobb bolygója?", "Jupiter"],
    ["Melyik a világ leghosszabb folyója (a klasszikus mérés szerint)?", "Nílus"],
    ["Melyik a legnagyobb óceán?", "Csendes-óceán"],
    ["Mi a világ legmagasabb hegye?", "Mount Everest"],
    ["Hány játékos van a pályán egy focicsapatból?", "11"],
    ["Hány kontinens van a Földön?", "7"],
    ["Hány foga van egy felnőtt embernek?", "32"],
    ["Ki festette a Mona Lisát?", "Leonardo da Vinci"],
    ["Ki írta a Rómeó és Júliát?", "William Shakespeare"],
    ["Ki írta az Egri csillagokat?", "Gárdonyi Géza"],
    ["Ki írta A Pál utcai fiúkat?", "Molnár Ferenc"],
    ["Ki találta fel a telefont?", "Alexander Graham Bell"],
    ["Ki találta fel a villanykörtét?", "Thomas Edison"],
    ["Ki írta a Himnusz szövegét?", "Kölcsey Ferenc"],
    ["Ki zenésítette meg a Himnuszt?", "Erkel Ferenc"],
    ["Melyik a leghosszabb folyó Magyarországon?", "Duna"],
    ["Mi Magyarország legmagasabb hegycsúcsa?", "Kékes"],
    ["Mi Magyarország legnagyobb tava?", "Balaton"],
    ["Melyik Magyarország második legnagyobb városa?", "Debrecen"],
    ["Melyik megyében van Miskolc?", "Borsod-Abaúj-Zemplén"],
    ["Hány megye van Magyarországon Budapest nélkül?", "19"],
    ["Mi a magyar fizetőeszköz neve?", "Forint"],
    ["Mi a víz kémiai képlete?", "H2O"],
    ["Hány Celsius-fokon forr a víz?", "100"],
    ["Hány napos egy szökőév?", "366"],
    ["Melyik a legnagyobb szárazföldi állat?", "Afrikai elefánt"],
    ["Melyik a leggyorsabb szárazföldi állat?", "Gepárd"],
    ["Melyik röpképtelen madár él Ausztráliában?", "Emu"],
    ["Hány szíve van a polipnak?", "3"],
    ["Hány lába van a póknak?", "8"],
    ["Hány lába van a rovaroknak?", "6"],
    ["Mit eszik szinte kizárólag a koala?", "Eukaliptuszlevelet"],
    ["Mi a panda fő tápláléka?", "Bambusz"],
    ["Ki alapította a Microsoftot Paul Allennel?", "Bill Gates"],
    ["Ki alapította a Facebookot?", "Mark Zuckerberg"],
    ["Hol rendezték a 2016-os nyári olimpiát?", "Rio de Janeiro"],
    ["Hol rendezték a 2024-es nyári olimpiát?", "Párizs"],
    ["Melyik országban találták fel a pizzát?", "Olaszország"],
    ["Melyik országban él a sumó hagyománya?", "Japán"],
    ["Melyik tánc származik Argentínából?", "Tangó"],
    ["Melyik hangszer billentyűs, pedálos, és templomokban áll?", "Orgona"],
    ["Ki komponálta a Holdfény-szonátát?", "Beethoven"],
    ["Ki komponálta A varázsfuvolát?", "Mozart"],
    ["Ki írta a Harry Potter-könyveket?", "J. K. Rowling"],
    ["Hogy hívják a roxforti varázslósportot?", "Kviddics"],
    ["Ki írta A Gyűrűk Urát?", "J. R. R. Tolkien"],
    ["Mi Super Mario foglalkozása?", "Vízvezeték-szerelő"],
    ["Melyik Pokémon a sárga, villámfarkú?", "Pikachu"],
    ["Hány mező van egy sakktáblán?", "64"],
    ["Hány bábuja van egy játékosnak sakkban?", "16"],
    ["Mennyi a legtöbb pont, amit három nyílból dobhatsz darts-ban?", "180"],
    ["Hány színe van a szivárványnak?", "7"],
    ["Milyen színt kapsz, ha kéket és sárgát keversz?", "Zöld"],
    ["Mi a Föld egyetlen természetes holdja?", "Hold"],
    ["Melyik gáz a levegő legnagyobb része?", "Nitrogén"],
    ["Mi a legkeményebb természetes anyag?", "Gyémánt"],
    ["Melyik szerv pumpálja a vért?", "Szív"],
    ["Melyik az emberi test legnagyobb szerve?", "Bőr"],
    ["Hány csontja van egy felnőtt embernek?", "206"],
    ["Melyik vitamint termeli a bőr napfény hatására?", "D-vitamin"],
    ["Melyik a világ legnagyobb forró sivataga?", "Szahara"],
    ["Melyik a világ legkisebb országa?", "Vatikán"],
    ["Mennyi a pi értéke két tizedesre kerekítve?", "3,14"],
    ["Mennyi 12 × 12?", "144"],
    ["Hány oldala van egy hatszögnek?", "6"],
    ["Hány méter egy kilométer?", "1000"],
    ["Melyik hónap a legrövidebb?", "Február"]
  ];

  const classic = [
    ...EVENTS.map(([event, year]) => [`Melyik évben történt: ${event}?`, year]),
    ...TRIVIA,
  ];

  RM.QUESTIONS = [...RM.FACTS, ...classic];
  RM.FUN_COUNT = RM.FACTS.length;
})();
