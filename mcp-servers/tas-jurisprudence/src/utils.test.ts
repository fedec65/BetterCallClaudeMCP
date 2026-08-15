import { describe, it, expect } from 'vitest';
import { normalizeCaseNumber, parseCaseNumber, generatePdfUrl } from './utils.js';

describe('normalizeCaseNumber', () => {
  it('normalizes a standard appeal case number', () => {
    expect(normalizeCaseNumber('CAS 2023/A/9876')).toBe('CAS 2023/A/9876');
  });

  it('accepts ADD (Anti-Doping Division) type', () => {
    expect(normalizeCaseNumber('CAS 2023/ADD/62')).toBe('CAS 2023/ADD/0062');
  });

  it('accepts joined cases', () => {
    expect(normalizeCaseNumber('CAS 2022/A/9328 & 9329')).toBe('CAS 2022/A/9328 & 9329');
  });

  it('accepts case number ranges and preserves the range notation', () => {
    expect(normalizeCaseNumber('CAS 2022/A/8865-8868')).toBe('CAS 2022/A/8865-8868');
  });

  it('still treats hyphens between components as separators', () => {
    expect(normalizeCaseNumber('2023-A-9876')).toBe('CAS 2023/A/9876');
  });

  it('still rejects malformed input', () => {
    expect(() => normalizeCaseNumber('not a case number')).toThrow(/Invalid case number format/);
  });

  it('still rejects unknown case types', () => {
    expect(() => normalizeCaseNumber('2023/XYZ/1234')).toThrow(/Invalid case type/);
  });
});

describe('parseCaseNumber', () => {
  it('parses ADD case numbers', () => {
    const parsed = parseCaseNumber('2023/ADD/62');
    expect(parsed.type).toBe('ADD');
    expect(parsed.year).toBe(2023);
    expect(parsed.number).toBe(62);
  });

  it('uses the first number of joined cases', () => {
    const parsed = parseCaseNumber('CAS 2022/A/9328 & 9329');
    expect(parsed.number).toBe(9328);
    expect(parsed.normalized).toBe('CAS 2022/A/9328 & 9329');
  });

  it('parses ranges keeping the first number', () => {
    const parsed = parseCaseNumber('CAS 2022/A/8865-8868');
    expect(parsed.number).toBe(8865);
    expect(parsed.normalized).toBe('CAS 2022/A/8865-8868');
  });
});

describe('generatePdfUrl', () => {
  it('builds the PDF URL for ADD cases', () => {
    expect(generatePdfUrl('CAS 2023/ADD/62')).toBe('https://www.tas-cas.org/files/decision/CAS-2023-ADD-0062.pdf');
  });

  it('builds the PDF URL from the first number of joined cases', () => {
    expect(generatePdfUrl('CAS 2022/A/9328 & 9329')).toBe('https://www.tas-cas.org/files/decision/CAS-2022-A-9328.pdf');
  });
});
