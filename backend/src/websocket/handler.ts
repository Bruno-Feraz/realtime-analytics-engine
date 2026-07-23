/**
 * WebSocket handler for real-time updates
 */

import { Server as SocketIOServer } from 'socket.io';
import { redis } from '../index';
import { logger } from '../utils/logger';

export function setupWebSocket(io: SocketIOServer) {
  // Subscribe to Redis pub/sub
  const subscriber = redis.duplicate();

  subscriber.subscribe('events', (err) => {
    if (err) {
      logger.error('Redis subscribe error:', err);
      return;
    }
    logger.info('📡 Subscribed to events channel');
  });

  subscriber.on('message', (channel, message) => {
    if (channel === 'events') {
      try {
        const event = JSON.parse(message);
        io.emit('event', event);
      } catch (err) {
        logger.error('Parse event error:', err);
      }
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('subscribe', (room: string) => {
      socket.join(room);
      logger.info(`Client ${socket.id} subscribed to ${room}`);
    });

    socket.on('unsubscribe', (room: string) => {
      socket.leave(room);
      logger.info(`Client ${socket.id} unsubscribed from ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
}
