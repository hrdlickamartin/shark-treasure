import { OCEAN_ORDER, OCEANS, type OceanId } from '../game/oceans';
import type { DiveResult, PropKind, PropSpec } from '../game/types';
import type { SpriteName } from '../render/spriteAssets';
import type { KitCounts, MaterialCounts } from '../game/gear';
import type { CharacterId, Line } from './characters';
import type { FactionId } from './factions';
import { TIDE_QUESTS } from './tideQuests';
import type { UpgradeId } from './upgrades';

export type QuestCategory = 'main' | 'maya' | 'side' | 'challenge';

export interface QuestItem {
  region: number;
  offset: number;
  lift?: number;
  sprite?: SpriteName;
}

export type QuestGoal =
  | { kind: 'deliver'; prop: PropKind; items: QuestItem[]; label: string }
  | { kind: 'activate'; prop: 'lever' | 'node' | 'echo' | 'scan'; items: QuestItem[]; vault?: QuestItem; label: string }
  | { kind: 'photo'; species: string; label: string }
  | { kind: 'cut'; count: number; label: string }
  | { kind: 'boss'; label: string }
  | { kind: 'chests'; count: number; label: string }
  | { kind: 'reach'; region: number; label: string }
  | { kind: 'choice'; label: string }
  | { kind: 'tide'; count: number; label: string }
  | { kind: 'drone'; count: number; label: string }
  | { kind: 'escape'; label: string }
  | { kind: 'heavy'; count: number; label: string }
  | { kind: 'materials'; count: number; label: string }
  | { kind: 'reputation'; points: number; factions?: number; faction?: FactionId; label: string }
  | { kind: 'craft'; label: string }
  | { kind: 'rifts'; count: number; label: string };

export interface QuestReward {
  money: number;
  xp: number;
  research: number;
  pearls: number;
  upgrade?: { id: UpgradeId; levels: number; label: string };
  flag?: string;
  materials?: MaterialCounts;
  kit?: KitCounts;
  reputation?: { faction: FactionId; amount: number };
}

export interface ChoiceOption {
  id: string;
  label: string;
  result: Line[];
  money?: number;
  research?: number;
  pearls?: number;
  flag?: string;
  needsFlag?: string[];
}

export interface QuestDef {
  id: string;
  ocean: OceanId;
  category: QuestCategory;
  giver: CharacterId;
  title: string;
  brief: string;
  steps: QuestGoal[];
  reward: QuestReward;
  requires?: string[];
  needsFlag?: string;
  chapterEnd?: boolean;
  chapter?: number;
  unlocks?: OceanId;
  briefing?: Line[];
  debrief?: Line[];
  choice?: { prompt: Line[]; options: ChoiceOption[] };
}

export interface QuestState {
  done: boolean;
  progress: number;
  flags: string[];
}

export const CATEGORY_LABEL: Record<QuestCategory, string> = {
  main: 'Hlavní příběh',
  maya: 'Mayiny prosby',
  side: 'Vedlejší příběhy',
  challenge: 'Výzvy',
};

const r = (money: number, xp: number, research: number, pearls = 0, extra: Partial<QuestReward> = {}): QuestReward => ({ money, xp, research, pearls, ...extra });
const fragment = (region: number, offset = 900): QuestGoal => ({ kind: 'deliver', prop: 'fragment', items: [{ region, offset, sprite: 'map_fragment' }], label: 'Najdi fragment a vrať se s ním na loď' });
const echoes = (label: string, items: QuestItem[], vault?: QuestItem): QuestGoal => ({ kind: 'activate', prop: 'echo', items, vault, label });
const item = (region: number, offset: number, sprite: SpriteName, lift?: number): QuestItem => ({ region, offset, sprite, lift });

const MAIN_QUESTS: QuestDef[] = [
  {
    id: 'first_dive',
    ocean: 'caribbean',
    category: 'main',
    giver: 'maya',
    title: 'First Dive',
    brief: 'Loď je tvoje. Než vyrazíš za Eliasovými stopami, ověř vybavení v Coral Garden.',
    steps: [
      { kind: 'deliver', prop: 'artifact', items: [item(0, 380, 'receiver_part'), item(0, 700, 'receiver_part'), item(0, 1020, 'receiver_part')], label: 'Seber 3 součástky přijímače' },
      { kind: 'photo', species: 'fish', label: 'Vyfoť rybu pro katalog' },
      echoes('Prozkoumej sonarový bod', [item(0, 1350, 'icon_sonar', 40)]),
    ],
    reward: r(300, 60, 10),
    briefing: [
      { who: 'maya', text: 'První pravidlo: když něco začne pískat, neznamená to, že to máš praštit kladivem. To je moje práce.' },
      { who: 'maya', text: 'Seber mi tři součástky k přijímači, vyfoť nějakou rybu a mrkni na sonarový bod. Pak se vrať.' },
    ],
    debrief: [
      { who: 'maya', text: 'Značka u sonarového bodu je stejná jako v Eliasově deníku. Neznačí poklad – značí něco, co chtěl, aby někdo našel.' },
    ],
  },
  {
    id: 'familiar_mark',
    ocean: 'caribbean',
    category: 'main',
    giver: 'maya',
    title: 'A Familiar Mark',
    brief: 'Eliasův symbol je vyrytý do útesu v Pirate Bay. Naskenuj ho.',
    requires: ['first_dive'],
    steps: [echoes('Naskenuj Eliasův symbol', [item(1, 500, 'icon_sonar', 50)])],
    reward: r(400, 80, 20),
    debrief: [
      { who: 'maya', text: 'Sken ukazuje kov pod vrakem v zátoce. Elias tam něco schoval.' },
      { who: 'nora', text: 'Abyssal Initiative začala v přístavu vykupovat staré artefakty. Platí podezřele dobře.' },
    ],
  },
  {
    id: 'pirate_bay',
    ocean: 'caribbean',
    category: 'main',
    giver: 'maya',
    title: 'Pirate Bay',
    brief: 'Sonar ukazuje kov pod pirátským vrakem.',
    requires: ['familiar_mark'],
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(1, 1300, 'elias_disk')], label: 'Přines kovový disk z vraku' }],
    reward: r(700, 100, 30),
    briefing: [{ who: 'maya', text: 'Mapa je připravená. Vrak je asi třicet metrů pod tebou. Vezmi světlo – sonar tam ukazuje něco, co se mi nelíbí.' }],
    debrief: [
      { who: 'maya', text: 'Kovový disk se zvláštním symbolem. Starší než celý ostrov, jestli se nepletu.' },
      { who: 'maya', text: 'A sonar chytil další echo. Jenže můj přijímač je na tohle moc slabý.' },
    ],
  },
  {
    id: 'broken_receiver',
    ocean: 'caribbean',
    category: 'maya',
    giver: 'maya',
    title: 'Broken Receiver',
    brief: 'Přijímač je slabý. V Blue Hole leží vrak s náhradní součástkou.',
    requires: ['pirate_bay'],
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(2, 600, 'receiver_part')], label: 'Najdi součástku v Blue Hole' }],
    reward: r(500, 90, 20, 0, { upgrade: { id: 'sonar', levels: 1, label: 'Sonar +1' } }),
    debrief: [{ who: 'maya', text: 'Hotovo. Sonar teď slyší i to, co šeptá. Teď najdi ty ozvěny.' }],
  },
  {
    id: 'three_echoes',
    ocean: 'caribbean',
    category: 'main',
    giver: 'maya',
    title: 'Three Echoes',
    brief: 'Signál se ozývá ze tří míst. Najdi je všechna.',
    requires: ['broken_receiver'],
    steps: [echoes('Aktivuj 3 sonarové body', [item(2, 400, 'icon_sonar', 60), item(3, 900, 'icon_sonar', 70), item(4, 500, 'icon_sonar', 60)])],
    reward: r(900, 130, 30),
    debrief: [{ who: 'maya', text: 'Všechny tři ozvěny ukazují do jednoho bodu. Hluboko pod Blue Hole.' }],
  },
  {
    id: 'blue_hole',
    ocean: 'caribbean',
    category: 'main',
    giver: 'maya',
    title: 'Echo Beneath the Blue',
    brief: 'Signál se opakuje každých třicet sekund. Eliasův deník obsahuje stejnou frekvenci, ale poslední stránka chybí.',
    requires: ['three_echoes'],
    steps: [echoes('Najdi tři sonarové značky a otevři komoru', [item(2, 250, 'icon_sonar', 90), item(2, 850, 'icon_sonar', 50), item(2, 1450, 'icon_sonar', 80)], item(2, 1750, 'elias_disk'))],
    reward: r(1200, 160, 40, 1),
    briefing: [
      { who: 'maya', text: 'Signál se opakuje každých třicet sekund. To není náhodné. Někdo – nebo něco – chce, abychom to našli.' },
      { who: 'maya', text: 'Třetí značka je za stěnou. Sonar mi ale ukazuje pohyb na druhé straně. Opatrně.' },
    ],
    debrief: [
      { who: 'maya', text: 'To je jeho symbol. Elias tu byl. A podle tohohle záznamu… nebyl sám.' },
      { who: 'maya', text: 'V pozadí záznamu… to jméno. Diego. Tohle je můj bratr. Jeho expedice zmizela před šesti lety.' },
    ],
  },
  {
    id: 'the_buyer',
    ocean: 'caribbean',
    category: 'main',
    giver: 'voss',
    title: 'The Buyer',
    brief: 'Někdo nabízí za disk víc, než stojí celá loď.',
    requires: ['blue_hole'],
    steps: [{ kind: 'choice', label: 'Rozhodni, co s diskem' }],
    reward: r(0, 120, 0),
    choice: {
      prompt: [
        { who: 'voss', text: 'Dobrý den. Selene Voss, Abyssal Initiative. Ten disk patří do laboratoře, ne do kajuty. Nabízím vám za něj velmi slušnou sumu.' },
        { who: 'maya', text: 'Její plán zní skoro rozumně. A právě to mě děsí.' },
      ],
      options: [
        { id: 'sell', label: 'Prodat disk Voss (+3 000 $)', money: 3000, flag: 'sold_disk', result: [{ who: 'voss', text: 'Moudré rozhodnutí. Oceán nám dává život – je načase ho začít řídit.' }, { who: 'maya', text: 'Doufám, že víš, co děláš.' }] },
        { id: 'research', label: 'Nechat ho Mayu prozkoumat (+80 dat)', research: 80, flag: 'studied_disk', result: [{ who: 'maya', text: 'Díky. Na disku jsou souřadnice. Míří na sever – hodně na sever.' }] },
        { id: 'hide', label: 'Ukrýt ho v Eliasově skrýši (+2 perly)', pearls: 2, flag: 'hid_disk', result: [{ who: 'nora', text: 'Elias by udělal totéž. Ve skrýši byly i dvě perly – asi pro tebe.' }] },
      ],
    },
  },
  {
    id: 'beyond_reef',
    ocean: 'caribbean',
    category: 'main',
    giver: 'maya',
    title: 'Beyond the Reef',
    brief: 'Disk ukazuje severní souřadnice. Poslední kus mapy čeká ve vraku Sunken Galleon.',
    requires: ['the_buyer'],
    chapterEnd: true,
    steps: [fragment(4)],
    reward: r(1500, 200, 30, 2),
    debrief: [
      { who: 'maya', text: 'Souřadnice sedí: polární expedice. Ta, o které nikdo nechce mluvit.' },
      { who: 'maya', text: 'Diego tam byl. Já to vím. Poplujeme do Arktidy?' },
    ],
  },
  {
    id: 'car_rescue',
    ocean: 'caribbean',
    category: 'side',
    giver: 'nora',
    title: 'SOS z Pirate Bay',
    brief: 'Potápěč z Port Royal uvízl v Pirate Bay bez kyslíku.',
    requires: ['first_dive'],
    steps: [{ kind: 'deliver', prop: 'survivor', items: [{ region: 1, offset: 1100, lift: 60 }], label: 'Přiveď potápěče na loď' }],
    reward: r(700, 100, 10),
    briefing: [{ who: 'nora', text: 'Jeden z mých chlapců je dole v zátoce a nehlásí se. Přiveď ho – a budeš mít u mě dobré slovo.' }],
    debrief: [{ who: 'nora', text: 'Dlužím ti. Elias by byl pyšný.' }],
  },
  {
    id: 'car_map',
    ocean: 'caribbean',
    category: 'side',
    giver: 'nora',
    title: "The Captain's Map",
    brief: 'Pirátský kapitán roztrhal mapu na tři útržky.',
    requires: ['pirate_bay'],
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(1, 700, 'map_fragment'), item(2, 1200, 'map_fragment'), item(3, 600, 'map_fragment')], label: 'Najdi 3 útržky mapy' }],
    reward: r(1200, 120, 15, 1),
  },
  {
    id: 'rook_challenge',
    ocean: 'caribbean',
    category: 'challenge',
    giver: 'rook',
    title: 'Rook Challenge',
    brief: 'Rook tvrdí, že víc pokladů za jeden ponor nikdo nevynese.',
    requires: ['pirate_bay'],
    steps: [{ kind: 'chests', count: 3, label: 'Dones 3 truhlice v jednom ponoru' }],
    reward: r(1500, 150, 0, 0, { flag: 'rook_respect' }),
    briefing: [{ who: 'rook', text: 'Ty jsi ten nový dědic? Tři truhly za jeden ponor. Já to dám před snídaní. Ty?' }],
    debrief: [{ who: 'rook', text: 'Hm. Nečekal jsem to. Dobře, nováčku – máš můj respekt. Zatím.' }],
  },
  {
    id: 'car_boss',
    ocean: 'caribbean',
    category: 'challenge',
    giver: 'nora',
    title: 'Stín Megalodona',
    brief: 'V Legendary Cave hlídá Megalodon starověký poklad.',
    requires: ['three_echoes'],
    steps: [{ kind: 'boss', label: 'Ukradni poklad Megalodona' }],
    reward: r(2000, 250, 30, 2),
  },
  {
    id: 'arc_station',
    ocean: 'arctic',
    category: 'main',
    giver: 'maya',
    title: 'Research Station 9',
    brief: 'Opuštěná výzkumná stanice skrývá plány termoobleku.',
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(3, 1400, 'icon_thermal')], label: 'Přines plány termoobleku ze stanice' }],
    reward: r(1200, 150, 30, 0, { upgrade: { id: 'thermal', levels: 1, label: 'Termooblek +1' } }),
    briefing: [{ who: 'maya', text: 'Bez termoobleku tam dole zmrzneš za pár minut. Stanice 9 měla vlastní plány. Přines mi je a ušiju ti něco teplejšího.' }],
    debrief: [{ who: 'maya', text: 'Hotovo. Teď vydržíš v ledové vodě mnohem déle. A ve stanici je ještě něco – nouzový signál.' }],
  },
  {
    id: 'arc_trail',
    ocean: 'arctic',
    category: 'main',
    giver: 'maya',
    title: 'Cold Trail',
    brief: 'Záchranný signál pod ledem u Polar Wreck.',
    requires: ['arc_station'],
    steps: [{ kind: 'deliver', prop: 'survivor', items: [{ region: 2, offset: 1000, lift: 50 }], label: 'Zachraň vědce u Polar Wreck' }],
    reward: r(1800, 180, 25, 1),
    debrief: [
      { who: 'maya', text: 'Je v šoku, ale žije. Pořád opakuje jedno jméno… Diego.' },
      { who: 'maya', text: 'Prý ten signál objevil Diego. A někdo jeho nález utajil.' },
    ],
  },
  {
    id: 'diego_log',
    ocean: 'arctic',
    category: 'maya',
    giver: 'maya',
    title: 'Diegův deník',
    brief: 'Vědec říká, že Diego nechal v Ice Cavern výzkumný modul.',
    requires: ['arc_trail'],
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(4, 800, 'research_module')], label: 'Najdi Diegův výzkumný modul' }],
    reward: r(1000, 200, 40, 0, { flag: 'diego_1' }),
    debrief: [{ who: 'maya', text: 'To je jeho písmo. A fotka… stojí vedle loga Abyssal Initiative. Diego pro ně pracoval?' }],
  },
  {
    id: 'frozen_secrets',
    ocean: 'arctic',
    category: 'main',
    giver: 'maya',
    title: 'Frozen Secrets',
    brief: 'Druhý fragment Srdce oceánu leží u Research Station 9.',
    requires: ['arc_trail'],
    chapterEnd: true,
    steps: [fragment(3, 700)],
    reward: r(2500, 250, 40, 2),
    debrief: [
      { who: 'maya', text: 'Fragmenty mají řecké znaky. Znám jednoho profesora, který by je přečetl.' },
      { who: 'maya', text: 'Středomoří. Idris Bell. A připrav se – je trochu… zapálený.' },
    ],
  },
  {
    id: 'arc_photo',
    ocean: 'arctic',
    category: 'maya',
    giver: 'maya',
    title: "A Giant's Shadow",
    brief: 'Tvor v Leviathan Passage není v žádném katalogu.',
    steps: [{ kind: 'photo', species: 'leviathan', label: 'Vyfoť leviatana' }],
    reward: r(2500, 250, 60, 2),
    briefing: [{ who: 'maya', text: 'Tvor není v katalogu. Vyfotíš ho? Z bezpečné vzdálenosti. Prosím.' }],
  },
  {
    id: 'port_workshop',
    ocean: 'arctic',
    category: 'side',
    giver: 'nora',
    title: 'Dílna v přístavu',
    brief: 'Maya potřebuje materiál ze dna, aby mohla v dílně postavit první výbavu.',
    steps: [
      { kind: 'materials', count: 2, label: 'Vylov v jednom ponoru 2 materiály' },
      { kind: 'craft', label: 'Vyrob cokoli v dílně (Přístav → Dílna)' },
    ],
    reward: r(600, 100, 10, 0, { materials: { scrap: 2, rope: 2 } }),
    debrief: [{ who: 'maya', text: 'Funguje! Z každého ponoru mi noste, co najdete na dně. Moduly na loď stojí za to.' }],
  },
  {
    id: 'arc_buoys',
    ocean: 'arctic',
    category: 'side',
    giver: 'nora',
    title: 'Ztracené bóje',
    brief: 'Rybáři z Ice Harbor přišli o tři signální bóje, které hlídají trhliny v ledu.',
    requires: ['arc_station'],
    steps: [echoes('Najdi sonarem 3 bóje', [item(0, 900, 'icon_sonar', 40), item(1, 500, 'icon_sonar', 50), item(1, 1300, 'icon_sonar', 60)])],
    reward: r(900, 120, 20),
    briefing: [{ who: 'nora', text: 'Bez bójí rybáři nevědí, kde led praská. Najdi je sonarem, víc nechci.' }],
    debrief: [{ who: 'nora', text: 'Bóje zase pípají. V přístavu se o tobě začíná mluvit.' }],
  },
  {
    id: 'arc_orca',
    ocean: 'arctic',
    category: 'maya',
    giver: 'maya',
    title: 'Kosatky pod ledem',
    brief: 'Kosatky ve Frozen Shelf loví ve skupině. Maya chce vědět, čeho se bojí.',
    requires: ['arc_station'],
    steps: [{ kind: 'photo', species: 'orca', label: 'Vyfoť kosatku' }],
    reward: r(800, 120, 35, 0, { upgrade: { id: 'harpoon', levels: 1, label: 'Harpuna +1' } }),
    briefing: [{ who: 'maya', text: 'Kosatky se vyhýbají Leviathan Passage. Vyfoť mi jednu a já ti mezitím upravím harpunu – budeš ji tam potřebovat.' }],
    debrief: [{ who: 'maya', text: 'Harpuna má silnější pružinu. Leviatana nezabiješ hned, ale na chvíli ho unavíš. Pak rychle k pokladu.' }],
  },
  {
    id: 'arc_supplies',
    ocean: 'arctic',
    category: 'side',
    giver: 'nora',
    title: 'Lékárny stanice',
    brief: 'Zachráněný vědec říká, že stanice měla pod ledem dvě nouzové lékárny.',
    requires: ['arc_trail'],
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(2, 500, 'icon_medkit'), item(3, 1300, 'icon_medkit')], label: 'Přines 2 lékárny ze stanice' }],
    reward: r(1400, 150, 20, 1),
    briefing: [{ who: 'nora', text: 'Ten vědec potřebuje léky a my taky. Dvě lékárny, jedna u vraku, druhá za stanicí.' }],
    debrief: [{ who: 'nora', text: 'Vědec už mluví celými větami. A pořád o Diegovi.' }],
  },
  {
    id: 'arc_haul',
    ocean: 'arctic',
    category: 'challenge',
    giver: 'rook',
    title: 'Polární kořist',
    brief: 'Rook sází, že v ledové vodě nikdo nevynese tři truhly najednou.',
    requires: ['arc_trail'],
    steps: [{ kind: 'chests', count: 3, label: 'Vynes 3 truhly v jednom ponoru' }],
    reward: r(1800, 160, 10, 1),
    briefing: [{ who: 'rook', text: 'V Karibiku to umí každý. Tady ti zmrznou prsty dřív, než uneseš třetí truhlu.' }],
    debrief: [{ who: 'rook', text: 'Dobře. Sázka je tvoje. Ale příště to zkus s leviatanem za zády.' }],
  },
  {
    id: 'idris_inscriptions',
    ocean: 'mediterranean',
    category: 'main',
    giver: 'idris',
    title: 'Nápisy pod hladinou',
    brief: 'Idris potřebuje naskenovat tři nápisy, aby přečetl znaky na fragmentech.',
    steps: [echoes('Naskenuj 3 nápisy', [item(0, 300, 'icon_sonar', 40), item(3, 600, 'icon_sonar', 50), item(4, 1100, 'icon_sonar', 60)])],
    reward: r(2000, 220, 60),
    briefing: [
      { who: 'idris', text: 'Tyhle znaky nejsou řecké. Jsou starší. Řekové je jen opisovali.' },
      { who: 'idris', text: 'Naskenujte mi tři nápisy a řeknu vám, co ty fragmenty doopravdy jsou.' },
    ],
    debrief: [{ who: 'idris', text: 'Síť. Starověká síť zařízení napříč oceány. A fragmenty jsou klíče.' }],
  },
  {
    id: 'rook_map',
    ocean: 'mediterranean',
    category: 'challenge',
    giver: 'rook',
    title: "Rook's Map",
    brief: 'Rook ukradl Idrisovu mapu – a uvízl s ní u Roman Fleet.',
    requires: ['idris_inscriptions'],
    steps: [{ kind: 'deliver', prop: 'survivor', items: [{ region: 2, offset: 1200, lift: 60 }], label: 'Zachraň Rooka u Roman Fleet' }],
    reward: r(1500, 200, 20, 0, { flag: 'rook_saved' }),
    briefing: [{ who: 'maya', text: 'Rook ukradl Idrisovu mapu. A teď volá o pomoc z flotily vraků. Ironie, co?' }],
    debrief: [{ who: 'rook', text: 'Dobře, dobře. Ta mapa byla chybná a ty jsi mi zachránil krk. Dlužím ti.' }],
  },
  {
    id: 'med_lock',
    ocean: 'mediterranean',
    category: 'main',
    giver: 'idris',
    title: 'Ancient Lock',
    brief: 'Chrám Poseidonův skrývá čtyři páky, které otevírají Kyklopovu klenotnici.',
    requires: ['idris_inscriptions'],
    steps: [{ kind: 'activate', prop: 'lever', items: [{ region: 4, offset: 250 }, { region: 4, offset: 750 }, { region: 4, offset: 1250 }, { region: 4, offset: 1700 }], vault: { region: 5, offset: 900 }, label: 'Aktivuj 4 páky a vynes poklad z klenotnice' }],
    reward: r(4000, 300, 50, 3),
    debrief: [
      { who: 'voss', text: 'Působivé. Idris Bell vám jistě namluvil, že ta zařízení jsou nebezpečná. Já vím, že jsou nutná.' },
      { who: 'voss', text: 'Oceán nám dává život. A přesto ho necháváme neprozkoumaný, neřízený a nevyužitý. To se musí změnit.' },
      { who: 'maya', text: 'Volala přes náš kanál. Takže nás sleduje. Skvělé.' },
    ],
  },
  {
    id: 'diego_cipher',
    ocean: 'mediterranean',
    category: 'maya',
    giver: 'maya',
    title: 'Šifrovaná poznámka',
    brief: 'V klenotnici byla poznámka Diegovým kódem.',
    requires: ['med_lock', 'diego_log'],
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(5, 400, 'icon_story')], label: 'Najdi zbytek Diegovy poznámky v Cyclops Vault' }],
    reward: r(1500, 200, 50, 0, { flag: 'diego_2' }),
    debrief: [{ who: 'maya', text: 'Rozluštila jsem to. Jedno slovo: Atlantida. Diego tam chtěl jít. Nebo už tam byl.' }],
  },
  {
    id: 'med_amphora',
    ocean: 'mediterranean',
    category: 'side',
    giver: 'idris',
    title: 'Amphora Fields',
    brief: 'Čtyři neporušené amfory. Muzeum je chce – místní rybáři taky.',
    steps: [
      { kind: 'deliver', prop: 'artifact', items: [300, 700, 1100, 1500].map((offset) => item(1, offset, 'amphora')), label: 'Vylov 4 amfory' },
      { kind: 'choice', label: 'Rozhodni, komu je dáš' },
    ],
    reward: r(500, 200, 20),
    choice: {
      prompt: [
        { who: 'idris', text: 'Muzeum v Athénách zaplatí. Ale rybáři tvrdí, že amfory patří jejich předkům a chtějí je zpět.' },
        { who: 'maya', text: 'Tohle je tvoje rozhodnutí. Já bych… asi poslouchala rybáře.' },
      ],
      options: [
        { id: 'museum', label: 'Muzeu (+3 000 $)', money: 3000, result: [{ who: 'idris', text: 'Budou v bezpečí. A celý svět je uvidí.' }] },
        { id: 'locals', label: 'Místním (+2 perly)', pearls: 2, flag: 'helped_med', result: [{ who: 'maya', text: 'Viděl jsi, jak se ten starý rybář usmál? Tohle je odměna.' }] },
      ],
    },
  },
  {
    id: 'rook_deal',
    ocean: 'mediterranean',
    category: 'challenge',
    giver: 'rook',
    title: 'Artifact Deal',
    brief: 'Rook našel fragment zařízení a chce ho prodat Voss.',
    requires: ['rook_map'],
    steps: [{ kind: 'choice', label: 'Přesvědč Rooka' }],
    reward: r(0, 200, 0),
    choice: {
      prompt: [{ who: 'rook', text: 'Voss platí třikrát víc než kdokoli jiný. Dej mi jeden důvod, proč bych jí to neměl prodat.' }],
      options: [
        { id: 'respect', label: 'Připomenout výzvu i záchranu', needsFlag: ['rook_respect', 'rook_saved'], flag: 'rook_ally', result: [{ who: 'rook', text: 'Fajn. Ty bys to neprodal. Tak to neprodám ani já. Ale jestli mě zklameš…' }] },
        { id: 'buy', label: 'Odkoupit ho (−5 000 $)', money: -5000, flag: 'rook_ally', result: [{ who: 'rook', text: 'Obchod je obchod. A ty aspoň víš, co s tím.' }] },
        { id: 'leave', label: 'Nechat ho jít', result: [{ who: 'maya', text: 'Tak a Voss má další kus. Doufám, že to nebudeme litovat.' }] },
      ],
    },
  },
  {
    id: 'ancient_med',
    ocean: 'mediterranean',
    category: 'main',
    giver: 'idris',
    title: 'Ancient Mediterranean',
    brief: 'Třetí fragment leží u starověkého majáku.',
    requires: ['med_lock'],
    chapterEnd: true,
    steps: [fragment(3)],
    reward: r(3500, 300, 50, 3),
    debrief: [
      { who: 'idris', text: 'Měl jsem pravdu a přál bych si, abych neměl. Voss právě aktivovala první zařízení v Tichomoří.' },
      { who: 'maya', text: 'Proudy se mění. Musíme tam.' },
    ],
  },
  {
    id: 'pac_anomaly',
    ocean: 'pacific',
    category: 'main',
    giver: 'maya',
    title: 'Anomálie',
    brief: 'Aktivované zařízení mate velryby a výzkumníci uvízli u Storm Island.',
    steps: [
      { kind: 'photo', species: 'whale', label: 'Zdokumentuj zmatené velryby' },
      { kind: 'deliver', prop: 'survivor', items: [{ region: 3, offset: 800, lift: 60 }], label: 'Zachraň výzkumníka u Storm Island' },
    ],
    reward: r(4000, 350, 80, 2, { flag: 'helped_pacific' }),
    briefing: [{ who: 'maya', text: 'Migrační trasy se zbláznily. Můžeme jít rovnou po fragmentu… nebo nejdřív pomoct. Já hlasuju pro pomoc.' }],
    debrief: [{ who: 'maya', text: 'Díky. Tohle je ten důvod, proč jsem se přidala. Nejen poklady.' }],
  },
  {
    id: 'diego_module',
    ocean: 'pacific',
    category: 'maya',
    giver: 'maya',
    title: 'Důkaz života',
    brief: 'Výzkumník viděl v Pearl Caverns modul s Diegovou značkou.',
    requires: ['diego_cipher'],
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(5, 1000, 'research_module')], label: 'Vynes Diegův modul z Pearl Caverns' }],
    reward: r(2500, 300, 60, 1, { flag: 'diego_3' }),
    debrief: [{ who: 'maya', text: 'Datum v modulu… je z minulého měsíce. On žije. Diego žije!' }],
  },
  {
    id: 'pac_pearls',
    ocean: 'pacific',
    category: 'side',
    giver: 'nora',
    title: 'Pearl Caverns',
    brief: 'Klenotníci zaplatí za tři obří perly.',
    steps: [{ kind: 'deliver', prop: 'artifact', items: [400, 1000, 1600].map((offset) => item(5, offset, 'icon_pearl')), label: 'Vylov 3 obří perly' }],
    reward: r(4500, 280, 30, 2),
  },
  {
    id: 'pacific_giants',
    ocean: 'pacific',
    category: 'main',
    giver: 'maya',
    title: 'Pacific Giants',
    brief: 'Čtvrtý fragment reaguje na teplo průduchů ve Volcanic Reef.',
    requires: ['pac_anomaly'],
    chapterEnd: true,
    steps: [fragment(4)],
    reward: r(4500, 350, 60, 3),
    debrief: [{ who: 'idris', text: 'Čtyři fragmenty, jedna mapa. A ta mapa ukazuje polohu ztraceného města.' }],
  },
  {
    id: 'atl_archives',
    ocean: 'atlantis',
    category: 'main',
    giver: 'idris',
    title: 'The Archives',
    brief: 'Archivy Atlantidy prozradí, co Srdce oceánu doopravdy dělá.',
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(1, 1000, 'icon_story')], label: 'Vynes desku z Archivů' }],
    reward: r(5000, 400, 120, 2),
    briefing: [{ who: 'idris', text: 'Celý život jsem snil, že to uvidím. A teď… mám strach, co se dozvím.' }],
    debrief: [
      { who: 'idris', text: 'Srdce oceánu stabilizuje celou síť. Neřízená aktivace by byla katastrofa.' },
      { who: 'maya', text: 'A přesně to Voss chystá.' },
    ],
  },
  {
    id: 'atl_nodes',
    ocean: 'atlantis',
    category: 'side',
    giver: 'idris',
    title: 'Energy Gardens',
    brief: 'Strážce nepustí nikoho do Heart Chamber, dokud nezapojíš energetické uzly.',
    requires: ['atl_archives'],
    steps: [{ kind: 'activate', prop: 'node', items: [{ region: 2, offset: 300, lift: 80 }, { region: 2, offset: 800, lift: 120 }, { region: 2, offset: 1300, lift: 90 }, { region: 2, offset: 1750, lift: 130 }], vault: { region: 5, offset: 900 }, label: 'Aktivuj 4 uzly a vynes poklad z Heart Chamber' }],
    reward: r(8000, 450, 100, 4, { flag: 'ancient_key' }),
    debrief: [{ who: 'idris', text: 'Prastarý klíč. S ním otevřeme cesty, kam se nikdo nedostal.' }],
  },
  {
    id: 'lost_city',
    ocean: 'atlantis',
    category: 'main',
    giver: 'idris',
    title: 'The Lost City',
    brief: 'Pátý fragment leží v Royal District.',
    requires: ['atl_archives'],
    chapterEnd: true,
    steps: [fragment(3)],
    reward: r(5500, 450, 80, 4),
    debrief: [
      { who: 'maya', text: 'Počkej. V záznamu z Royal District je zpráva. Je pro mě.' },
      { who: 'diego', text: 'Mayo, jestli tohle slyšíš… jsem v Propasti. Voss nesmí dostat poslední klíč.' },
    ],
  },
  {
    id: 'aby_base',
    ocean: 'abyss',
    category: 'main',
    giver: 'maya',
    title: 'Základna Initiative',
    brief: 'Někde v Abyssal Station má Voss tajnou základnu.',
    steps: [echoes('Naskenuj 2 terminály základny', [item(3, 400, 'icon_research', 60), item(3, 1300, 'icon_research', 70)])],
    reward: r(6000, 450, 100, 2),
    briefing: [{ who: 'maya', text: 'Propast vyžaduje sonar, světlo a tlakový oblek. A odvahu. Hlavně se vrať.' }],
    debrief: [{ who: 'maya', text: 'Terminály patří Initiative. Diego tu byl. Nedávno.' }],
  },
  {
    id: 'aby_signal',
    ocean: 'abyss',
    category: 'maya',
    giver: 'maya',
    title: 'Lost Signal',
    brief: 'Z Echo Chamber vysílá Diegův nouzový maják.',
    requires: ['aby_base', 'diego_module'],
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(2, 1100, 'research_module')], label: 'Najdi Diegův maják v Echo Chamber' }],
    reward: r(5000, 450, 90, 3, { flag: 'diego_4' }),
    debrief: [
      { who: 'diego', text: 'Mayo… Voss ignoruje pojistky. Pokusil jsem se ji zastavit. Teď mě hledá. Je na Hřbitově lodí.' },
      { who: 'maya', text: 'Tohle je jeho hlas. Slyšela jsem ho naposledy před šesti lety. Pusť to znovu. Prosím.' },
    ],
  },
  {
    id: 'aby_photo',
    ocean: 'abyss',
    category: 'maya',
    giver: 'maya',
    title: 'Unknown Nest',
    brief: 'V Unknown Nest žije něco, co nikdo nevyfotil.',
    steps: [{ kind: 'photo', species: 'abyssal', label: 'Vyfoť tvora z hlubin' }],
    reward: r(9000, 500, 150, 4),
  },
  {
    id: 'the_abyss',
    ocean: 'abyss',
    category: 'main',
    giver: 'maya',
    title: 'The Abyss',
    brief: 'Šestý fragment odvezli do Abyssal Station.',
    requires: ['aby_base'],
    chapterEnd: true,
    steps: [fragment(3, 900)],
    reward: r(7000, 500, 90, 5),
    debrief: [{ who: 'maya', text: 'Diego varoval, že Voss má poslední fragment. A Eliasova loď leží na Hřbitově lodí.' }],
  },
  {
    id: 'gy_elias',
    ocean: 'graveyard',
    category: 'main',
    giver: 'maya',
    title: 'Eliasova loď',
    brief: 'Mezi vraky leží loď tvého dědečka – i s jeho posledním deníkem.',
    steps: [{ kind: 'deliver', prop: 'artifact', items: [item(2, 900, 'icon_story')], label: 'Vynes Eliasův deník z Ghost Ship' }],
    reward: r(7000, 500, 80, 3, { upgrade: { id: 'tank', levels: 1, label: 'Eliasova legendární nádrž (+1)' }, flag: 'elias_truth' }),
    debrief: [
      { who: 'elias', text: 'Kdo tohle čte, je z mé krve. Fragmenty jsem ukryl, protože jsem viděl, co síť dokáže. Nebyl jsem hrdina. Byl jsem vyděšený.' },
      { who: 'maya', text: 'Neukrýval je ze strachu. Ukrýval je, aby měl někdo jiný šanci rozhodnout líp.' },
    ],
  },
  {
    id: 'gy_diego',
    ocean: 'graveyard',
    category: 'maya',
    giver: 'maya',
    title: 'Diego',
    brief: 'Diego se skrývá u Lost Expedition.',
    requires: ['gy_elias', 'aby_signal'],
    steps: [
      { kind: 'deliver', prop: 'survivor', items: [{ region: 3, offset: 1200, lift: 60 }], label: 'Přiveď Diega na loď' },
      { kind: 'choice', label: 'Rozhodni o Diegovi' },
    ],
    reward: r(5000, 600, 100, 3),
    choice: {
      prompt: [
        { who: 'diego', text: 'Pracoval jsem pro Voss. Věřil jsem, že ta technologie obnoví ekosystémy. Pak jsem viděl, že pojistky vypnula.' },
        { who: 'maya', text: 'Šest let, Diego. Šest let jsem nevěděla, jestli žiješ.' },
        { who: 'diego', text: 'Vím. Můžu to napravit. Znám bezpečný způsob, jak síť obnovit. Jen mi musíte věřit.' },
      ],
      options: [
        { id: 'help', label: 'Pomoct mu napravit chybu', flag: 'diego_saved', result: [{ who: 'diego', text: 'Děkuju. Ve finále budu u vás.' }, { who: 'maya', text: 'Vítej doma, brácho.' }] },
        { id: 'refuse', label: 'Nechat ho jít vlastní cestou', result: [{ who: 'maya', text: 'Možná máš pravdu. Ale bolí to.' }] },
      ],
    },
  },
  {
    id: 'gy_vault',
    ocean: 'graveyard',
    category: 'side',
    giver: 'nora',
    title: "Captain's Vault",
    brief: 'Rozřízni řezákem tři zapečetěné truhly z vraků.',
    steps: [{ kind: 'cut', count: 3, label: 'Otevři 3 zapečetěné truhly' }],
    reward: r(9000, 500, 60, 3),
  },
  {
    id: 'ship_graveyard',
    ocean: 'graveyard',
    category: 'main',
    giver: 'maya',
    title: 'Ship Graveyard',
    brief: 'Sedmý fragment leží u Lost Expedition.',
    requires: ['gy_elias'],
    chapterEnd: true,
    steps: [fragment(3, 600)],
    reward: r(9000, 600, 110, 6),
    debrief: [{ who: 'maya', text: 'Voss spustila finální expedici do vulkanických hlubin. Síť se rozpadá. Teď nebo nikdy.' }],
  },
  {
    id: 'vol_obsidian',
    ocean: 'volcanic',
    category: 'side',
    giver: 'idris',
    title: 'Obsidian Cavern',
    brief: 'Vulkanologové potřebují čtyři vzorky obsidiánu.',
    steps: [{ kind: 'deliver', prop: 'artifact', items: [300, 800, 1300, 1700].map((offset) => item(2, offset, 'cave_crystal')), label: 'Vylov 4 vzorky obsidiánu' }],
    reward: r(10000, 600, 150, 4),
  },
  {
    id: 'rook_final',
    ocean: 'volcanic',
    category: 'challenge',
    giver: 'rook',
    title: 'Final Rival',
    brief: 'Rook chce pomoct – po svém. Závod k Core Rift.',
    needsFlag: 'rook_ally',
    steps: [
      { kind: 'reach', region: 3, label: 'Dopluj až do Core Rift' },
      { kind: 'chests', count: 2, label: 'Vynes 2 truhly v jednom ponoru' },
    ],
    reward: r(6000, 500, 50, 3, { flag: 'rook_final' }),
    briefing: [{ who: 'rook', text: 'Poslední závod, parťáku. Kdo dřív u Core Rift. A pak ti pomůžu s tou šílenou ženskou.' }],
    debrief: [{ who: 'rook', text: 'Dobře, vyhrál jsi. Ve finále se na mě můžeš spolehnout.' }],
  },
  {
    id: 'heart_ocean',
    ocean: 'volcanic',
    category: 'main',
    giver: 'maya',
    title: 'Heart of the Ocean',
    brief: 'Finální expedice. Poslední fragment čeká ve Final Descent.',
    chapterEnd: true,
    steps: [fragment(4)],
    reward: r(15000, 1000, 150, 10),
    briefing: [{ who: 'maya', text: 'Tohle je ono. Ať se dole stane cokoli… jsem ráda, že jsem na té lodi s tebou.' }],
  },
];

export const QUESTS: QuestDef[] = [...MAIN_QUESTS, ...TIDE_QUESTS];

export const CHAPTER_COUNT = OCEAN_ORDER.length;

export const TIDE_FIRST_CHAPTER = 9;
export const TIDE_LAST_CHAPTER = 12;

export const chapterName = (chapter: number): string => `kapitoly ${chapter} (${OCEANS[OCEAN_ORDER[Math.max(0, Math.min(OCEAN_ORDER.length, chapter) - 1)]].czech})`;

export const chapterOf = (quest: QuestDef): number => (quest.chapter ? quest.chapter - 1 : OCEAN_ORDER.indexOf(quest.ocean));

export const chapterEndFor = (chapter: number): QuestDef | undefined => QUESTS.find((q) => q.chapterEnd && chapterOf(q) === chapter);

export const EMPTY_QUEST: QuestState = { done: false, progress: 0, flags: [] };

export const questById = (id: string): QuestDef | undefined => QUESTS.find((q) => q.id === id);

export const stepKey = (quest: string, step: number) => `${quest}#${step}`;
const itemKey = (quest: string, step: number, i: number) => `${quest}:${step}:${i}`;
const vaultKey = (quest: string, step: number) => `${quest}:${step}:vault`;

export function questTarget(quest: QuestDef): number {
  return quest.steps.length;
}

export function itemX(ocean: OceanId, item: QuestItem): number {
  return OCEANS[ocean].regions[item.region].start + item.offset;
}

export function questAvailable(quest: QuestDef, quests: Record<string, QuestState>, oceans: OceanId[], flags: string[]): boolean {
  if (!oceans.includes(quest.ocean)) return false;
  if (quest.requires && !quest.requires.every((id) => quests[id]?.done)) return false;
  if (quest.needsFlag && !flags.includes(quest.needsFlag)) return false;
  return true;
}

export function activeQuests(quests: Record<string, QuestState>, oceans: OceanId[], flags: string[] = []): QuestDef[] {
  return QUESTS.filter((q) => !quests[q.id]?.done && questAvailable(q, quests, oceans, flags));
}

const CATEGORY_ORDER: QuestCategory[] = ['main', 'maya', 'side', 'challenge'];

export interface Objective {
  quest: QuestDef;
  step: number;
  goal: QuestGoal;
}

export function currentObjective(quests: Record<string, QuestState>, oceans: OceanId[], flags: string[], ocean: OceanId): Objective | null {
  const candidates = activeQuests(quests, oceans, flags)
    .filter((q) => q.ocean === ocean)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  for (const quest of candidates) {
    const state = quests[quest.id] ?? EMPTY_QUEST;
    const step = quest.steps.findIndex((goal, s) => goal.kind !== 'choice' && !state.flags.includes(stepKey(quest.id, s)));
    if (step >= 0) return { quest, step, goal: quest.steps[step] };
  }
  return null;
}

export function objectiveHowTo(goal: QuestGoal): string | null {
  if (goal.kind === 'photo') return 'pod vodou zapni foťák a vyfoť zblízka';
  if (goal.kind === 'chests') return 'doruč truhlice na loď';
  return null;
}

export const objectivePropPrefix = (objective: Objective) => `${objective.quest.id}:${objective.step}:`;

export function stepsDone(quest: QuestDef, state: QuestState): number {
  return quest.steps.filter((_, i) => state.flags.includes(stepKey(quest.id, i))).length;
}

export function questProps(quests: Record<string, QuestState>, oceans: OceanId[], flags: string[], ocean: OceanId): PropSpec[] {
  const specs: PropSpec[] = [];
  for (const quest of activeQuests(quests, oceans, flags)) {
    if (quest.ocean !== ocean) continue;
    const state = quests[quest.id] ?? EMPTY_QUEST;
    quest.steps.forEach((goal, s) => {
      if (state.flags.includes(stepKey(quest.id, s))) return;
      if (goal.kind === 'deliver') {
        goal.items.forEach((it, i) => {
          const id = itemKey(quest.id, s, i);
          if (state.flags.includes(id)) return;
          specs.push({ id, kind: goal.prop, x: itemX(ocean, it), lift: it.lift ?? 24, quest: quest.id, sprite: it.sprite ?? null, active: false, value: 0 });
          if (goal.prop === 'shard') specs.push({ id: `${id}:rift`, kind: 'rift', x: itemX(ocean, it), lift: it.lift ?? 24, quest: quest.id, sprite: null, active: true, value: 0 });
        });
      } else if (goal.kind === 'activate') {
        goal.items.forEach((it, i) => {
          const id = itemKey(quest.id, s, i);
          specs.push({ id, kind: goal.prop, x: itemX(ocean, it), lift: it.lift ?? 26, quest: quest.id, sprite: it.sprite ?? null, active: state.flags.includes(id), value: 0 });
        });
        if (goal.vault) {
          const open = goal.items.every((_, i) => state.flags.includes(itemKey(quest.id, s, i)));
          specs.push({ id: vaultKey(quest.id, s), kind: 'vault', x: itemX(ocean, goal.vault), lift: 30, quest: quest.id, sprite: goal.vault.sprite ?? null, active: open, value: 0 });
          if (goal.prop === 'node') specs.push({ id: `${quest.id}:${s}:guardian`, kind: 'guardian', x: itemX(ocean, goal.vault) - 900, lift: 160, quest: quest.id, sprite: null, active: open, value: 0 });
        }
      }
    });
  }
  return specs;
}

export function photoMatches(species: string, photo: string): boolean {
  if (species === 'fish') return photo.startsWith('fish_') || photo === 'whale';
  return species === photo;
}

export function progressQuest(quest: QuestDef, prev: QuestState, result: DiveResult): QuestState {
  const flags = new Set(prev.flags);
  let progress = prev.progress;
  quest.steps.forEach((goal, s) => {
    if (flags.has(stepKey(quest.id, s))) return;
    let done = false;
    if (goal.kind === 'deliver') {
      goal.items.forEach((_, i) => {
        const id = itemKey(quest.id, s, i);
        if (result.delivered.includes(id)) flags.add(id);
      });
      done = goal.items.every((_, i) => flags.has(itemKey(quest.id, s, i)));
    } else if (goal.kind === 'activate') {
      goal.items.forEach((_, i) => {
        const id = itemKey(quest.id, s, i);
        if (result.activated.includes(id)) flags.add(id);
      });
      const switches = goal.items.every((_, i) => flags.has(itemKey(quest.id, s, i)));
      if (goal.vault && result.delivered.includes(vaultKey(quest.id, s))) flags.add(vaultKey(quest.id, s));
      done = switches && (!goal.vault || flags.has(vaultKey(quest.id, s)));
    } else if (goal.kind === 'photo') {
      done = result.photos.some((p) => photoMatches(goal.species, p.species));
    } else if (goal.kind === 'cut') {
      progress = Math.min(goal.count, progress + result.cut);
      done = progress >= goal.count;
    } else if (goal.kind === 'boss') {
      done = result.bossLoot;
    } else if (goal.kind === 'chests') {
      done = result.success && result.chests.length >= goal.count;
    } else if (goal.kind === 'reach') {
      done = result.regionMax >= goal.region;
    } else if (goal.kind === 'tide') {
      done = result.success && result.gates >= goal.count;
    } else if (goal.kind === 'drone') {
      done = result.scans.filter((sc) => !sc.startsWith('net:')).length >= goal.count;
    } else if (goal.kind === 'escape') {
      done = result.escapes > 0;
    } else if (goal.kind === 'heavy') {
      done = result.heavy >= goal.count;
    } else if (goal.kind === 'materials') {
      done = result.success && Object.values(result.materials).reduce((sum, n) => sum + (n ?? 0), 0) >= goal.count;
    }
    if (done) flags.add(stepKey(quest.id, s));
  });
  const all = quest.steps.every((_, s) => flags.has(stepKey(quest.id, s)));
  return { done: all, progress, flags: [...flags] };
}

export function pendingChoice(quest: QuestDef, state: QuestState): number {
  return quest.steps.findIndex((goal, s) => goal.kind === 'choice' && !state.flags.includes(stepKey(quest.id, s)) && quest.steps.every((other, o) => other.kind === 'choice' || state.flags.includes(stepKey(quest.id, o))));
}

export function oceansAfter(chapter: number): OceanId[] {
  return OCEAN_ORDER.slice(0, Math.min(OCEAN_ORDER.length, chapter + 1));
}
