import type { Line } from './characters';
import { QUESTS } from './quests';
import type { Ending, SaveData, TideEnding } from './saveData';

export interface EndingDef {
  id: Ending;
  title: string;
  choice: string;
  text: string;
  epilogue: Line[];
  reward: { money: number; pearls: number; research: number };
}

export const ENDINGS: Record<Ending, EndingDef> = {
  guardian: {
    id: 'guardian',
    title: 'Strážci oceánu',
    choice: 'Obnovit síť s pojistkami',
    text: 'S Diegovými daty a výzkumem jste síť obnovili bezpečně. Ekosystémy se stabilizují a technologie Atlanťanů je sdílena pod dohledem. Voss stojí před komisí – a poprvé mlčí.',
    epilogue: [
      { who: 'diego', text: 'Pojistky drží. Proudy se vracejí. Mayo… dokázali jsme to.' },
      { who: 'maya', text: 'My všichni. Elias by se smál – a pak by hned plánoval další výpravu.' },
    ],
    reward: { money: 20000, pearls: 10, research: 400 },
  },
  hidden: {
    id: 'hidden',
    title: 'Skryté Srdce',
    choice: 'Ukrýt Srdce a zničit mapy',
    text: 'Srdce oceánu leží tam, kde ho nikdo nenajde, a mapy shořely v kamnech Eliasovy kajuty. Oceán je v bezpečí. Technologie zůstane nevyužitá – a možná je to tak správně.',
    epilogue: [
      { who: 'idris', text: 'Někdy je největší objev ten, který nikomu neukážeme.' },
      { who: 'maya', text: 'Ale my dva víme, kde je. To stačí.' },
    ],
    reward: { money: 0, pearls: 12, research: 0 },
  },
  power: {
    id: 'power',
    title: 'Síla hlubin',
    choice: 'Aktivovat síť naplno',
    text: 'Síť se rozzářila a oceány na chvíli poslechly. Energie, proudy, bohatství – a pak první anomálie. Voss slaví, svět platí. Hlubiny jsou od teď nebezpečnější.',
    epilogue: [
      { who: 'voss', text: 'Viděl jste to? Celý oceán pod kontrolou. Tohle je budoucnost.' },
      { who: 'maya', text: 'Tohle není budoucnost. Tohle je sázka. A my jsme vsadili úplně všechno.' },
    ],
    reward: { money: 60000, pearls: 0, research: 0 },
  },
  sacrifice: {
    id: 'sacrifice',
    title: 'Oběť',
    choice: 'Zastavit katastrofu za každou cenu',
    text: 'Srdce jsi přetížil a síť zhasla. Eliasova loď to nepřežila beze škod a s ní zmizela i část technologie. Oceán je ale klidný – a v doku už čeká nová výprava.',
    epilogue: [
      { who: 'nora', text: 'Loď se dá opravit. Lidi, co mají odvahu tohle udělat, se hledají hůř.' },
      { who: 'maya', text: 'Tak co, kapitáne? Kam teď?' },
    ],
    reward: { money: 0, pearls: 20, research: 100 },
  },
};

export const ENDING_ORDER: Ending[] = ['guardian', 'hidden', 'power', 'sacrifice'];

export interface TideEndingDef {
  id: TideEnding;
  title: string;
  choice: string;
  text: string;
  epilogue: Line[];
  reward: { money: number; pearls: number; research: number };
}

export const TIDE_ENDINGS: Record<TideEnding, TideEndingDef> = {
  escort: {
    id: 'escort',
    title: 'Doprovod',
    choice: 'Doprovodit Strážce chráněnou trasou',
    text: 'Strážce putuje dál chráněnou trasou a cestou obnovuje mrtvé útesy. Přístavy se poprvé domluvily na společných pravidlech. Proudy dýchají – a nikdo jim neporoučí.',
    epilogue: [
      { who: 'jun', text: 'Nová trasa je v mapě. Každý týden jinde. Konečně mapa, která žije.' },
      { who: 'maya', text: 'Elias by tohle chtěl vidět. Tak to uvidíme za něj.' },
    ],
    reward: { money: 25000, pearls: 15, research: 300 },
  },
  sleep: {
    id: 'sleep',
    title: 'Spánek',
    choice: 'Uspat Strážce pod Srdcem',
    text: 'Strážce znovu usíná pod Srdcem oceánu. Proudy se uklidnily a trhliny zmizely – a s nimi i část života, kterou s sebou nesl. Moře je bezpečnější a o něco tišší.',
    epilogue: [
      { who: 'harlan', text: 'Tak jsme ho nechali spát. Jako tehdy. Jen tentokrát víme proč.' },
      { who: 'maya', text: 'Klidné moře taky potřebuje průzkumníky. Kam teď, kapitáne?' },
    ],
    reward: { money: 10000, pearls: 10, research: 200 },
  },
  harvest: {
    id: 'harvest',
    title: 'Sklizeň',
    choice: 'Vzít si energii Srdečního kamene',
    text: 'Energie Srdečního kamene proudí do sítě a do tvé výbavy. Strážce slábne a mizí do hlubin. Oceány jsou bohatší – a neklidnější. Anomálie už se nezavřou.',
    epilogue: [
      { who: 'diego', text: 'S pojistkami to vydrží. Musí.' },
      { who: 'maya', text: 'Doufám, že víme, co jsme si vzali. A komu.' },
    ],
    reward: { money: 50000, pearls: 5, research: 100 },
  },
};

export const TIDE_ENDING_ORDER: TideEnding[] = ['escort', 'sleep', 'harvest'];

export const ENDING_PROMPT: Line[] = [
  { who: 'voss', text: 'Osm fragmentů. Konečně. Dejte mi Srdce a oceány už nikdy nebudou nevyužité.' },
  { who: 'maya', text: 'Je to tvoje rozhodnutí. Ať zvolíš cokoli, stojím za tebou.' },
];

export interface EndingCheck {
  label: string;
  done: boolean;
}

export function guardianChecks(save: SaveData): EndingCheck[] {
  const sideDone = QUESTS.filter((q) => q.category !== 'main' && save.quests[q.id]?.done).length;
  return [
    { label: 'Zachraň Diega a pomoz mu napravit chybu', done: save.flags.includes('diego_saved') },
    { label: 'Vyzkoumej aspoň 5 technologií', done: save.research.length >= 5 },
    { label: 'Pomoz regionům (aspoň 8 vedlejších úkolů)', done: sideDone >= 8 },
  ];
}

export function endingAvailable(id: Ending, save: SaveData): boolean {
  if (id === 'guardian') return guardianChecks(save).every((c) => c.done);
  return true;
}

export function pearlLabel(count: number): string {
  return `${count} ${count === 1 ? 'perla' : count < 5 ? 'perly' : 'perel'}`;
}
