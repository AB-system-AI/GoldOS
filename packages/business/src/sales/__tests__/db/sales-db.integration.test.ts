import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';

import { createBusinessContainer } from '../../../container.js';
import { DiscountApprovalRepository } from '../../repositories/discount-approval.repository.js';
import { LoyaltyRepository } from '../../repositories/loyalty.repository.js';
import { InvoiceSearchService } from '../../services/invoice-search.service.js';
import { createTestPrisma, resolveTestDatabaseUrl, withRollback } from './test-db.js';

const databaseUrl = resolveTestDatabaseUrl();

if (databaseUrl) {
  describe('sales database integration', () => {
    const prisma = databaseUrl ? createTestPrisma() : null;

    it('creates customer identity fields and finds via invoice search', async () => {
      if (!prisma) return;

      await withRollback(prisma, async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            slug: `test-${randomUUID().slice(0, 8)}`,
            name: 'Integration Tenant',
            status: 'ACTIVE',
          },
        });

        const organization = await tx.organization.create({
          data: {
            tenantId: tenant.id,
            code: 'ORG1',
            name: 'Integration Org',
            legalName: 'Integration Org LLC',
          },
        });

        const branch = await tx.branch.create({
          data: {
            tenantId: tenant.id,
            organizationId: organization.id,
            code: 'BR1',
            name: 'Main Branch',
          },
        });

        const customer = await tx.customer.create({
          data: {
            tenantId: tenant.id,
            customerNo: `C-${randomUUID().slice(0, 8)}`,
            name: 'Integration Customer',
            phone: '0500000001',
            nationalId: '1234567890',
            passportNumber: 'P1234567',
            taxNumber: '300000000000003',
            commercialRegistration: '1010000000',
          },
        });

        const order = await tx.salesOrder.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            customerId: customer.id,
            orderNo: `ORD-${randomUUID().slice(0, 8)}`,
            orderDate: new Date(),
            status: 'DRAFT',
            paymentStatus: 'UNPAID',
            currency: 'SAR',
            subtotal: 1000,
            discountAmount: 0,
            taxAmount: 150,
            totalAmount: 1150,
          },
        });

        const invoice = await tx.invoice.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            customerId: customer.id,
            salesOrderId: order.id,
            invoiceNo: `INV-${randomUUID().slice(0, 8)}`,
            status: 'ISSUED',
            paymentStatus: 'UNPAID',
            currency: 'SAR',
            subtotal: 1000,
            discountAmount: 0,
            taxAmount: 150,
            totalAmount: 1150,
            amountPaid: 0,
            amountDue: 1150,
            exchangeRateSnapshot: {
              currencyCode: 'SAR',
              exchangeRate: '1.0000',
              providerName: 'MOCK',
            },
          },
        });

        const searchService = new InvoiceSearchService(tx);
        const byNationalId = await searchService.search(tenant.id, { nationalId: '1234567890' });
        assert.equal(byNationalId.total, 1);
        assert.equal(byNationalId.items[0]?.id, invoice.id);

        const byPassport = await searchService.search(tenant.id, { passportNumber: 'P1234567' });
        assert.equal(byPassport.total, 1);

        const byTax = await searchService.search(tenant.id, { taxNumber: '300000000000003' });
        assert.equal(byTax.total, 1);
      });
    });

    it('persists loyalty earn and reverse through repository', async () => {
      if (!prisma) return;

      await withRollback(prisma, async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            slug: `loyalty-${randomUUID().slice(0, 8)}`,
            name: 'Loyalty Tenant',
            status: 'ACTIVE',
          },
        });

        const customer = await tx.customer.create({
          data: {
            tenantId: tenant.id,
            customerNo: `LC-${randomUUID().slice(0, 8)}`,
            name: 'Loyalty Customer',
            phone: '0500000002',
          },
        });

        const loyaltyRepository = new LoyaltyRepository(tx);
        const account = await loyaltyRepository.ensureAccount(tenant.id, customer.id);
        await loyaltyRepository.adjustPoints(tenant.id, account.id, 100, 'EARN', {
          type: 'sales_order',
          id: randomUUID(),
        });

        const updated = await loyaltyRepository.findByCustomer(tenant.id, customer.id);
        assert.equal(Number(updated?.pointsBalance), 100);

        await loyaltyRepository.adjustPoints(tenant.id, account.id, -25, 'REVERSE', {
          type: 'sales_return',
          id: randomUUID(),
        });

        const afterReverse = await loyaltyRepository.findByCustomer(tenant.id, customer.id);
        assert.equal(Number(afterReverse?.pointsBalance), 75);
      });
    });

    it('creates discount approval and blocks pending state', async () => {
      if (!prisma) return;

      await withRollback(prisma, async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            slug: `disc-${randomUUID().slice(0, 8)}`,
            name: 'Discount Tenant',
            status: 'ACTIVE',
          },
        });

        const organization = await tx.organization.create({
          data: {
            tenantId: tenant.id,
            code: 'ORG-D',
            name: 'Discount Org',
            legalName: 'Discount Org LLC',
          },
        });

        const branch = await tx.branch.create({
          data: {
            tenantId: tenant.id,
            organizationId: organization.id,
            code: 'BR-D',
            name: 'Discount Branch',
          },
        });

        const repo = new DiscountApprovalRepository(tx);
        const referenceId = randomUUID();
        const approval = await repo.create(tenant.id, {
          discountType: 'PERCENTAGE',
          requestedValue: 15,
          status: 'PENDING',
          referenceType: 'sales_order',
          referenceId,
          branch: { connect: { id: branch.id } },
        });

        const pending = await repo.findPendingByReference(tenant.id, 'sales_order', referenceId);
        assert.ok(pending);
        assert.equal(pending.id, approval.id);
        assert.equal(pending.status, 'PENDING');
      });
    });

    it('builds exchange rate snapshot via business container', async () => {
      if (!prisma) return;

      await withRollback(prisma, async (tx) => {
        const container = createBusinessContainer({ prisma: tx });
        const tenant = await tx.tenant.create({
          data: {
            slug: `fx-${randomUUID().slice(0, 8)}`,
            name: 'FX Tenant',
            status: 'ACTIVE',
          },
        });

        const organization = await tx.organization.create({
          data: {
            tenantId: tenant.id,
            code: 'ORG-FX',
            name: 'FX Org',
            legalName: 'FX Org LLC',
          },
        });

        const branch = await tx.branch.create({
          data: {
            tenantId: tenant.id,
            organizationId: organization.id,
            code: 'BR-FX',
            name: 'FX Branch',
          },
        });

        const goldPricing = await container.goldPriceService.getBranchPricing(
          tenant.id,
          branch.id,
          'SAR',
        );

        const snapshot = await container.exchangeRateSnapshotService.buildSnapshot({
          tenantId: tenant.id,
          branchId: branch.id,
          currencyCode: 'SAR',
          goldPricing,
        });

        assert.equal(snapshot.currencyCode, 'SAR');
        assert.equal(snapshot.exchangeRate, '1.0000');
        assert.equal(snapshot.manualOverride, false);
        assert.ok(snapshot.snapshotTimestamp);
      });
    });
  });
} else {
  describe('sales database integration', () => {
    it('skips database suites when TEST_DATABASE_URL is not configured', () => {
      assert.ok(true);
    });
  });
}
