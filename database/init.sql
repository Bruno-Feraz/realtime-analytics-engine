-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Events table (main hypertable)
CREATE TABLE events (
    time        TIMESTAMPTZ NOT NULL,
    event_type  VARCHAR(50) NOT NULL,
    user_id     VARCHAR(100),
    session_id  VARCHAR(100),
    page        VARCHAR(255),
    properties  JSONB,
    value       NUMERIC,
    ip_address  INET,
    user_agent  TEXT
);

-- Convert to hypertable
SELECT create_hypertable('events', 'time');

-- Indexes
CREATE INDEX idx_events_type ON events (event_type, time DESC);
CREATE INDEX idx_events_user ON events (user_id, time DESC);
CREATE INDEX idx_events_session ON events (session_id, time DESC);
CREATE INDEX idx_events_page ON events (page, time DESC);
CREATE INDEX idx_events_properties ON events USING GIN (properties);

-- Continuous aggregate: Hourly stats
CREATE MATERIALIZED VIEW events_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value
FROM events
GROUP BY hour, event_type
WITH NO DATA;

-- Refresh policy
SELECT add_continuous_aggregate_policy('events_hourly',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- Continuous aggregate: Daily stats
CREATE MATERIALIZED VIEW events_daily
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', time) AS day,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(value) as avg_value
FROM events
GROUP BY day, event_type
WITH NO DATA;

-- Refresh policy for daily
SELECT add_continuous_aggregate_policy('events_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);

-- Page views table
CREATE TABLE page_views (
    time        TIMESTAMPTZ NOT NULL,
    user_id     VARCHAR(100),
    session_id  VARCHAR(100),
    page_url    VARCHAR(500),
    referrer    VARCHAR(500),
    duration    INTEGER,
    metadata    JSONB
);

SELECT create_hypertable('page_views', 'time');

-- Metrics table for custom metrics
CREATE TABLE metrics (
    time        TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    tags        JSONB,
    dimensions  JSONB
);

SELECT create_hypertable('metrics', 'time');
CREATE INDEX idx_metrics_name ON metrics (metric_name, time DESC);

-- Compression policy (auto-compress old data)
SELECT add_compression_policy('events', INTERVAL '7 days');
SELECT add_compression_policy('page_views', INTERVAL '7 days');
SELECT add_compression_policy('metrics', INTERVAL '7 days');

-- Retention policy (auto-delete old data)
SELECT add_retention_policy('events', INTERVAL '90 days');
SELECT add_retention_policy('page_views', INTERVAL '90 days');
SELECT add_retention_policy('metrics', INTERVAL '180 days');

-- Alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    condition VARCHAR(20) NOT NULL,
    threshold NUMERIC NOT NULL,
    window_minutes INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT true,
    last_triggered TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Alert history
CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id),
    triggered_at TIMESTAMPTZ NOT NULL,
    metric_value NUMERIC,
    resolved_at TIMESTAMPTZ
);
