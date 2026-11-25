# The Living Tides – plán rozšíření

Zdroj: `Shark_Treasure_The_Living_Tides_Rozsireni.pdf`. Navazuje na `docs/lost-oceans.md` a `docs/story-bible.md`. Rozsah schválen uživatelem: celé rozšíření včetně assetů (generování obrázků ~3–5 $, hudba ~0,1 $) a nasazení na GitHub Pages.

## Rozhodnutí

- Kapitoly hlavní kampaně zůstávají svázané s `OCEAN_ORDER` (8 oceánů). Nové oceány jsou v `EXPANSION_OCEANS`, mapa světa a cestování používají `WORLD_OCEANS`. Questy rozšíření mají pole `chapter` (9–12) a odemykají se až po konci kampaně (`save.ending`).
- Varianta úvodu kapitoly 9 se řídí `save.ending`; trhliny (počet, výdrž, odměny) taky.
- Příliv je vlastnost oceánu (`tide: { period, strength }`). Mění sílu proudů a u proudů s `tidal` otáčí směr; přílivové brány jsou `Prop` typu `gate`, které blokují průplav, dokud není příliv nebo aktivní páka brány.
- Pip je `state.drone` se stavem a schopnostmi podle úrovně (`stats.drone`). Úroveň 1 dává quest, 2–3 jsou vylepšení `drone`.
- Hroutící se jeskyně = `Cave.unstable`; kolaps se spustí sebráním truhly z takové jeskyně. Po kolapsu se jeskyně uzavře (strop klesne na dno).
- Těžká truhla je `ChestKind` `heavy` (váha 3, zabere 2 místa). Doručí se doplaváním, dvěma balóny, nebo jeřábem u bóje pod lodí.
- Mimikry chobotnice je `HazardKind` `mimic` vykreslená jako truhla; sonar a Pip ji odhalí.
- Materiály jsou interaktivní předměty (`Prop` typu `material`), padají i z vraků a nákladu. Při neúspěchu se ztratí polovina.
- Spotřební předměty se vyrábějí do `save.kit` a na ponor se berou všechny; použité se odečtou po ponoru. V akcích ponoru je jedno tlačítko výbavy s přepínáním.
- Modifikace výbavy: jeden slot na nádrž, ploutve, oblek, harpunu a dron; efekty jdou přes `statsFor`.
- Moduly lodi: 6 slotů, počet odemčených podle úrovně lodi; efekty přes `statsFor` a engine; vykreslení jako vrstvy na lodi.
- Frakce: reputace 0–1400+, úrovně 0/150/400/800/1400. Zakázky se generují deterministicky podle dne. Atlantské úlomky po ponoru hráč předá jedné frakci.
- Dekompresní komora: místo „+20 % zdraví“ (zdraví má pevné maximum) dává −8 % poškození a +15 % rychlost výstupu.
- Rádiová věž sedí ve slotu Příď (PDF ji dává na stěžeň), aby byl využitý všech 6 slotů.
- Hudba nových oceánů je ambientní smyčka (proud, dýchání Strážce) syntetizovaná přes ffmpeg; hudební model vyžaduje text a mohl by přidat zpěv.
- Rozšíření (materiály, výbava, moduly, reputace, Pip) přežije novou výpravu.
- Zkratky: G = Pip, Q = použít výbavu, X = přepnout výbavu. Gamepad: A ponor/sonar, X harpuna, Y Pip, B balón, LB/RB výbava, RT foťák, Start pauza.
- Trhliny: `Prop` typu `rift` se zónou zkřivené vody (pomalejší kyslík, truhly stoupají) a atlantským úlomkem uprostřed; stav trhlin žije v save.
- Putující útes: poloha na mapě světa podle týdne, start lodi posunutý o úsek podle počtu ponorů; questové objekty kotví k útesu.
- Nové režimy: volný průzkum (`free`), lov pokladů (mapy v lahvi, `dig` předmět), fotosafari (týdenní zadání se zachycením chování), týdenní expedice (pevný seed týdne), legendární expedice (odvety s bossy).
- Gamepad přes Web Gamepad API (web), nativně zatím ne.
- Zvukové efekty (příliv, Pip, kolaps, brána) a ambient nových oceánů se syntetizují přes ffmpeg.

## Úkoly

1. [x] Data a save v5: oceány rozšíření, materiály, frakce, recepty, moduly, migrace, testy migrace
2. [x] Příliv: systém, přílivové proudy, brány, HUD indikátor, zvuk rohu, testy
3. [x] Dron Pip: engine, schopnosti 1–3, render a animace, ovládání, testy
4. [x] Hroutící se jeskyně, těžké truhly a jeřáb, mimikry chobotnice, testy
5. [x] Noví tvorové: barakudy, řetězová medúza, krevetka pistolník, trhlinový stín, mladý Strážce; dýchací průduchy
6. [x] Bossové: Vládce proudů, Dutá ulita, finále kapitoly 12
7. [x] Materiály a crafting: sběr, výsledek ponoru, dílna, spotřební předměty v ponoru, modifikace
8. [x] Moduly lodi: sloty, nákup, efekty, vrstvy na lodi, editor
9. [x] Frakce a přístav: reputace, zakázky, předání úlomků, obrazovka přístavu (přístav, dílna a materiály se později přesunuly do kampaně od 2. kapitoly, viz `port.md`)
10. [x] Trhliny Srdce podle konce kampaně
11. [x] Putující útes (pohyb oceánu, mapa světa)
12. [x] Příběh: postavy Jun, Harlan, Pip; kapitoly 9–12, dialogy, varianty úvodu, konce rozšíření
13. [x] Režimy: volný průzkum, lov pokladů, fotosafari, týdenní a legendární expedice
14. [x] UI: přístav, dílna, editor lodi, mapa přílivu, HUD, akce ponoru na výšku i na šířku
15. [x] Gamepad a přístupnost (méně pohybu, pomalejší příliv, tvary rarity, větší text dialogů)
16. [x] Assety: sprity, pozadí, rigy; hudba a zvuky; kontrola ořezu a směru
17. [x] Testy férovosti, `npm run check`, ověření v prohlížeči včetně animací, README, AGENTS.md
18. [x] Nasazení na GitHub Pages a push

## Mimo rozsah

Nativní gamepad (vyžaduje nativní modul), skutečný online žebříček týdenní expedice (je jen lokální).

## Zjednodušení oproti PDF

- Hudba: místo dynamických vrstev jen dvě ambientní smyčky (`amb_riptide`, `amb_reef`) přepínané podle oceánu.
- Strážce trhlin nemá čtyřfázový souboj; nad úlomkem a srdečním kamenem se zjevuje jeho ozvěna jako silueta.
- Dutá ulita nemá mírumilovné řešení, poráží se přes řetězy a slabé místo.
- Legendární expedice jsou bossové s životem ×1,5 a dvojnásobným pokladem i trofejí, bez nových útoků.
- Dozvuky konců jsou střídmé: „Sklizeň“ zvedá kyslík, nebezpečí i rychlost žraloků o 10 %, „Doprovod“ přidá 5 % k lupu, „Spánek“ zastaví nové trhliny.
- Rookovy závody jsou dva, ne čtyři.
- Rádiová věž je na přídi lodi; dekompresní komora místo léčení po ponoru snižuje poškození o 8 % a zrychluje výstup o 15 %.
- Gamepad funguje jen na webu přes Web Gamepad API.
