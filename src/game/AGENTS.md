# src/game – herní engine

Čistý TypeScript bez Reactu, React Native a Expo: engine musí jít spustit v Node testech (`tests/`). Z okolí importuje jen moduly, které samy nic takového netáhnou:
- typy `SpriteName` a `BackgroundName` ze `src/render/spriteAssets` (vždy `import type`, runtime import by do Node testů zatáhl `require` obrázků);
- data relikvií ze `src/progression/relics`.

## Smyčka

`engine.ts`:
- `createGame(stats, view, boatX, options)` postaví nový `GameState` a vygeneruje okolní úseky.
- `newWorld` udělá totéž se zachovaným časem a natočením lodi; volá se po každém ponoru.
- `step(state, input, dt, view)` posune simulaci o `dt` (oříznuté na `MAX_DT`) a vrátí nasbírané `GameEvent[]`.

Pořadí v `step` je záměrné:
1. Fáze: `boat` → `updateBoat` a `updateBoatEvents`; `dive` → pohyb, kyslík, prostředí, `updateDive`, `updateTreasure`; `result` → jen `updateTreasure`.
2. Systémy běžící v každé fázi: `updateEnemies`, `updateProps`, `updateExtras`, `updateAmbient`, `updateAnimation`, `updateCamera`.
3. `ensureWorld` dogeneruje úseky kolem kamery.

Nový systém zařaď do tohoto pořadí a napiš ho jako `updateX(state, dt)` v `systems/`.

Systémy mutují `state` přímo. Ven komunikují jen pomocnými funkcemi z `systems/effects.ts`:
- `sfx`, `haptic` → eventy;
- `floatText`, `burst`, `bubble` → vizuální efekty;
- `shake` → otřes kamery.

Toasty a rádio jsou eventy `{ type: 'toast' | 'radio' }`. UI na ně reaguje v `GameScreen.handleEvents`. Nový druh eventu přidej do unie `GameEvent` v `types.ts` a obsluž ho tam.

Systémy rozšíření Živé proudy: `tide.ts` (příliv, brány), `drone.ts` (Pip), `collapse.ts` (hroutící se jeskyně a padající bloky), `kit.ts` (spotřební výbava, značky světlice/návnady/bóje), `haul.ts` (těžké truhly, jeřáb), `fauna.ts` (mimikry, barakudy, řetězová medúza, krevetka pistolník, trhlinový stín) a `bosses.ts` (Vládce proudů, Dutá ulita, `bossVulnerable`). Materiály a výbava jsou v `gear.ts`, konstruktory záznamu a dronu v `records.ts` (mimo `engine.ts`, aby nevznikl kruhový import se `systems/dive.ts`).

Akce hráče jsou samostatné funkce volané z UI (`startDive`, `triggerSonar` v `dive.ts`; `fireHarpoon`, `launchBalloon`, `fireRepellent`, `healDiver`, `fireScooter`, `toggleCamera`, `takePhoto`, `cameraKey` v `extras.ts`). Kontrolují si cooldown a zásoby samy, UI je volá bez podmínek.

## Souřadnice

- Pixely světa, `y` roste dolů, hladina je `y = 0`, paluba `BOAT_DECK_Y = -30`. Hloubka v metrech = `y / PX_PER_M` (10 px = 1 m).
- `x` je neomezené na obě strany a běžně záporné: loď pluje doleva i doprava od startu v `x = 0`. Regiony oceánu jsou zrcadlené podle `|x|` (`regionIndexAt`).
- Svět je rozdělený na úseky (`Chunk`) široké `CHUNK_W = 480`; index úseku `Math.floor(x / CHUNK_W)` je pro levou stranu záporný.
- Každý výpočet indexu z `x` musí platit i pro záporná čísla: `%` v JS vrací záporný zbytek. Používej `((n % k) + k) % k` nebo `Math.abs`. Na tomhle už jednou spadla produkce (houpání rostlin vlevo od startu).

## Náhoda a determinismus

- Generování světa je deterministické podle `state.seed`: `generateChunk` bere `mulberry32(hash(seed, index, salt))`, terén `seabedY` a propast `shaftWalls` stejně. Ve vzhledu úseků proto nepoužívej `Math.random`, jinak se úsek po přegenerování změní.
- Za běhu (chování žraloků, částice, události) je `Math.random` v pořádku.
- Prvky rozšíření v úseku (`expansionChunk` ve `world.ts`) berou vlastní generátor `hash(seed, index, 6262)`. Nový obsah přidávej tam nebo s dalším vlastním saltem; sdílený generátor úseku by posunul rozložení původních oceánů a rozbil jejich testy férovosti.
- Pozice questových předmětů nezávisí na seedu, ale jen na oceánu a definici questu (`itemX`), takže přežijí přegenerování světa.

## Data místo kódu

- `oceans.ts`: 10 oceánů (`OCEANS`). `OCEAN_ORDER` drží 8 oceánů hlavní kampaně a určuje její kapitoly; oceány rozšíření jsou v `EXPANSION_OCEANS`, mapa a cestování používají `WORLD_OCEANS`. Oceán obsahuje:
  - regiony (`start`, `baseDepth`, `tier`, `decor`, `landmarks`, `caves`);
  - pozadí podle hloubky;
  - bosse a mechaniky (`temperature`, `fog`, `darkness`, `currents`, `puzzle`, `sealed`).

  - materiály (`materials`), příliv (`tide`), u Putujícího útesu `moving`, `vents`, šance na mimikry, těžké truhly a nestabilní jeskyně.

  Nový oceán nebo lokace je nový řádek dat, ne nová větev kódu.
- `catalog.ts`: truhlice (`CHESTS`, váhy podle regionu), žraloci (`SHARKS`; boss = `boss: true` a `hp > 1`, nikdy test na `kind === 'mega'`), poškození tvorů.
- `world.ts` `DECOR`: rozměry dekorací. `min`/`max` je šířka v px a výška se dopočítá z poměru stran spritu, takže při výměně spritu za jinak široký uprav šířky, aby zůstala výška.
- `modifiers.ts`: počasí (`Condition`) a denní výzvy (`CHALLENGES`).
- `density.ts`: strop nepřátel na úsek (`CHUNK_THREATS`) a rozestupy, aby nevznikla neprůchodná zeď (`thinThreats`). Questové objekty jsou `state.props`, ne `Hazard`, a `thinThreats` je nesmí vyřadit.

## Entity a jejich životní cyklus

- Žraloci (`state.sharks`):
  - smrt: nastaví se `dying > 0` (dohraje se potopení) a odebere je až `updateEnemies`;
  - cíle (harpuna, foto, balón) žraloky s `dying` přeskakují.
- Tvorové (`state.hazards`): mají `alive`. V moři mrtví tvorové v poli zůstávají a systémy i render je přeskakují podle `alive`; režim `endless` průběžně zahazuje entity nad kamerou.
- Simulují se jen entity v dosahu kolem potápěče: `ACTIVE_RANGE` vodorovně (`constants.ts`), `ACTIVE_DEPTH` svisle (`systems/enemies.ts`).
- Bossové s puzzlem (`maelstrom`, `hollow`) mají vlastní update v `bosses.ts`; `bossVulnerable` rozhoduje, jestli harpuna zraní, a `shark.exposed` říká renderu, kdy ukázat slabé místo.
- Pole `prop.phase` se obecně zvyšuje v `updateProps`; brány ho používají jako stav animace (0–1), proto jsou z obecného přičítání vyřazené.
- `damageDiver` v `collision.ts` je jediná cesta ke zranění. Řeší nezranitelnost, brnění, odhození, ztrátu nesené truhlice a záznam do `record`.
- Výsledek ponoru skládá `computeResult` / `finishDive` v `dive.ts` do `DiveResult`. Co má jít do save (fotky, objevy, aktivace, relikvie), musí být ve `state.record` a odtud v `DiveResult`.
- Režim `endless` (UI „Hlubinný ponor“): svislá propast místo úseků (`endless.ts`), jiné generování i výplata. Jmenuje se tak, aby nekolidoval s oceánem Abyss.

## Rozšiřování

Nová mechanika = pole v `types.ts` + inicializace v `createGame` + `updateX` v `systems/` + vykreslení v `src/render/` + test v `tests/`. U nového stavového pole ověř, že ho `createGame` vždy naplní: `newWorld` staví stav znovu od nuly.

Vyvážení zkontroluj testy férovosti v `tests/oceans.test.ts`: s doporučenou výbavou musí jít doplout pro fragment každého oceánu a vrátit se.
