import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';

import { CustomerRepository } from '../../../repositories/customer.repository.js';
import { BuybackRepository } from '../../repositories/buyback.repository.js';
import { InvoiceRepository } from '../../repositories/invoice.repository.js';
import { PaymentRepository } from '../../repositories/payment.repository.js';
import { SalesExchangeRepository } from '../../repositories/sales-exchange.repository.js';
import { SalesReturnRepository } from '../../repositories/sales-return.repository.js';
import { createTestPrisma, resolveTestDatabaseUrl, withRollback } from './test-db.js';

const databaseUrl = resolveTestDatabaseUrl();

async function seedSalesFixture(tx: ReturnType<typeof createTestPrisma>) {
  const tenant = await tx.tenant.create({
    data: {
      slug: `ops-${randomUUID().slice(0, 8)}`,
      name: 'Operations Tenant',
      status: 'ACTIVE',
    },
  });

  const organization = await tx.organization.create({
    data: {
      tenantId: tenant.id,
      code: 'ORG-OPS',
      name: 'Operations Org',
      legalName: 'Operations Org LLC',
    },
  });

  const branch = await tx.branch.create({
    data: {
      tenantId: tenant.id,
      organizationId: organization.id,
      code: 'BR-OPS',
      name: 'Operations Branch',
    },
  });

  const customer = await tx.customer.create({
    data: {
      tenantId: tenant.id,
      customerNo: `OPS-${randomUUID().slice(0, 8)}`,
      name: 'Operations Customer',
      phone: '0500000100',
      nationalId: '9988776655',
      taxNumber: '399999999900003',
    },
  });

  const order = await tx.salesOrder.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      orderNo: `ORD-${randomUUID().slice(0, 8)}`,
      orderDate: new Date(),
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      currency: 'SAR',
      subtotal: 5000,
      discountAmount: 0,
      taxAmount: 750,
      totalAmount: 5750,
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
      paymentStatus: 'PAID',
      currency: 'SAR',
      subtotal: 5000,
      discountAmount: 0,
      taxAmount: 750,
      totalAmount: 5750,
      amountPaid: 5750,
      amountDue: 0,
      exchangeRateSnapshot: {
        currencyCode: 'SAR',
        baseCurrency: 'SAR',
        exchangeRate: '1.0000',
        goldPrice: { K24: '250.0000' },
        pricingSource: 'MOCK',
        snapshotTimestamp: new Date().toISOString(),
        manualOverride: false,
        providerName: 'MOCK',
        goldProviderVersion: 'MOCK',
        branchId: branch.id,
      },
    },
  });

  return { tenant, branch, customer, order, invoice };
}

if (databaseUrl) {
  describe('sales operations database integration', () => {
    const prisma = createTestPrisma();

    it('persists immutable exchange rate snapshot on invoice', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant, invoice } = await seedSalesFixture(tx);
        const invoiceRepository = new InvoiceRepository(tx);

        const loaded = await invoiceRepository.findById(tenant.id, invoice.id);
        assert.ok(loaded);
        const snapshot = loaded.exchangeRateSnapshot as Record<string, unknown>;
        assert.equal(snapshot.currencyCode, 'SAR');
        assert.equal(snapshot.exchangeRate, '1.0000');
        assert.equal(snapshot.providerName, 'MOCK');
      });
    });

    it('creates return, buyback, and exchange records through repositories', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant, branch, customer, invoice } = await seedSalesFixture(tx);

        const returnRepository = new SalesReturnRepository(tx);
        const salesReturn = await returnRepository.create(tenant.id, {
          returnNo: `RET-${randomUUID().slice(0, 8)}`,
          status: 'DRAFT',
          currency: 'SAR',
          refundAmount: 1150,
          customer: { connect: { id: customer.id } },
          branch: { connect: { id: branch.id } },
          invoice: { connect: { id: invoice.id } },
        });
        assert.equal(salesReturn.status, 'DRAFT');

        const buybackRepository = new BuybackRepository(tx);
        const buyback = await buybackRepository.create(tenant.id, {
          transactionNo: `BB-${randomUUID().slice(0, 8)}`,
          status: 'DRAFT',
          currency: 'SAR',
          karat: 'K21',
          weightGrams: 10,
          purity: 87.5,
          offeredAmount: 1925,
          customer: { connect: { id: customer.id } },
          branch: { connect: { id: branch.id } },
        });
        assert.equal(buyback.status, 'DRAFT');

        const exchangeRepository = new SalesExchangeRepository(tx);
        const exchange = await exchangeRepository.create(tenant.id, {
          exchangeNo: `EX-${randomUUID().slice(0, 8)}`,
          status: 'DRAFT',
          currency: 'SAR',
          returnAmount: 1000,
          newSaleAmount: 1500,
          priceDifference: 500,
          refundAmount: 0,
          customer: { connect: { id: customer.id } },
          branch: { connect: { id: branch.id } },
          originalInvoice: { connect: { id: invoice.id } },
        });
        assert.equal(exchange.status, 'DRAFT');
      });
    });

    it('records payment and aggregates invoice totals', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant, branch, invoice } = await seedSalesFixture(tx);
        const paymentRepository = new PaymentRepository(tx);

        await paymentRepository.create(tenant.id, {
          paymentNo: `PAY-${randomUUID().slice(0, 8)}`,
          method: 'CASH',
          status: 'PAID',
          amount: 2000,
          currency: 'SAR',
          paidAt: new Date(),
          branch: { connect: { id: branch.id } },
          invoice: { connect: { id: invoice.id } },
        });

        const aggregate = await paymentRepository.sumForInvoice(tenant.id, invoice.id);
        assert.ok(Number(aggregate._sum.amount) >= 2000);
      });
    });

    it('searches customers by national ID and tax number', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant } = await seedSalesFixture(tx);
        const customerRepository = new CustomerRepository(tx);

        const byNationalId = await customerRepository.list(tenant.id, {
          nationalId: '9988776655',
        });
        assert.equal(byNationalId.length, 1);

        const byTax = await customerRepository.list(tenant.id, {
          taxNumber: '399999999900003',
        });
        assert.equal(byTax.length, 1);
      });
    });
  });
} else {
  describe('sales operations database integration', () => {
    it('skips operations suites when TEST_DATABASE_URL is not configured', () => {
      assert.ok(true);
    });
  });
}
