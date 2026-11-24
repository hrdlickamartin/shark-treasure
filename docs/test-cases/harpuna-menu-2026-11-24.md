# Shark Treasure – harpuna a mobilní menu

Změny: harpuna střílí viditelný projektil s naváděním, zasažený žralok nebo tvor zmizí, bossové mají více životů. Hlavní menu a panel na lodi mají kompaktní rozložení pro telefony.

Kategorie Role a licence, Integrace, Domény a překlady a SSR jsou vynechány: hra nemá role, backend, domény ani SSR.

### TC-001 - Výstřel na žraloka a jeho zmizení

**Kategorie:** Happy path
**Priorita:** P1
**Prostředí a doména:** web build, Android Chrome (Samsung) i desktop
**Předpoklady:**
- vylepšení Harpuna aspoň na úrovni 1

**Kroky:**
1. Ponoř se a plav doprava, dokud se před potápěčem neobjeví žralok do zhruba 3 m.
2. Sleduj žraloka a tlačítko harpuny.
3. Klepni na tlačítko harpuny (na desktopu klávesa E).

**Očekávaný výsledek:**
Kolem žraloka se točí žlutý přerušovaný zaměřovač, tlačítko harpuny zezlátne a jednou za ponor se ukáže toast „Cíl na mušce! Vystřel harpunou.“. Po výstřelu z potápěče vyletí harpuna (stříbrná násada, žlutý hrot), doletí za žralokem, zobrazí se jiskry a „Zásah!“, žralok se převrátí, klesá, zprůhlední a zmizí. Počet na odznaku tlačítka klesne o 1.

### TC-002 - Boss vydrží více zásahů

**Kategorie:** Happy path
**Priorita:** P1
**Prostředí a doména:** web build, Karibik, doupě Megalodona
**Předpoklady:**
- aspoň 3 harpuny (úroveň 3 nebo zásoby od obchodníka)

**Kroky:**
1. Doplav do doupěte Megalodona.
2. Vystřel na Megalodona jednou.
3. Vystřel podruhé a potřetí.

**Očekávaný výsledek:**
Nad bossem je od začátku ukazatel se 3 červenými dílky. Po prvním zásahu jeden zhasne, boss bliká a krátce zpomalí, text „Zásah! Zbývá 2×“. Po třetím zásahu text „Megalodon poražen!“, toast „Megalodon je poražen! Poklad je tvůj.“ a boss klesne a zmizí. Ukazatel je vidět i v tmavé hloubce.

**Poznámky:** Leviatan a Tvor z hlubin mají 4 životy.

### TC-003 - Poklad poraženého bosse

**Kategorie:** Stavové přechody
**Priorita:** P2
**Prostředí a doména:** web build
**Předpoklady:**
- poražený boss z TC-002

**Kroky:**
1. Seber bossovu truhlici.
2. Opakuj v jiném ponoru bez poražení bosse.

**Očekávaný výsledek:**
Po poražení toast „Máš poklad poraženého bosse!“, nikdo nepronásleduje. Bez poražení toast „Máš poklad! Megalodon tě pronásleduje – uteč!“.

### TC-004 - Výstřel bez cíle

**Kategorie:** Hraniční hodnoty
**Priorita:** P1
**Prostředí a doména:** web build
**Předpoklady:**
- aspoň 1 harpuna, v dosahu nikdo

**Kroky:**
1. Klepni na tlačítko harpuny.

**Očekávaný výsledek:**
Harpuna vyletí rovně ve směru pohledu, po doletu zmizí v bublinkách, zobrazí se „Nic v dosahu“. Počet harpun se nezmění.

### TC-005 - Zásah nebezpečného tvora

**Kategorie:** Happy path
**Priorita:** P2
**Prostředí a doména:** web build
**Předpoklady:**
- medúza, chobotnice, úhoř, krab, ďas nebo rejnok před potápěčem, žádný žralok blíž

**Kroky:**
1. Vystřel harpunu.

**Očekávaný výsledek:**
Tvor je zaměřený, po zásahu zmizí v jiskrách a bublinách, harpuna se spotřebuje. Mina ani ježovka zaměřené nejsou.

### TC-006 - Rychlé opakované klepání

**Kategorie:** Souběh
**Priorita:** P2
**Prostředí a doména:** Android telefon
**Předpoklady:**
- 3 harpuny, žralok v dosahu

**Kroky:**
1. Klepni na tlačítko harpuny 5× co nejrychleji.

**Očekávaný výsledek:**
Vyletí nejvýš jedna harpuna za 0,7 s, tlačítko je mezi výstřely zašedlé. Na jednoho běžného žraloka se nespotřebuje víc harpun, než doletí, než zmizí.

### TC-007 - Mrtvý žralok neublíží

**Kategorie:** Negativní a chybové cesty
**Priorita:** P2
**Prostředí a doména:** web build
**Předpoklady:**
- zasažený žralok během animace klesání

**Kroky:**
1. Plav přímo do klesajícího žraloka.
2. Vyšli k němu balón s truhlicí.
3. Zapni fotoaparát a zamiř na něj.

**Očekávaný výsledek:**
Potápěč neztratí zdraví, balón není prokousnut a hledáček fotoaparátu žraloka nezaměří.

### TC-008 - Hlavní menu na Samsungu na šířku

**Kategorie:** Responzivita
**Priorita:** P1
**Prostředí a doména:** Samsung Galaxy (Chrome) na šířku, nebo devtools 740×320 a 915×412
**Předpoklady:**
- žádné

**Kroky:**
1. Otevři hru a otoč telefon na šířku.

**Očekávaný výsledek:**
Vlevo logo, pod ním zelené HRÁT a štítek „Oceán: …“. Vpravo mřížka 2×3 stejně širokých tlačítek (Mapa světa, Vylepšení, Deník, výprava, Výzva, Hlubina). Vpravo nahoře peníze a Nastavení. Nic se nepřekrývá ani neuřezává, není vidět řádek s ovládáním klávesnicí.

### TC-009 - Hlavní menu na Samsungu na výšku

**Kategorie:** Responzivita
**Priorita:** P1
**Prostředí a doména:** Samsung Galaxy na výšku, nebo devtools 360×640 a 412×915
**Předpoklady:**
- žádné

**Kroky:**
1. Otevři hru na výšku.

**Očekávaný výsledek:**
Logo nahoře, pod ním HRÁT přes celou šířku, štítek oceánu a mřížka 2×3. Žádný popisek se nezalomí do dvou řádků, poslední řádek tlačítek je celý vidět.

### TC-010 - Panel na lodi na nízkém displeji

**Kategorie:** Responzivita
**Priorita:** P2
**Prostředí a doména:** telefon na šířku (740×320)
**Předpoklady:**
- hra spuštěná, potápěč na lodi

**Kroky:**
1. Klepni na HRÁT a podívej se na pravý dolní roh.

**Očekávaný výsledek:**
Menší tlačítka Vylepšení, Deník, Mapa, Výzva dne a PONOŘIT SE nepřekrývají loď a vejdou se na obrazovku.

### TC-011 - Desktop beze změny chování

**Kategorie:** Regrese
**Priorita:** P2
**Prostředí a doména:** desktop 1280×800
**Předpoklady:**
- žádné

**Kroky:**
1. Otevři menu, projdi všechna tlačítka.
2. Ve hře použij klávesy E, B, R, H, F, C.

**Očekávaný výsledek:**
Menu má větší tlačítka a řádek s ovládáním klávesnicí. Všechna tlačítka otevírají stejné obrazovky jako dřív, klávesy fungují.

### TC-012 - Ovládání bez myši

**Kategorie:** Přístupnost
**Priorita:** P3
**Prostředí a doména:** desktop
**Předpoklady:**
- žádné

**Kroky:**
1. V ponoru střílej jen klávesou E.

**Očekávaný výsledek:**
Harpuna se chová stejně jako po klepnutí na tlačítko.

## Souhrn

| ID | Název | Kategorie | Priorita |
|---|---|---|---|
| TC-001 | Výstřel na žraloka a jeho zmizení | Happy path | P1 |
| TC-002 | Boss vydrží více zásahů | Happy path | P1 |
| TC-003 | Poklad poraženého bosse | Stavové přechody | P2 |
| TC-004 | Výstřel bez cíle | Hraniční hodnoty | P1 |
| TC-005 | Zásah nebezpečného tvora | Happy path | P2 |
| TC-006 | Rychlé opakované klepání | Souběh | P2 |
| TC-007 | Mrtvý žralok neublíží | Negativní a chybové cesty | P2 |
| TC-008 | Hlavní menu na Samsungu na šířku | Responzivita | P1 |
| TC-009 | Hlavní menu na Samsungu na výšku | Responzivita | P1 |
| TC-010 | Panel na lodi na nízkém displeji | Responzivita | P2 |
| TC-011 | Desktop beze změny chování | Regrese | P2 |
| TC-012 | Ovládání bez myši | Přístupnost | P3 |

Celkem: 12 - P1: 5, P2: 6, P3: 1
