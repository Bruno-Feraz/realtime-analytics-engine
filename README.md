# Real-time Analytics Engine ⚡📊

Motore di analisi real-time per ingest, processing e query su stream dati con dashboard live.

## 🎯 Caratteristiche

- **Ingest Real-time**: Supporto Kafka, WebSocket, HTTP streaming
- **Processing Stream**: Aggregazioni window-based su dati live
- **TimeSeries DB**: TimescaleDB per dati temporali ottimizzati
- **Query API**: REST API con filtri avanzati e aggregazioni
- **Dashboard Live**: Grafici real-time con aggiornamenti automatici
- **Caching**: Redis per query frequenti ad alte prestazioni
- **Alerting**: Threshold-based alerts su metriche



## 📋 Prerequisiti

- Node.js 18+
- PostgreSQL 15+ / TimescaleDB
- Redis 7+
- Kafka (opzionale per streaming)

## ⚡ Quick Start

### Opzione 1: Docker Compose (Consigliato)

```bash
docker-compose up
```

Accedi:
- Dashboard: `http://localhost:3000`
- API: `http://localhost:3001`
- Grafana: `http://localhost:3002`

### Opzione 2: Installazione Locale

```bash
# Database (TimescaleDB)
docker run -d --name timescaledb -p 5432:5432 timescale/timescaledb:latest-pg15

# Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 🏗️ Architettura

```
realtime-analytics-engine/
├── backend/               # Node.js API server
│   ├── src/
│   │   ├── ingest/       # Data ingestion layer
│   │   ├── processing/   # Stream processing
│   │   ├── query/        # Query engine
│   │   ├── cache/        # Redis cache layer
│   │   └── api/          # REST endpoints
│   └── tests/
├── frontend/             # React dashboard
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── charts/       # Chart components
│   │   └── hooks/        # Custom hooks
├── data-generator/       # Simulatore dati streaming
└── docker-compose.yml
```

## 📊 Use Cases

### 1. IoT Sensor Monitoring
- Ingest da sensori IoT
- Aggregazioni per device/location
- Anomaly detection
- Real-time alerts

### 2. Web Analytics
- Pageviews, sessions, events
- User behavior tracking
- Funnel analysis
- Real-time dashboard

### 3. Financial Trading
- Tick data streaming
- OHLCV aggregations
- Moving averages
- Real-time positions

### 4. Application Monitoring
- Logs streaming
- Error rates
- Response times
- Resource usage

## 🔌 API Endpoints

### Ingest
```typescript
POST   /api/ingest/event          # Single event
POST   /api/ingest/batch          # Batch events
WS     /api/ingest/stream         # WebSocket stream
```

### Query
```typescript
GET    /api/metrics/timeseries    # Time series data
GET    /api/metrics/aggregate     # Aggregated metrics
GET    /api/metrics/realtime      # Last 5min data
POST   /api/query/custom          # Custom SQL query
```

### Analytics
```typescript
GET    /api/analytics/summary     # Overall summary
GET    /api/analytics/top         # Top N entities
GET    /api/analytics/trends      # Trend analysis
```

## 📈 Query Examples

### Time Series Query
```javascript
// Last 24h pageviews per hour
GET /api/metrics/timeseries?
  metric=pageviews&
  interval=1h&
  from=now-24h&
  groupBy=page
```

### Aggregation Query
```javascript
// Top 10 pages by unique visitors
GET /api/analytics/top?
  metric=unique_visitors&
  dimension=page&
  limit=10&
  period=7d
```

### Real-time Query
```javascript
// Active users right now
GET /api/metrics/realtime?
  metric=active_users&
  window=5m
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load testing
npm run test:load

# Generate fake streaming data
npm run generate-data
```

## 📦 Tecnologie

**Backend:**
- Node.js + TypeScript
- Express.js - REST API
- Socket.io - WebSocket server
- KafkaJS - Kafka client
- node-postgres - PostgreSQL driver
- ioredis - Redis client
- Bull - Job queue

**Database:**
- TimescaleDB - Time series extension per PostgreSQL
- Redis - Caching & pub/sub

**Frontend:**
- React 18 + TypeScript
- Recharts - Charting library
- React Query - Data fetching
- Socket.io-client - Real-time updates
- Tailwind CSS - Styling

**Streaming:**
- Apache Kafka - Event streaming
- Socket.io - WebSocket

**Monitoring:**
- Grafana - Dashboard monitoring
- Prometheus - Metrics collection

## ⚡ Performance

- **Ingest**: 50k+ events/sec per node
- **Query**: <50ms per query (cached), <200ms (DB)
- **Storage**: Compressione automatica con TimescaleDB
- **Retention**: Auto-cleanup dati vecchi
- **Scalabilità**: Horizontal scaling ready

## 💾 Database Schema

```sql
-- Hypertable per time series
CREATE TABLE events (
  time        TIMESTAMPTZ NOT NULL,
  event_type  VARCHAR(50),
  user_id     VARCHAR(100),
  properties  JSONB,
  value       NUMERIC
);

SELECT create_hypertable('events', 'time');

-- Continuous aggregates
CREATE MATERIALIZED VIEW events_hourly
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', time) AS hour,
  event_type,
  COUNT(*) as count,
  AVG(value) as avg_value
FROM events
GROUP BY hour, event_type;
```

## 📊 Dashboard Features

- **Live Charts**: Auto-refresh ogni 5s
- **Multiple Views**: Time series, bar, pie, heatmap
- **Date Range Picker**: Quick ranges + custom
- **Drill-down**: Click per dettagli
- **Export**: CSV, JSON, PNG
- **Filters**: Per dimensioni multiple
- **Alerts**: Visual indicators per threshold

## 🔔 Alerting System

```javascript
// Configura alert
POST /api/alerts/create
{
  "name": "High Error Rate",
  "metric": "error_rate",
  "condition": "greater_than",
  "threshold": 5,
  "window": "5m",
  "actions": ["email", "slack"]
}
```

## 🤝 Competenze Dimostrate

✅ **Real-time Processing**: Stream ingestion & processing  
✅ **Time Series DB**: TimescaleDB, ottimizzazioni  
✅ **Caching**: Redis, cache invalidation strategies  
✅ **Full Stack**: Node.js + React, WebSocket  
✅ **Query Optimization**: Indexing, materialized views  
✅ **Scalability**: Horizontal scaling, load balancing

## 🔐 Security

- Rate limiting per IP
- API key authentication
- Query timeout limits
- Input validation
- SQL injection prevention

## 📄 Licenza

MIT License

## 👤 Autore

**Bruno Ferr**  
[GitHub](https://github.com/brunoferr) | [LinkedIn](https://linkedin.com/in/brunoferr)
