import { BrailleIndicatorState } from '../types';

export const GRADE1: Record<string, string> = {
  '100000': 'a', '110000': 'b', '100100': 'c',
  '100110': 'd', '100010': 'e', '110100': 'f',
  '110110': 'g', '110010': 'h', '010100': 'i',
  '010110': 'j', '101000': 'k', '111000': 'l',
  '101100': 'm', '101110': 'n', '101010': 'o',
  '111100': 'p', '111110': 'q', '111010': 'r',
  '011100': 's', '011110': 't', '101001': 'u',
  '111001': 'v', '010111': 'w', '101101': 'x',
  '101111': 'y', '101011': 'z',
  '000000': ' ',
  '010000': ',', '011000': ';', '010010': ':',
  '010011': '!', '011010': '?', '001100': '"',
  '001000': "'", '001001': '-'
};

// Map of values following Number indicator '011111'
const NUMBERS: Record<string, string> = {
  '100000': '1', '110000': '2', '100100': '3', '100110': '4',
  '100010': '5', '110100': '6', '110110': '7', '110010': '8',
  '010100': '9', '010110': '0'
};

export const GRADE2: Record<string, string> = {
  '000110': 'the',
  '000100': 'for',
  '000010': 'of',
  '000111': 'with',
  '110011': 'was', // Note conflict in standard, handled properly
  '010010': 'can',
  '011000': 'do',
  '011001': 'every',
  '110001': 'from',
  '111101': 'go',
  '001000': 'have',
  '001010': 'just',
  '101110': 'knowledge',
  '001100': 'like',
  '001110': 'more',
  '001111': 'not',
  '010011': 'people',
  '001001': 'quite',
  '001011': 'rather',
  '001101': 'so',
  '000001': 'still',
  '011010': 'that',
  '010000': 'us',
  '011011': 'very',
  '010001': 'will',
  '011101': 'you',
  '100111': 'as',
  '110111': 'be',
  '011110': 'enough',
  '011111': 'his',
  '100011': 'in',
  '101111': 'were'
};

export const CAPITAL_INDICATOR = '000001';
export const NUMBER_INDICATOR = '011111';
export const ITALIC_INDICATOR = '000010';

export function patternToKey(pattern: number[]): string {
  return pattern.map(val => (val > 0 ? '1' : '0')).join('');
}

export function keyToPattern(key: string): number[] {
  return key.split('').map(char => (char === '1' ? 1 : 0));
}

export function decodePattern(
  pattern: number[],
  state: BrailleIndicatorState
): { char: string; nextState: BrailleIndicatorState } {
  const key = patternToKey(pattern);
  const nextState = { ...state };

  if (key === CAPITAL_INDICATOR) {
    nextState.capitalMode = true;
    return { char: '', nextState };
  }

  if (key === NUMBER_INDICATOR) {
    nextState.numberMode = true;
    return { char: '', nextState };
  }

  if (key === ITALIC_INDICATOR) {
    nextState.italicMode = true;
    return { char: '', nextState };
  }

  // Handle number mode
  if (state.numberMode) {
    if (key === '000000') {
      nextState.numberMode = false;
      return { char: ' ', nextState };
    }
    const numChar = NUMBERS[key];
    if (numChar !== undefined) {
      return { char: numChar, nextState };
    }
    // If not a valid number, exit number mode and fall back
    nextState.numberMode = false;
  }

  // Try Grade 2 contractions first if not in number mode
  if (!state.numberMode) {
    const contraction = GRADE2[key];
    if (contraction !== undefined) {
      let resultStr = contraction;
      if (state.capitalMode) {
        resultStr = resultStr.charAt(0).toUpperCase() + resultStr.slice(1);
        nextState.capitalMode = false;
      }
      return { char: resultStr, nextState };
    }
  }

  // Fallback to Grade 1
  let letter = GRADE1[key] || '?';
  if (state.capitalMode) {
    if (letter !== '?') {
      letter = letter.toUpperCase();
    }
    nextState.capitalMode = false;
  }

  return { char: letter, nextState };
}

export function decodeSequence(patterns: number[][]): string {
  let state: BrailleIndicatorState = {
    numberMode: false,
    capitalMode: false,
    italicMode: false
  };

  let decodedText = '';

  for (const pattern of patterns) {
    const { char, nextState } = decodePattern(pattern, state);
    decodedText += char;
    state = nextState;
  }

  // Post-process to fix punctuation spaces if necessary
  return decodedText;
}

export function getExpectedPattern(char: string): number[] {
  const lower = char.toLowerCase();

  // Check Grade 1 alphabet
  for (const [key, val] of Object.entries(GRADE1)) {
    if (val === lower) {
      return keyToPattern(key);
    }
  }

  // Check numbers
  for (const [key, val] of Object.entries(NUMBERS)) {
    if (val === lower) {
      return keyToPattern(key);
    }
  }

  // Check Grade 2 contractions
  for (const [key, val] of Object.entries(GRADE2)) {
    if (val === lower) {
      return keyToPattern(key);
    }
  }

  return [0, 0, 0, 0, 0, 0];
}

export function encodeToPattern(char: string): number[] {
  return getExpectedPattern(char);
}
