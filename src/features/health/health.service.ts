/**
 * Health Service
 */

import { HealthStatus } from '@/features/health/health.types';

/**
 * Get current health status
 */
export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
