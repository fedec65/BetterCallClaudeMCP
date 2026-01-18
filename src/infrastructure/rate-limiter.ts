import Bottleneck from 'bottleneck';

/**
 * Rate limiters for Swiss legal APIs
 * Configured per API to respect their limits
 */

// Bundesgericht API - Conservative limit
export const bundesgerichtLimiter = new Bottleneck({
  minTime: 2000, // 2 seconds between requests
  maxConcurrent: 1,
  reservoir: 30, // 30 requests
  reservoirRefreshAmount: 30,
  reservoirRefreshInterval: 60 * 1000, // per minute
});

// Entscheidsuche API - More permissive
export const entscheidsucheLimiter = new Bottleneck({
  minTime: 1000, // 1 second between requests
  maxConcurrent: 2,
  reservoir: 60, // 60 requests
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000, // per minute
});

// Fedlex SPARQL - Standard limit
export const fedlexLimiter = new Bottleneck({
  minTime: 1500, // 1.5 seconds between requests
  maxConcurrent: 2,
  reservoir: 40, // 40 requests
  reservoirRefreshAmount: 40,
  reservoirRefreshInterval: 60 * 1000, // per minute
});

// Cantonal court APIs - Conservative default
export const cantonalLimiter = new Bottleneck({
  minTime: 2000, // 2 seconds between requests
  maxConcurrent: 1,
  reservoir: 20, // 20 requests
  reservoirRefreshAmount: 20,
  reservoirRefreshInterval: 60 * 1000, // per minute
});

// Generic limiter for unknown/new APIs
export const genericLimiter = new Bottleneck({
  minTime: 3000, // 3 seconds between requests (very conservative)
  maxConcurrent: 1,
  reservoir: 15,
  reservoirRefreshAmount: 15,
  reservoirRefreshInterval: 60 * 1000,
});

/**
 * Get the appropriate limiter for a given API
 */
export function getLimiter(api: string): Bottleneck {
  switch (api) {
    case 'bundesgericht':
    case 'bger':
      return bundesgerichtLimiter;
    case 'entscheidsuche':
      return entscheidsucheLimiter;
    case 'fedlex':
    case 'sparql':
      return fedlexLimiter;
    case 'zh':
    case 'be':
    case 'ge':
    case 'bs':
    case 'vd':
    case 'ti':
      return cantonalLimiter;
    default:
      return genericLimiter;
  }
}

/**
 * Execute a function with rate limiting
 */
export async function withRateLimit<T>(
  api: string,
  fn: () => Promise<T>
): Promise<T> {
  const limiter = getLimiter(api);
  return limiter.schedule(fn);
}
