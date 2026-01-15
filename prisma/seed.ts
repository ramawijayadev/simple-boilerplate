/**
 * Database Seeder
 *
 * Seeds the database with sample data.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.example.deleteMany();
  console.log('✓ Cleared existing examples');

  // Generate 100 example records
  const examples = Array.from({ length: 100 }, (_, i) => ({
    name: `Example ${i + 1}`,
    description: i % 5 === 0 ? null : `Description for example ${i + 1}`,
    createdBy: i % 3 === 0 ? 'admin' : 'user',
  }));

  // Insert in batches
  const created = await prisma.example.createMany({
    data: examples,
  });

  console.log(`✓ Created ${created.count} examples`);
  console.log('🌱 Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
