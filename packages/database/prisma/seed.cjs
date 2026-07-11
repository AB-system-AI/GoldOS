/**
 * GoldOS Database Seed — Phase 4 Core Business Foundation
 * Run: pnpm --filter @goldos/database db:seed
 */

const { PrismaClient } = require('@prisma/client');
const { seedPermissions } = require('./seed-permissions.cjs');

const prisma = new PrismaClient();

const CURRENCIES = [
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', decimals: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', decimals: 2 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', decimals: 3 },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', decimals: 3 },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
];

const COUNTRIES = [
  { code: 'SA', code3: 'SAU', name: 'Saudi Arabia', phoneCode: '+966' },
  { code: 'AE', code3: 'ARE', name: 'United Arab Emirates', phoneCode: '+971' },
  { code: 'EG', code3: 'EGY', name: 'Egypt', phoneCode: '+20' },
  { code: 'KW', code3: 'KWT', name: 'Kuwait', phoneCode: '+965' },
  { code: 'BH', code3: 'BHR', name: 'Bahrain', phoneCode: '+973' },
  { code: 'QA', code3: 'QAT', name: 'Qatar', phoneCode: '+974' },
  { code: 'US', code3: 'USA', name: 'United States', phoneCode: '+1' },
  { code: 'GB', code3: 'GBR', name: 'United Kingdom', phoneCode: '+44' },
];

const CITIES = {
  SA: ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah'],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  EG: ['Cairo', 'Alexandria', 'Giza'],
};

const GOLD_PRICE_PROVIDERS = [
  {
    code: 'manual',
    name: 'Manual Override Provider',
    priority: 0,
    apiKeyRequired: false,
    config: { type: 'manual', description: 'Reads tenant manual overrides from database' },
  },
  {
    code: 'mock',
    name: 'Mock Gold Price Provider',
    priority: 100,
    apiKeyRequired: false,
    config: { type: 'mock', description: 'Development fallback provider with static prices' },
  },
  {
    code: 'lbma',
    name: 'LBMA Spot (Reserved)',
    priority: 10,
    apiKeyRequired: true,
    isActive: false,
    config: { type: 'premium', description: 'Future premium LBMA integration slot' },
  },
  {
    code: 'kitco',
    name: 'Kitco Market Data (Reserved)',
    priority: 20,
    apiKeyRequired: true,
    isActive: false,
    config: { type: 'premium', description: 'Future premium Kitco integration slot' },
  },
];

async function seedReferenceData() {
  for (const currency of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      create: currency,
      update: {
        name: currency.name,
        symbol: currency.symbol,
        decimals: currency.decimals,
        deletedAt: null,
      },
    });
  }
  console.log(`Seeded ${CURRENCIES.length} currencies.`);
}

async function seedCountries() {
  for (const country of COUNTRIES) {
    const record = await prisma.country.upsert({
      where: { code: country.code },
      create: country,
      update: {
        name: country.name,
        phoneCode: country.phoneCode,
        deletedAt: null,
      },
    });

    const cityNames = CITIES[country.code] ?? [];
    for (const cityName of cityNames) {
      await prisma.city.upsert({
        where: {
          countryId_name_stateCode: {
            countryId: record.id,
            name: cityName,
            stateCode: null,
          },
        },
        create: {
          countryId: record.id,
          name: cityName,
        },
        update: {
          isActive: true,
          deletedAt: null,
        },
      });
    }
  }
  console.log(`Seeded ${COUNTRIES.length} countries with cities.`);
}

async function seedEnterpriseReferenceData() {
  for (const provider of GOLD_PRICE_PROVIDERS) {
    await prisma.goldPriceProvider.upsert({
      where: { code: provider.code },
      create: {
        code: provider.code,
        name: provider.name,
        priority: provider.priority,
        apiKeyRequired: provider.apiKeyRequired,
        isActive: provider.isActive ?? true,
        config: provider.config,
      },
      update: {
        name: provider.name,
        priority: provider.priority,
        apiKeyRequired: provider.apiKeyRequired,
        isActive: provider.isActive ?? true,
        config: provider.config,
        deletedAt: null,
      },
    });
  }
  console.log(`Seeded ${GOLD_PRICE_PROVIDERS.length} gold price providers.`);
}

async function seedPermissionsCatalog() {
  const count = await seedPermissions(prisma);
  console.log(`Seeded ${count} permissions.`);
}

async function main() {
  console.log('GoldOS seed: Phase 4 core business foundation.');

  await seedReferenceData();
  await seedPermissionsCatalog();
  await seedCountries();
  await seedEnterpriseReferenceData();

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
