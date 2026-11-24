# tools/assets – pipeline grafiky

Jediný zdroj pravdy o grafice je `manifest.json`. Z něj a ze souborů v `assets/` skript `assets.py` generuje `src/render/spriteAssets.ts` (`SPRITES` s poměrem stran, `BACKGROUNDS`, `ILLUSTRATIONS`) a `src/render/rigs.ts`. Vygenerované soubory se ručně neupravují. `npm run check:assets` hlídá soulad a selže, když se rozejdou.

## Manifest

- `style`, `backgroundStyle`: společné stylové zadání přidávané ke každému promptu.
- `sprites.<jméno>`: PNG v `assets/sprites/<jméno>.png`, s těmito poli:
  - `prompt`: co se má nakreslit. Popisuj celý objekt včetně okrajových částí (špička rostliny, ocas, ploutve), ať vygenerovaný obrázek nic neusekne.
  - `references`: jiné sprity jako přesná předloha designu (varianty lodi, čtvrtpohledy `_q`).
  - `maxSize`: delší strana po importu v px (výchozí 400).
  - `facing: "right"` + `facingCheck`: tvor musí koukat doprava. Kontrola měří, kde má obrázek víc hmoty; doleva otočený tvor se opraví importem s `--flip`.
  - `rig: { cuts, pivots }`: rozřezání na pruhy pro vlnění (`RigSprite`).
  - `derive: { from, hue }`: barevná varianta odvozená z jiného spritu posunem odstínu (vzhledy potápěče), negeneruje se.
- `backgrounds.<jméno>`: JPG v `assets/backgrounds/` pro parallax pozadí oceánů. Pozadí musí být vodorovně navazující.
- `illustrations`: velké ilustrace (mapa světa) v `assets/backgrounds/`.

## Příkazy

```bash
python3 tools/assets/assets.py generate <jméno> [--size 1024x1536] [--flip]  # vygeneruje sprite z promptu
python3 tools/assets/assets.py import <jméno> <soubor> [--flip]              # importuje hotový obrázek
python3 tools/assets/assets.py derive [--force]                              # dopočítá barevné varianty
npm run assets:build                                                         # přegeneruje TS z manifestu
npm run check:assets                                                         # kontrola souladu
```

- `generate` je placený (gpt-image-1.5 přes skill `generate-media`, kolem 0,05 $ za obrázek) a jako předlohu posílá `style-reference.png`. Hromadné generování nejdřív odsouhlas s uživatelem.
- Pro vysoké objekty (rostliny, sloupy) použij `--size 1024x1536`, pro široké (lodě, velcí bossové) `1536x1024`. Čtvercové plátno svádí k useknutí.
- `import` a `generate` ořežou průhledné okraje, zmenší na `maxSize` a rovnou přegenerují TS.

## Kontrola výsledku

- Každý nový nebo přegenerovaný sprite si prohlédni (přečti PNG). Automatická kontrola useknutí (`side_cut`, varování při importu) se týká jen tvorů (`facing` nebo `_q`). U rostlin a dekorací useknutý vršek nic nezachytí; tak se do hry dostala rostlina `kelp` s rovně uříznutou špičkou.
- Když se změní poměr stran spritu, změní se i výška ve hře, protože ta se počítá ze šířky. Uprav šířky v datech, která sprite používají (`DECOR` ve `src/game/world.ts`, `width` v `src/game/catalog.ts`), aby zůstala výška.
- Postavy a žraloci koukají doprava, render je otáčí sám.
