/**
 * Analytics API - Advanced analytics endpoints
 */

import { Router } from 'express';
import { db } from '../index';
import { logger } from '../utils/logger';

export const analyticsRouter = Router();

/**
 * GET /api/analytics/summary - Overall summary stats
 */
analyticsRouter.get('/summary', async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT event_type) as event_types,
        MIN(time) as first_event,
        MAX(time) as last_event
      FROM events
      WHERE time > NOW() - INTERVAL '${period}'
    `;

    const result = await db.query(query);

    res.json({
      period,
      summary: result.rows[0],
    });
  } catch (err: any) {
    logger.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * GET /api/analytics/top - Top N entities by metric
 */
analyticsRouter.get('/top', async (req, res) => {
  try {
    const {
      dimension = 'page',
      metric = 'pageviews',
      limit = 10,
      period = '24h',
    } = req.query;

    const query = `
      SELECT 
        ${dimension},
        COUNT(*) as ${metric},
        COUNT(DISTINCT user_id) as unique_users
      FROM events
      WHERE time > NOW() - INTERVAL '${period}'
        AND ${dimension} IS NOT NULL
      GROUP BY ${dimension}
      ORDER BY ${metric} DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);

    res.json({
      dimension,
      metric,
      period,
      top: result.rows,
    });
  } catch (err: any) {
    logger.error('Top error:', err);
    res.status(500).json({ error: 'Failed to fetch top entities' });
  }
});

/**
 * GET /api/analytics/trends - Trend analysis
 */
analyticsRouter.get('/trends', async (req, res) => {
  try {
    const { metric = 'events', period = '7d' } = req.query;

    const query = `
      SELECT 
        time_bucket('1 day', time) AS day,
        COUNT(*) as value
      FROM events
      WHERE time > NOW() - INTERVAL '${period}'
      GROUP BY day
      ORDER BY day ASC
    `;

    const result = await db.query(query);

    // Calculate trend (simple linear regression slope)
    const values = result.rows.map(r => r.value);
    const trend = calculateTrend(values);

    res.json({
      metric,
      period,
      data: result.rows,
      trend: {
        direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat',
        slope: trend,
      },
    });
  } catch (err: any) {
    logger.error('Trends error:', err);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * Helper: Calculate simple trend (linear regression slope)
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}
