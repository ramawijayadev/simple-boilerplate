/**
 * Health Types
 */

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
}

export interface HealthResponse {
  success: true;
  data: HealthStatus;
  requestId: string;
}
