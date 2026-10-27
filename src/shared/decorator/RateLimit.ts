import { SkipThrottle, Throttle, seconds } from '@nestjs/throttler';

export const RateLimit = (limit: number, ttlSeconds: number) =>
  Throttle({ default: { limit, ttl: seconds(ttlSeconds) } });

export const SkipRateLimit = () => SkipThrottle({ default: true });
