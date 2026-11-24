# The Lost Oceans – plán rozšíření

Zdroj: `Shark_Treasure_The_Lost_Oceans_GDD.pdf`. Rozsah schválen: celé GDD, generování obrázků (~1,4 $).

## Rozhodnutí

- Oceán = data (`src/game/oceans.ts`), sdílený generátor úseků. Lokace jsou řádky dat (5–6 na oceán), počet není v typech pevný.
- Odemčené oceány se ukládají do save podle příběhu; nová výprava (prestiž) je neresetuje. Vylepšení řídí jen rychlost a bezpečnost (tlak, teplota).
- Svět se po ponoru přegeneruje s novým seedem → stav questů žije v save, pozice questových objektů závisí jen na oceánu a definici questu (jako `fragmentX`).
- Questové objekty jsou interaktivní předměty (`state.props`), ne `Hazard` – `thinThreats` je nesmí vyřadit.
- Bossové mají příznak `boss` v `SHARKS`, ne `kind === 'mega'`.
- Nekonečný režim se v kódu jmenuje `endless` (UI „Hlubinný ponor“), aby nekolidoval s oceánem Abyss.
- Save má verzi a migraci v modulu bez AsyncStorage (`src/progression/saveData.ts`), test načítá starý tvar.
- Pozadí jsou v manifestu pod jménem; preloader načítá jen vrstvy aktuálního oceánu.
- HUD: jedna šipka cíle, teplotní lišta jen v oceánech s teplotou; nové obrazovky schované za Deník (hub).

## Úkoly

1. [x] Assety (pozadí 5 + mapa světa, tvorové, rekvizity, ikony)
2. [x] Refaktor beze změny chování: regiony → oceán ve stavu, save migrace, přejmenování endless, boss flag, pozadí podle jména
3. [x] Oceány jako data (8), mapa světa, cestování, briefing, odemykání příběhem
4. [x] Mechaniky prostředí: tlak, teplota (chlad/žár) s majáky, viditelnost, proudy, gejzíry
5. [x] Nové vybavení: termooblek, tlakový oblek, řezák, fotoaparát
6. [x] Interaktivní předměty: páky / energetické uzly + trezor, strážce, zapečetěné truhly, trosečník
7. [x] Fotografování + katalog (fauna, místa, artefakty)
8. [x] Výzkum (data + strom) a úroveň průzkumníka (XP)
9. [x] Questy: hlavní příběh (8 kapitol, dědeček) + vedlejší questy, cíl v HUD, deník
10. [x] Náhodné události na moři
11. [x] Finále s volbou ze tří konců
12. [x] Mise, menu/hub, README, testy férovosti, ověření v prohlížeči

## Mimo rozsah (zatím)

Crafting a materiály, reputace frakcí, NPC dialogy v přístavech, vizuální moduly lodi, kolaps jeskyní, zvuk pro každý biom, gamepad.
