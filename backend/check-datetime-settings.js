const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'user.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n=== Date/Time Format Settings in user_settings ===\n');

const userSettings = db.prepare(`
  SELECT user_id, setting_key, setting_value, created_at, updated_at
  FROM user_settings
  WHERE setting_key IN ('date_format', 'time_format')
  ORDER BY user_id, setting_key
`).all();

if (userSettings.length === 0) {
  console.log('No date/time format settings found in user_settings table.');
} else {
  console.table(userSettings);
}

console.log('\n=== System-wide Date/Time Format Settings (if any) ===\n');

const systemSettings = db.prepare(`
  SELECT id, category, key, value, is_public, updated_at
  FROM system_settings
  WHERE key IN ('app.date_format', 'app.time_format')
  ORDER BY key
`).all();

if (systemSettings.length === 0) {
  console.log('No system-wide date/time format settings found.');
} else {
  console.table(systemSettings);
}

console.log('\n=== User Count ===\n');

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log(`Total users: ${userCount.count}`);

console.log('\n=== Settings Count Per User ===\n');

const settingsPerUser = db.prepare(`
  SELECT user_id, COUNT(*) as settings_count
  FROM user_settings
  WHERE setting_key IN ('date_format', 'time_format')
  GROUP BY user_id
  ORDER BY user_id
`).all();

console.table(settingsPerUser);

db.close();
