# src/ui – obrazovky a ovládání

Prezentační komponenty. Data a callbacky dostávají z `src/GameScreen.tsx`, který rozhoduje, co se zobrazí (`screen`), a volá engine nebo `useProgress`. Komponenty v `ui/` save nemění samy.

## Stavební prvky

- `theme.ts`: barvy (`COLORS`), fonty (`FONTS`: Baloo 2 pro nadpisy, Nunito pro text), `RADIUS`, `textShadow`. Barvy a fonty ber odtud. Font musí umět českou diakritiku, `npm run check:fonts` to ověřuje pro fonty načtené v `App.tsx`.
- `Button.tsx` `GameButton`: varianty `green | blue | gold | red | navy`, velikosti `xs | sm | md | lg`, volitelná ikona. Klik sám přehraje zvuk; `silent` ho vypne.
- `Panel.tsx`: `Panel`, `Title`, `Overlay` (ztmavené pozadí dialogu), `MoneyPill`.
- Ikony přes `Icon` ze `src/render/Sprite`, jen se jmény ze `SPRITES`.

## Dotykové ovládání

- Herní tlačítka (ponor, akce ve vodě) jdou přes `TouchAction`: na nativní platformě reaguje na `onTouchStart` (okamžitě, a víc prstů najednou s joystickem), na webu přes `Pressable`. Pro herní akce ho používej místo `Pressable`.
- `Joystick` sleduje svůj prst podle `identifier` (multitouch) a zapisuje do `inputRef`. Klávesnice má v `GameScreen` přednost, jakmile je stisknutá.
- Překryvné panely ležící přes hrací plochu dostávají `pointerEvents="box-none"`, aby prázdná místa nepohlcovala dotyky. Na výšku dřív panel na lodi zakrýval joystick a loď nešla ovládat.

## Responzivita

Hraje se na telefonech v obou orientacích, na tabletech i na webu. Cílová zařízení jsou běžné Androidy (Samsung), ne jen iPhone.

- Rozměry ber z `useWindowDimensions()`, okraje z `useSafeAreaInsets()` (výřezy, gesta). Pevné pozice počítej od insetů.
- Prahy používané v kódu:
  - `compact = Math.min(width, height) < 520` (telefon): menší tlačítka (`xs`/`sm`), skrytá legenda kláves;
  - `portrait = height > width`;
  - HUD `narrow = width < 640`.
- Na výšku je obrazovka úzká. Spodní okraj patří joysticku vlevo a akcím vpravo, další ovládání jde nad joystick. `DiveActions` mají na výšku mřížku dvou sloupců (`GRID`), na šířku oblouk kolem sonaru.
- Svět se škáluje `zoom` v `GameScreen` (podle menšího rozměru obrazovky), UI se neškáluje.
- Změny UI ověř v prohlížeči aspoň na 412×891 (na výšku), 800×360 a 740×320 (na šířku) a na desktopu (postup v kořenovém `AGENTS.md`).

## Výkon

- HUD se překresluje přes `ThrottledHUD` jen každý třetí snímek (`tick`).
- Co se mění každým snímkem, je obalené v `<Live>` (`src/hooks/useFrame.ts`). Statické obrazovky (obchod, deník, mapa) se renderují jen při změně React stavu.

## Obrazovky

| Soubor | Obrazovka |
|---|---|
| `MainMenu` | hlavní menu (na šířku logo vlevo a dlaždice vpravo, na výšku pod sebou) |
| `HUD`, `DiveActions` | ukazatele a akční tlačítka během hry |
| `DiveSummary` | výsledek ponoru, mise, questy, úrovně |
| `UpgradeShop` | vylepšení |
| `Logbook` | deník, rozcestník záložek: úkoly, posádka, katalog, výzkum, mise, sbírka |
| `WorldMap` | mapa oceánů a cestování |
| `Expedition` | nová výprava (prestiž) a perky |
| `Dialogue` | dialogy na lodi (`DialogueBox`) a rádio během ponoru (`RadioBubble`) |
| `Ending` | volba konce příběhu |
| `Settings`, `PauseMenu` | nastavení a pauza |
