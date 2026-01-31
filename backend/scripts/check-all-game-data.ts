import { DatabaseService } from '../src/services/DatabaseService';

async function checkAllGameData(gameId: string) {
  try {
    await DatabaseService.initialize();

    console.log(`\n=== All game_data entries for gameId: ${gameId} ===\n`);

    const sql = `
      SELECT id, gameId, presentOnDisk, path, title, sha256
      FROM game_data
      WHERE gameId = ?
      ORDER BY id
    `;

    const rows = DatabaseService.all(sql, [gameId]);

    if (!rows || rows.length === 0) {
      console.log('No game_data entries found');
    } else {
      console.log(`Found ${rows.length} game_data entry(ies):\n`);
      rows.forEach((row: any, index: number) => {
        console.log(`Entry ${index + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Title: ${row.title}`);
        console.log(`  presentOnDisk: ${row.presentOnDisk} ${row.presentOnDisk === 1 ? '✅' : row.presentOnDisk === 0 ? '❌' : '⚪'}`);
        console.log(`  Path: ${row.path || 'NULL'}`);
        console.log(`  SHA256: ${row.sha256?.substring(0, 16)}...`);
        console.log();
      });
    }

    // Also check what the query returns with MAX()
    console.log('=== Query with MAX(presentOnDisk) (what backend returns) ===\n');
    const querySql = `
      SELECT MAX(gd.presentOnDisk) as presentOnDisk
      FROM game g
      LEFT JOIN game_data gd ON gd.gameId = g.id
      WHERE g.id = ?
      GROUP BY g.id
    `;
    const result = DatabaseService.get(querySql, [gameId]);
    console.log(`MAX(presentOnDisk): ${result.presentOnDisk} ${result.presentOnDisk === 1 ? '✅' : result.presentOnDisk === 0 ? '❌' : '⚪'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    DatabaseService.close();
  }
}

const gameId = process.argv[2];
if (!gameId) {
  console.error('Usage: npx ts-node check-all-game-data.ts <gameId>');
  process.exit(1);
}

checkAllGameData(gameId);
