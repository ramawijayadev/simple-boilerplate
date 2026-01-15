/**
 * Health Service
 */

import { HealthStatus } from './health.types';

/**
 * Get current health status
 */
export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
