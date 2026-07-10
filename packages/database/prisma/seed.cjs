/**
 * GoldOS Database Seed — Placeholders Only (Phase 2)
 *
 * No business logic. Implement seed data in Phase 3+.
 * Run: pnpm --filter @goldos/database db:seed
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedReferenceData() {
  // Placeholder: global currencies (SAR, USD, AED, EGP)
  // await prisma.currency.upsert({ ... });
}

async function seedPlans() {
  // Placeholder: SaaS plans (starter, professional, enterprise)
  // await prisma.plan.upsert({ ... });
}

async function seedPermissions() {
  // Placeholder: global permission catalog
  // await prisma.permission.upsert({ ... });
}

async function seedCountries() {
  // Placeholder: countries and cities reference data
  // await prisma.country.upsert({ ... });
}

async function seedSystemSettings() {
  // Placeholder: platform-wide system settings
  // await prisma.systemSetting.upsert({ ... });
}

async function seedDemoTenant() {
  // Placeholder: demo tenant, organization, branch, admin user
  // Disabled in production — implement in development seed profile only
}

async function main() {
  console.log('GoldOS seed: placeholder mode (no data written).');

  await seedReferenceData();
  await seedPlans();
  await seedPermissions();
  await seedCountries();
  await seedSystemSettings();
  await seedDemoTenant();

  console.log('Seed placeholders complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
