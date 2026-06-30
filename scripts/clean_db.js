const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDB() {
  console.log("Starting database cleanup...");

  // Delete in reverse dependency order
  await prisma.sptOrgDosageRegimen.deleteMany();
  await prisma.sptOrgEventCausality.deleteMany();
  await prisma.sptOrgProduct.deleteMany();
  await prisma.sptOrgEvent.deleteMany();
  await prisma.sptOrgCad.deleteMany();
  await prisma.reporter.deleteMany();
  await prisma.caseActionItem.deleteMany();
  await prisma.workflowLog.deleteMany();
  await prisma.instructorFeedback.deleteMany();
  await prisma.auditLog.deleteMany();
  
  await prisma.sptOrgCase.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();

  console.log("Database successfully cleaned! All cases, users, and organizations have been removed.");
}

cleanDB()
  .catch((e) => {
    console.error("Error during cleanup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
