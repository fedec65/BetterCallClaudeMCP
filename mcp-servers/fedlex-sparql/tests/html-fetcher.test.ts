/**
 * Unit Tests for extractParagraphText (HTML paragraph filter)
 */

import { describe, it, expect } from 'vitest';
import { extractParagraphText } from '../src/html-fetcher.js';

const OR_41 =
  '⁽1⁾ Wer einem andern widerrechtlich Schaden zufügt, sei es mit Absicht, sei es aus Fahrlässigkeit, wird ihm zum Ersatze verpflichtet.\n' +
  '⁽2⁾ Ebenso ist zum Ersatze verpflichtet, wer einem andern in einer gegen die guten Sitten verstossenden Weise absichtlich Schaden zufügt.';

describe('extractParagraphText', () => {
  it('extracts the requested paragraph without its marker', () => {
    expect(extractParagraphText(OR_41, '1')).toBe(
      'Wer einem andern widerrechtlich Schaden zufügt, sei es mit Absicht, sei es aus Fahrlässigkeit, wird ihm zum Ersatze verpflichtet.'
    );
    expect(extractParagraphText(OR_41, '2')).toBe(
      'Ebenso ist zum Ersatze verpflichtet, wer einem andern in einer gegen die guten Sitten verstossenden Weise absichtlich Schaden zufügt.'
    );
  });

  it('returns null for a non-existent paragraph', () => {
    expect(extractParagraphText(OR_41, '3')).toBeNull();
  });

  it('normalizes non-digit input like "Abs. 2"', () => {
    expect(extractParagraphText(OR_41, 'Abs. 2')).toContain('Ebenso ist zum Ersatze verpflichtet');
  });

  it('returns the whole text for paragraph 1 when the article has no markers', () => {
    expect(extractParagraphText('Ein einzelner Absatz ohne Marker.', '1')).toBe(
      'Ein einzelner Absatz ohne Marker.'
    );
    expect(extractParagraphText('Ein einzelner Absatz ohne Marker.', '2')).toBeNull();
  });

  it('treats leading text as paragraph 1 when the first marker is ⁽2⁾', () => {
    const text = 'Ungemarkierter erster Absatz.\n⁽2⁾ Zweiter Absatz.';
    expect(extractParagraphText(text, '1')).toBe('Ungemarkierter erster Absatz.');
    expect(extractParagraphText(text, '2')).toBe('Zweiter Absatz.');
  });

  it('returns null for input without digits', () => {
    expect(extractParagraphText(OR_41, 'Abs.')).toBeNull();
  });
});
