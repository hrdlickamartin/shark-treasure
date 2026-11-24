# src/progression – save, ekonomika, příběh

Všechno mezi ponory: co hráč vlastní, co splnil a kam smí. Logika jsou čisté funkce nad `SaveData`; jediný React kus je hook `useProgress.ts` a jediný kus s AsyncStorage je `save.ts`. Díky tomu testy volají progresi přímo v Node.

## Save

- `saveData.ts`: typ `SaveData`, `DEFAULT_SAVE`, `SAVE_VERSION` a `migrateSave`. Modul nesmí importovat AsyncStorage, testy ho načítají v Node.
- `save.ts`: čtení a zápis přes AsyncStorage pod klíčem `shark-treasure-save-v1`; na webu je to `localStorage`. Klíč se nemění, verzi nese pole `version`.
- `useProgress.ts`: drží `save` v Reactu a `saveRef` pro synchronní čtení. Každá změna jde přes `commit(next)` (stav i zápis najednou). Nové akce piš jako `useCallback`, které vezmou `saveRef.current`, zavolají čistou funkci a výsledek předají `commit`.
- Save je neměnný: vždy vracej nový objekt (`{ ...current, … }`), nemutuj vnořená pole ani objekty.

### Změna tvaru save

1. Přidej pole do `SaveData` a výchozí hodnotu do `DEFAULT_SAVE`.
2. `migrateSave` musí nové pole doplnit ze starých savů. Vnořené objekty slučuje s výchozími (`{ ...DEFAULT_SAVE.x, ...parsed.x }`), pole kopíruje.
3. Když se mění význam existujících dat (ne jen přibývá pole), zvyš `SAVE_VERSION` a přidej větev `version < N`. Přejmenování řeš jako `abyssBest` → `shaftBest`.
4. Přidej test, který načte save ve starém tvaru a ověří, že postup zůstal (vzor: „starý save z verze 2…“ v `tests/oceans.test.ts`).

Hráči mají savy z dřívějších verzí, rozbitá migrace jim smaže postup.

Save je ve verzi 5 (materiály, výbava, modifikace, moduly lodi, reputace, zakázky, trhliny, úlomky, lov pokladů, safari, týdenní expedice, kapitola a konec rozšíření). Rozšíření (materiály, výbava, moduly, reputace, Pip) přežije novou výpravu.

## Vyhodnocení ponoru

`applyDive(save, result)` v `progress.ts` je jediné místo, kde `DiveResult` mění save:
- peníze, mise, questy aktivní v daném oceánu (`progressQuest`);
- katalog fotek, relikvie, objevy, XP a úrovně průzkumníka, výzkumná data, perly z propasti.

Pak zavolá `settle`, který:
- vyplatí odměny splněných questů;
- posune kapitolu (`chapterEnd`) a odemkne oceány;
- nastaví příznaky;
- zařadí dialogy do `pendingDialogs` (`debrief:`, `brief:`, `hook_`, `choice:`).

Pro rozšíření volá `applyDive` navíc `applyTideDive` z `tides.ts` (materiály, spotřebovaná výbava, zakázky, safari, týdenní expedice, lov pokladů, trhliny podle konce kampaně). `settle` vyhodnocuje i cíle, které nevznikají v ponoru (`reputation`, `craft`, `rifts`), takže akce v přístavu ukládej přes `resettle`, jinak by se quest nedokončil.

Vrací nový save a `ResultSummary` pro obrazovku výsledku. Volby v dialozích jdou přes `applyChoice`, který končí také v `settle`.

## Data

| Soubor | Obsah |
|---|---|
| `upgrades.ts` | `UPGRADES` (cena `baseCost · growth^level`; strop `max` se každou výpravou zvedne o 1, nejvýš o `extra`; `unlockAt` = od které výpravy je k dispozici) a `statsFor()`, které skládá `Stats` pro engine z vylepšení, relikvií, výzvy, výpravy, perků a výzkumu |
| `quests.ts` | `QUESTS`: kategorie `main / maya / side / challenge`, více cílů (`steps`) v libovolném pořadí, řetězy přes `requires`, příznaky `needsFlag`, volby `choice`; pozice předmětů `itemX` podle oceánu a regionu |
| `characters.ts`, `dialogue.ts` | postavy s portréty, dialogy na lodi podle id, rádiové hlášky podle tématu |
| `story.ts` | konce příběhu a jejich podmínky |
| `missions.ts` | krátkodobé mise (3 aktivní najednou) |
| `research.ts` | výzkumný strom, úroveň průzkumníka podle XP a odměny za úroveň |
| `expedition.ts`, `embark.ts` | nová výprava (prestiž): perly, perky, škálování obtížnosti a odměn, co se resetuje |
| `relics.ts`, `skins.ts`, `encyclopedia.ts` | relikvie s bonusy, vzhledy potápěče, katalog druhů pro fotky |
| `tideQuests.ts` | questy rozšíření (kapitoly 9–12, pole `chapter`, `unlocks`); kapitoly rozšíření posouvají `tideChapter`, ne `storyChapter` |
| `crafting.ts`, `modules.ts`, `factions.ts` | recepty a modifikace, moduly lodi a sloty, frakce s úrovněmi, zakázky a odměny za úlomky |
| `tides.ts` | čisté funkce rozšíření: trhliny, lov pokladů, safari, týdenní expedice, výroba, nákup modulů, předání úlomku; `hasFlag` počítá i odvozené příznaky (`allies3`, `riftsN`, `respect:<frakce>`) |

Questy a dialogy jsou data. Nový quest je záznam v `QUESTS` (plus dialogy v `dialogue.ts`, když má `briefing`/`debrief`). Kód měň jen pro nový druh cíle v `QuestGoal`, a pak ve třech místech:
- `progressQuest`: plnění cíle;
- `questProps`: questové objekty ve světě;
- `DiveResult` / `state.record`: odkud se plnění zjistí.

Test `každý quest má platné lokace v oceánu` hlídá, že předměty questů leží v existujících regionech.
