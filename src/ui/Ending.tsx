import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Ending as EndingId, SaveData, TideEnding } from '../progression/saveData';
import { ENDING_ORDER, ENDING_PROMPT, endingAvailable, ENDINGS, guardianChecks, pearlLabel, TIDE_ENDINGS } from '../progression/story';
import { GameButton } from './Button';
import { SpeakerLine } from './Dialogue';
import { Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS } from './theme';

interface Props {
  save: SaveData;
  height: number;
  onChoose: (ending: EndingId) => void;
  onClose: () => void;
  tide?: TideEnding;
  onTide?: (ending: TideEnding) => void;
}

function rewardText(id: EndingId): string {
  const r = ENDINGS[id].reward;
  return [r.money ? `${r.money.toLocaleString('cs-CZ')} $` : '', r.pearls ? pearlLabel(r.pearls) : '', r.research ? `${r.research} dat` : ''].filter(Boolean).join(' • ');
}

function TideOutcome({ id, save, height, onTide, onClose }: { id: TideEnding; save: SaveData; height: number; onTide?: (ending: TideEnding) => void; onClose: () => void }) {
  const def = TIDE_ENDINGS[id];
  const r = def.reward;
  const reward = [r.money ? `${r.money.toLocaleString('cs-CZ')} $` : '', r.pearls ? pearlLabel(r.pearls) : '', r.research ? `${r.research} dat` : ''].filter(Boolean).join(' • ');
  return (
    <Overlay dim={0.85}>
      <Panel style={[styles.panel, { maxHeight: height - 24 }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>Živé proudy • konec rozšíření</Text>
          <Title size={26} color={COLORS.gold}>
            {def.title}
          </Title>
          <Text style={styles.text}>{def.text}</Text>
          {def.epilogue.map((line, i) => (
            <SpeakerLine key={i} line={line} compact />
          ))}
          <Text style={[styles.reward, styles.center]}>Odměna: {reward}</Text>
        </ScrollView>
        <GameButton
          label="Pokračovat ve výpravách"
          onPress={() => {
            if (!save.tideEnding) onTide?.(id);
            onClose();
          }}
          style={styles.center}
        />
      </Panel>
    </Overlay>
  );
}

export function Ending({ save, height, onChoose, onClose, tide, onTide }: Props) {
  if (tide) return <TideOutcome id={tide} save={save} height={height} onTide={onTide} onClose={onClose} />;
  const chosen = save.ending;
  const checks = guardianChecks(save);
  return (
    <Overlay dim={0.85}>
      <Panel style={[styles.panel, { maxHeight: height - 24 }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Title size={26} color={COLORS.gold}>
            {chosen ? ENDINGS[chosen].title : 'Srdce oceánu'}
          </Title>
          {chosen ? (
            <>
              <Text style={styles.text}>{ENDINGS[chosen].text}</Text>
              {ENDINGS[chosen].epilogue.map((line, i) => (
                <SpeakerLine key={i} line={line} compact />
              ))}
            </>
          ) : (
            <>
              {ENDING_PROMPT.map((line, i) => (
                <SpeakerLine key={i} line={line} compact />
              ))}
              {ENDING_ORDER.map((id) => {
                const open = endingAvailable(id, save);
                return (
                  <View key={id} style={styles.option}>
                    <GameButton label={ENDINGS[id].choice} variant={open ? (id === 'guardian' ? 'gold' : 'blue') : 'navy'} size="sm" disabled={!open} onPress={() => onChoose(id)} />
                    <Text style={styles.reward}>Odměna: {rewardText(id)}</Text>
                    {id === 'guardian' &&
                      checks.map((c) => (
                        <Text key={c.label} style={[styles.check, { color: c.done ? COLORS.seaweed : COLORS.coral }]}>
                          {c.done ? '✓' : '✗'} {c.label}
                        </Text>
                      ))}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
        {chosen && <GameButton label="Pokračovat ve výpravách" onPress={onClose} style={styles.center} />}
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 600, gap: 10 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 10, alignItems: 'stretch' },
  text: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  option: { alignItems: 'center', gap: 3, paddingVertical: 4 },
  reward: { color: COLORS.gold, fontFamily: FONTS.bodyHeavy, fontSize: 12 },
  check: { fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  center: { alignSelf: 'center' },
  kicker: { color: COLORS.aqua, fontFamily: FONTS.bodyHeavy, fontSize: 12, textAlign: 'center' },
});
