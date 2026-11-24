import type { SpriteName } from '../render/spriteAssets';

export type CharacterId = 'maya' | 'nora' | 'idris' | 'rook' | 'voss' | 'diego' | 'elias' | 'jun' | 'harlan' | 'pip';

export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  bio: string;
  portrait: SpriteName;
  color: string;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  maya: {
    id: 'maya',
    name: 'Maya Torres',
    role: 'Oceánografka, mechanik a expertka na sonar',
    bio: 'Vyrůstala mezi rybáři a záchranáři. Její bratr Diego zmizel před šesti lety při výpravě za neznámým signálem. Na palubě analyzuje nálezy, opravuje zařízení a mluví s tebou přes rádio.',
    portrait: 'portrait_maya',
    color: '#20D4E8',
  },
  nora: {
    id: 'nora',
    name: 'Kapitánka Nora Vale',
    role: 'Správkyně přístavu Port Royal',
    bio: 'Znala Eliase desítky let. Nedůvěřivá k nováčkům, ale kdo si u ní získá respekt, dostane přístup k archivům a nejlepším zakázkám.',
    portrait: 'portrait_nora',
    color: '#FFBF32',
  },
  idris: {
    id: 'idris',
    name: 'Profesor Idris Bell',
    role: 'Archeolog a znalec starověkých civilizací',
    bio: 'Umí číst nápisy, které nikdo jiný nepřečte. Pomáhá vykládat artefakty – a varuje, co se stane, když je někdo zneužije.',
    portrait: 'portrait_idris',
    color: '#C9A24A',
  },
  rook: {
    id: 'rook',
    name: 'Rook (Marcus Vane)',
    role: 'Rivalní lovec pokladů',
    bio: 'Namyšlený, rychlý a soutěživý. Pod tou maskou má ale smysl pro fair play – a kdo si získá jeho respekt, má v něm spojence.',
    portrait: 'portrait_rook',
    color: '#FF7185',
  },
  voss: {
    id: 'voss',
    name: 'Dr. Selene Voss',
    role: 'Ředitelka Abyssal Initiative',
    bio: 'Inteligentní a kultivovaná. Věří, že lidstvo musí ovládnout oceánské zdroje, aby přežilo – a že každé riziko je přijatelné, pokud technologie zafunguje.',
    portrait: 'portrait_voss',
    color: '#AD65F5',
  },
  diego: {
    id: 'diego',
    name: 'Diego Torres',
    role: 'Mayin bratr, výzkumník ztracené expedice',
    bio: 'Objevil technologii jako první. Voss ho přesvědčila, že může obnovit oceány. Když zjistil, že ignoruje pojistky, pokusil se ji zastavit – a zmizel.',
    portrait: 'portrait_diego',
    color: '#65C83C',
  },
  elias: {
    id: 'elias',
    name: 'Elias',
    role: 'Tvůj dědeček, legendární průzkumník',
    bio: 'Zanechal ti loď, deník, mapy a šifry. Z legendy se postupně stává člověk, jehož rozhodnutí nebyla vždy správná.',
    portrait: 'portrait_elias',
    color: '#FFFFFF',
  },
  jun: {
    id: 'jun',
    name: 'Jun Arai',
    role: 'Kartograf proudů a pilot dronů',
    bio: 'Mapuje proudy bójemi a čte je jako notový zápis. Věří jen datům – dokud nepotká tvora, kterého nejde změřit.',
    portrait: 'portrait_jun',
    color: '#20A4B8',
  },
  harlan: {
    id: 'harlan',
    name: 'Harlan „Starý Sůl“ Pike',
    role: 'Vůdce Bratrstva volných potápěčů',
    bio: 'Eliasův parťák z mládí. Kdysi Strážce proudů viděl a slíbil Eliasovi, že o něm pomlčí. Ten slib ho tíží.',
    portrait: 'portrait_harlan',
    color: '#C9822A',
  },
  pip: {
    id: 'pip',
    name: 'Pip',
    role: 'Mayin průzkumný dron',
    bio: 'Zvědavý, lekavý a posedlý lesklými věcmi. Mluví pípáním, Maya ho překládá.',
    portrait: 'icon_pip',
    color: '#7A8CA8',
  },
};

export interface Line {
  who: CharacterId;
  text: string;
}

export const MAYA_PHASES = [
  { title: 'Profesionální odstup', text: 'Maya tě bere jako dědice bez zkušeností. Dává praktické rady a trochu si z tebe utahuje.' },
  { title: 'Zvědavost a důvěra', text: 'Po Karibiku ti svěřila, že pátrá po bratrovi Diegovi.' },
  { title: 'Osobní pátrání', text: 'Vědec z Arktidy potvrdil stopu. Maya je do výpravy emocionálně zapojená.' },
  { title: 'Pochybnosti o Voss', text: 'Ve Středomoří spolu řešíte, komu se dá věřit.' },
  { title: 'Partnerství', text: 'V Tichomoří rozhodujete jako tým – Maya stojí na straně oceánu.' },
  { title: 'Úžas a obavy', text: 'Atlantida jí vzala dech. A ukázala, jak nebezpečná ta technologie je.' },
  { title: 'Zranitelnost', text: 'Diegova zpráva z Propasti. Maya poprvé přiznala, že se bojí.' },
  { title: 'Konfrontace', text: 'Na Hřbitově lodí stála tváří v tvář bratrovi.' },
  { title: 'Pevné pouto', text: 'Ať se rozhodneš jakkoli, Maya stojí při tobě.' },
];
