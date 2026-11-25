# Audit před vydáním – 25. 11. 2026

Celá hra prošla automatickou simulací, UX auditem zamčených stavů a průchodem v prohlížeči. Opravy jsou ve stejném commitu.

## 1. Dohratelnost

| Kontrola | Jak | Výsledek |
|---|---|---|
| Všechny questy jdou splnit | `tests/campaign.test.ts`: simulace od nového savu přes celou kampaň i rozšíření (volby s příznaky) | 70/70, konec „Strážci oceánu“, kapitola 8, rozšíření kapitola 13, 10 oceánů |
| Opačné volby nezablokují hru | stejný test, poslední volba v každém dialogu | 69/70; chybí jen `rook_final`, který záměrně vyžaduje spojenectví s Rookem |
| Questové předměty jsou dosažitelné | skutečný ponor ke každému předmětu kampaně (doručení i aktivace, 130 cílů) s doporučenou výbavou kapitoly | vše doplaveno a vráceno |
| Bossové jdou porazit | `tests/balance.test.ts` | harpuny stačí v kapitole, kdy na bosse hráč narazí |

## 2. Ekonomika (tempo kampaně)

Základní úrovně vylepšení (88 000 $) jsou dostupné od začátku a hráč je kupuje průběžně. Kapitoly přidávají úrovně:

| Kapitola | Nové náklady | Peníze z questů | Dobrý ponor (L3) | Ponorů navíc |
|---|---|---|---|---|
| 2 Arktida | 4 800 | 14 500 | 1 280 | 0 |
| 3 Středomoří | 10 010 | 13 000 | 1 878 | 0 |
| 4 Tichomoří | 8 750 | 15 500 | 2 089 | 0 |
| 5 Atlantida | 55 500 | 18 500 | 5 280 | 8 |
| 6 Propast | 11 350 | 27 000 | 6 059 | 0 |
| 7 Hřbitov | 48 120 | 30 000 | 4 622 | 4 |
| 8 Vulkány | 51 170 | 31 000 | 5 999 | 4 |

Další průběžné výdaje jsou moduly lodi (31 000 $ bez rozšíření), zásoby na ponor, výroba v dílně a perky výprav.

## 3. Srozumitelnost – nálezy a opravy

**Vysoká závažnost**
1. Zamčená volba v dialogu ukazovala jen „– nedostupné“. Nově vypíše chybějící podmínky (např. „✗ Respektovaný u 3 frakcí (máš 1/3)“, „✗ Uzavři 6 trhlin (máš 4/6)“, „✗ Splň úkol …“, chybějící peníze).
2. Materiály byly jen ikony. Nově mají název, počet a místo, kde je najdeš („Zatím nedostupné – první výskyt: Atlantida“). Deník je ukazuje od otevření přístavu.
3. Zamčený slot lodi neříkal úroveň motoru a modul šel koupit do zamčeného slotu. Nově: „Odemkne Lodní motor úr. 4 (máš 2)“, nákup je zablokovaný s vysvětlením.

**Střední závažnost**
4. Zakázka na biogel chodila dřív, než šel biogel sehnat. Nově se nabízejí jen zakázky na materiály z odemčených oceánů.
5. Útržek mapy byl zašedlý bez důvodu. Nově: „Od Bratrstva – Známý (60/150 b.)“.
6. U zamčených receptů a modulů chyběly body. Nově: „(40/150 b.)“.
7. Karta frakce neříkala, co dá další úroveň. Doplněno, sleva 10 % jen u Cechu (tak to i funguje).
8. Popis Lodního motoru: „víc slotů pro moduly“, efekt ukazuje sloty.
9. Varování před výpravou neodpovídalo realitě. Nově přesně: co se ztratí (i lodní motor a sloty) a co zůstane (příběh, materiály, moduly, reputace…).
10. Podmínka bosse u výpravy říká, kde bosse najít.
11. „Další úroveň na příští výpravě“ upozorní, že vybavení začne znovu od nuly.
12. Deník ukazoval plnou cenu výzkumu i s Laboratoří (−20 %). Opraveno.
13. Deník tvrdil „Fotoaparát koupíš ve Vylepšení“. Opraveno.
14. Podmínky kapitol sjednoceny na „po dokončení kapitoly N (oceán)“.
15. Výprava ukazuje nově odemčené vybavení (Lékárnička, Podvodní skútr).
16. Výzkum říká, odkud jsou data.

**Nízká závažnost**
- Doporučená výbava na mapě: „Tlakový oblek úr. 2 (máš 1)“.
- Hlubina: „dosáhni 50 m“.
- V obchodě je vidět sleva Cechu.
- Zásoby: vysvětleno, že limit 2 platí pro obchod, obchodník a dílna přidají další.
- Na výšku se hláška „Nová lokace“ překrývala s rádiem. Posunuta pod rádio.

**Ponecháno**
- Tlačítko Přístav se před dokončením Karibiku nezobrazuje vůbec. Hráč se o přístavu dozví z úvodního dialogu ve chvíli, kdy se otevře.
- Budoucí úrovně vylepšení se vysvětlují až u vylepšení na stropu.

## 4. Průchod v prohlížeči

Rozehraný save (kapitola 4, Tichomoří) ve 900×420, 412×891 a 740×320:
- hlavní menu, mapa světa, deník (všechny záložky), vylepšení, výprava;
- loď, přístav (zakázky, dílna, loď), ponor, pauza, nastavení.

39 snímků bez chyby v konzoli. Zvlášť ověřeno:
- finále rozšíření se zamčenými volbami (na šířku i na výšku);
- úvod přístavu;
- sběr materiálů;
- trofej bosse;
- zásoby po rychlém návratu.

## Ruční scénáře pro tester

| # | Scénář | Očekávaný výsledek |
|---|---|---|
| 1 | Nový save, dokončit First Dive | Nápověda na lodi vede krok po kroku, souhrn ukazuje splněné kroky |
| 2 | Dokončit Karibik | Úvod přístavu (Nora, Maya), tlačítko Přístav, quest Dílna v přístavu |
| 3 | V Arktidě koupit 4. harpunu, zaútočit na Leviatana | 3 zásahy „Unavený!“, 4. zabije, souhrn „Trofej … poprvé“ |
| 4 | Přístav → Loď s motorem úr. 1 | Zamčené sloty s úrovní motoru, zvon do Kýlu nejde koupit |
| 5 | Přístav → Dílna před Atlantidou | Biogel „Zatím nedostupné – první výskyt: Atlantida“ |
| 6 | Finále rozšíření bez spojenců | U „Doprovodit Strážce“ seznam chybějících podmínek |
| 7 | Výprava → potvrdit | Varování vyjmenuje, co se ztratí a co zůstane |
| 8 | Deník → Výzkum s Laboratoří na palubě | Cena −20 % a tlačítko aktivní podle ceny se slevou |
