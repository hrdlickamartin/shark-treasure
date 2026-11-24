# Shark Treasure

2D side-scrolling hra (Expo SDK 58, React Native 0.88, React 19, TypeScript) pro iOS, Android a web. Hráč pluje lodí, potápí se pro truhlice a vrací se s nimi, než dojde kyslík. Kolem toho je meta-progrese: vylepšení, 8 oceánů, příběhové questy, výzkum, výpravy (prestiž).

## Pravidla

- Texty ve hře, testy, commity i odpovědi uživateli jsou česky. Názvy oceánů a lokací zůstávají anglicky (`Coral Garden`, `Pirate Bay`), jsou to vlastní jména.
- Kód bez komentářů; srozumitelnost nese pojmenování.
- Před dokončením spusť `npm run check` (typy kódu i testů, lint, testy enginu, české glyfy fontů, soulad assetů). Totéž hlídá pre-commit hook v `.githooks/`.
- Commituj a pushuj jen na výslovný pokyn.

## Mapa kódu

Než upravíš kód v adresáři, přečti jeho `AGENTS.md`:

- `src/game/` – čistý TypeScript engine: stav, simulace, generování světa, data oceánů → [`src/game/AGENTS.md`](src/game/AGENTS.md)
- `src/render/` – vykreslení `GameState` do React Native views, sprity → [`src/render/AGENTS.md`](src/render/AGENTS.md)
- `src/ui/` – obrazovky, HUD, ovládání, responzivita → [`src/ui/AGENTS.md`](src/ui/AGENTS.md)
- `src/progression/` – save, ekonomika, questy, příběh → [`src/progression/AGENTS.md`](src/progression/AGENTS.md)
- `tools/assets/` – pipeline spritů a pozadí → [`tools/assets/AGENTS.md`](tools/assets/AGENTS.md)
- `tests/` – testy enginu a progrese → [`tests/AGENTS.md`](tests/AGENTS.md)

Ostatní: `src/GameScreen.tsx` (orchestrátor), `src/hooks/` (herní smyčka, `Live`, klávesnice), `src/audio/audio.ts` (hudba a efekty přes `expo-audio`), `docs/` (plány rozšíření a rozhodnutí, ruční testovací scénáře v `docs/test-cases/`). PDF v kořeni jsou zdrojové GDD, Story Bible a grafický manuál.

## Architektura

Jednosměrný tok, jedna obrazovka bez navigace (žádný Expo Router):

```
useGameLoop (rAF) → step(state, input, dt, view) → GameEvent[] → GameScreen.handleEvents
                         │ mutuje GameState in-place              (zvuk, haptika, toast, rádio, výsledek ponoru)
                         ▼
             nextFrame() → <Live> překreslí World / HUD / DiveActions
```

- **`GameState` je mutabilní objekt v `gameRef`**, ne React state. React o změnách ví jen přes `nextFrame()` / `useFrame()` z `src/hooks/useFrame.ts`; obsah, který se mění každým snímkem, obal do `<Live>{() => …}</Live>`. Při slabém výkonu smyčka překresluje jen každý druhý snímek (`perfRef`).
- **Engine komunikuje s okolím jen přes `state.events`** (`GameEvent` v `src/game/types.ts`). Engine nevolá audio, haptiku ani React.
- **Konec ponoru** = event `finished` s `DiveResult` → `useProgress().applyResult` → čistá funkce `applyDive` vrátí nový `SaveData` a `ResultSummary` → obrazovka `summary` → `newWorld()` vytvoří nový svět s novým seedem.
- **`GameScreen.tsx`** drží `screen` (`menu | play | summary | shop | settings | paused | expedition | worldmap | logbook | ending`), převádí save na `WorldOptions` a `Stats` (`optionsFor`, `statsWith`) a předává akce tlačítek do engine funkcí (`startDive`, `fireHarpoon`, …).

## Nasazení webu

Web běží na GitHub Pages: https://hrdlickamartin.github.io/shark-treasure/. Repo `hrdlickamartin/shark-treasure`, zdrojáky ve větvi `main`, statický build ve větvi `gh-pages` (Pages servíruje `gh-pages` z kořene).

1. Do `app.json` dočasně přidej `expo.experiments.baseUrl: "/shark-treasure"`, spusť `npx expo export --platform web --output-dir <dočasná složka>` a `app.json` vrať do původního stavu (baseUrl v repu nezůstává, lokální vývoj by jinak běžel pod podcestou).
2. Obsah exportu zkopíruj do checkoutu větve `gh-pages`, přidej prázdný `.nojekyll` (bez něj Jekyll zahodí složku `_expo`), commitni a pushni přes SSH remote.
3. Ověř, že `index.html` na webu odkazuje na nový `index-<hash>.js`. Pages drží `index.html` v cache až 10 minut; chyba hlášená se starým hashem pochází ze staré verze.

## Ověření v prohlížeči

`npx expo start --web` (port 8081). Telefony emuluj viewportem: Samsung S21 FE na výšku 412×891, na šířku 800×360; kompaktní telefon 740×320. Ovládání na webu: šipky/WASD, mezerník = ponor/sonar, E harpuna, B balón, R plašič, H lékárnička, F skútr, C fotoaparát.

Stav hry je dostupný z prohlížeče přes React fiber: projdi `memoizedState` hooků od kořene a najdi ref, jehož `current` má `diver` a `chests`. Tím jde potápěč teleportovat (k truhle, na loď, napříč mapou) a cíleně vyzkoušet scénáře, na které náhodné hraní nedosáhne. Save je v `localStorage` pod klíčem `shark-treasure-save-v1`.

## Expo

Expo mění API každým SDK. Než napíšeš kód sahající na Expo/RN API, ověř ho v dokumentaci pro verzi z `package.json` (`https://docs.expo.dev/versions/v58.0.0/`, index `https://docs.expo.dev/llms.txt`). Balíčky přidávej přes `npx expo install`. Složky `ios/` a `android/` se generují (CNG), nativní nastavení patří do `app.json`.
