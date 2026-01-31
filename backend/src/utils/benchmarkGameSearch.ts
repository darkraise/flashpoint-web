/**
 * Game Search Endpoint Benchmark
 *
 * Measures performance of game search queries with various filter combinations
 * to identify slow query patterns and optimization opportunities.
 *
 * Usage: npm run benchmark:games
 */

import { GameService, GameSearchQuery } from '../services/GameService';
import { DatabaseService } from '../services/DatabaseService';
import { UserDatabaseService } from '../services/UserDatabaseService';
import { logger } from './logger';

interface BenchmarkResult {
  name: string;
  query: Partial<GameSearchQuery>;
  executionTime: number;
  resultCount: number;
  totalResults: number;
}

/**
 * Execute a benchmark test
 */
async function runBenchmark(
  name: string,
  query: Partial<GameSearchQuery>
): Promise<BenchmarkResult> {
  const gameService = new GameService();

  // Default query parameters
  const fullQuery: GameSearchQuery = {
    sortBy: 'title',
    sortOrder: 'asc',
    page: 1,
    limit: 50,
    showBroken: false,
    showExtreme: false,
    ...query,
  };

  const start = performance.now();

  try {
    const result = await gameService.searchGames(fullQuery);
    const executionTime = Math.round(performance.now() - start);

    return {
      name,
      query: fullQuery,
      executionTime,
      resultCount: result.data.length,
      totalResults: result.total,
    };
  } catch (error) {
    const executionTime = Math.round(performance.now() - start);
    logger.error(`Benchmark "${name}" failed:`, error);
    return {
      name: `${name} (FAILED)`,
      query: fullQuery,
      executionTime,
      resultCount: 0,
      totalResults: 0,
    };
  }
}

/**
 * Run all benchmark tests
 */
async function runAllBenchmarks(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  GAME SEARCH ENDPOINT BENCHMARK                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const benchmarks: BenchmarkResult[] = [];

  // Benchmark 1: No filters (baseline)
  benchmarks.push(await runBenchmark('Baseline (no filters)', {}));

  // Benchmark 2: Search term only
  benchmarks.push(await runBenchmark('Search: "sonic"', { search: 'sonic' }));

  // Benchmark 3: Platform filter
  benchmarks.push(await runBenchmark('Platform: Flash', { platforms: ['Flash'] }));

  // Benchmark 4: Multiple platforms
  benchmarks.push(
    await runBenchmark('Platforms: Flash + HTML5', { platforms: ['Flash', 'HTML5'] })
  );

  // Benchmark 5: Library filter
  benchmarks.push(await runBenchmark('Library: arcade', { library: 'arcade' }));

  // Benchmark 6: Year range
  benchmarks.push(
    await runBenchmark('Years: 2000-2010', { yearFrom: 2000, yearTo: 2010 })
  );

  // Benchmark 7: Tag filter (single tag)
  benchmarks.push(await runBenchmark('Tag: Puzzle', { tags: ['Puzzle'] }));

  // Benchmark 8: Multiple tags
  benchmarks.push(
    await runBenchmark('Tags: Puzzle + Action', { tags: ['Puzzle', 'Action'] })
  );

  // Benchmark 9: Complex filter combination
  benchmarks.push(
    await runBenchmark('Complex: Platform + Library + Years', {
      platforms: ['Flash'],
      library: 'arcade',
      yearFrom: 2005,
      yearTo: 2010,
    })
  );

  // Benchmark 10: Search + filters
  benchmarks.push(
    await runBenchmark('Search + Filters', {
      search: 'mario',
      platforms: ['Flash'],
      library: 'arcade',
    })
  );

  // Benchmark 11: Sort by releaseDate
  benchmarks.push(
    await runBenchmark('Sort: releaseDate DESC', { sortBy: 'releaseDate', sortOrder: 'desc' })
  );

  // Benchmark 12: Sort by developer
  benchmarks.push(await runBenchmark('Sort: developer ASC', { sortBy: 'developer' }));

  // Benchmark 13: Large page size
  benchmarks.push(await runBenchmark('Large page: limit=100', { limit: 100 }));

  // Benchmark 14: Deep pagination
  benchmarks.push(await runBenchmark('Deep pagination: page 10', { page: 10, limit: 50 }));

  // Benchmark 15: Show broken + extreme
  benchmarks.push(
    await runBenchmark('Show broken + extreme', { showBroken: true, showExtreme: true })
  );

  // Print results
  console.log('RESULTS:\n');
  console.log('┌────┬──────────────────────────────────┬──────────┬────────┬──────────┐');
  console.log('│ #  │ Benchmark                        │ Time (ms)│ Results│ Total    │');
  console.log('├────┼──────────────────────────────────┼──────────┼────────┼──────────┤');

  benchmarks.forEach((result, index) => {
    const num = String(index + 1).padStart(2);
    const name = result.name.padEnd(32).substring(0, 32);
    const time = String(result.executionTime).padStart(8);
    const count = String(result.resultCount).padStart(6);
    const total = String(result.totalResults).padStart(8);

    // Highlight slow queries (>100ms)
    if (result.executionTime >= 100) {
      console.log(`│ ${num} │ ${name} │ \x1b[33m${time}\x1b[0m │ ${count} │ ${total} │`);
    } else {
      console.log(`│ ${num} │ ${name} │ ${time} │ ${count} │ ${total} │`);
    }
  });

  console.log('└────┴──────────────────────────────────┴──────────┴────────┴──────────┘\n');

  // Summary statistics
  const times = benchmarks.map(b => b.executionTime);
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const slowQueries = benchmarks.filter(b => b.executionTime >= 100);

  console.log('SUMMARY:\n');
  console.log(`  Average execution time: ${avgTime}ms`);
  console.log(`  Fastest query:          ${minTime}ms`);
  console.log(`  Slowest query:          ${maxTime}ms`);
  console.log(`  Slow queries (≥100ms):  ${slowQueries.length}/${benchmarks.length}`);

  if (slowQueries.length > 0) {
    console.log('\n⚠️  SLOW QUERIES DETECTED:\n');
    slowQueries.forEach(q => {
      console.log(`  - ${q.name}: ${q.executionTime}ms`);
    });
  }

  console.log('\n');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Initialize databases
    console.log('Initializing databases...');
    await DatabaseService.initialize();
    await UserDatabaseService.initialize();

    // Run benchmarks
    await runAllBenchmarks();

    // Close databases
    DatabaseService.close();
    UserDatabaseService.close();

    process.exit(0);
  } catch (error) {
    logger.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runBenchmark, runAllBenchmarks };
