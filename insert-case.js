const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Find or create an Organisation
  let org = await prisma.organisation.findFirst({ where: { name: 'Demo University' } });
  if (!org) {
    org = await prisma.organisation.create({
      data: { name: 'Demo University', type: 'COLLEGE' }
    });
  }

  // 2. Find or create a Student User
  let student = await prisma.user.findFirst({ where: { username: 'demostudent' } });
  if (!student) {
    student = await prisma.user.create({
      data: {
        username: 'demostudent',
        password_hash: 'hashed_password_mock',
        role: 'STUDENT',
        org_id: org.org_id,
        full_name: 'Demo Student',
        email: 'student@demo.edu',
        status: 'ACTIVE'
      }
    });
  }

  // Generate unique case number
  const caseNumber = `CASE-${Date.now()}`;

  // 3. Create a Case
  const newCase = await prisma.sptOrgCase.create({
    data: {
      case_number: caseNumber,
      student_id: student.user_id,
      org_id: org.org_id,
      workflow_state: 'DRAFT',
      receipt_date: new Date(),
      aware_date: new Date(),
      serious_flag: 'N'
    }
  });

  // 4. Create some case details like patient and product
  await prisma.sptOrgCad.create({
    data: {
      case_id: newCase.case_id,
      patient_code: `PT-${Math.floor(Math.random() * 1000)}`,
      age_value: Math.floor(Math.random() * 80) + 10,
      age_unit: 'Years',
      sex: Math.random() > 0.5 ? 'Male' : 'Female',
      weight_kg: 70,
      height_cm: 170
    }
  });

  await prisma.sptOrgProduct.create({
    data: {
      case_id: newCase.case_id,
      drug_name: 'Aspirin',
      dose: '500',
      dose_unit: 'mg',
      suspect_flag: 'SUSPECT'
    }
  });

  console.log(`Successfully created case ${newCase.case_number} for student ${student.username} at ${org.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
