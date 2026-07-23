/**
 * Alerts API - Alert management
 */

import { Router } from 'express';
import { db } from '../index';
import { logger } from '../utils/logger';

export const alertsRouter = Router();

/**
 * GET /api/alerts - List all alerts
 */
alertsRouter.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM alerts ORDER BY created_at DESC';
    const result = await db.query(query);
    res.json({ alerts: result.rows });
  } catch (err: any) {
    logger.error('List alerts error:', err);
    res.status(500).json({ error: 'Failed to list alerts' });
  }
});

/**
 * POST /api/alerts/create - Create new alert
 */
alertsRouter.post('/create', async (req, res) => {
  try {
    const { name, metric_name, condition, threshold, window_minutes } = req.body;

    const query = `
      INSERT INTO alerts (name, metric_name, condition, threshold, window_minutes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [
      name,
      metric_name,
      condition,
      threshold,
      window_minutes,
    ]);

    res.status(201).json({ alert: result.rows[0] });
  } catch (err: any) {
    logger.error('Create alert error:', err);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});
