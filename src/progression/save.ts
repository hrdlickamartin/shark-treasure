import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SAVE, migrateSave, type SaveData } from './saveData';

export { DEFAULT_SAVE, type SaveData } from './saveData';

const KEY = 'shark-treasure-save-v1';

export async function loadSave(): Promise<SaveData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? migrateSave(JSON.parse(raw)) : DEFAULT_SAVE;
  } catch {
    return DEFAULT_SAVE;
  }
}

export async function writeSave(data: SaveData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}
