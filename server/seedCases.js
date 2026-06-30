const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const user = await prisma.user.findFirst({
    where: { role: 'STUDENT' }
  });

  if (!user) {
    console.log("No student user found to attach cases to!");
    process.exit(1);
  }

  // Case 1
  await prisma.sptOrgCase.create({
    data: {
      case_number: '2026US000001',
      student_id: user.user_id,
      org_id: user.org_id,
      workflow_state: 'DRAFT',
      receipt_date: new Date('2026-05-01'),
      aware_date: new Date('2026-05-02'),
      case_type: 'Spontaneous',
      serious_flag: 'Y',
      patient: {
        create: {
          dob: new Date('1985-06-15'),
          age_value: 40,
          age_unit: 'Years',
          sex: 'Male',
          patient_code: 'JD',
        }
      },
      products: {
        create: [
          { drug_name: 'Amoxicillin' }
        ]
      },
      reporters: {
        create: [
          {
            first_name: 'John',
            last_name: 'Doe',
            country: 'United States',
            reporter_type: 'Physician'
          }
        ]
      },
      workflow_logs: {
        create: [
          {
            to_state: 'DRAFT',
            actioned_by: user.user_id,
            comments: 'Initial report for case 1'
          }
        ]
      }
    }
  });

  // Case 2
  await prisma.sptOrgCase.create({
    data: {
      case_number: '2026EU000002',
      student_id: user.user_id,
      org_id: user.org_id,
      workflow_state: 'SUBMITTED',
      receipt_date: new Date('2026-05-10'),
      aware_date: new Date('2026-05-11'),
      case_type: 'Clinical Trial',
      serious_flag: 'N',
      patient: {
        create: {
          dob: new Date('1990-11-20'),
          age_value: 35,
          age_unit: 'Years',
          sex: 'Female',
          patient_code: 'AS',
        }
      },
      products: {
        create: [
          { drug_name: 'Ibuprofen' }
        ]
      },
      reporters: {
        create: [
          {
            first_name: 'Anna',
            last_name: 'Smith',
            country: 'Germany',
            reporter_type: 'Consumer'
          }
        ]
      },
      workflow_logs: {
        create: [
          {
            to_state: 'SUBMITTED',
            actioned_by: user.user_id,
            comments: 'Initial report for case 2 submitted'
          }
        ]
      }
    }
  });

  console.log("Cases created successfully!");
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
