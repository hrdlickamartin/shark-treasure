# Přístav od 2. kapitoly – plán

Přístav (zakázky a frakce, dílna, moduly lodi) a sběr materiálů se dřív otevíraly až s rozšířením Živé proudy po konci kampaně. Hráč tak celou kampaň neměl za co utrácet kromě vylepšení. Nově se přístav otevře po dokončení Karibiku. Rozšíření zůstává příběhem a novým obsahem po kampani.

## Rozhodnutí

- **Dvě brány:**
  - `portOn(save)` (`src/progression/tides.ts`) je odvozená, bez příznaku: `storyChapter >= 1` nebo rozšíření.
  - `expansionOn(save)` dál znamená příznak `expansion` po konci kampaně.
- **Od 2. kapitoly** (po Karibiku):
  - tlačítko Přístav;
  - materiály ve všech oceánech (náhodné na dně a u vraků);
  - dílna, spotřební výbava v ponoru, modifikace;
  - moduly lodi;
  - zakázky Cechu, Institutu a Bratrstva.
- **Jen s rozšířením:**
  - příliv, Pip, trhliny a úlomky, láhve s mapou a lov pokladů, režimy;
  - oceány Úžina proudů a Putující útes;
  - tvorové rozšíření (mimikry, barakudy, sifon, krevetka, stín), těžké truhly, nestabilní jeskyně, průduchy, brány;
  - frakce Tidewatch.
- **Před rozšířením se nic nedá koupit naprázdno.** Prvky, které bez rozšíření nefungují, mají v datech `expansion: true`, přístav je ukáže zamčené „po dohrání kampaně“ a nákup je odmítnutý:
  - vlečné lano (jen pro těžké truhly);
  - magnet pro Pipa, trhlinový oblek;
  - jeřáb, rádio, dekompresní komora (Tidewatch);
  - zakázky na těžké truhly, brány, Pipa, úlomky a barakudu.
- **Reputace z příběhu:** splněný quest kampaně přidá reputaci frakci podle zadavatele (Nora → Cech, Rook → Bratrstvo, Idris a Maya → Institut). Jinak by frakční recepty a moduly s denními zakázkami trvaly týdny.
- **Úvod:** jednorázový dialog `port_intro` (příznak `port_intro`), i pro rozehrané savy. K tomu quest „Dílna v přístavu“ v Arktidě (Nora): vylovit materiály a něco vyrobit.
- **Bratrstvo** před rozšířením zastupuje Rook, Harlan se objeví až v příběhu rozšíření.
- **Generování světa:**
  - `expansionChunk` běží i s přístavem;
  - náhodná čísla se berou ve stejném pořadí;
  - bez rozšíření se vynechá vše kromě materiálů.
  - Světy rozšíření se tím nemění.

## Úkoly

1. [x] `portOn`, stav `workshop` v enginu, materiály bez rozšíření, test, že svět jinak zůstane stejný.
2. [x] `applyDive`: materiály, výbava a zakázky s přístavem; safari, týdenní expedice a lov jen s rozšířením.
3. [x] Data: `expansion` u receptů, modulů a zakázek; Tidewatch jen s rozšířením; odmítnutí nákupu.
4. [x] Přístav: tlačítko podle `portOn`, zamčené prvky, skrytý lov a Tidewatch, vůdce Bratrstva.
5. [x] Reputace za questy kampaně.
6. [x] Úvodní dialog a quest „Dílna v přístavu“; úprava questu „Dílna na palubě“ v rozšíření.
7. [x] Testy, dokumentace (`AGENTS.md`, README, `living-tides.md`), ověření v prohlížeči na 412×891, 800×360 a 740×320.

## Co jde vyrobit hned v Karibiku a Arktidě

Materiály: šrot, lana, perleť (Karibik), ledový krystal (Arktida).
- **Výbava:** žraločí návnada, kyslíková patrona, proudová kotva, sonarová bóje.
- **Zásoby:** balón.
- **Modifikace:** Rezerva (šrot a led), Rychlý start (lana a perleť).
- **Moduly:** Trofejní síň (perleť); potápěčský zvon (šrot a led) potřebuje slot Kýl, tedy vyšší lodní motor.
- **Později:** biogel (Propast) otevře světlice a lékárničky, obsidián (Vulkány) a slitina (Atlantida) další modifikace. Frakční recepty (Známý, 150 b.) a moduly (Důvěryhodný, 400 b.) přijdou z denních zakázek a z reputace za questy kampaně (+30 frakci zadavatele).

## Vedlejší dopady

- Materiály, výbava, modifikace, moduly a reputace přežívají novou výpravu (tak to bylo navržené pro rozšíření) a nově platí od první výpravy.
- Zásoby vyrobené v dílně nemají strop `SUPPLY_LIMIT` z obchodu, cenou jsou materiály.
