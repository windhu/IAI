import { describe, expect, it } from 'vitest';
import { interpretOdometer, MIN_CANDIDATE_CONFIDENCE } from '../src/ocr/interpret';

const w = (text: string, confidence = 92) => ({ text, confidence });

describe('interpretOdometer', () => {
  it('offers a single integer as a candidate', () => {
    expect(interpretOdometer([w('ODO'), w('058320'), w('km')])).toMatchObject({ kind: 'candidate', value: 58320, confidence: 92 });
  });

  it('accepts thousands separators', () => {
    expect(interpretOdometer([w('58,320')])).toMatchObject({ kind: 'candidate', value: 58320 });
  });

  it('never concatenates separate numbers', () => {
    expect(interpretOdometer([w('58'), w('320')])).toEqual({
      kind: 'ambiguous',
      readings: [{ text: '58', integer: 58, confidence: 92 }, { text: '320', integer: 320, confidence: 92 }],
      rawText: '58 320',
    });
  });

  it('does not pick the largest of several numbers', () => {
    const result = interpretOdometer([w('ODO'), w('58320'), w('TRIP'), w('1234')]);
    expect(result.kind).toBe('ambiguous');
  });

  it('treats an integer next to a trip decimal as ambiguous', () => {
    expect(interpretOdometer([w('58320'), w('123.4')]).kind).toBe('ambiguous');
  });

  it('retains the original text, safe values and individual confidence for multiple readings', () => {
    expect(interpretOdometer([w('58,320', 84.4), w('123.4', 98), w('9007199254740991', 90), w('9007199254740992', 70)]))
      .toMatchObject({
        kind: 'ambiguous',
        readings: [
          { text: '58,320', integer: 58320, confidence: 84 },
          { text: '123.4', integer: null, confidence: 98 },
          { text: '9007199254740991', integer: Number.MAX_SAFE_INTEGER, confidence: 90 },
          { text: '9007199254740992', integer: null, confidence: 70 },
        ],
      });
  });

  it('keeps the decimal point of a trip reading instead of stripping it', () => {
    expect(interpretOdometer([w('123.4')])).toEqual({ kind: 'decimal-only', readings: ['123.4'], rawText: '123.4' });
    expect(interpretOdometer([w('58.320')]).kind).toBe('decimal-only');
  });

  it('does not offer a low-confidence reading as a candidate', () => {
    const result = interpretOdometer([w('58320', MIN_CANDIDATE_CONFIDENCE - 1)]);
    expect(result).toMatchObject({ kind: 'low-confidence', value: 58320 });
  });

  it('reports failure instead of zero when nothing is readable', () => {
    expect(interpretOdometer([])).toEqual({ kind: 'none', rawText: '' });
    expect(interpretOdometer([w('ODO'), w('km')]).kind).toBe('none');
  });

  it('rejects values beyond the safe integer range', () => {
    expect(interpretOdometer([w('99999999999999999999')]).kind).toBe('none');
  });

  it('retains multiple unsafe integer and decimal readings without making them selectable', () => {
    expect(interpretOdometer([w('9007199254740992'), w('123.4')])).toMatchObject({
      kind: 'ambiguous',
      readings: [
        { text: '9007199254740992', integer: null },
        { text: '123.4', integer: null },
      ],
    });
    expect(interpretOdometer([w('123.4'), w('56.7')]).kind).toBe('decimal-only');
  });
});
