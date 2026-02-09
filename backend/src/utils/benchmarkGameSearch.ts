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

async function runBenchmark(
  name: string,
  query: Partial<GameSearchQuery>
): Promise<BenchmarkResult> {
  const gameService = new GameService();

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

async function runAllBenchmarks(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  GAME SEARCH ENDPOINT BENCHMARK                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const benchmarks: BenchmarkResult[] = [];

  benchmarks.push(await runBenchmark('Baseline (no filters)', {}));
  benchmarks.push(await runBenchmark('Search: "sonic"', { search: 'sonic' }));
  benchmarks.push(await runBenchmark('Platform: Flash', { platforms: ['Flash'] }));
  benchmarks.push(
    await runBenchmark('Platforms: Flash + HTML5', { platforms: ['Flash', 'HTML5'] })
  );

  benchmarks.push(await runBenchmark('Library: arcade', { library: 'arcade' }));
  benchmarks.push(await runBenchmark('Years: 2000-2010', { yearFrom: 2000, yearTo: 2010 }));
  benchmarks.push(await runBenchmark('Tag: Puzzle', { tags: ['Puzzle'] }));
  benchmarks.push(await runBenchmark('Tags: Puzzle + Action', { tags: ['Puzzle', 'Action'] }));
  benchmarks.push(
    await runBenchmark('Complex: Platform + Library + Years', {
      platforms: ['Flash'],
      library: 'arcade',
      yearFrom: 2005,
      yearTo: 2010,
    })
  );

  benchmarks.push(
    await runBenchmark('Search + Filters', {
      search: 'mario',
      platforms: ['Flash'],
      library: 'arcade',
    })
  );

  benchmarks.push(
    await runBenchmark('Sort: releaseDate DESC', { sortBy: 'releaseDate', sortOrder: 'desc' })
  );

  benchmarks.push(await runBenchmark('Sort: developer ASC', { sortBy: 'developer' }));
  benchmarks.push(await runBenchmark('Large page: limit=100', { limit: 100 }));
  benchmarks.push(await runBenchmark('Deep pagination: page 10', { page: 10, limit: 50 }));
  benchmarks.push(
    await runBenchmark('Show broken + extreme', { showBroken: true, showExtreme: true })
  );

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

    if (result.executionTime >= 100) {
      console.log(`│ ${num} │ ${name} │ \x1b[33m${time}\x1b[0m │ ${count} │ ${total} │`);
    } else {
      console.log(`│ ${num} │ ${name} │ ${time} │ ${count} │ ${total} │`);
    }
  });

  console.log('└────┴──────────────────────────────────┴──────────┴────────┴──────────┘\n');

  const times = benchmarks.map((b) => b.executionTime);
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const slowQueries = benchmarks.filter((b) => b.executionTime >= 100);

  console.log('SUMMARY:\n');
  console.log(`  Average execution time: ${avgTime}ms`);
  console.log(`  Fastest query:          ${minTime}ms`);
  console.log(`  Slowest query:          ${maxTime}ms`);
  console.log(`  Slow queries (≥100ms):  ${slowQueries.length}/${benchmarks.length}`);

  if (slowQueries.length > 0) {
    console.log('\n⚠️  SLOW QUERIES DETECTED:\n');
    slowQueries.forEach((q) => {
      console.log(`  - ${q.name}: ${q.executionTime}ms`);
    });
  }

  console.log('\n');
}

async function main(): Promise<void> {
  try {
    console.log('Initializing databases...');
    await DatabaseService.initialize();
    await UserDatabaseService.initialize();

    await runAllBenchmarks();

    DatabaseService.close();
    UserDatabaseService.close();

    process.exit(0);
  } catch (error) {
    logger.error('Benchmark failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runBenchmark, runAllBenchmarks };
