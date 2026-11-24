import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CHARACTERS, type Line } from '../progression/characters';
import type { Dialogue as DialogueDef } from '../progression/dialogue';
import { Icon } from '../render/Sprite';
import { GameButton } from './Button';
import { COLORS, FONTS, textShadow } from './theme';
import { TouchAction } from './TouchAction';

interface Props {
  dialogue: DialogueDef;
  width: number;
  bottom: number;
  canChoose: (needs?: string[]) => boolean;
  money: number;
  onChoose: (optionId: string) => Line[] | null;
  onDone: () => void;
  big?: boolean;
}

export function SpeakerLine({ line, compact, big }: { line: Line; compact?: boolean; big?: boolean }) {
  const who = CHARACTERS[line.who];
  return (
    <View style={styles.speaker}>
      <View style={[styles.portrait, compact && styles.portraitSmall, { borderColor: who.color }]}>
        <Icon name={who.portrait} size={compact ? 44 : 78} />
      </View>
      <View style={styles.textBox}>
        <Text style={[styles.name, { color: who.color }]}>{who.name}</Text>
        <Text style={[styles.text, compact && styles.textSmall, big && styles.textBig]}>{line.text}</Text>
      </View>
    </View>
  );
}

export function DialogueBox({ dialogue, width, bottom, canChoose, money, onChoose, onDone, big }: Props) {
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<Line[] | null>(null);
  const lines = outcome ?? dialogue.lines;
  const line = lines[Math.min(index, lines.length - 1)];
  const last = index >= lines.length - 1;
  const choosing = last && !outcome && dialogue.choice;
  const advance = () => {
    if (!last) setIndex(index + 1);
    else if (!choosing) onDone();
  };
  return (
    <View style={[styles.root, { bottom, width: Math.min(width - 24, 640) }]}>
      <TouchAction onFire={advance}>
        <View style={styles.box}>
          <SpeakerLine line={line} big={big} />
          {!choosing && <Text style={styles.hint}>{last ? 'Klepni pro pokračování' : `Klepni (${index + 1}/${lines.length})`}</Text>}
        </View>
      </TouchAction>
      {choosing && (
        <View style={styles.choices}>
          {dialogue.choice!.options.map((option) => {
            const allowed = canChoose(option.needsFlag) && (option.money ?? 0) + money >= 0;
            return (
              <GameButton
                key={option.id}
                label={allowed ? option.label : `${option.label} – nedostupné`}
                size="sm"
                variant={allowed ? 'blue' : 'navy'}
                disabled={!allowed}
                onPress={() => {
                  const result = onChoose(option.id);
                  if (!result) return;
                  setOutcome(result);
                  setIndex(0);
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

export function RadioBubble({ line, top, bottom, left, width, big }: { line: Line; top?: number; bottom?: number; left?: number; width: number; big?: boolean }) {
  return (
    <View style={[styles.radio, left !== undefined && styles.radioLeft, { top, bottom, left, width: Math.min(width - 32, 420) }]} pointerEvents="none">
      <SpeakerLine line={line} compact big={big} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', alignSelf: 'center', gap: 8 },
  box: { backgroundColor: 'rgba(4, 27, 61, 0.95)', borderRadius: 18, borderWidth: 2, borderColor: COLORS.aqua, padding: 12, gap: 6 },
  speaker: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  portrait: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, backgroundColor: '#0E3E78', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  portraitSmall: { width: 50, height: 50, borderRadius: 25, borderWidth: 2 },
  textBox: { flex: 1, gap: 2 },
  name: { fontFamily: FONTS.title, fontSize: 15, ...textShadow },
  text: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20 },
  textSmall: { fontSize: 12, lineHeight: 16 },
  textBig: { fontSize: 17, lineHeight: 23 },
  hint: { color: COLORS.muted, fontFamily: FONTS.bodyHeavy, fontSize: 11, textAlign: 'right' },
  choices: { gap: 6, alignItems: 'stretch' },
  radioLeft: { alignSelf: 'auto' },
  radio: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(4, 27, 61, 0.88)', borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.aqua, paddingVertical: 6, paddingHorizontal: 10 },
});
