const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Try to find the first student user to assign the case
  let user = await prisma.user.findFirst({
    where: { role: 'STUDENT' }
  });

  if (!user) {
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.error("No user found in the database. Run seeding first.");
    process.exit(1);
  }

  // Generate a random case number
  const caseNumber = `2011NA${Math.floor(100000 + Math.random() * 900000)}`;

  const newCase = await prisma.sptOrgCase.create({
    data: {
      case_number: caseNumber,
      student_id: user.user_id,
      org_id: user.org_id,
      workflow_state: 'DRAFT',
      receipt_date: new Date('2011-06-24'),
      case_type: 'Spontaneous',
      serious_flag: 'Y',
      patient: {
        create: {
          patient_code: 'JY',
          dob: new Date('1980-01-01'),
          age_value: 31,
          age_unit: 'Years',
          sex: 'Female',
          medical_history: 'Hypertension'
        }
      },
      products: {
        create: {
          drug_name: 'Cure All',
          dose: '500',
          dose_unit: 'mg',
          route: 'Oral',
          frequency: 'BID',
          suspect_flag: 'SUSPECT',
          indication: 'Infection'
        }
      },
      reporters: {
        create: {
          reporter_type: 'Physician',
          first_name: 'Leonard',
          last_name: 'McCormik',
          qualification: 'MD',
          country: 'UNITED STATES',
          institution: 'Saint Anthony Hospital',
          email: 'leonard@example.com'
        }
      }
    },
    include: {
      patient: true,
      products: true,
      reporters: true
    }
  });

  console.log('Created Mock Case:', newCase.case_number);
  console.log('Case ID:', newCase.case_id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
