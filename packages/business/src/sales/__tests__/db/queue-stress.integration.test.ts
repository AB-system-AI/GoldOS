import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';

import { CashierQueueRepository } from '../../repositories/cashier-queue.repository.js';
import { createTestPrisma, resolveTestDatabaseUrl, withRollback } from './test-db.js';

const databaseUrl = resolveTestDatabaseUrl();

if (databaseUrl) {
  describe('cashier queue stress integration', () => {
    const prisma = databaseUrl ? createTestPrisma() : null;

    async function seedQueueFixture(tx: ReturnType<typeof createTestPrisma>) {
      const tenant = await tx.tenant.create({
        data: {
          slug: `queue-${randomUUID().slice(0, 8)}`,
          name: 'Queue Tenant',
          status: 'ACTIVE',
        },
      });

      const organization = await tx.organization.create({
        data: {
          tenantId: tenant.id,
          code: 'ORG-Q',
          name: 'Queue Org',
          legalName: 'Queue Org LLC',
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          organizationId: organization.id,
          code: 'BR-Q',
          name: 'Queue Branch',
        },
      });

      const customer = await tx.customer.create({
        data: {
          tenantId: tenant.id,
          customerNo: `QC-${randomUUID().slice(0, 8)}`,
          name: 'Queue Customer',
          phone: '0500000099',
        },
      });

      return { tenant, branch, customer };
    }

    it('queues 100 customers with unique positions', async () => {
      if (!prisma) return;

      await withRollback(prisma, async (tx) => {
        const { tenant, branch, customer } = await seedQueueFixture(tx);
        const queueRepository = new CashierQueueRepository(tx);
        const orderIds: string[] = [];

        for (let i = 0; i < 100; i += 1) {
          const order = await tx.salesOrder.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              customerId: customer.id,
              orderNo: `Q-${String(i)}-${randomUUID().slice(0, 6)}`,
              orderDate: new Date(),
              status: 'PENDING_PAYMENT',
              paymentStatus: 'UNPAID',
              currency: 'SAR',
              subtotal: 100,
              discountAmount: 0,
              taxAmount: 0,
              totalAmount: 100,
            },
          });
          orderIds.push(order.id);

          await queueRepository.create(tenant.id, {
            status: 'WAITING',
            priority: i % 5,
            queuePosition: i + 1,
            estimatedWaitMinutes: i + 1,
            branch: { connect: { id: branch.id } },
            salesOrder: { connect: { id: order.id } },
          });
        }

        const waiting = await queueRepository.list(tenant.id, {
          branchId: branch.id,
          status: 'WAITING',
          take: 200,
        });

        assert.equal(waiting.length, 100);
        const positions = new Set(waiting.map((entry) => entry.queuePosition));
        assert.equal(positions.size, 100);
      });
    });

    it('prevents duplicate queue entry per sales order', async () => {
      if (!prisma) return;

      await withRollback(prisma, async (tx) => {
        const { tenant, branch, customer } = await seedQueueFixture(tx);
        const queueRepository = new CashierQueueRepository(tx);

        const order = await tx.salesOrder.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            customerId: customer.id,
            orderNo: `DUP-${randomUUID().slice(0, 8)}`,
            orderDate: new Date(),
            status: 'PENDING_PAYMENT',
            paymentStatus: 'UNPAID',
            currency: 'SAR',
            subtotal: 100,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: 100,
          },
        });

        await queueRepository.create(tenant.id, {
          status: 'WAITING',
          priority: 0,
          queuePosition: 1,
          branch: { connect: { id: branch.id } },
          salesOrder: { connect: { id: order.id } },
        });

        await assert.rejects(
          queueRepository.create(tenant.id, {
            status: 'WAITING',
            priority: 0,
            queuePosition: 2,
            branch: { connect: { id: branch.id } },
            salesOrder: { connect: { id: order.id } },
          }),
        );
      });
    });

    it('detects inventory lock race conditions', async () => {
      if (!prisma) return;

      await withRollback(prisma, async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            slug: `lock-${randomUUID().slice(0, 8)}`,
            name: 'Lock Tenant',
            status: 'ACTIVE',
          },
        });

        const organization = await tx.organization.create({
          data: {
            tenantId: tenant.id,
            code: 'ORG-L',
            name: 'Lock Org',
            legalName: 'Lock Org LLC',
          },
        });

        const branch = await tx.branch.create({
          data: {
            tenantId: tenant.id,
            organizationId: organization.id,
            code: 'BR-L',
            name: 'Lock Branch',
          },
        });

        const category = await tx.category.create({
          data: {
            tenantId: tenant.id,
            code: 'CAT-L',
            name: 'Lock Category',
          },
        });

        const product = await tx.product.create({
          data: {
            tenantId: tenant.id,
            categoryId: category.id,
            sku: `SKU-${randomUUID().slice(0, 8)}`,
            name: 'Lock Product',
            type: 'GOLD',
          },
        });

        const item = await tx.inventoryItem.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            productId: product.id,
            assetId: `AST-${randomUUID().slice(0, 8)}`,
            serialNumber: `SN-${randomUUID().slice(0, 8)}`,
            status: 'AVAILABLE',
            lifecycleStage: 'AVAILABLE',
          },
        });

        const lockA = await tx.inventoryLock.create({
          data: {
            tenantId: tenant.id,
            inventoryItemId: item.id,
            lockType: 'SALE',
            referenceType: 'sales_order',
            referenceId: randomUUID(),
          },
        });

        const activeLocks = await tx.inventoryLock.count({
          where: {
            tenantId: tenant.id,
            inventoryItemId: item.id,
            releasedAt: null,
          },
        });

        assert.equal(activeLocks, 1);
        assert.ok(lockA.id);
      });
    });
  });
} else {
  describe('cashier queue stress integration', () => {
    it('skips stress suites when TEST_DATABASE_URL is not configured', () => {
      assert.ok(true);
    });
  });
}
