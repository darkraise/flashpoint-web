const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function findGame(searchTerm) {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '../../../Data/flashpoint.sqlite');
  const filebuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(filebuffer);

  let results;

  // Special query for finding games with activeDataId
  if (searchTerm === '--with-data') {
    results = db.exec(`
      SELECT id, title, activeDataId, activeDataOnDisk, launchCommand, source
      FROM game
      WHERE activeDataId IS NOT NULL
      LIMIT 20
    `);
  } else {
    // Search for game by title or launch command
    results = db.exec(`
      SELECT id, title, activeDataId, activeDataOnDisk, launchCommand, source
      FROM game
      WHERE title LIKE '%${searchTerm}%' OR launchCommand LIKE '%${searchTerm}%'
      LIMIT 10
    `);
  }

  if (results.length === 0 || results[0].values.length === 0) {
    console.log(`No games found matching: ${searchTerm}`);
    return;
  }

  console.log(`Found ${results[0].values.length} game(s):\n`);

  const columns = results[0].columns;
  results[0].values.forEach((row) => {
    console.log('---');
    columns.forEach((col, i) => {
      console.log(`${col}: ${row[i]}`);
    });
  });

  db.close();
}

const searchTerm = process.argv[2] || 'Red-Warrior';
findGame(searchTerm).catch(console.error);
