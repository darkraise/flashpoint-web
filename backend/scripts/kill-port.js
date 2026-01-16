#!/usr/bin/env node

/**
 * Helper script to kill processes using specific ports
 * Usage: node scripts/kill-port.js [port]
 * Example: node scripts/kill-port.js 22500
 */

const { execSync } = require('child_process');

const port = process.argv[2] || '22500';

console.log(`🔍 Checking for processes using port ${port}...`);

try {
  // Find process using the port (Windows)
  const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });

  if (!result.trim()) {
    console.log(`✓ Port ${port} is free!`);
    process.exit(0);
  }

  console.log(result);

  // Extract PIDs
  const lines = result.trim().split('\n');
  const pids = new Set();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && !isNaN(pid)) {
      pids.add(pid);
    }
  }

  if (pids.size === 0) {
    console.log(`✓ Port ${port} is free!`);
    process.exit(0);
  }

  console.log(`\n⚠️  Found ${pids.size} process(es) using port ${port}`);
  console.log(`PIDs: ${Array.from(pids).join(', ')}`);

  // Kill each process
  for (const pid of pids) {
    try {
      console.log(`\n🔨 Killing process ${pid}...`);
      // Use /F and /PID (single slash) for Windows
      execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf-8' });
      console.log(`✓ Process ${pid} terminated`);
    } catch (error) {
      console.error(`✗ Failed to kill process ${pid}:`, error.message);
    }
  }

  console.log(`\n✅ Port ${port} should now be free!`);

} catch (error) {
  if (error.status === 1 && error.stderr === '') {
    // findstr returns exit code 1 when nothing is found
    console.log(`✓ Port ${port} is free!`);
  } else {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
