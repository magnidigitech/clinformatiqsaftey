const prisma = require('../../server/prisma/client');
const bcrypt = require('bcryptjs');
const { loadMedDRA }      = require('./meddra.seed');
const { loadCountries }   = require('./countries.seed');
const { loadReportTypes } = require('./reporttypes.seed');

async function main() {
  console.log('Seeding reference data and default accounts...');
  await loadReportTypes();
  await loadCountries();

  let org = await prisma.organisation.findFirst();
  if (!org) {
    org = await prisma.organisation.create({
      data: { name: 'Pharmavigil College', type: 'COLLEGE' }
    });
  }

  const passAdmin = await bcrypt.hash('adminpassword123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: passAdmin,
      full_name: 'System Administrator',
      email: 'admin@pharmavigil.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      org_id: org.org_id
    }
  });

  const passStudent = await bcrypt.hash('studentpassword123', 10);
  await prisma.user.upsert({
    where: { username: 'student' },
    update: {},
    create: {
      username: 'student',
      password_hash: passStudent,
      full_name: 'Demo Student',
      email: 'student@pharmavigil.com',
      role: 'STUDENT',
      status: 'ACTIVE',
      org_id: org.org_id
    }
  });

  console.log('Initial accounts ready: admin / adminpassword123, student / studentpassword123');
  await loadMedDRA();
  console.log('Seed complete.');
}

main().catch(console.error);
