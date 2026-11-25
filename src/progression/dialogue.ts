import type { Line } from './characters';
import { questById, type ChoiceOption } from './quests';

export interface Dialogue {
  id: string;
  lines: Line[];
  choice?: { quest: string; options: ChoiceOption[] };
}

const SCRIPTS: Record<string, Line[]> = {
  prologue: [
    { who: 'nora', text: 'Tohle je Eliasova loď. Říkal, že se vrátí, až najde něco, co změní všechny mapy. Vrátil se jen jeho deník.' },
    { who: 'nora', text: 'Teď je loď tvoje. Ať se ti líbí, nebo ne.' },
    { who: 'maya', text: 'Maya Torres. Opravuju ten jeho sonar už třetí týden. Pomůžu ti – výměnou za přístup k Eliasovým poznámkám.' },
    { who: 'maya', text: 'Přijímač zachytil signál. A podle mapy je přesně tam, kde Elias označil první vrak.' },
  ],
  intro_existing: [
    { who: 'maya', text: 'Ahoj, kapitáne. Maya Torres – od dneška tvoje oceánografka, mechanik a hlas v rádiu.' },
    { who: 'maya', text: 'Prošla jsem Eliasův deník. Je v něm víc než mapy k pokladům. Je v něm stopa k mému bratrovi.' },
  ],
  hook_0: [
    { who: 'maya', text: 'Mám ti něco říct. Hledám bratra. Diego zmizel před šesti lety při výpravě za neznámým signálem. Oficiálně nehoda.' },
    { who: 'maya', text: 'Ale ten signál… je stejný, jaký hledal Elias.' },
  ],
  hook_1: [{ who: 'maya', text: 'Vědec tvrdí, že Diego signál objevil a někdo jeho nález utajil. Musím zjistit kdo.' }],
  hook_2: [{ who: 'idris', text: 'Voss aktivovala první zařízení. Oceánské proudy se mění. Nemáme moc času.' }],
  hook_3: [{ who: 'maya', text: 'Mapa z fragmentů ukazuje polohu ztraceného města. Já… nemůžu uvěřit, že to říkám nahlas.' }],
  hook_4: [{ who: 'maya', text: 'Diego možná žije. Prosím, poplujme do Propasti.' }],
  hook_5: [{ who: 'maya', text: 'Diego varuje: Voss má poslední fragment. A Eliasova loď je na Hřbitově lodí.' }],
  hook_6: [{ who: 'maya', text: 'Síť se destabilizuje. Finální expedice. Ať se stane cokoli – jsme tým.' }],
  tide_intro_guardian: [
    { who: 'diego', text: 'Komise Tidewatch dnes zasedla poprvé. Pojistky drží. A přesto… proudy u Karibiku se otáčejí.' },
    { who: 'voss', text: 'Pod dohledem, jak vidíte. Ale moje data říkají, že síť nebyla stroj. Byla postavená kolem něčeho živého.' },
    { who: 'maya', text: 'Kapitáne, vyplouváme. Někdo musí zjistit, co jsme to vlastně probudili.' },
  ],
  tide_intro_hidden: [
    { who: 'idris', text: 'Mapy shořely. Jenže v přístavu se objevila kopie. Někdo ví, kde Srdce leží.' },
    { who: 'rook', text: 'Bratrstvo se dělí. Půlka chce Srdce najít a prodat. Já jen chci vědět, proč se proudy točí dokola.' },
    { who: 'maya', text: 'Srdce jsme ukryli. Ale oceán se mění dál. Tak se pojďme podívat proč.' },
  ],
  tide_intro_power: [
    { who: 'voss', text: 'Síť pracuje naplno. Tidewatch řídí proudy po celém světě. Gratuluji, pomohl jste změnit dějiny.' },
    { who: 'maya', text: 'A anomálie sílí. Tvorové jsou nervózní a ve starých oceánech se otevírají trhliny.' },
    { who: 'maya', text: 'Tohle jsme spustili my. Tak to taky musíme dát do pořádku.' },
  ],
  tide_intro_sacrifice: [
    { who: 'nora', text: 'Loď drží pohromadě jen silou vůle a Mayiných svárů. Technologie je pryč. Ale vy jste tady.' },
    { who: 'maya', text: 'Začneme dílnou. Ze šrotu a lan se dá postavit víc, než si myslíš. A pak zjistíme, proč se proudy otáčejí.' },
  ],
  port_intro: [
    { who: 'nora', text: 'Port Royal ti otevřel molo. Cech, Institut i Bratrstvo tam vyvěšují zakázky – a platí reputací, ne jen penězi.' },
    { who: 'maya', text: 'A já mám v podpalubí dílnu. Šrot, lana a perleť ze dna mi nos v ponorech, postavím z nich výbavu i moduly na loď.' },
    { who: 'maya', text: 'Najdeš to na lodi pod tlačítkem Přístav.' },
  ],
  tide_hook_8: [{ who: 'jun', text: 'Úžina proudů je otevřená. Kotviště Tern, molo tří frakcí. Najdeme tam i Harlana – Eliasova starého parťáka.' }],
  tide_hook_9: [{ who: 'maya', text: 'Stopa krunýře vede k útesu, který se hýbe. Jun mu říká Putující útes. Je na zádech Strážce proudů.' }],
  tide_hook_10: [{ who: 'harlan', text: 'Klíč je tvůj. Srdeční jeskyně čeká. A s ní i všechny trhliny, které Srdce otevřelo.' }],
  tide_hook_11: [{ who: 'maya', text: 'Strážce pluje dál. Ať jsme se rozhodli jakkoli, jeho cesta se teď mění každý týden.' }],
};

const RADIO: Record<string, Line[]> = {
  dive_start: [
    { who: 'maya', text: 'Jsi ve vodě. Drž se mapy a sleduj kyslík.' },
    { who: 'maya', text: 'Sonar běží. Jestli uvidíš něco blikat a starého, nejdřív to ukaž mně.' },
    { who: 'maya', text: 'Hodně štěstí tam dole. A žádné hrdinství, jasné?' },
  ],
  quest_item: [
    { who: 'maya', text: 'Počkej… to není obyčejný nález. Vezmi ho na loď!' },
    { who: 'maya', text: 'Mám to na sonaru. Přesně tohle jsme hledali.' },
    { who: 'maya', text: 'Výborně! Teď hlavně v klidu zpátky.' },
  ],
  echo: [
    { who: 'maya', text: 'Signál zesílil. Ještě kousek.' },
    { who: 'maya', text: 'Sonar to zachytil. Další značka.' },
  ],
  danger: [
    { who: 'maya', text: 'Pohyb vlevo! Ne, tvoje druhé vlevo! Dobře, už ho vidím. Klid, drž se stěny.' },
    { who: 'maya', text: 'Žralok tě má v merku. Plašič nebo harpunu, rychle!' },
    { who: 'maya', text: 'Něco velkého se blíží. Nepanikař.' },
  ],
  low_oxygen: [
    { who: 'maya', text: 'Kyslík je na rezervě. Poklad tam zítra pořád bude. Vrať se.' },
    { who: 'maya', text: 'Ta truhla tam bude i zítra. Ty se mi vrať dnes.' },
  ],
  new_location: [
    { who: 'maya', text: 'Tohle místo není na žádné mapě. Zapisuju.' },
    { who: 'maya', text: 'Nová lokace v deníku. Elias by byl nadšený.' },
  ],
  boss: [{ who: 'maya', text: 'Sonar ukazuje něco obrovského. Tohle je jeho doupě. Buď opatrný.' }],
  cold: [{ who: 'maya', text: 'Teplota padá. Najdi topný maják nebo se vynoř.' }],
  heat: [{ who: 'maya', text: 'Přehříváš se! Chladicí krystaly nebo hladina, hned.' }],
  pressure: [{ who: 'maya', text: 'Tlak je nad limit obleku. Vystoupej, prosím!' }],
  tide_low: [
    { who: 'jun', text: 'Odliv za osm. Sedm. Drž se dna, tam to tolik netáhne.' },
    { who: 'jun', text: 'Proud se za chvíli otočí. Brány se zavřou.' },
  ],
  tide_high: [
    { who: 'jun', text: 'Příliv za osm sekund. Brány se otevřou, ale proud zesílí.' },
    { who: 'maya', text: 'Slyšíš roh? Příliv se vrací. Chyť se něčeho!' },
  ],
  collapse: [
    { who: 'maya', text: 'Strop praská! Ven, hned, truhla počká!' },
    { who: 'maya', text: 'Sypou se kameny! Plav k nejbližšímu okraji jeskyně!' },
  ],
  pip: [
    { who: 'maya', text: 'Pip říká, že tam vlevo je něco lesklého. Pip říká, že všechno lesklé je skvělý nápad.' },
    { who: 'maya', text: 'Pip si myslí, že ta truhla dýchá. Pip má obvykle pravdu, když jde o věci, co dýchají.' },
  ],
  success: [
    { who: 'maya', text: 'Podívej se na to! Tolik věcí a žádná díra v lodi. Dneska tomu říkám úspěch.' },
    { who: 'maya', text: 'Vítej zpátky. Kafe je teplé a nálezy v laboratoři.' },
  ],
  fail: [
    { who: 'maya', text: 'Expedice se nepovedla, ale víme víc než předtím. Opravíme vybavení a zkusíme jinou cestu.' },
    { who: 'maya', text: 'Hlavně že jsi v pořádku. Na všechno ostatní je čas.' },
  ],
};

export const RADIO_TOPICS = Object.keys(RADIO);

export function radioLine(topic: string, seed: number): Line | null {
  const pool = RADIO[topic];
  if (!pool) return null;
  return pool[Math.abs(Math.floor(seed)) % pool.length];
}

export function dialogueFor(id: string): Dialogue | null {
  if (SCRIPTS[id]) return { id, lines: SCRIPTS[id] };
  const [kind, questId] = id.split(':');
  const quest = questId ? questById(questId) : undefined;
  if (!quest) return null;
  if (kind === 'brief') return quest.briefing ? { id, lines: quest.briefing } : null;
  if (kind === 'debrief') return quest.debrief ? { id, lines: quest.debrief } : null;
  if (kind === 'choice' && quest.choice) return { id, lines: quest.choice.prompt, choice: { quest: quest.id, options: quest.choice.options } };
  return null;
}
