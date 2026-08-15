// Disable the API rate limiter in tests so the suite doesn't serialize at 1s.
process.env.TAS_API_MIN_INTERVAL_MS = '0';
