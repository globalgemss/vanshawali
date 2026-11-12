-- Backend identity + sessions. No public signup; initial one-time bootstrap token.
CREATE TABLE IF NOT EXISTS auth_users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 display_name TEXT NOT NULL, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id,expires_at);
CREATE TABLE IF NOT EXISTS setup_tokens (
 token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, used_at INTEGER
);
CREATE TABLE IF NOT EXISTS login_attempts (
 key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_started INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS family_invites (
 token_hash TEXT PRIMARY KEY, family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')), expires_at INTEGER NOT NULL,
 created_by TEXT NOT NULL, accepted_by TEXT, accepted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_family_invites_family ON family_invites(family_id);
