export interface OcrWord {
  text: string;
  /** Tesseract word confidence, 0-100. */
  confidence: number;
}

/**
 * Minimum word confidence for offering a candidate. Chosen from real dashboard photos
 * (docs/usage.md): the highest-confidence wrong reading seen was 78, clear LCD readings scored 91+.
 */
export const MIN_CANDIDATE_CONFIDENCE = 85;

export type OdometerReading =
  | { kind: 'candidate'; value: number; confidence: number; rawText: string }
  | { kind: 'low-confidence'; value: number; confidence: number; rawText: string }
  | { kind: 'ambiguous'; readings: NumberToken[]; rawText: string }
  | { kind: 'decimal-only'; readings: string[]; rawText: string }
  | { kind: 'none'; rawText: string };

interface NumberToken {
  text: string;
  integer: number | null;
  confidence: number;
}

const THOUSANDS = /^\d{1,3}(,\d{3})+$/;

function tokenize(words: OcrWord[]): NumberToken[] {
  const tokens: NumberToken[] = [];
  for (const word of words) {
    for (const match of word.text.matchAll(/\d(?:[\d.,]*\d)?/g)) {
      const text = match[0];
      let integer: number | null = null;
      if (/^\d+$/.test(text)) integer = Number(text);
      else if (THOUSANDS.test(text)) integer = Number(text.replaceAll(',', ''));
      // Anything else (e.g. "123.4", "58.320") is kept as a non-integer reading, never stripped.
      if (integer !== null && !Number.isSafeInteger(integer)) integer = null;
      tokens.push({ text, integer, confidence: Math.round(word.confidence) });
    }
  }
  return tokens;
}

/**
 * Interprets OCR words from the cropped odometer area. Only a single integer reading becomes a
 * candidate; separate numbers are never concatenated and the largest is never picked automatically.
 */
export function interpretOdometer(words: OcrWord[], minConfidence = MIN_CANDIDATE_CONFIDENCE): OdometerReading {
  const rawText = words.map((w) => w.text).join(' ').trim();
  const tokens = tokenize(words);
  if (tokens.length === 0) return { kind: 'none', rawText };

  const integers = tokens.filter((t) => t.integer !== null);
  if (tokens.length > 1 && tokens.some((t) => /^\d+$/.test(t.text) || THOUSANDS.test(t.text))) {
    return { kind: 'ambiguous', readings: tokens, rawText };
  }
  if (integers.length === 0) {
    const decimals = tokens.filter((t) => /[.,]/.test(t.text));
    return decimals.length > 0 ? { kind: 'decimal-only', readings: decimals.map((t) => t.text), rawText } : { kind: 'none', rawText };
  }

  const [token] = integers;
  const value = token.integer as number;
  const confidence = Math.round(token.confidence);
  if (confidence < minConfidence) return { kind: 'low-confidence', value, confidence, rawText };
  return { kind: 'candidate', value, confidence, rawText };
}
