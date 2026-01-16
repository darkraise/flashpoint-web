import { DatabaseService } from '../src/services/DatabaseService';

async function inspectFullGameData(gameId: string) {
  try {
    await DatabaseService.initialize();

    console.log(`\n=== Full game table data for: ${gameId} ===\n`);

    const gameSql = `SELECT * FROM game WHERE id = ?`;
    const game = DatabaseService.get(gameSql, [gameId]);

    if (game) {
      console.log('GAME TABLE:');
      Object.entries(game).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log('Game not found');
    }

    console.log(`\n=== Full game_data table data for: ${gameId} ===\n`);

    const gameDataSql = `SELECT * FROM game_data WHERE gameId = ?`;
    const gameDataRows = DatabaseService.all(gameDataSql, [gameId]);

    if (!gameDataRows || gameDataRows.length === 0) {
      console.log('No game_data entries found');
    } else {
      console.log(`Found ${gameDataRows.length} game_data entry(ies):\n`);
      gameDataRows.forEach((row: any, index: number) => {
        console.log(`Entry ${index + 1} (ID: ${row.id}):`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        console.log();
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    DatabaseService.close();
  }
}

const gameId = process.argv[2];
if (!gameId) {
  console.error('Usage: npx ts-node inspect-full-game-data.ts <gameId>');
  process.exit(1);
}

inspectFullGameData(gameId);
