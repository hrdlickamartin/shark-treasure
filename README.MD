Shark Treasure 🦈💰
Game Design Document – zadání projektu






















12














Shark Treasure je jednoduchá 2D arkádová hra, ve které hráč ovládá loď s potápěčem, hledá poklady na mořském dně, vyhýbá se žralokům a dalším nebezpečím a snaží se bezpečně vrátit zpět na loď, než mu dojde kyslík.

Hra je založená na jednoduchém ovládání, rychlém pochopení pravidel, postupném zvyšování obtížnosti a pocitu odměny za riskování.

1. Základní koncept hry
   Hráč začíná na lodi plující po hladině oceánu. Z lodi se může potápěč vydat pod hladinu a prozkoumávat podmořský svět.

Jeho cílem je najít truhlici s pokladem, sebrat ji a vrátit se bezpečně zpět na loď.

Za úspěšné doručení pokladu získává peníze, které může využít k vylepšování vybavení, lodi a potápěče.

Každý ponor představuje určité riziko:
- Omezená zásoba kyslíku.
- Žraloci a další nebezpeční tvorové.
- Rostoucí vzdálenost od lodi.
- Poklady umístěné v různých hloubkách.
- Možnost ztratit získaný poklad, pokud se hráč nestihne vrátit.
  Hlavní herní smyčka
1. Loď a příprava

Hráč se nachází na lodi, má aktuální vybavení a zásobu kyslíku.

2. Ponor

Potápěč opustí loď a pohybuje se pod hladinou.

3. Hledání pokladu

Hráč hledá truhlice, vyhýbá se žralokům a rozhoduje, jak hluboko a daleko se vydá.

4. Získání pokladu

Potápěč se dotkne truhlice, sebere ji a musí se dostat zpět na loď.

5. Návrat a odměna

Po bezpečném návratu se poklad započítá a hráč získá peníze.



2. Herní prostředí a kamera
   Hra je kompletně 2D, z bočního pohledu (side-scrolling).






















12














Rozložení obrazovky
Obrazovka je rozdělena do několika vizuálních vrstev:

1. Horní část – hladina
- Loď plující po hladině.
- Animace vln.
- Slunce, mraky, případně ostrovy.
- Potápěč může být na lodi nebo pod hladinou.
2. Podvodní část – herní prostor
- Potápěč se pohybuje volně nahoru, dolů, doleva a doprava.
- Žraloci a další mořští tvorové.
- Truhlice, mince a předměty.
- Korály, rostliny, skály, vraky.
3. Mořské dno
- Není statické.
- Při pohybu lodi a potápěče doleva nebo doprava se prostředí posouvá.
- Generuje se nové prostředí.
- Mění se hloubka, terén, překážky a rozmístění pokladů.
  Pohyb prostředí
  Hráč může s lodí plout doleva a doprava. Loď představuje základnu a místo návratu.

Pod hladinou se zároveň nachází rozsáhlý svět, který není celý viditelný na jedné obrazovce.

Při pohybu doprava se kamera postupně posouvá a odhaluje novou část oceánu. Stejně tak při pohybu doleva.

Mořské dno se může generovat z jednotlivých segmentů:
- Písečné dno.
- Skalnaté dno.
- Korálové útesy.
- Podvodní jeskyně.
- Potopené lodě.
- Oblasti s vysokým výskytem žraloků.
- Oblasti s bohatým pokladem.
  Hráč tak nemusí mít při každém ponoru stejné prostředí.

3. Ovládání
   Ovládání musí být maximálně jednoduché a intuitivní. Hru musí být možné hrát jednou rukou na mobilu, ale také na počítači.
   Pohyb
   Směr	Akce
   ↑ Nahoru	Plavání směrem k hladině
   ↓ Dolů	Potápění do větší hloubky
   ← Doleva	Pohyb doleva
   → Doprava	Pohyb doprava

Mobilní ovládání
Na obrazovce jsou čtyři jednoduchá tlačítka nebo joystick.

Preferovaná varianta:
- Virtuální joystick vlevo dole.
- Pohyb ve všech čtyřech směrech.
- Vpravo případně jedno interakční tlačítko, pokud bude potřeba.
- Tlačítka nesmí zakrývat důležité části herního prostoru.
  PC ovládání
- WASD
- Šipky
  Pohyb by měl být plynulý, nikoliv založený na jednotlivých krocích.

Potápěč by měl mít určitou setrvačnost, ale ovládání musí být přesné. Hráč se musí umět rychle vyhnout žralokovi nebo korálu.

4. Kyslík – hlavní herní limit
   Kyslík je hlavním časovým limitem každého ponoru.

Po opuštění lodi se začne kyslík postupně spotřebovávat.
O₂ – kyslík

100 %



Vizuální ukázka plné zásoby kyslíku.
Pravidla kyslíku
- Kyslík se spotřebovává po celou dobu pobytu pod vodou.
- Při větší hloubce se může spotřebovávat rychleji.
- Při nesení těžké truhlice se může spotřebovávat rychleji.
- Kyslík se doplní po návratu na loď.
- Hráč může kyslík vylepšovat nákupem lepší nádrže.
  Doporučená herní mechanika
  Kyslík by měl být nastaven tak, aby hráč při prvních pokusech měl dostatek času na jeden jednoduchý ponor.

Hráč by se měl postupně naučit, že:
Není důležité najít co nejvíce pokladů. Důležité je vrátit se s pokladem živý.

Když kyslík dosáhne nuly, hráč začne ztrácet zdraví nebo se spustí kritický stav.

5. Poklady a truhlice
   Na mořském dně se nachází truhlice různé vzácnosti.






















10











Typy pokladů
Typ	Vzhled	Hodnota
Obyčejná truhlice	Dřevěná	Nízká
Zlatá truhlice	Zlaté detaily	Vysoká
Vzácná truhlice	Svítící, drahokamy	Velmi vysoká
Starověká truhlice	Z vraku nebo ruin	Speciální odměna
Mystery truhlice	Neznámý obsah	Náhodná odměna

Získání pokladu
Potápěč musí truhlici fyzicky dosáhnout.

Po kontaktu:
- Truhlice se otevře.
- Zobrazí se animace získání pokladu.
- Truhlice se připojí k potápěči nebo zmizí z prostředí.
- Nad hráčem se zobrazí hodnota pokladu.
- Potápěč se začne pohybovat pomaleji, pokud poklad ovlivňuje váhu.
  Poklad není definitivně získán, dokud se hráč nevrátí na loď.

To je zásadní herní rozhodnutí: hráč může riskovat další poklad, nebo se vrátit s již získaným.

6. Žraloci a nebezpečí
   Žraloci jsou hlavní hrozbou hry.






















8











Chování žraloků
Žraloci se pohybují pod vodou a mají různé typy chování.

Hlídkující žralok
- Pohybuje se ve vymezené oblasti.
- Hráč ho může bezpečně obejít.
  Lovící žralok
- Pokud spatří potápěče, začne ho pronásledovat.
- Má vyšší rychlost.
- Po určité době může pronásledování ukončit.
  Velký žralok
- Vyskytuje se ve větších hloubkách.
- Je nebezpečnější.
- Může hlídat oblast s velmi vzácným pokladem.
  Kontakt se žralokem
  Při kontaktu s žralokem:
- Potápěč utrpí poškození.
- Může ztratit část kyslíku.
- Může upustit truhlici.
- Při opakovaném útoku může ponor skončit neúspěchem.
  Není nutné, aby hráč žraloky zabíjel. Primární mechanikou je jejich vyhýbání.

Další nebezpečí:
- Medúzy.
- Podvodní miny.
- Ostré korály.
- Silné proudy.
- Zřícené části vraků.
- Podvodní jeskyně.

7. Styl grafiky a animací (Art Direction)
   Doporučuji držet stylizovanou 2D cartoon grafiku, která je barevná, přátelská a lehce hravá, ale zároveň umožňuje vytvářet napětí.

Ne fotorealistické prostředí. Hra by měla působit jako kvalitní mobilní arkáda.










Styl prostředí
- Jasné barvy.
- Čisté tvary.
- Jemné stíny.
- Lehké gradienty pouze v pozadí.
- Čitelná silueta všech objektů.













Potápěč
- Roztomilá stylizovaná postava.
- Velká maska.
- Výrazné ploutve.
- Barevný neopren.
- Čitelné animace i v malém měřítku.













Loď
- Malá stylizovaná loď.
- Výrazné barvy.
- Animace vlnění na hladině.
- Lano nebo žebřík pro návrat potápěče.



Barevná paleta
Prostředí	Barvy
Hladina	Světle modrá, tyrkysová
Mělká voda	Azurová, světle modrá
Střední hloubka	Modrá, tmavší tyrkys
Velká hloubka	Navy, tmavě modrá
Mořské dno	Písková, hnědá
Korály	Oranžová, růžová, fialová
Poklad	Zlatá, žlutá
Nebezpečí	Červená, oranžová

S hloubkou se postupně mění barvy prostředí. Hráč tak vizuálně vnímá, že se dostává do nebezpečnější oblasti.
Pravidla animace
Všechny animace musí dodržovat stejný vizuální styl:
- Plynulý pohyb.
- Mírně přehnané reakce.
- Žádné realistické, agresivní animace.
- Animace mají být čitelné a zábavné.
- Pohyb má působit lehce a přirozeně.
- Všechny objekty mají podobnou tloušťku obrysů.
- Postavy a objekty mají být čitelné i na malém mobilním displeji.
  Animace potápěče






















10












Potápěč potřebuje tyto základní animace:
- Idle – jemné pohupování, bubliny z kyslíkové masky.
- Swim – pohyb ploutví při plavání.
- Swim up/down – změna polohy těla podle směru.
- Turn – otočení doleva/doprava.
- Collect – sebrání truhlice.
- Carry – plavání s truhlicí.
- Damage – krátké odskočení při zasažení.
- Death / failure – vyčerpání kyslíku nebo poražení.
- Return – návrat k lodi a vylezení na palubu.
  Při pohybu by se měl potápěč lehce naklánět podle směru. Ploutve by měly animovat pohyb a za potápěčem mohou zůstávat malé bubliny.
  Animace žraloků
- Neustálé pohyby ocasní ploutve.
- Jemné pohupování těla.
- Při lovu zrychlení animace.
- Při spatření potápěče změna směru.
- Při útoku rychlý výpad.
- Po neúspěšném útoku krátké zpomalení.
  Žraloci musí působit nebezpečně, ale stále stylizovaně a ne příliš realisticky.
  Animace pokladu
- Truhlice lehce plave nebo se pohupuje.
- Vzácné truhlice mají jemný glow efekt.
- Při otevření se vysypou mince.
- Získání pokladu doprovází krátký vizuální efekt.
- Nad potápěčem se objeví například +250 $.
  Animace prostředí
- Vlny na hladině.
- Světelné paprsky procházející vodou.
- Plovoucí bubliny.
- Jemně pohybující se mořské rostliny.
- Plankton.
- Pomalé částice ve vodě.
- Korály se lehce pohupují.
- Malé rybky plavou ve skupinách.
- S hloubkou ubývá světla.

8. Postupné zvyšování obtížnosti
   Hra by měla být rozdělena do oblastí, které se postupně odemykají.






















10











Oblast	Prostředí	Obtížnost
1. Sunny Reef	Mělká voda, písek	Velmi snadná
2. Coral Bay	Korály, první žraloci	Snadná
3. Shark Territory	Více žraloků	Střední
4. Sunken Ship	Vrak, překážky	Těžká
5. Deep Ocean	Velká hloubka, tma	Velmi těžká
6. Ancient Ruins	Starověké poklady	Expert

Každá oblast nabízí:
- Nové prostředí.
- Nové typy překážek.
- Větší odměny.
- Vzácnější truhlice.
- Silnější žraloky.
- Nové mise.
  Obtížnost by měla růst postupně. Hráč by neměl být potrestán příliš tvrdě na začátku.

9. Peníze a ekonomika hry
   Peníze jsou odměnou za úspěšný ponor.

Po návratu na loď se zobrazí přehled:
PONOR ÚSPĚŠNÝ!










+850 $
Poklad bezpečně doručen

Získané truhlice
3

Získané mince
850 $

Bonus za hloubku
+150 $



Peníze slouží k nákupu vylepšení.
Upgrady










Kyslíková nádrž
Delší ponory.











Ploutve
Vyšší rychlost.











Neopren
Odolnost vůči útokům.











Sonar
Ukazuje poklady poblíž.


Další upgrady:
- Lepší kyslíková nádrž.
- Rychlejší ploutve.
- Silnější neopren.
- Světlo pro hluboké ponory.
- Sonar na poklady.
- Větší kapacita pro nesení pokladů.
- Lepší loď.
- Rychlejší návrat na hladinu.
  Upgrady by měly být rozdělené do několika úrovní a jejich cena postupně růst.

10. Herní HUD (uživatelské rozhraní)
    Rozhraní musí být jednoduché, přehledné a nesmí překážet samotné hře.






















11











Zobrazení během ponoru
- Kyslík – výrazný ukazatel v horní části.
- Peníze – aktuální stav hráčova účtu.
- Poklad – kolik truhlic hráč nese.
- Hloubka – aktuální hloubka.
- Směr k lodi – jednoduchá navigační šipka.
- Ovládání – joystick / směrová tlačítka.
  V okamžiku, kdy kyslík klesne pod 25 %, začne ukazatel blikat a objeví se vizuální varování.

Když hráč nese poklad, měl by mít výraznou indikaci, že ho ještě nedoručil.

11. Herní mise a úkoly
    Aby hra nebyla pouze o opakovaném hledání truhlic, je vhodné přidat jednoduché mise.

Příklady:
- Získej 3 truhlice během jednoho ponoru.
- Najdi zlatou truhlici.
- Vrať se s pokladem, aniž by tě zasáhl žralok.
- Dosáhni hloubky 50 metrů.
- Najdi poklad v potopené lodi.
- Získej 1 000 mincí během tří ponorů.
- Prozkoumej novou oblast.
- Dokonči ponor s minimálně 30 % kyslíku.
  Mise dávají hráči další důvod pokračovat a odemykají nové oblasti a vybavení.

12. Neúspěšný ponor
    Ne každý ponor musí skončit úspěšně.

Pokud hráč:
- Dojde mu kyslík.
- Je napaden žralokem.
- Zůstane příliš hluboko.
- Nedokáže se vrátit na loď.
  Ponor skončí neúspěchem.

Doporučuji, aby hra nebyla příliš trestající. Hráč může přijít o právě nesený poklad, ale neměl by ztratit všechny své peníze nebo již zakoupené upgrady.
Obrazovka neúspěchu
- Animace potápěče, který se musí zachránit.
- Informace o důvodu neúspěchu.
- Ztracená hodnota pokladu.
- Možnost okamžitě začít nový ponor.

13. Zvuky a hudba
    Zvuk by měl podporovat atmosféru, ale neměl by být rušivý.
    Zvukové efekty
- Plavání.
- Bubliny z kyslíkové masky.
- Sebrání truhlice.
- Otevření truhlice.
- Vysypání mincí.
- Žraločí zvuk.
- Varování před nízkým kyslíkem.
- Zasažení potápěče.
- Návrat na loď.
- Odměna za úspěšný ponor.
- Nákup upgradu.
  Hudba
- Klidná, dobrodružná hudba při začátku.
- Jemná podvodní ambientní hudba.
- Napínavější hudba ve velké hloubce.
- Krátká vítězná melodie při doručení pokladu.
  Hudba by se měla dynamicky měnit podle hloubky a nebezpečí.

14. Doporučené technické řešení
    Pokud se projekt bude realizovat jako 2D hra pro web a mobil, doporučuji:
- 2D game engine.
- Spritesheet animace.
- Tile-based generování mořského dna.
- Kamera sledující hráče.
- Procedurální generování prostředí nebo předem připravené segmenty.
- Oddělené herní systémy: movement, oxygen, treasure, enemies, collision, economy.
- Ukládání progresu hráče.
- Optimalizace pro mobilní zařízení.
  Architektura herních objektů
  Game
  ├── GameWorld
  │   ├── OceanSurface
  │   ├── Boat
  │   ├── Diver
  │   ├── Camera
  │   ├── SeabedGenerator
  │   └── WorldObjects
  │       ├── TreasureChest
  │       ├── Shark
  │       ├── Coral
  │       ├── Rocks
  │       └── Hazards
  │
  ├── GameSystems
  │   ├── MovementSystem
  │   ├── OxygenSystem
  │   ├── TreasureSystem
  │   ├── EnemySystem
  │   ├── CollisionSystem
  │   ├── DiveSystem
  │   └── EconomySystem
  │
  ├── UI
  │   ├── HUD
  │   ├── Controls
  │   ├── DiveSummary
  │   ├── UpgradeShop
  │   └── Missions
  │
  └── Progression
  ├── PlayerStats
  ├── Upgrades
  ├── Regions
  └── SaveSystem



15. MVP – první hratelná verze
    Pro první verzi bych hru zbytečně nerozšiřoval. Nejprve je potřeba vytvořit funkční a zábavnou základní smyčku.
    První verze musí obsahovat:
- [ ] Loď na hladině.
- [ ] Potápěče.
- [ ] Pohyb nahoru, dolů, doleva, doprava.
- [ ] Plynule scrollující kameru.
- [ ] Mořské dno, které se mění při pohybu.
- [ ] Kyslík s časovým limitem.
- [ ] Jednu truhlici s pokladem.
- [ ] Žraloka s jednoduchým AI.
- [ ] Kolize a poškození.
- [ ] Sebrání pokladu.
- [ ] Návrat na loď.
- [ ] Výplatu peněz za úspěšný ponor.
- [ ] Základní obrazovku upgradu.
- [ ] Restart ponoru.

První herní prototyp
Hráč se objeví na lodi. Stisknutím tlačítka se potopí. Kamera začne sledovat potápěče. Hráč se pohybuje pod vodou, vidí truhlici, vyhne se žralokovi, sebere poklad a vrátí se na loď.

Po návratu se spustí krátká animace odměny, hráč získá peníze a může koupit lepší kyslíkovou nádrž.

Tohle je základ, který musí být zábavný ještě před přidáním desítek dalších funkcí.

16. Finální vizuální směr






















11














Celkový dojem hry:
- Barevná a přátelská.
- Dobrodružná.
- Jednoduchá na pochopení.
- Lehce napínavá.
- Moderní mobilní arkáda.
- Plynulé animace.
- Výrazné postavy.
- Čisté UI.
- Vizuálně atraktivní poklady.
- Krátké herní cykly, které hráče motivují k dalšímu ponoru.
  Hráč by měl mít neustále pocit:
  „Ještě jednu truhlici… ale už mi dochází kyslík. Stihnu se vrátit?“

Právě tohle rozhodování mezi riskováním, odměnou a bezpečným návratem by mělo být hlavním zdrojem zábavy celé hry.
## Spuštění

```bash
npm install
npx expo start          # Expo Go na telefonu (naskenuj QR kód)
npx expo start --web    # hra v prohlížeči (WASD / šipky, mezerník = ponor / sonar, Esc = pauza)
```

Kontroly: `npx tsc --noEmit`, `npx expo lint`.

## Struktura

- `src/game` – herní engine bez Reactu: svět generovaný po segmentech (`world.ts`, `terrain.ts`, `regions.ts`), katalog truhlic a žraloků (`catalog.ts`), systémy v `systems/` (pohyb, kyslík, žraloci a nebezpečí, poklady, kolize, ponor, kamera, efekty) a `engine.ts` se smyčkou `step()`.
- `src/progression` – vylepšení, mise, ukládání postupu (AsyncStorage).
- `src/render` – vykreslení scény (pozadí podle hloubky, mořské dno, postavy, efekty, tma v hlubinách).
- `src/ui` – HUD, joystick, menu, shrnutí ponoru, obchod, mise, nastavení, pauza.
- `src/audio` – hudba a zvukové efekty (expo-audio).
- `assets/sprites`, `assets/backgrounds`, `assets/audio` – vygenerované assety podle grafického manuálu.
