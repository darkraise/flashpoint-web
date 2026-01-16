const StreamZip = require('node-stream-zip');

async function searchZip(zipPath, searchPattern) {
  console.log(`Searching in: ${zipPath}`);
  console.log(`Pattern: ${searchPattern}\n`);

  const zip = new StreamZip.async({ file: zipPath });

  try {
    const entries = await zip.entries();
    const matches = [];

    for (const [name, entry] of Object.entries(entries)) {
      if (name.toLowerCase().includes(searchPattern.toLowerCase())) {
        matches.push(name);
      }
    }

    if (matches.length === 0) {
      console.log('No matches found');
    } else {
      console.log(`Found ${matches.length} match(es):`);
      matches.forEach(match => console.log(`  ${match}`));
    }
  } finally {
    await zip.close();
  }
}

const zipPath = process.argv[2];
const searchPattern = process.argv[3] || '';

if (!zipPath) {
  console.error('Usage: node search-zip.js <zip-path> <search-pattern>');
  process.exit(1);
}

searchZip(zipPath, searchPattern).catch(console.error);
