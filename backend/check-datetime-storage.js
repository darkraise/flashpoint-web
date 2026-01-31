const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'user.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n=== Checking DateTime Storage Format ===\n');

// Check users table
console.log('--- USERS TABLE ---');
const users = db.prepare(`
  SELECT id, username, created_at, updated_at, last_login_at
  FROM users
  LIMIT 5
`).all();
console.table(users);

// Check activity_logs table
console.log('\n--- ACTIVITY_LOGS TABLE ---');
const activities = db.prepare(`
  SELECT id, user_id, action, created_at
  FROM activity_logs
  ORDER BY created_at DESC
  LIMIT 5
`).all();
console.table(activities);

// Check user_settings table
console.log('\n--- USER_SETTINGS TABLE ---');
const userSettings = db.prepare(`
  SELECT id, user_id, setting_key, created_at, updated_at
  FROM user_settings
  LIMIT 5
`).all();
console.table(userSettings);

// Check system_settings table
console.log('\n--- SYSTEM_SETTINGS TABLE ---');
const systemSettings = db.prepare(`
  SELECT id, category, key, updated_at
  FROM system_settings
  LIMIT 5
`).all();
console.table(systemSettings);

// Check refresh_tokens table
console.log('\n--- REFRESH_TOKENS TABLE ---');
const tokens = db.prepare(`
  SELECT id, user_id, expires_at, created_at, revoked_at
  FROM refresh_tokens
  LIMIT 5
`).all();
console.table(tokens);

// Check user_game_plays table
console.log('\n--- USER_GAME_PLAYS TABLE ---');
const plays = db.prepare(`
  SELECT id, user_id, game_title, started_at, ended_at
  FROM user_game_plays
  ORDER BY started_at DESC
  LIMIT 5
`).all();
console.table(plays);

// Check job_execution_logs table
console.log('\n--- JOB_EXECUTION_LOGS TABLE ---');
const jobLogs = db.prepare(`
  SELECT id, job_id, started_at, completed_at
  FROM job_execution_logs
  ORDER BY started_at DESC
  LIMIT 5
`).all();
console.table(jobLogs);

console.log('\n=== Current JavaScript Date (for comparison) ===');
console.log('new Date().toISOString():', new Date().toISOString());
console.log("datetime('now') in SQLite:", db.prepare("SELECT datetime('now') as dt").get());
console.log("datetime('now', 'utc') in SQLite:", db.prepare("SELECT datetime('now', 'utc') as dt").get());

db.close();
