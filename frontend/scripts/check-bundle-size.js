#!/usr/bin/env node

/**
 * Performance Budget Checker
 *
 * Analyzes build output and compares against performance budgets
 * Fails CI if budgets are exceeded
 *
 * Usage: node scripts/check-bundle-size.js
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '../dist');
const BUDGET_FILE = path.join(__dirname, '../performance-budget.json');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Format bytes to KB
 */
function formatKB(bytes) {
  return Math.round(bytes / 1024);
}

/**
 * Get all files in directory recursively
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push({
        path: filePath,
        name: file,
        size: stat.size,
        relativePath: path.relative(DIST_DIR, filePath)
      });
    }
  });

  return fileList;
}

/**
 * Analyze build output
 */
function analyzeBuild() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`${colors.red}Error: ${colors.reset}dist/ directory not found. Run 'npm run build' first.`);
    process.exit(1);
  }

  const allFiles = getAllFiles(DIST_DIR);

  // Categorize files
  const jsFiles = allFiles.filter(f => f.name.endsWith('.js'));
  const cssFiles = allFiles.filter(f => f.name.endsWith('.css'));
  const assetFiles = allFiles.filter(f => !f.name.endsWith('.html'));

  // Find initial bundle (index-*.js)
  const initialBundle = jsFiles.find(f => f.name.match(/index-[a-f0-9]+\.js$/));

  // Calculate sizes
  const totalJSSize = jsFiles.reduce((sum, f) => sum + f.size, 0);
  const totalCSSSize = cssFiles.reduce((sum, f) => sum + f.size, 0);
  const totalAssetSize = assetFiles.reduce((sum, f) => sum + f.size, 0);
  const largestChunk = jsFiles.sort((a, b) => b.size - a.size)[0];

  return {
    initialBundle: initialBundle ? formatKB(initialBundle.size) : 0,
    totalJavaScript: formatKB(totalJSSize),
    totalCSS: formatKB(totalCSSSize),
    totalAssets: formatKB(totalAssetSize),
    largestChunk: largestChunk ? formatKB(largestChunk.size) : 0,
    largestChunkName: largestChunk ? largestChunk.name : 'N/A',
    chunkCount: jsFiles.length,
    files: {
      js: jsFiles,
      css: cssFiles,
      total: assetFiles
    }
  };
}

/**
 * Check budget compliance
 */
function checkBudget() {
  const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
  const analysis = analyzeBuild();

  console.log(`\n${colors.bold}${colors.blue}=== Performance Budget Check ===${colors.reset}\n`);

  const checks = [
    {
      name: 'Initial Bundle',
      actual: analysis.initialBundle,
      budget: budget.budgets.initialBundle,
      description: budget.budgets.initialBundle.description
    },
    {
      name: 'Total JavaScript',
      actual: analysis.totalJavaScript,
      budget: budget.budgets.totalJavaScript,
      description: budget.budgets.totalJavaScript.description
    },
    {
      name: 'Total Assets',
      actual: analysis.totalAssets,
      budget: budget.budgets.totalAssets,
      description: budget.budgets.totalAssets.description
    },
    {
      name: 'Largest Chunk',
      actual: analysis.largestChunk,
      budget: budget.budgets.chunkSize,
      description: `${budget.budgets.chunkSize.description} (${analysis.largestChunkName})`
    },
    {
      name: 'Total CSS',
      actual: analysis.totalCSS,
      budget: budget.budgets.cssSize,
      description: budget.budgets.cssSize.description
    }
  ];

  let hasErrors = false;
  let hasWarnings = false;

  checks.forEach(check => {
    const { name, actual, budget, description } = check;
    const status = actual > budget.max ? 'FAIL' : actual > budget.warning ? 'WARN' : 'PASS';

    let statusColor = colors.green;
    let statusSymbol = '✓';

    if (status === 'FAIL') {
      statusColor = colors.red;
      statusSymbol = '✗';
      hasErrors = true;
    } else if (status === 'WARN') {
      statusColor = colors.yellow;
      statusSymbol = '⚠';
      hasWarnings = true;
    }

    const percentage = Math.round((actual / budget.max) * 100);
    const budgetInfo = `${budget.warning}KB (warn) / ${budget.max}KB (max)`;

    console.log(`${statusColor}${statusSymbol} ${name}${colors.reset}`);
    console.log(`  ${description}`);
    console.log(`  Actual: ${colors.bold}${actual}KB${colors.reset} | Budget: ${budgetInfo} | ${percentage}%`);
    console.log('');
  });

  // Summary
  console.log(`${colors.bold}=== Summary ===${colors.reset}\n`);
  console.log(`Total Chunks: ${analysis.chunkCount}`);
  console.log(`Total JS: ${analysis.totalJavaScript}KB`);
  console.log(`Total CSS: ${analysis.totalCSS}KB`);
  console.log(`Total Assets: ${analysis.totalAssets}KB\n`);

  // Top 5 largest chunks
  console.log(`${colors.bold}Top 5 Largest Chunks:${colors.reset}\n`);
  analysis.files.js
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} - ${formatKB(file.size)}KB`);
    });

  console.log('');

  // Exit code
  if (hasErrors) {
    console.log(`${colors.red}${colors.bold}✗ Budget check FAILED${colors.reset}`);
    console.log(`${colors.red}One or more budgets exceeded maximum limits.${colors.reset}\n`);
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`${colors.yellow}${colors.bold}⚠ Budget check passed with WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}Consider optimizing to stay within warning thresholds.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}${colors.bold}✓ Budget check PASSED${colors.reset}`);
    console.log(`${colors.green}All budgets within limits.${colors.reset}\n`);
    process.exit(0);
  }
}

// Run check
try {
  checkBudget();
} catch (error) {
  console.error(`${colors.red}Error:${colors.reset}`, error.message);
  process.exit(1);
}
