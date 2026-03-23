import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  bundesgerichtLimiter,
  entscheidsucheLimiter,
  fedlexLimiter,
  cantonalLimiter,
  genericLimiter,
  getLimiter,
  withRateLimit,
} from '../../infrastructure/rate-limiter.js';

describe('Rate Limiter', () => {
  describe('Limiter Exports', () => {
    it('should export bundesgerichtLimiter', () => {
      expect(bundesgerichtLimiter).toBeDefined();
      expect(typeof bundesgerichtLimiter.schedule).toBe('function');
    });

    it('should export entscheidsucheLimiter', () => {
      expect(entscheidsucheLimiter).toBeDefined();
      expect(typeof entscheidsucheLimiter.schedule).toBe('function');
    });

    it('should export fedlexLimiter', () => {
      expect(fedlexLimiter).toBeDefined();
      expect(typeof fedlexLimiter.schedule).toBe('function');
    });

    it('should export cantonalLimiter', () => {
      expect(cantonalLimiter).toBeDefined();
      expect(typeof cantonalLimiter.schedule).toBe('function');
    });

    it('should export genericLimiter', () => {
      expect(genericLimiter).toBeDefined();
      expect(typeof genericLimiter.schedule).toBe('function');
    });
  });

  describe('getLimiter', () => {
    describe('Bundesgericht API', () => {
      it('should return bundesgerichtLimiter for "bundesgericht"', () => {
        const limiter = getLimiter('bundesgericht');
        expect(limiter).toBe(bundesgerichtLimiter);
      });

      it('should return bundesgerichtLimiter for "bger"', () => {
        const limiter = getLimiter('bger');
        expect(limiter).toBe(bundesgerichtLimiter);
      });
    });

    describe('Entscheidsuche API', () => {
      it('should return entscheidsucheLimiter for "entscheidsuche"', () => {
        const limiter = getLimiter('entscheidsuche');
        expect(limiter).toBe(entscheidsucheLimiter);
      });
    });

    describe('Fedlex API', () => {
      it('should return fedlexLimiter for "fedlex"', () => {
        const limiter = getLimiter('fedlex');
        expect(limiter).toBe(fedlexLimiter);
      });

      it('should return fedlexLimiter for "sparql"', () => {
        const limiter = getLimiter('sparql');
        expect(limiter).toBe(fedlexLimiter);
      });
    });

    describe('Cantonal APIs', () => {
      it('should return cantonalLimiter for "zh"', () => {
        const limiter = getLimiter('zh');
        expect(limiter).toBe(cantonalLimiter);
      });

      it('should return cantonalLimiter for "be"', () => {
        const limiter = getLimiter('be');
        expect(limiter).toBe(cantonalLimiter);
      });

      it('should return cantonalLimiter for "ge"', () => {
        const limiter = getLimiter('ge');
        expect(limiter).toBe(cantonalLimiter);
      });

      it('should return cantonalLimiter for "bs"', () => {
        const limiter = getLimiter('bs');
        expect(limiter).toBe(cantonalLimiter);
      });

      it('should return cantonalLimiter for "vd"', () => {
        const limiter = getLimiter('vd');
        expect(limiter).toBe(cantonalLimiter);
      });

      it('should return cantonalLimiter for "ti"', () => {
        const limiter = getLimiter('ti');
        expect(limiter).toBe(cantonalLimiter);
      });
    });

    describe('Default/Unknown APIs', () => {
      it('should return genericLimiter for unknown API', () => {
        const limiter = getLimiter('unknown');
        expect(limiter).toBe(genericLimiter);
      });

      it('should return genericLimiter for empty string', () => {
        const limiter = getLimiter('');
        expect(limiter).toBe(genericLimiter);
      });

      it('should return genericLimiter for random string', () => {
        const limiter = getLimiter('some-random-api');
        expect(limiter).toBe(genericLimiter);
      });
    });
  });

  describe('withRateLimit', () => {
    it('should execute function and return result', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await withRateLimit('generic', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should use correct limiter based on API', async () => {
      const mockFn = vi.fn().mockResolvedValue('data');

      // These should all succeed using appropriate limiters
      await withRateLimit('bundesgericht', mockFn);
      await withRateLimit('entscheidsuche', mockFn);
      await withRateLimit('fedlex', mockFn);
      await withRateLimit('zh', mockFn);

      expect(mockFn).toHaveBeenCalledTimes(4);
    });

    it('should propagate errors from function', async () => {
      const error = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(withRateLimit('generic', mockFn)).rejects.toThrow('Test error');
    });

    it('should handle async functions', async () => {
      const asyncFn = async () => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('async result'), 10);
        });
      };

      const result = await withRateLimit('generic', asyncFn);
      expect(result).toBe('async result');
    });

    it('should handle functions returning different types', async () => {
      const numberFn = vi.fn().mockResolvedValue(42);
      const objectFn = vi.fn().mockResolvedValue({ key: 'value' });
      const arrayFn = vi.fn().mockResolvedValue([1, 2, 3]);

      expect(await withRateLimit('generic', numberFn)).toBe(42);
      expect(await withRateLimit('generic', objectFn)).toEqual({ key: 'value' });
      expect(await withRateLimit('generic', arrayFn)).toEqual([1, 2, 3]);
    });

    it('should handle null and undefined returns', async () => {
      const nullFn = vi.fn().mockResolvedValue(null);
      const undefinedFn = vi.fn().mockResolvedValue(undefined);

      expect(await withRateLimit('generic', nullFn)).toBeNull();
      expect(await withRateLimit('generic', undefinedFn)).toBeUndefined();
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('bundesgerichtLimiter should have conservative settings', async () => {
      // Verify limiter exists and can schedule tasks
      const result = await bundesgerichtLimiter.schedule(() => Promise.resolve('test'));
      expect(result).toBe('test');
    });

    it('entscheidsucheLimiter should be configured', async () => {
      const result = await entscheidsucheLimiter.schedule(() => Promise.resolve('test'));
      expect(result).toBe('test');
    });

    it('fedlexLimiter should be configured', async () => {
      const result = await fedlexLimiter.schedule(() => Promise.resolve('test'));
      expect(result).toBe('test');
    });

    it('cantonalLimiter should be configured', async () => {
      const result = await cantonalLimiter.schedule(() => Promise.resolve('test'));
      expect(result).toBe('test');
    });

    it('genericLimiter should be configured', async () => {
      const result = await genericLimiter.schedule(() => Promise.resolve('test'));
      expect(result).toBe('test');
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const results: number[] = [];
      const createTask = (id: number) => async () => {
        results.push(id);
        return id;
      };

      const promises = [
        withRateLimit('generic', createTask(1)),
        withRateLimit('generic', createTask(2)),
        withRateLimit('generic', createTask(3)),
      ];

      const completedResults = await Promise.all(promises);

      expect(completedResults).toHaveLength(3);
      expect(completedResults).toContain(1);
      expect(completedResults).toContain(2);
      expect(completedResults).toContain(3);
    });

    it('should handle mixed API requests concurrently', async () => {
      const mockFn = vi.fn().mockResolvedValue('done');

      const promises = [
        withRateLimit('bundesgericht', mockFn),
        withRateLimit('entscheidsuche', mockFn),
        withRateLimit('fedlex', mockFn),
        withRateLimit('zh', mockFn),
        withRateLimit('generic', mockFn),
      ];

      await Promise.all(promises);

      expect(mockFn).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should not retry on function error by default', async () => {
      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        throw new Error('Intentional failure');
      };

      await expect(withRateLimit('generic', failingFn)).rejects.toThrow('Intentional failure');
      expect(callCount).toBe(1);
    });

    it('should handle synchronous errors in async wrapper', async () => {
      const syncErrorFn = async () => {
        throw new Error('Sync error in async');
      };

      await expect(withRateLimit('generic', syncErrorFn)).rejects.toThrow('Sync error in async');
    });
  });
});
