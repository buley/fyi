-- Aeon Flux D1 Schema for buley.fyi
-- Run with: wrangler d1 execute buley-fyi --file=./schema.sql

-- Sessions table (async propagation from Durable Objects)
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  data TEXT,           -- JSON serialized session data
  schema_version TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Presence snapshots (for analytics)
CREATE TABLE IF NOT EXISTS presence_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_count INTEGER NOT NULL,
  users TEXT,  -- JSON array of user IDs
  snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_route ON sessions(route);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_presence_session ON presence_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_presence_time ON presence_snapshots(snapshot_at);
