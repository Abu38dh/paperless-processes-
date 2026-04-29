import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deptId = 5; // Dental Department
  const levels = await prisma.$queryRaw<any[]>`
    SELECT level_id, name, "order" FROM levels WHERE department_id = ${deptId} ORDER BY level_id ASC;
  `;

  console.log('Current levels:', levels);

  // Level 7: ا -> Order 1
  // Level 8: ث -> Order 2
  // Level 9: ت -> Order 3
  
  await prisma.$executeRaw`UPDATE levels SET "order" = 1 WHERE level_id = 7`;
  await prisma.$executeRaw`UPDATE levels SET "order" = 2 WHERE level_id = 8`;
  await prisma.$executeRaw`UPDATE levels SET "order" = 3 WHERE level_id = 9`;

  console.log('Updated orders for Dental Department.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

