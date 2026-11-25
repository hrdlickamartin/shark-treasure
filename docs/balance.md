# Vyvážení hry – analýza

Podklad pro rozpad na úkoly. Čísla pochází z dat hry (`src/progression/upgrades.ts`, `src/game/catalog.ts`, `src/game/oceans.ts`, `src/progression/quests.ts`, `missions.ts`, `expedition.ts`) a ze simulace světa: 12 seedů × 81 úseků na oceán přes `createGame` + `generateChunk`, výbava na nule, počasí `normal`. Výnos ponoru je odhad „2 truhly s násobičem ×1,25 + bonus za hloubku 3 $/m“ (`computeResult` v `src/game/systems/dive.ts`), bez mincí, výzvy dne a relikvií.

Analýza popisuje stav před úpravami; co se z ní zapracovalo, je na konci v části Úkoly a stav.

## Shrnutí

1. **Leviatan se 4 životy proti 3 harpunám není záměr, ale nedoladěný zbytek.** Bossové byli původně navržení na krádež pokladu (README: „ohlásí se, provedou výpad a pak odpočívají“, harpuna „Megalodona na chvíli unaví“). Bossové na víc ran přibyli později a životy nikdo nesladil se zásobou harpun. Zabití bosse hra nikde nevyžaduje ani neodměňuje, ale ukazatel životů a hláška „poražen!“ hráči říkají, že zabít ho má.
2. **Legendární bossové se 8 životy nejdou zabít nikdy:** maximum harpun je 5 + 1 od obchodníka.
3. **Ekonomika začátku je v pořádku, konec první výpravy ne.** Loď na maximum (podmínka nové výpravy) stojí 28 980 $ a na další výpravě 61 650 $, později 130 260 $. To je víc než všechna ostatní vybavení dohromady.
4. **Karibik se dá farmit:** lokace 5 (98 m) je bezpečná i bez tlakového obleku a vynáší kolem 3 200 $ za ponor, tedy stejně jako Arktida nebo Atlantida.
5. **Drobné chyby v datech:** Propast doporučuje tlakový oblek 6, který jde koupit až od 2. výpravy, a přitom stačí úroveň 4. README popisuje harpunu i obchod zastarale.

## 1. Bossové a harpuna

### Kolik harpun může hráč mít

| Zdroj | Počet | Kde |
|---|---|---|
| Vylepšení Harpuna, 1. výprava | 3 | `upgrades.ts:63` (`max: 3`) |
| další výpravy (`extra: 2`) | 4, pak 5 | `maxLevel` v `upgrades.ts:116` |
| obchodník na moři (náhodná událost) | +1 na příští ponor | `GameScreen.tsx:687`, `dive.ts:131` |
| recept v dílně | není (výstup „Harpuna“ umí `outputName`, ale žádný recept ho nedává) | `crafting.ts:57–58` |

Harpuna zabije obyčejného žraloka i nebezpečného tvora jednou ranou (`hitHazard`, `hitShark` v `extras.ts`). V doupěti bosse je 1,6–2,2 žraloka a 2,2 tvora na úsek, takže část harpun padne cestou.

### Životy bossů

| Boss | Oceán (pořadí) | Životy | Legendární (×2, `world.ts:317`) | Zabitelný s harpunami 1. výpravy (3) | max. (5+1) |
|---|---|---|---|---|---|
| Megalodon | Karibik (1.) | 3 | 6 | jen bez jediné ztracené harpuny | ano / legendární ano, těsně |
| Leviatan | Arktida (2.) | 4 | 8 | **ne** (jen s obchodníkem) | ano / legendární **ne** |
| Tvor z hlubin | Propast (6.) | 4 | 8 | **ne** | ano / legendární **ne** |
| Vládce proudů | Úžina proudů (rozš.) | 3 | 6 | jen za odlivu a bez ztráty | ano / legendární ano, těsně |
| Dutá ulita | Putující útes (rozš.) | 4 | 8 | **ne** | ano / legendární **ne** |

Zdroj: `catalog.ts:55–60`.

### Co zabití dává

- `bossLoot` (quest „Ukradni poklad Megalodona“, podmínka výpravy `run.boss`) je jen doručená truhla bosse (`dive.ts:89`). Zabití není potřeba.
- Zabití zapíše objev `defeated:<boss>` (`extras.ts:124`), ten ale nic nečte.
- Zásah, který nezabije, bosse na 2,5 s unaví (`extras.ts`, `mode = 'tired'`). To je ve skutečnosti hlavní užitek harpuny proti bossovi: okno na krádež.
- Questy rozšíření `rt_vortex` a `wr_hollow` mají text „Poraz … a vynes poklad“, splní se ale doručením truhly.

### Nález B1 – nesoulad životů, harpun a sdělení

Hráč vidí ukazatel životů, „Zásah! Zbývá N×“ a „poražen!“, takže hru čte jako „zabij bosse“. V Arktidě na to v 1. výpravě nemá prostředky.

Možnosti:
- **A (doporučeno): krádež je cíl, zabití je bonus.** Doplnit sdělení („Unavený – teď ukradni poklad!“, hláška Mayi v doupěti, text questů „Ukradni“ místo „Poraz“). Zabití odměnit: relikvie navíc, výzkum, trofej v katalogu, tedy začít číst `defeated:`. Životy nechat a zajistit jen, aby se s plnou výbavou dané výpravy zabít daly (viz B2).
- **B: životy podle harpun.** Leviatan a Tvor z hlubin na 3, Dutá ulita na 3. Jednoduché, ale bossové ztratí váhu.
- **C: víc harpun.** Strop harpuny 4 v 1. výpravě, recept v dílně (`harpoon` supply) nebo doplnění harpuny z lodi / ponorky.

Test: „s plně vylepšenou harpunou a obchodníkem jde každý boss 1. výpravy porazit“ a „unavený boss nechá potápěče sebrat poklad“.

### Nález B2 – legendární bossové nejdou zabít

8 životů proti maximálně 6 harpunám. Legendární expedice slibuje „Odvety s bossy“.

Možnosti: legendární násobek ×1,5 místo ×2 (6/6/6/5/6), nebo harpuny doplňované v legendárním režimu (stojan u doupěte), nebo vědomě „jen krádež“ a říct to v popisu režimu. Doporučení: ×1,5 a zaokrouhlit dolů.

## 2. Ekonomika

### Ceny vylepšení (1. výprava)

| Vylepšení | Úrovně a ceny | Celkem |
|---|---|---|
| Kyslíková nádrž | 150 / 260 / 460 / 800 / 1 410 / 2 460 | 5 540 |
| Ploutve | 180 / 320 / 580 / 1 050 / 1 890 | 4 020 |
| Neopren | 220 / 400 / 710 / 1 280 / 2 310 | 4 920 |
| Síť na poklady | 400 / 880 / 1 940 | 3 220 |
| Sonar | 500 / 1 000 / 2 000 | 3 500 |
| Světlo | 600 / 1 200 / 2 400 | 4 200 |
| Vztlaková vesta | 350 / 670 / 1 260 | 2 280 |
| Zvedací balón | 450 / 860 / 1 620 | 2 930 |
| Plašič | 380 / 720 / 1 370 | 2 470 |
| Magnet | 320 / 610 / 1 160 | 2 090 |
| Pojištění | 600 / 1 200 / 2 400 | 4 200 |
| Harpuna | 700 / 1 330 / 2 530 | 4 560 |
| Tlakový oblek | 500 / 930 / 1 710 / 3 170 / 5 860 | 12 170 |
| Termooblek | 700 / 1 330 / 2 530 | 4 560 |
| Řezák | 1 400 / 2 800 | 4 200 |
| Objektiv | 350 / 670 / 1 260 | 2 280 |
| **Lodní motor** | 800 / 1 680 / 3 530 / 7 410 / 15 560 | **28 980** |
| Lékárnička (od 2. výpravy) | 900 / 1 710 / 3 250 | 5 860 |
| Skútr (od 2. výpravy) | 1 100 / 2 090 / 3 970 | 7 160 |
| Mini ponorka (od 3. výpravy) | 2 500 / 4 500 / 8 100 | 15 100 |
| Dron Pip (rozšíření) | 1 200 / 3 000 / 7 500 | 11 700 |

Vše v 1. výpravě: 135 940 $.

### Výnos ponoru podle lokace (simulace)

Ø hodnota truhly a odhad ponoru se 2 truhlami.

| Oceán | L0 | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|---|
| Karibik | 18 m · 90 · **278** | 36 m · 164 · 518 | 56 m · 292 · 897 | 64 m · 353 · 1 076 | 82 m · 475 · 1 433 | 98 m · 1 156 · **3 184** |
| Arktida | 26 m · 117 · 371 | 48 m · 257 · 787 | 70 m · 485 · 1 424 | 82 m · 417 · 1 287 | 98 m · 696 · 2 034 | 115 m · 1 100 · 3 096 |
| Středomoří | 22 m · 96 · 306 | 40 m · 123 · 428 | 60 m · 292 · 909 | 72 m · 353 · 1 099 | 86 m · 364 · 1 167 | 100 m · 772 · 2 231 |
| Tichomoří | 24 m · 115 · 360 | 48 m · 200 · 644 | 64 m · 360 · 1 092 | 76 m · 476 · 1 418 | 90 m · 629 · 1 843 | 106 m · 888 · 2 538 |
| Atlantida | 120 m · 404 · 1 371 | 140 m · 885 · 2 633 | 160 m · 832 · 2 559 | 180 m · 935 · 2 877 | 200 m · 876 · 2 790 | 220 m · 1 096 · 3 401 |
| Propast | 150 m · 512 · 1 730 | 190 m · 963 · 2 978 | 220 m · 972 · 3 090 | 250 m · 1 003 · 3 258 | 280 m · 1 099 · 3 587 | 310 m · 1 319 · 4 229 |
| Hřbitov lodí | 70 m · 293 · 943 | 90 m · 772 · 2 199 | 110 m · 820 · 2 380 | 130 m · 948 · 2 760 | 150 m · 1 063 · 3 108 | – |
| Vulkány | 140 m · 473 · 1 603 | 170 m · 954 · 2 895 | 200 m · 981 · 3 052 | 230 m · 1 094 · 3 425 | 260 m · 1 067 · 3 448 | – |

Skutečný ponor v Coral Garden v prohlížeči vynesl 246–261 $, odhad sedí.

Peníze z questů na oceán: Karibik 20 900 (17 questů), Arktida 9 000 (5), Středomoří 13 000 (7), Tichomoří 15 500 (4), Atlantida 18 500 (3), Propast 27 000 (4), Hřbitov 30 000 (4), Vulkány 31 000 (3); mise celkem 41 200.

### Nález E1 – lodní motor jako podmínka výpravy

`canEmbark` (`embark.ts:5–7`) chce loď na maximu a poklad Megalodona. Motor roste s `growth: 2.1`, nejstrměji ze všech vylepšení:

| Výprava | Strop motoru | Cena motoru celkem |
|---|---|---|
| 1. | 5 | 28 980 |
| 2. | 6 | 61 650 |
| 3. a další | 7 | 130 260 |

Motor přitom dává jen rychlost lodi. Ve 3. výpravě je to přes 40 nejlepších ponorů jen za podmínku prestiže, navíc po resetu peněz.

Možnosti: snížit `growth` na 1,8 (17 900 / 33 020 / 60 230) nebo 1,9 (21 130 / 40 940 / 78 580); nebo podmínku výpravy navázat na postup (kapitola, poklad bosse) místo motoru; nebo škálovat cenu motoru s `expeditionScale.loot`. Doporučení: podmínka „poklad Megalodona + kapitola 2“, motor nechat jako běžné vylepšení s `growth: 1.9`. **Rozhodnutí na uživateli.**

### Nález E2 – farmení Karibiku

Tlakový oblek 0 je bezpečný do 100 m (`safeDepthFor`, `upgrades.ts`), Karibik končí v 98 m. Lokace 5 (Legendary Cave) dá kolem 3 200 $ za ponor bez jakékoli výbavy kromě kyslíku. To je stejně jako Arktida L5 nebo Atlantida L5. Druhý a třetí oceán tím finančně ztrácí smysl, hráč motivovaný penězi nemá důvod plout dál.

Hodnoty truhel se řídí jen `tier` lokace (`chestKindFor` ve `world.ts:54`, `CHEST_WEIGHTS` v `catalog.ts:25`), ne oceánem. Karibik L5 má `tier: 5`, stejně jako Arktida L5 a Atlantida L1.

Možnosti: snížit tier Karibiku L4–L5 na 3–4 (zůstane jen doupě s pokladem bosse); nebo bezpečnou hloubku bez obleku snížit na ~70 m, aby Legendary Cave chtěla oblek 1 (Karibik ho už doporučuje, `recommended.pressure: 1`); nebo násobit hodnotu truhel indexem oceánu. Doporučení: bezpečná hloubka 0. úrovně 70 m a Karibik L5 na tier 4.

Test: férovost s doporučenou výbavou dál projde a výnos L5 Karibiku je pod výnosem L5 Arktidy.

### Nález E3 – lokace bez stoupající odměny

Arktida L3 (tier 3) vynáší míň než L2 (tier 3), Středomoří L1 = L0 a L4 = L3, Atlantida L2 < L1. Sousední lokace sdílí tier, hloubka ale roste, takže hlubší lokace je těžší za stejné peníze.

Možnost: tier podle pořadí lokace s krokem aspoň 0,5 (nové řádky v `CHEST_WEIGHTS`), nebo bonus za hloubku vyšší než 3 $/m. Doporučení: bonus za hloubku 5 $/m pod 50 m.

### Nález E4 – Arktida je chudá na questy

Karibik má 17 questů a 20 900 $, Arktida 5 questů a 9 000 $. Hráč přichází s výbavou pro Karibik a Arktida chce tlak 2, termo 1 a světlo 1 (2 730 $). To je dosažitelné. Leviatan ale v kombinaci s harpunou dělá z Arktidy první frustrující místo. Možnost: přidat do Arktidy 2–3 vedlejší questy (Diego, výzkum chladu), jeden z nich s odměnou „harpuna navíc / lékárnička“.

## 3. Obtížnost

### Nebezpečí na úsek (simulace)

| Lokace | Žraloci / úsek | Tvorové / úsek |
|---|---|---|
| Karibik L0 | 0,01 | 0,14 |
| Karibik L1 | 0,29 | 0,96 |
| Karibik L2–L5 | 0,9–1,7 | 1,5–2,2 |
| Arktida L0 | 0,21 | 0,22 |
| Arktida L1–L5 | 1,0–1,7 | 1,3–2,2 |
| Atlantida, Propast, Vulkány L1+ | 1,5–2,2 | 2,0–2,8 |

Skok mezi L1 a L2 Karibiku je ×4 u žraloků. Ve druhém ponoru do Blue Hole hráč bez harpuny a neoprenu narazí na víc než žraloka na úsek.

### Škálování výprav

`expeditionScale` (`expedition.ts:38–41`, strop 10 výprav): nebezpečí +15 %, rychlost žraloků +6 %, poklady +30 %, mise +50 % za výpravu. Strop vybavení se zvedá jen o 1–3 úrovně (`extra`), takže od 3. výpravy obtížnost roste a výbava ne. Výprava 10 má nebezpečí ×2,5 a rychlost žraloků ×1,6 s výbavou výpravy 3.

Možnost: strop škálování 5, nebo `extra` u obrany (neopren, harpuna, plašič) navázat na číslo výpravy bez stropu. **Rozhodnutí na uživateli**, záleží, jak dlouhou prestiž chceš.

### Nález D1 – nástup žraloků

Doporučení: Karibik L2 na ~0,6 žraloka na úsek (`CHUNK_THREATS` v `density.ts`) a rádio Mayi před první lokací se žraloky („Kup si harpunu nebo plašič“).

## 4. Data a dokumentace

- **Propast doporučuje tlakový oblek 6** (`oceans.ts:238`), v 1. výpravě je strop 5. Úroveň 4 dává 325 m bezpečně a Propast končí v 310 m. Mapa světa tak ukazuje nesplnitelnou červenou podmínku. Oprava: `pressure: 4`, nebo 5 s rezervou.
- **README zastaralé:**
  - „Harpuna omráčí a zažene žraloka… Megalodona na chvíli unaví“ (`README.md:879`). Dnes zabíjí a bossové mají životy.
  - Chybí zmínka, že boss se krade, ne zabíjí.
- **Popis harpuny v obchodě:** „Střílí na žraloky a nebezpečné tvory před tebou“ neříká, že jedna rána zabije žraloka a boss potřebuje víc ran. Doplnit do `effect` „boss: unaví, N ran zabije“.
- **AGENTS.md** zatím neříká, kde hledat vyvážení. Odkaz na tento dokument patří do mapy dokumentů v kořenovém `AGENTS.md`.

## Rozhodnutí (25. 11. 2026)

1. Bossové: krádež je cíl, zabití je bonus (varianta A).
2. Nová výprava: podmínkou je příběh a ukradený poklad bosse, ne lodní motor.
3. Karibik L5: snížit odměnu, nebezpečí a hloubka zůstávají.
4. Škálování výprav zůstává až do 10. výpravy.
5. Hráč má mít co kupovat po celou dobu hry a důvod opakovat ponory.

## Úkoly a stav

1. [x] **Bossové na krádež.** Zásah bosse ukáže „Unavený! Ukradni poklad (zbývá N×)“, doupě hlásí „Ukradni poklad, když odpočívá. Harpuna ho unaví.“ Questy rozšíření mají „Vynes poklad …“ místo „Poraz …“.
2. [x] **Trofej za zabití** (`bossTrophies` v `progress.ts`): poprvé 1 500–5 000 $ podle bosse, 1 perla a 40 dat; každé další zabití 30 %; legendární ×2. Platí i při nezdařeném ponoru (zabití je čin, ne náklad), ne ve volném průzkumu a propasti. Souhrn ponoru ukáže „Trofej: …“.
3. [x] **Legendární bossové** mají život ×1,5 (`LEGENDARY_HP`): 4 / 6 / 6 / 4 / 6.
4. [x] **Harpuna podle příběhu:** strop 3, +1 po Karibiku, Tichomoří a Propasti (`story: [1, 4, 6]`, číslo = počet dokončených kapitol), výpravami až +4. Leviatana v Arktidě jde porazit čtyřmi harpunami, s plnými zásobami šesti.
5. [x] **Zásoby na příští ponor** v obchodě (harpuna, balón, lékárnička, od každé nejvýš 2, cena roste o 35 % za kapitolu). Opakovaný výdaj, který dává smysl i s vylepšeným vybavením.
6. [x] **Vylepšení po celou kampaň:** 18 vylepšení má `story` – kapitoly, po kterých se strop zvedne o úroveň; každá kapitola 1–8 něco odemkne. Obchod u vylepšení na stropu ukazuje „Další úroveň: dokonči kapitolu X“ nebo „na příští výpravě“. Výpravy zvedají strop víc u nádrže (+5), ploutví, neoprenu, plašiče (+3) a harpuny (+4). Křivky ploutví, neoprenu, pojištění a termoobleku nad původním stropem pokračují pomaleji, aby každá úroveň něco dala a nic nepřeteklo.
7. [x] **Podmínka výpravy** (`embark.ts`): dokončená kapitola podle čísla výpravy (1. → Karibik, 2. → Arktida, … nejvýš 8), poklad bosse na této výpravě a výdělek výpravy 20 000 $ + 15 000 $ za každou předchozí. Výdělek brání výpravám „naprázdno“ jen kvůli perlám. Lodní motor má `growth` 1,9 a stropy z příběhu (kapitola 4 a 7); perk Loďař dál dává lepší loď na začátku (rychlost a sloty modulů).
8. [x] **Karibik L5** (`lootScale: 0.7` u lokace, rarita truhel zůstává): průměrná truhla bez pokladu bosse 880 → 616 $ (Karibik L4 556 $, Arktida L4 696 $, Arktida L5 856 $). Skutečná farma byla truhla bosse za pevných 6 000 $ v každém oceánu a při každém ponoru; nově `bossChestValue` = 3 000 $ + 1 000 $ za pořadí oceánu (Karibik 3 000, Arktida 4 000 … Vulkány 10 000, rozšíření 11 000).
9. [x] **Propast** doporučuje tlakový oblek 4.
10. [x] **Zásoby po rychlém návratu:** ponor ukončený do 5 s bez nálezu vrátí zaplacené zásoby na další ponor.
11. [x] README, `AGENTS.md` a testy (`tests/balance.test.ts`).

### Vedlejší dopady

- Neopren od 6. úrovně, termooblek od 4. a pojištění od 4. dávají o něco méně než dřív (křivka nad původním stropem je pozvolnější, aby každá další úroveň něco přidala). Týká se jen savů z pozdějších výprav.
- Ploutve nad 5. úrovní zrychlují o 8 bodů místo 16, aby potápěč neprolétal stropy jeskyní.

### Zbývá (bez rozhodnutí)

- E3 – hlubší lokace se stejným tierem nevynáší víc (návrh: bonus za hloubku 5 $/m pod 50 m).
- E4 – Arktida má málo questů (návrh: 2–3 vedlejší questy).
- D1 – skok počtu žraloků mezi Karibikem L1 a L2 (návrh: snížit hustotu na L2, rádiová rada před první lokací se žraloky).
