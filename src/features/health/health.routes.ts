/**
 * Health Routes
 */

import { Router } from 'express';
import { getHealth } from '@/features/health/health.controller';

const router = Router();

// GET /health - Health check endpoint
router.get('/', getHealth);

export default router;
