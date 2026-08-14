import { describe, it, expect } from 'vitest';
import { htmlContainsAny } from './jina-client.js';

const RENDERED = '<html><body><table><tbody><tr class="line-wrapped"><td>En</td></tr></tbody></table></body></html>';
const SHELL = '<html><head><title>TAS / CAS</title></head><body><app-root></app-root></body></html>';

describe('htmlContainsAny', () => {
  it('detects rendered content rows', () => {
    expect(htmlContainsAny(RENDERED, ['table tbody tr.line-wrapped', 'table tbody tr'])).toBe(true);
  });

  it('rejects the unrendered SPA shell', () => {
    expect(htmlContainsAny(SHELL, ['table tbody tr.line-wrapped', 'table tbody tr'])).toBe(false);
  });

  it('handles an empty selector list caller-side (not its concern)', () => {
    expect(htmlContainsAny(RENDERED, [])).toBe(false);
  });
});
