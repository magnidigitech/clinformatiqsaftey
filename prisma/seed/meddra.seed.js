// prisma/seed/meddra.seed.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function loadMedDRA() {
  const filePath = path.join(__dirname, '../../data/meddra_v26.json');

  if (!fs.existsSync(filePath)) {
    console.error('ERROR: data/meddra_v26.json not found.');
    console.error('Download MedDRA v26.1 from https://www.meddra.org/');
    console.error('Convert to JSON using scripts/load-meddra.js');
    process.exit(1);
  }

  const terms = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loading ${terms.length} MedDRA terms...`);

  // Batch insert in chunks of 500 for performance
  const chunkSize = 500;
  for (let i = 0; i < terms.length; i += chunkSize) {
    const chunk = terms.slice(i, i + chunkSize);
    await prisma.meddraTerm.createMany({ data: chunk, skipDuplicates: true });
    process.stdout.write(`\r  Loaded ${Math.min(i + chunkSize, terms.length)} / ${terms.length}`);
  }
  console.log('\nMedDRA terms loaded successfully.');
}

module.exports = { loadMedDRA };
