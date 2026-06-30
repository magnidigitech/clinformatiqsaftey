// prisma/seed/seed.js
const { loadMedDRA }      = require('./meddra.seed');
const { loadCountries }   = require('./countries.seed');
const { loadReportTypes } = require('./reporttypes.seed');

async function main() {
  console.log('Seeding real reference data only — no mock users or cases.');
  await loadReportTypes();
  await loadCountries();
  await loadMedDRA();       // run last — largest dataset
  console.log('Seed complete. Start the app and register your first user.');
}

main().catch(console.error);
