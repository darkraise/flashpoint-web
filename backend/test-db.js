const BetterSqlite3 = require('better-sqlite3');

try {
  const db = new BetterSqlite3('./user.db');

  console.log('Testing login_attempts INSERT...');
  const stmt = db.prepare('INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)');
  const result = stmt.run('admin', '::1', 1);
  console.log('Success:', result);

  db.close();
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
