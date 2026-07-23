/**
 * Ingest API - Event ingestion endpoints
 */

import { Router } from 'express';
import { db, redis } from '../index';
import { logger } from '../utils/logger';
import Joi from 'joi';

export const ingestRouter = Router();

// Validation schema
const eventSchema = Joi.object({
  event_type: Joi.string().required(),
  user_id: Joi.string().optional(),
  session_id: Joi.string().optional(),
  page: Joi.string().optional(),
  value: Joi.number().optional(),
  properties: Joi.object().optional(),
});

/**
 * POST /api/ingest/event - Ingest single event
 */
ingestRouter.post('/event', async (req, res) => {
  try {
    const { error, value } = eventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      event_type,
      user_id,
      session_id,
      page,
      value: eventValue,
      properties,
    } = value;

    // Insert into TimescaleDB
    const query = `
      INSERT INTO events (time, event_type, user_id, session_id, page, value, properties, ip_address, user_agent)
      VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      event_type,
      user_id || null,
      session_id || null,
      page || null,
      eventValue || null,
      JSON.stringify(properties || {}),
      req.ip,
      req.headers['user-agent'] || null,
    ]);

    // Invalidate cache
    await redis.del('metrics:realtime');

    // Publish to Redis pub/sub for real-time updates
    await redis.publish('events', JSON.stringify(result.rows[0]));

    res.status(201).json({
      success: true,
      event_id: result.rows[0].time,
    });
  } catch (err: any) {
    logger.error('Ingest error:', err);
    res.status(500).json({ error: 'Failed to ingest event' });
  }
});

/**
 * POST /api/ingest/batch - Ingest batch of events
 */
ingestRouter.post('/batch', async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }

    if (events.length > 1000) {
      return res.status(400).json({ error: 'Max 1000 events per batch' });
    }

    // Validate all events
    for (const event of events) {
      const { error } = eventSchema.validate(event);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
    }

    // Bulk insert
    const values = events.map((e, idx) => {
      const params = [
        e.event_type,
        e.user_id || null,
        e.session_id || null,
        e.page || null,
        e.value || null,
        JSON.stringify(e.properties || {}),
      ];
      const placeholders = params.map((_, i) => `$${idx * 6 + i + 1}`).join(', ');
      return `(NOW(), ${placeholders}, '${req.ip}', '${req.headers['user-agent'] || ''}')`;
    });

    const query = `
      INSERT INTO events (time, event_type, user_id, session_id, page, value, properties, ip_address, user_agent)
      VALUES ${values.join(', ')}
    `;

    const flatParams = events.flatMap(e => [
      e.event_type,
      e.user_id || null,
      e.session_id || null,
      e.page || null,
      e.value || null,
      JSON.stringify(e.properties || {}),
    ]);

    await db.query(query, flatParams);

    // Invalidate cache
    await redis.del('metrics:realtime');

    res.status(201).json({
      success: true,
      ingested: events.length,
    });
  } catch (err: any) {
    logger.error('Batch ingest error:', err);
    res.status(500).json({ error: 'Failed to ingest batch' });
  }
});

/**
 * POST /api/ingest/metric - Ingest custom metric
 */
ingestRouter.post('/metric', async (req, res) => {
  try {
    const { metric_name, metric_value, tags, dimensions } = req.body;

    if (!metric_name || metric_value === undefined) {
      return res.status(400).json({ error: 'metric_name and metric_value required' });
    }

    const query = `
      INSERT INTO metrics (time, metric_name, metric_value, tags, dimensions)
      VALUES (NOW(), $1, $2, $3, $4)
    `;

    await db.query(query, [
      metric_name,
      metric_value,
      JSON.stringify(tags || {}),
      JSON.stringify(dimensions || {}),
    ]);

    res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error('Metric ingest error:', err);
    res.status(500).json({ error: 'Failed to ingest metric' });
  }
});
