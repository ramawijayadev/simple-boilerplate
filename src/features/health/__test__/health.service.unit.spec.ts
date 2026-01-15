/**
 * Health Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { getHealthStatus } from '@/features/health/health.service';

describe('Health Service', () => {
  describe('getHealthStatus', () => {
    it('should return ok status', () => {
      const result = getHealthStatus();

      expect(result.status).toBe('ok');
    });

    it('should return valid timestamp', () => {
      const result = getHealthStatus();

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('should return timestamp close to current time', () => {
      const before = new Date().toISOString();
      const result = getHealthStatus();
      const after = new Date().toISOString();

      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });
});
