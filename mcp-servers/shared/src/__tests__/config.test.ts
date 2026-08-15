/**
 * Configuration System Tests
 * Tests: config/index.ts (getConfig, validateConfig)
 */

import { describe, it, expect, afterEach } from 'vitest';
import { isAbsolute } from 'node:path';
import { getConfig, defaultDatabasePath } from '../config/config';

describe('defaultDatabasePath', () => {
  const ORIGINAL_XDG = process.env.XDG_CACHE_HOME;
  const ORIGINAL_DB = process.env.DB_DATABASE;

  afterEach(() => {
    if (ORIGINAL_XDG === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = ORIGINAL_XDG;
    if (ORIGINAL_DB === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = ORIGINAL_DB;
  });

  it('should return an absolute path (never cwd-relative)', () => {
    expect(isAbsolute(defaultDatabasePath())).toBe(true);
  });

  it('should place the database in the bettercallclaude cache directory', () => {
    expect(defaultDatabasePath()).toContain('bettercallclaude');
    expect(defaultDatabasePath().endsWith('bettercallclaude.db')).toBe(true);
  });

  it('should honor XDG_CACHE_HOME when set', () => {
    process.env.XDG_CACHE_HOME = '/tmp/xdg-test-cache';
    expect(defaultDatabasePath()).toBe('/tmp/xdg-test-cache/bettercallclaude/bettercallclaude.db');
  });
});

describe('Configuration System', () => {
  describe('getConfig', () => {
    it('should return valid configuration object', () => {
      const config = getConfig();

      expect(config).toBeDefined();
      expect(config.environment).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.apis).toBeDefined();
      expect(config.logging).toBeDefined();
    });

    it('should have database configuration', () => {
      const config = getConfig();

      expect(config.database.type).toBe('sqlite');
      expect(config.database).toHaveProperty('database');
      expect(config.database.poolSize).toBeGreaterThan(0);
    });

    it('should have API configurations', () => {
      const config = getConfig();

      expect(config.apis.bundesgericht).toBeDefined();
      expect(config.apis.bundesgericht.baseUrl).toBeDefined();
      expect(config.apis.bundesgericht.timeout).toBeGreaterThan(0);

      expect(config.apis.cantons).toBeDefined();
      expect(Object.keys(config.apis.cantons)).toContain('ZH');
      expect(Object.keys(config.apis.cantons)).toContain('BE');
    });

    it('should have logging configuration', () => {
      const config = getConfig();

      expect(config.logging.level).toBeDefined();
      expect(['error', 'warn', 'info', 'debug']).toContain(config.logging.level);
    });

    it('should have environment configuration', () => {
      const config = getConfig();

      expect(config.environment).toBeDefined();
      expect(['development', 'staging', 'production', 'test']).toContain(config.environment);
    });
  });
});
