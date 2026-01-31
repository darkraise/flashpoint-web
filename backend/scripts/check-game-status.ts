import { DatabaseService } from '../src/services/DatabaseService';
import { logger } from '../src/utils/logger';

/**
 * Quick script to check game and game_data status
 */

async function checkGameStatus(gameId: string) {
  try {
    console.log('='.repeat(60));
    console.log(`Checking Game Status: ${gameId}`);
    console.log('='.repeat(60));
    console.log();

    // Initialize database
    await DatabaseService.initialize();

    // Query game table
    const gameSql = `
      SELECT id, title, activeDataId, activeDataOnDisk
      FROM game
      WHERE id = ?
    `;
    const game = DatabaseService.get(gameSql, [gameId]);

    if (!game) {
      console.log('❌ Game not found in database');
      return;
    }

    console.log('GAME TABLE:');
    console.log('-'.repeat(60));
    console.log(`Game ID:           ${game.id}`);
    console.log(`Title:             ${game.title}`);
    console.log(`Active Data ID:    ${game.activeDataId || 'None'}`);
    console.log(`Active Data On Disk: ${game.activeDataOnDisk === 1 ? '✅ YES (1)' : '❌ NO (0)'}`);
    console.log();

    // Query game_data table if activeDataId exists
    if (game.activeDataId) {
      const gameDataSql = `
        SELECT id, gameId, title, presentOnDisk, path, size, sha256, dateAdded
        FROM game_data
        WHERE id = ?
      `;
      const gameData = DatabaseService.get(gameDataSql, [game.activeDataId]);

      if (gameData) {
        console.log('GAME_DATA TABLE:');
        console.log('-'.repeat(60));
        console.log(`ID:                ${gameData.id}`);
        console.log(`Game ID:           ${gameData.gameId}`);
        console.log(`Title:             ${gameData.title}`);
        console.log(`Present On Disk:   ${gameData.presentOnDisk === 1 ? '✅ YES (1)' : '❌ NO (0)'}`);
        console.log(`Path:              ${gameData.path || 'NULL'}`);
        console.log(`Size:              ${gameData.size ? `${(gameData.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}`);
        console.log(`SHA256:            ${gameData.sha256 ? gameData.sha256.substring(0, 16) + '...' : 'NULL'}`);
        console.log(`Date Added:        ${gameData.dateAdded || 'Unknown'}`);
        console.log();

        // Check if path is absolute or relative
        if (gameData.path) {
          const isAbsolute = gameData.path.includes(':') || gameData.path.startsWith('/');
          console.log('PATH ANALYSIS:');
          console.log('-'.repeat(60));
          console.log(`Format:            ${isAbsolute ? '❌ ABSOLUTE (needs migration!)' : '✅ RELATIVE (correct)'}`);
          console.log(`Slashes:           ${gameData.path.includes('\\') ? '❌ Backslashes (Windows)' : '✅ Forward slashes'}`);
          console.log();
        }

        // Check if file actually exists on disk
        if (gameData.path && gameData.presentOnDisk === 1) {
          const fs = await import('fs');
          const path = await import('path');
          const { config } = await import('../src/config');

          // Try to resolve path
          let absolutePath: string;
          if (gameData.path.includes(':') || gameData.path.startsWith('/')) {
            // Already absolute
            absolutePath = gameData.path;
          } else {
            // Relative - resolve from Flashpoint root
            absolutePath = path.resolve(config.flashpointPath, gameData.path);
          }

          const exists = fs.existsSync(absolutePath);
          console.log('FILE SYSTEM CHECK:');
          console.log('-'.repeat(60));
          console.log(`Resolved Path:     ${absolutePath}`);
          console.log(`File Exists:       ${exists ? '✅ YES' : '❌ NO'}`);

          if (exists) {
            const stats = fs.statSync(absolutePath);
            console.log(`Actual Size:       ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`DB Size Match:     ${gameData.size === stats.size ? '✅ YES' : `❌ NO (DB: ${gameData.size}, Actual: ${stats.size})`}`);
          }
          console.log();
        }

        // Diagnosis
        console.log('DIAGNOSIS:');
        console.log('-'.repeat(60));
        if (game.activeDataOnDisk === 1 && gameData.presentOnDisk === 1 && gameData.path) {
          console.log('✅ Game is marked as available in database');

          const isAbsolute = gameData.path.includes(':') || gameData.path.startsWith('/');
          if (isAbsolute) {
            console.log('⚠️  Path is ABSOLUTE - needs migration!');
            console.log('   Run: npm run fix-paths');
          } else {
            console.log('✅ Path format is correct (relative)');
          }
        } else if (game.activeDataOnDisk === 0 && gameData.presentOnDisk === 0) {
          console.log('ℹ️  Game data not downloaded yet');
        } else {
          console.log('⚠️  Inconsistent state detected:');
          console.log(`   game.activeDataOnDisk = ${game.activeDataOnDisk}`);
          console.log(`   game_data.presentOnDisk = ${gameData.presentOnDisk}`);
          console.log(`   game_data.path = ${gameData.path || 'NULL'}`);
        }
      } else {
        console.log('❌ game_data entry not found (inconsistent database state)');
      }
    } else {
      console.log('ℹ️  Game has no activeDataId (does not require download)');
    }

    console.log();
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    DatabaseService.close();
  }
}

// Get gameId from command line argument or use default
const gameId = process.argv[2] || '0012de86-aec2-45a5-8f92-f7f3e00703b1';

checkGameStatus(gameId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
