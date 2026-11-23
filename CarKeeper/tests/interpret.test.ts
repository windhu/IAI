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
    expect(interpretOdometer([w('58'), w('320')])).toEqual({ kind: 'ambiguous', readings: ['58', '320'], rawText: '58 320' });
  });

  it('does not pick the largest of several numbers', () => {
    const result = interpretOdometer([w('ODO'), w('58320'), w('TRIP'), w('1234')]);
    expect(result.kind).toBe('ambiguous');
  });

  it('treats an integer next to a trip decimal as ambiguous', () => {
    expect(interpretOdometer([w('58320'), w('123.4')]).kind).toBe('ambiguous');
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
});
