/**
 * Database Seeder
 *
 * Seeds the database with sample data using Faker.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { faker } from '@faker-js/faker';
import argon2 from 'argon2';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Seed configuration
const SEED_CONFIG = {
  users: 10,
  examples: 100,
  defaultPassword: 'password123',
};

/**
 * Hash password using Argon2id
 */
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/**
 * Seed users
 */
async function seedUsers() {
  console.log('👤 Seeding users...');

  // Clear existing users and related data
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Cleared existing users');

  const hashedPassword = await hashPassword(SEED_CONFIG.defaultPassword);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      isActive: true,
      emailVerifiedAt: new Date(),
      createdBy: 'seeder',
    },
  });
  console.log(`  ✓ Created admin: ${admin.email}`);

  // Create regular users
  const users = Array.from({ length: SEED_CONFIG.users - 1 }, () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: hashedPassword,
      isActive: faker.datatype.boolean({ probability: 0.9 }),
      emailVerifiedAt: faker.datatype.boolean({ probability: 0.8 }) ? faker.date.past() : null,
      lastLoginAt: faker.datatype.boolean({ probability: 0.6 }) ? faker.date.recent() : null,
      createdBy: 'seeder',
    };
  });

  const created = await prisma.user.createMany({ data: users });
  console.log(`  ✓ Created ${created.count} additional users`);

  return admin;
}

/**
 * Seed examples
 */
async function seedExamples() {
  console.log('📦 Seeding examples...');

  // Clear existing examples
  await prisma.example.deleteMany();
  console.log('  ✓ Cleared existing examples');

  const examples = Array.from({ length: SEED_CONFIG.examples }, () => ({
    name: faker.commerce.productName(),
    description: faker.datatype.boolean({ probability: 0.8 })
      ? faker.commerce.productDescription()
      : null,
    createdBy: faker.helpers.arrayElement(['admin', 'user', 'system']),
  }));

  const created = await prisma.example.createMany({ data: examples });
  console.log(`  ✓ Created ${created.count} examples`);
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...');
  console.log(`   Config: ${SEED_CONFIG.users} users, ${SEED_CONFIG.examples} examples\n`);

  // Set faker seed for reproducible data
  faker.seed(12345);

  await seedUsers();
  console.log('');
  await seedExamples();

  console.log('\n🌱 Seed completed!');
  console.log('\n📋 Test Credentials:');
  console.log(`   Email:    admin@example.com`);
  console.log(`   Password: ${SEED_CONFIG.defaultPassword}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
