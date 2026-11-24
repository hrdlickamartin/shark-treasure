# src/render – vykreslení světa

Vstupem je `GameState`, výstupem strom React Native `View`/`Image`, žádný canvas ani Skia. Render stav jen čte, nikdy ho nemění. Všechno, co se má hýbat podle simulace, se počítá v enginu a render to jen zobrazí.

## Vrstvy v `World.tsx`

Pořadí potomků určuje překrývání:
1. `Background`: parallax pozadí oceánu podle hloubky a obloha.
2. Světová vrstva: posun o kameru přes `translateX/translateY`. V ní postupně:
   - dno: `SeabedChunk`, `CaveRock`, šachta;
   - tvorové, truhlice, mince, předměty, ryby, žraloci, balóny;
   - potápěč, ponorka a loď;
   - vlny hladiny a `FrontDecor` (popředí před potápěčem);
   - kraby, projektily harpuny, sonar, částice a plovoucí texty.
3. `Darkness`: ztmavení s hloubkou, mlha a světelný kužel potápěče.
4. Druhá světová vrstva nad tmou, pro to, co musí být vidět i v hloubce: světla ďasů, záře předmětů, ukazatel životů bosse, zaměřovač harpuny, hledáček foťáku.
5. Inkoust chobotnice přes obrazovku.

Nový prvek zařaď podle toho, jestli má být pod tmou (běžný objekt), nebo nad ní (ukazatel, záře, cíl).

## Výkon

- Prvky mimo obrazovku se nerenderují: `visible(x, y)` v `World` a výběr úseků podle kamery. Každý nový seznam entit filtruj stejně.
- Statické věci jsou `memo` a závisí jen na neměnných props: `SeabedChunk`, `FrontDecor`, `CaveRock`, `ShaftSegment`, `Sky`, `BgTiles`. Úsek se vygeneruje jednou a jeho objekt se nemění, takže memo drží. Do takové komponenty nepředávej `time` ani stav, který se mění každým snímkem.
- Opakující se animace (houpání rostlin, vlny, záře, rotace, ploutve) neběží přes React, ale přes sdílené `Animated.Value` hodiny v `clocks.ts`. Na nativních platformách mají native driver, na webu běží v JS. `useClocks()` je spustí jednou. Pro nový cyklický pohyb přidej hodiny do `LOOPS` a interpoluj je, místo počítání z `time` při každém renderu.
- Výběr varianty z pole podle souřadnice (`swayRotations[...]`, `fishSway[...]`) musí dostat nezáporný index; `x` bývá záporné.

## Sprity

- `spriteAssets.ts` (`SPRITES`, `BACKGROUNDS`) a `rigs.ts` (`RIGS`) jsou generované z `tools/assets/manifest.json` přes `npm run assets:build`. Ruční úprava neprojde `npm run check`. Postup v [`tools/assets/AGENTS.md`](../../tools/assets/AGENTS.md).
- `Sprite.tsx`:
  - `Sprite` umisťuje obrázek podle středu (nebo spodku přes `anchor="bottom"`) a šířky;
  - výšku vždy dopočítává `spriteHeight(name, width)` z poměru stran;
  - `Icon` vykresluje ikony v UI.
- Postavy a žraloci kreslení koukají doprava; doleva se otáčejí přes `flip` / `scaleX: -1`. Plynulé otočení řeší `turnPose` (bok ↔ čtvrtpohled `_q` sprite).
- `RigSprite` rozřeže sprite na svislé pruhy podle `RIGS[name].cuts` a natáčí je kolem `pivots`; tak se vlní ocas žraloka a těla tvorů. Úhly pruhů počítají komponenty v `Entities.tsx` z času a fáze entity (`sharkAngles`, `anim.kick` potápěče).
- `Preloader` předem načítá pozadí aktuálního oceánu, aby při potopení neproblikla.

## Kde co je

| Soubor | Obsah |
|---|---|
| `Entities.tsx` | potápěč, loď, žraloci, tvorové, truhlice, předměty, balóny, efekty, prvky harpuny a sonaru |
| `SeabedChunk.tsx` | terén úseku (SVG profil dna), dekorace, jeskyně, vlny hladiny |
| `Shaft.tsx` | stěny a vzduchové bubliny režimu `endless` |
| `Background.tsx` | parallax pozadí a obloha podle počasí |
| `Darkness.tsx` | tma, mlha, světlo potápěče, varování při nedostatku kyslíku |
