# Story Bible – plán zapracování

Zdroj: `Shark_Treasure_Story_Bible.pdf`. Navazuje na `docs/lost-oceans.md`.

## Rozhodnutí

- Postavy, dialogy a rádiové hlášky jsou data (`src/progression/characters.ts`, `src/progression/dialogue.ts`).
- Quest má více cílů (`steps`), které se plní v libovolném pořadí; řetězy přes `requires`, kategorie podle bible (hlavní příběh, Mayiny prosby, vedlejší příběhy, výzvy).
- Konec kapitoly (`chapterEnd`) odemyká další oceán; volby (disk, amfora, Diego, Rook) jsou příznaky v save (`flags`).
- Dialogy na lodi jdou přes frontu `pendingDialogs` v save (briefing při zpřístupnění questu, debrief po splnění, háček kapitoly); během ponoru jen krátké rádio s omezenou četností.
- Konce: Guardian / Hidden Heart / Power of the Deep / Sacrifice; Guardian vyžaduje Diegovu linku, výzkum a pomoc regionům.
- Základní fotoaparát má každý (tutoriál fotí rybu); vylepšení zvyšuje úroveň.
- Ukazatele úkolů jdou vypnout v nastavení.

## Úkoly

1. [x] Portréty postav a příběhové předměty
2. [x] Quest framework: kroky, řetězy, kategorie, volby, odměny vybavením, nové cíle (sken, počet truhel, volba, dosažení lokace)
3. [x] Postavy a dialogy: prolog, briefingy, debriefy, háčky kapitol, Voss, Diego, Rook, Idris, Nora
4. [x] Rádio během ponoru (Maya)
5. [x] Questové linky: Karibik (8), Diego, Rook, ostatní oceány
6. [x] Konce podle činů hráče
7. [x] Deník: kategorie questů, posádka a Mayin vztah; přepínač ukazatelů
8. [x] Save v4 + migrace, testy, README, ověření v prohlížeči
