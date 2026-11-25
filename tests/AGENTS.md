# tests – testy enginu a progrese

`node:test` + `assert/strict`, spouští `npm test` (`tsx --test tests/*.test.ts`). Testy importují přímo `src/game` a `src/progression`, bez Reactu a bez emulátoru. Proto engine ani `saveData.ts` nesmí táhnout React Native, Expo nebo AsyncStorage. Typy testů hlídá zvlášť `tests/tsconfig.json` (součást `npm run typecheck`).

- `dive.test.ts`: jádro ponoru:
  - kyslík, zranění a ztráta truhly;
  - determinismus generování (i pro záporné indexy úseků);
  - jeskyně a kapsy, tvorové, vybavení a harpuna;
  - režim `endless`, výpravy, migrace save, hustota nepřátel.
- `balance.test.ts`: vyvážení – každá úroveň vylepšení něco zlepší, ceny úrovní z příběhu proti výdělku oceánu, harpuny proti životům bossů, trofeje, podmínky výpravy, zásoby, odměny lokací (simulace přes `generateChunk`).
- `oceans.test.ts`: všech 8 oceánů a mechaniky prostředí (tlak, teplota), questy, příběh a konce, migrace savů ze starších verzí a **testy férovosti**: s doporučenou výbavou musí jít doplout ke questovým cílům a vrátit se.

## Jak psát test

- Názvy testů jsou česká věta o chování: `'harpuna doletí za žralokem, zasáhne ho a žralok zmizí'`.
- Simuluj přes veřejné API:
  - `createGame` → `startDive` → smyčka `step(state, input, DT, VIEW)` s `DT = 1/60` a `VIEW = { width: 900, height: 420 }`;
  - pomocníci `run(state, seconds, policy)` (vrátí `DiveResult`) a `toward(from, to)` (vstup joysticku k cíli) jsou definovaní na začátku každého souboru; nový soubor si je zkopíruje.
- Scénář si postav přímo ve stavu: vlož žraloka přes `newShark`, tvora přes `newHazard`, posuň potápěče. Spoléhat na náhodné rozmístění vede k nestabilním testům.
- Progresi testuj čistými funkcemi (`applyDive`, `settle`, `migrateSave`, `progressQuest`) s ručně složeným `SaveData` / `DiveResult`.
- Každá nová mechanika nebo oprava chyby enginu dostane test, který bez opravy selže.

Render a UI testy nemají; ty se ověřují v prohlížeči (postup v kořenovém `AGENTS.md`). Ruční scénáře pro testera patří do `docs/test-cases/<téma>-<datum>.md`.
