import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LegalCache,
  searchCache,
  citationCache,
  statuteCache,
} from '../../infrastructure/cache.js';

describe('LegalCache', () => {
  let cache: LegalCache<string>;

  beforeEach(() => {
    cache = new LegalCache<string>({ maxSize: 10, ttlMs: 1000 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('constructor', () => {
    it('should create cache with default options', () => {
      const defaultCache = new LegalCache<string>();
      expect(defaultCache.size).toBe(0);
    });

    it('should create cache with custom options', () => {
      const customCache = new LegalCache<string>({ maxSize: 100, ttlMs: 60000 });
      expect(customCache.size).toBe(0);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing value', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should store complex objects', () => {
      const complexCache = new LegalCache<{ data: string; count: number }>();
      const obj = { data: 'test', count: 42 };
      complexCache.set('obj', obj);
      expect(complexCache.get('obj')).toEqual(obj);
    });

    it('should store arrays', () => {
      const arrayCache = new LegalCache<string[]>();
      const arr = ['a', 'b', 'c'];
      arrayCache.set('arr', arr);
      expect(arrayCache.get('arr')).toEqual(arr);
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return value before TTL expires', () => {
      cache.set('key1', 'value1');
      vi.advanceTimersByTime(500); // Half of TTL
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined after TTL expires', () => {
      cache.set('key1', 'value1');
      vi.advanceTimersByTime(1500); // Past TTL
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should handle different TTL values', () => {
      const shortCache = new LegalCache<string>({ maxSize: 10, ttlMs: 100 });
      const longCache = new LegalCache<string>({ maxSize: 10, ttlMs: 10000 });

      shortCache.set('short', 'value');
      longCache.set('long', 'value');

      vi.advanceTimersByTime(500);

      expect(shortCache.get('short')).toBeUndefined();
      expect(longCache.get('long')).toBe('value');
    });
  });

  describe('has', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for existing key', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', () => {
      cache.set('key1', 'value1');
      vi.advanceTimersByTime(1500);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove a key from cache', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not throw for non-existent key', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });

    it('should only delete specified key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('clear', () => {
    it('should remove all keys from cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });

    it('should handle clearing empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
      expect(cache.size).toBe(0);
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size).toBe(0);
    });

    it('should return correct size after adding items', () => {
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
    });

    it('should not increase size when updating existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.size).toBe(1);
    });

    it('should decrease size after delete', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.delete('key1');
      expect(cache.size).toBe(1);
    });
  });

  describe('max size eviction', () => {
    it('should evict oldest entries when max size reached', () => {
      const smallCache = new LegalCache<string>({ maxSize: 3, ttlMs: 10000 });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      smallCache.set('key4', 'value4'); // Should evict key1

      expect(smallCache.size).toBe(3);
      // LRU cache should have evicted the least recently used item
    });
  });

  describe('generateKey', () => {
    it('should generate consistent key for same params', () => {
      const params = { query: 'test', limit: 10 };
      const key1 = LegalCache.generateKey('search', params);
      const key2 = LegalCache.generateKey('search', params);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different prefixes', () => {
      const params = { query: 'test' };
      const key1 = LegalCache.generateKey('search', params);
      const key2 = LegalCache.generateKey('citation', params);
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = LegalCache.generateKey('search', { query: 'test1' });
      const key2 = LegalCache.generateKey('search', { query: 'test2' });
      expect(key1).not.toBe(key2);
    });

    it('should handle empty params', () => {
      const key = LegalCache.generateKey('prefix', {});
      expect(key).toBeDefined();
      expect(key.startsWith('prefix:')).toBe(true);
    });

    it('should handle nested objects', () => {
      const params = { outer: { inner: 'value' }, list: [1, 2, 3] };
      const key = LegalCache.generateKey('complex', params);
      expect(key).toBeDefined();
    });

    it('should handle null and undefined values', () => {
      const params = { nullVal: null, undefVal: undefined };
      const key = LegalCache.generateKey('nullable', params);
      expect(key).toBeDefined();
    });

    it('should generate keys with special characters in values', () => {
      const params = { query: 'Art. 97 OR', lang: 'de' };
      const key = LegalCache.generateKey('citation', params);
      expect(key).toBeDefined();
    });
  });
});

describe('Pre-configured Cache Instances', () => {
  describe('searchCache', () => {
    afterEach(() => {
      searchCache.clear();
    });

    it('should exist and be a LegalCache instance', () => {
      expect(searchCache).toBeInstanceOf(LegalCache);
    });

    it('should store and retrieve values', () => {
      searchCache.set('test-key', { results: [] });
      expect(searchCache.get('test-key')).toEqual({ results: [] });
    });
  });

  describe('citationCache', () => {
    afterEach(() => {
      citationCache.clear();
    });

    it('should exist and be a LegalCache instance', () => {
      expect(citationCache).toBeInstanceOf(LegalCache);
    });

    it('should store and retrieve values', () => {
      citationCache.set('bge-145-iii-229', { parsed: true });
      expect(citationCache.get('bge-145-iii-229')).toEqual({ parsed: true });
    });
  });

  describe('statuteCache', () => {
    afterEach(() => {
      statuteCache.clear();
    });

    it('should exist and be a LegalCache instance', () => {
      expect(statuteCache).toBeInstanceOf(LegalCache);
    });

    it('should store and retrieve values', () => {
      statuteCache.set('art-97-or', { text: 'Statute text' });
      expect(statuteCache.get('art-97-or')).toEqual({ text: 'Statute text' });
    });
  });
});
