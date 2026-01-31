// Quick script to fix theme color defaults for existing users
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'user.db');
const db = new Database(dbPath);

console.log('Fixing theme color defaults...');

// Update users with 'blue' to 'blue-500'
const result1 = db.prepare(`
  UPDATE users
  SET theme_color = 'blue-500'
  WHERE theme_color = 'blue' OR theme_color IS NULL
`).run();

console.log(`Updated ${result1.changes} user(s) theme_color from 'blue' to 'blue-500'`);

// List all users with their current theme settings
const users = db.prepare(`
  SELECT id, username, theme_color, surface_color FROM users
`).all();

console.log('\nCurrent user theme settings:');
users.forEach(user => {
  console.log(`  ${user.username}: theme=${user.theme_color}, surface=${user.surface_color}`);
});

db.close();
console.log('\nDone!');
