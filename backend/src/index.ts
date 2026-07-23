/**
 * Real-time Analytics Engine - Backend Server
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import Redis from 'ioredis';

import { ingestRouter } from './api/ingest';
import { metricsRouter } from './api/metrics';
import { analyticsRouter } from './api/analytics';
import { alertsRouter } from './api/alerts';
import { setupWebSocket } from './websocket/handler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Database connections
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/ingest', ingestRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/alerts', alertsRouter);

// WebSocket setup
setupWebSocket(io);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Analytics engine ready`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing gracefully');
  await db.end();
  await redis.quit();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
