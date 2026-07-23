/**
 * Metrics API - Query time series and aggregated data
 */

import { Router } from 'express';
import { db, redis } from '../index';
import { logger } from '../utils/logger';

export const metricsRouter = Router();

/**
 * GET /api/metrics/realtime - Last 5 minutes of data
 */
metricsRouter.get('/realtime', async (req, res) => {
  try {
    const cacheKey = 'metrics:realtime';
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const query = `
      SELECT 
        time_bucket('1 minute', time) AS minute,
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM events
      WHERE time > NOW() - INTERVAL '5 minutes'
      GROUP BY minute, event_type
      ORDER BY minute DESC
    `;

    const result = await db.query(query);

    const data = {
      data: result.rows,
      generated_at: new Date().toISOString(),
    };

    // Cache for 10 seconds
    await redis.setex(cacheKey, 10, JSON.stringify(data));

    res.json(data);
  } catch (err: any) {
    logger.error('Realtime metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch realtime metrics' });
  }
});

/**
 * GET /api/metrics/timeseries - Time series data with custom interval
 */
metricsRouter.get('/timeseries', async (req, res) => {
  try {
    const { 
      metric = 'pageviews',
      interval = '1h',
      from = 'now-24h',
      to = 'now',
      groupBy,
    } = req.query;

    // Parse time range
    const fromTime = parseTimeRange(from as string);
    const toTime = parseTimeRange(to as string);

    const groupByClause = groupBy ? `, ${groupBy}` : '';
    const selectGroupBy = groupBy ? `, ${groupBy}` : '';

    const query = `
      SELECT 
        time_bucket($1, time) AS bucket${selectGroupBy},
        COUNT(*) as value
      FROM events
      WHERE time BETWEEN $2 AND $3
      GROUP BY bucket${groupByClause}
      ORDER BY bucket ASC
    `;

    const result = await db.query(query, [interval, fromTime, toTime]);

    res.json({
      metric,
      interval,
      from: fromTime,
      to: toTime,
      data: result.rows,
    });
  } catch (err: any) {
    logger.error('Timeseries error:', err);
    res.status(500).json({ error: 'Failed to fetch timeseries' });
  }
});

/**
 * GET /api/metrics/aggregate - Aggregated metrics
 */
metricsRouter.get('/aggregate', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const fromTime = parseTimeRange(`now-${period}`);

    const query = `
      SELECT 
        event_type,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        AVG(value) as avg_value
      FROM events
      WHERE time > $1
      GROUP BY event_type
      ORDER BY total_events DESC
    `;

    const result = await db.query(query, [fromTime]);

    res.json({
      period,
      from: fromTime,
      aggregates: result.rows,
    });
  } catch (err: any) {
    logger.error('Aggregate error:', err);
    res.status(500).json({ error: 'Failed to fetch aggregates' });
  }
});

/**
 * Helper: Parse time range strings like "now-24h", "now-7d"
 */
function parseTimeRange(timeStr: string): Date {
  if (timeStr === 'now') {
    return new Date();
  }

  const match = timeStr.match(/now-(\d+)([smhd])/);
  if (!match) {
    throw new Error('Invalid time format');
  }

  const [, amount, unit] = match;
  const now = new Date();
  const value = parseInt(amount);

  switch (unit) {
    case 's':
      return new Date(now.getTime() - value * 1000);
    case 'm':
      return new Date(now.getTime() - value * 60 * 1000);
    case 'h':
      return new Date(now.getTime() - value * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    default:
      throw new Error('Invalid time unit');
  }
}
