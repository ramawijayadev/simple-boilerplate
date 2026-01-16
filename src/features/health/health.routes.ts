/**
 * Health Routes
 */

import { Router } from 'express';
import { index } from '@/features/health/health.controller';

const router = Router();

// GET /health - Health check endpoint
router.get('/', index);

export default router;
