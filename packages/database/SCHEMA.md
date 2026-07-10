# GoldOS Database Schema (Phase 2 + Enterprise Extensions)

Production PostgreSQL schema for multi-tenant jewelry/gold ERP SaaS.

## Statistics

| Metric                             |  Count |
| ---------------------------------- | -----: |
| **Tables (models)**                |    119 |
| **Enums**                          |     76 |
| **Relation fields**                |    224 |
| **Schema files**                   |     28 |
| **Phase 2 migration SQL lines**    | ~2,485 |
| **Enterprise migration SQL lines** | ~1,880 |

## Migrations

| Migration                                     | Description                                          |
| --------------------------------------------- | ---------------------------------------------------- |
| `20260710100000_phase2_complete_schema`       | Core 66-table production schema                      |
| `20260710120000_phase2_enterprise_extensions` | Enterprise additive extensions (53 tables, 21 enums) |

## Schema Files

### Core (Phase 2)

| File                   | Domain                                                       |
| ---------------------- | ------------------------------------------------------------ |
| `schema.prisma`        | Generator and datasource                                     |
| `enums.prisma`         | Core enum definitions                                        |
| `tenancy.prisma`       | Tenant, Organization, Plan, Subscription, Settings           |
| `auth.prisma`          | User, Role, Permission, Session, ApiKey, Device              |
| `geo.prisma`           | Country, City, Address                                       |
| `organization.prisma`  | Branch, Employee, Workshop                                   |
| `partners.prisma`      | Customer, Supplier, Manufacturer                             |
| `catalog.prisma`       | Category, Brand, Product, GoldItem, DiamondItem, Gemstone    |
| `inventory.prisma`     | InventoryItem, Lot, StockMovement, Transfer, Reservation     |
| `orders.prisma`        | PurchaseOrder, SalesOrder and line items                     |
| `billing.prisma`       | Invoice, InvoiceItem, Payment, Expense                       |
| `finance.prisma`       | Bank, CashRegister, Transaction, Currency, Pricing, Tax      |
| `manufacturing.prisma` | ManufacturingOrder, RepairOrder, Certificate                 |
| `system.prisma`        | File, Media, Attachment, Audit, Webhook, Integration, Backup |
| `ai.prisma`            | AiConversation, AiReport                                     |

### Enterprise Extensions

| File                        | Domain                                                               |
| --------------------------- | -------------------------------------------------------------------- |
| `enums-enterprise.prisma`   | Invitation, auth security, providers, AI, search, printing, flags    |
| `invitations.prisma`        | Employee invitations, tokens, audit trail                            |
| `auth-security.prisma`      | Password reset, verification, MFA, login history, account lock       |
| `gold-engine.prisma`        | Gold price providers, sources, cache, sync logs, overrides, formulas |
| `currency-engine.prisma`    | Exchange rate providers, cache, sync logs                            |
| `ai-enterprise.prisma`      | AI agents, prompts, context, actions, usage, tokens, feedback, jobs  |
| `dashboard.prisma`          | Dashboard layouts, widgets, preferences                              |
| `search.prisma`             | Saved searches, recent searches, global search index                 |
| `barcode.prisma`            | Barcode templates, scans, QR codes                                   |
| `printing.prisma`           | Thermal printers, profiles, jobs, templates                          |
| `feature-flags.prisma`      | Feature flags, tenant features, module configuration                 |
| `subscription-usage.prisma` | Monthly usage tracking and overage billing                           |
| `timeline.prisma`           | Activity timeline, comments, attachments                             |
| `recycle-bin.prisma`        | Deleted records tombstones and restore jobs                          |

## Enterprise Capabilities

### 1. Employee Invitation System

- `employee_invitations` — full workflow (status, source, expiration, resend, acceptance, cancellation)
- `invitation_tokens` — secure hashed tokens with attempt tracking
- `invitation_audit_logs` — audit trail for send, resend, accept, cancel events

### 2. Authentication Preparation

- `password_reset_tokens`, `email_verification_tokens`, `phone_verification_tokens`
- `mfa_recovery_codes`, `trusted_devices`, `remembered_devices`
- `login_attempts`, `failed_login_history`, `account_locks`, `password_history`

### 3. Gold Price Engine

- `gold_price_providers` — global providers with priority and health status
- `gold_price_sources` — tenant provider configuration with failover support
- `gold_price_sync_logs`, `gold_price_cache` — sync history and live cache
- `gold_price_overrides`, `gold_pricing_formulas` — manual override and company formulas
- `gold_price_history` extended with optional `provider_id` and `source_id`

### 4. Currency Engine

- `exchange_rate_providers`, `exchange_rate_cache`, `exchange_sync_logs`
- `exchange_rates` extended with optional `provider_id`

### 5. AI Engine

- `ai_agents`, `ai_prompts`, `ai_context`, `ai_actions`
- `ai_usage`, `ai_tokens`, `ai_feedback`, `ai_jobs`
- `ai_conversations` extended with optional `agent_id`

### 6. Dashboard

- `dashboard_layouts`, `dashboard_widgets`, `dashboard_preferences`

### 7. Search Engine

- `saved_searches`, `recent_searches`, `global_search_index`

### 8. Barcode / QR

- `barcode_templates`, `barcode_scans`, `qr_codes`

### 9. Printing

- `thermal_printers`, `printer_profiles`, `print_jobs`, `print_templates`

### 10. Feature Flags

- `feature_flags`, `tenant_features`, `module_configuration`

### 11. Subscription Improvements

- `plans` extended: `max_employees`, `max_api_calls`, AI/WhatsApp/SMS/push credits
- `subscription_usages` — monthly usage per metric
- `subscription_overages` — overage tracking and billing

### 12. Audit Improvements

- `audit_logs` and `activity_logs` extended with IP geo, browser, OS, device, correlation ID

### 13. Activity Timeline

- `activity_timeline`, `timeline_comments`, `timeline_attachments`

### 14. Recycle Bin

- `deleted_records`, `restore_jobs`

## Design Principles

- UUID primary keys on every table
- Soft delete via `deletedAt` on every table (except `deleted_records` which uses status lifecycle)
- Timestamps `createdAt` and `updatedAt` on every table
- `tenantId` on all tenant-scoped tables with FK to `tenants`
- Restrict on core business FKs; Cascade on line items and settings
- Money as `Decimal(18,4)`; weight as `Decimal(12,4)`
- Snake_case column mapping via `@map`
- **Backward compatible**: no tables removed or renamed; only additive columns and new tables

## Commands

```bash
pnpm --filter @goldos/database db:format
pnpm --filter @goldos/database db:validate
pnpm --filter @goldos/database db:generate
pnpm --filter @goldos/database db:migrate
pnpm --filter @goldos/database db:seed
```

## Regenerating Enterprise Schema

```bash
node packages/database/scripts/build-enterprise-schema.cjs
```

Then patch existing models if needed and run `db:format` + `db:validate`.
