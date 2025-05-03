// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed your database
  await prisma.user.create({
    data: {
      name: 'John Doe',
      username: 'john.doe@example.com',
    },
  });
}

main()
  .then(() => {
    console.log('Seeding completed successfully!');
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });