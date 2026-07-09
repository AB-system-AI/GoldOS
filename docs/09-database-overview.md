# GoldOS — Database Overview

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Architecture

---

## Purpose

This document provides a comprehensive overview of the GoldOS database architecture — entity relationships, schema design principles, indexing strategy, and data management policies. This is a conceptual and logical data model document; physical implementation details (exact column types, migration files) will be defined during development.

---

## Database Technology

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Primary Database | PostgreSQL 16+ | All transactional data |
| Cache | Redis 7+ | Sessions, rate limiting, hot data cache |
| Search | PostgreSQL Full-Text Search (Phase 1) → Elasticsearch (Phase 2) | Product, customer, invoice search |
| File Metadata | PostgreSQL | File records and metadata |
| File Storage | S3-compatible Object Storage | Images, documents, exports |
| Message Queue | Redis Streams / PostgreSQL LISTEN/NOTIFY (Phase 1) → Dedicated queue (Phase 2) | Async jobs, notifications |

### Why PostgreSQL

- ACID compliance for financial transactions
- Row-Level Security (RLS) for tenant isolation
- JSONB for flexible attributes (product specs, settings)
- Full-text search capabilities
- Mature ecosystem, proven at SaaS scale
- Excellent indexing (B-tree, GIN, GiST)
- Native UUID support
- Partitioning for large tables

---

## Schema Design Principles

1. **Tenant Isolation** — Every business table includes `tenant_id UUID NOT NULL`
2. **UUID Primary Keys** — All tables use UUID v7 (time-ordered) for primary keys
3. **Soft Deletes** — Business entities use `deleted_at TIMESTAMPTZ` (nullable) instead of hard deletes
4. **Audit Columns** — Every table includes: `created_at`, `updated_at`, `created_by`, `updated_by`
5. **Optimistic Locking** — Critical tables include `version INTEGER` for concurrent update protection
6. **Normalized Design** — Third normal form for transactional data; denormalization only for read performance (reports)
7. **Consistent Naming** — snake_case, singular table names, `{entity}_id` foreign keys
8. **Index Strategy** — `tenant_id` as leading column in all composite indexes

---

## Entity Relationship Overview

### Core Entity Map

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tenant    │────<│   Branch    │────<│  Employee   │
│  (Company)  │     │             │     │   (User)    │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │             │
       │     ┌──────┴───┐  ┌─────┴──────┐
       │     │Inventory │  │    POS     │
       │     │  Item    │  │  Terminal  │
       │     └────┬─────┘  └────────────┘
       │          │
       ├─────┬────┴────┬──────────┬──────────┐
       │     │         │          │          │
  ┌────┴──┐ │  ┌──────┴──┐ ┌────┴───┐ ┌───┴────┐
  │Product│ │  │ Invoice │ │Customer│ │Supplier│
  │       │─┘  │         │ │        │ │        │
  └───────┘    └────┬────┘ └────────┘ └────────┘
                    │
              ┌─────┴─────┐
              │ Invoice   │
              │ Line Item │
              └───────────┘
```

### Module Entity Groups

| Module | Core Entities |
|--------|--------------|
| **Platform** | tenants, subscription_plans, tenant_subscriptions, platform_users |
| **Auth** | users, sessions, user_2fa, password_reset_tokens, login_attempts |
| **RBAC** | roles, permissions, role_permissions, user_roles |
| **Organization** | branches, branch_settings, pos_terminals |
| **Inventory** | products, product_categories, inventory_items, gold_rates, gold_rate_history, stock_adjustments |
| **POS** | invoices, invoice_line_items, payments, payment_methods, shifts, shift_transactions |
| **Transfers** | transfers, transfer_items, transfer_approvals |
| **Purchasing** | suppliers, purchase_orders, purchase_order_items, goods_receipts, supplier_payments |
| **Workshop** | work_orders, work_order_materials, work_order_wastage, work_order_labor |
| **CRM** | customers, customer_addresses, customer_documents, loyalty_transactions |
| **Accounting** | chart_of_accounts, journal_entries, journal_entry_lines, fiscal_periods |
| **HR** | employee_profiles, attendance_records, shift_schedules, commission_rules, commission_records |
| **Notifications** | notifications, notification_templates, notification_preferences |
| **Audit** | audit_logs |
| **Files** | files |
| **Reports** | report_definitions, scheduled_reports |

---

## Core Table Definitions

### Platform Tables

#### `tenants`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | VARCHAR(63) | URL-safe unique identifier |
| name | VARCHAR(255) | Company display name |
| legal_name | VARCHAR(255) | Legal business name |
| tax_id | VARCHAR(50) | Tax registration number |
| country_code | CHAR(2) | ISO 3166-1 alpha-2 |
| currency_code | CHAR(3) | ISO 4217 base currency |
| timezone | VARCHAR(50) | IANA timezone |
| locale | VARCHAR(10) | BCP 47 locale |
| status | ENUM | pending, onboarding, active, suspended, cancelled, deleted |
| settings | JSONB | Tenant configuration (see multi-tenant doc) |
| logo_file_id | UUID | FK → files |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes:** `slug` (unique), `status`, `country_code`

#### `subscription_plans`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Plan name (Starter, Professional, Enterprise) |
| code | VARCHAR(50) | Unique plan code |
| max_branches | INTEGER | NULL = unlimited |
| max_employees | INTEGER | NULL = unlimited |
| features | JSONB | Feature flag map |
| price_monthly | DECIMAL(10,2) | Monthly price |
| price_annual | DECIMAL(10,2) | Annual price |
| is_active | BOOLEAN | Available for new subscriptions |

#### `tenant_subscriptions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| plan_id | UUID | FK → subscription_plans |
| status | ENUM | trialing, active, past_due, cancelled |
| billing_cycle | ENUM | monthly, annual |
| current_period_start | TIMESTAMPTZ | |
| current_period_end | TIMESTAMPTZ | |
| external_subscription_id | VARCHAR(255) | Stripe subscription ID |

---

### Organization Tables

#### `branches`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants (NOT NULL) |
| name | VARCHAR(255) | Branch name |
| code | VARCHAR(20) | Short branch code |
| type | ENUM | retail, warehouse, workshop |
| address_line1 | VARCHAR(255) | |
| address_line2 | VARCHAR(255) | |
| city | VARCHAR(100) | |
| state | VARCHAR(100) | |
| postal_code | VARCHAR(20) | |
| country_code | CHAR(2) | |
| phone | VARCHAR(20) | |
| email | VARCHAR(255) | |
| timezone | VARCHAR(50) | Override tenant timezone |
| is_active | BOOLEAN | |
| settings | JSONB | Branch-specific settings |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | Soft delete |

**Indexes:** `(tenant_id, is_active)`, `(tenant_id, code)` unique

#### `users`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants (NOT NULL) |
| email | VARCHAR(255) | Unique within tenant |
| password_hash | VARCHAR(255) | Argon2id hash |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| phone | VARCHAR(20) | |
| avatar_file_id | UUID | FK → files |
| status | ENUM | invited, active, deactivated |
| email_verified_at | TIMESTAMPTZ | |
| last_login_at | TIMESTAMPTZ | |
| password_changed_at | TIMESTAMPTZ | |
| failed_login_count | INTEGER | |
| locked_until | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, email)` unique, `(tenant_id, status)`

---

### Inventory Tables

#### `products`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants (NOT NULL) |
| sku | VARCHAR(50) | Stock keeping unit |
| name | VARCHAR(255) | Product name |
| description | TEXT | |
| category_id | UUID | FK → product_categories |
| type | ENUM | serialized, bulk |
| karat | VARCHAR(10) | e.g., "21K", "18K" |
| default_making_charge | DECIMAL(12,2) | Default making charge amount |
| making_charge_type | ENUM | fixed, percentage, per_gram |
| has_stones | BOOLEAN | |
| stone_details | JSONB | Stone type, carat, clarity, etc. |
| images | JSONB | Array of file IDs |
| is_active | BOOLEAN | |
| attributes | JSONB | Custom attributes |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, sku)` unique, `(tenant_id, category_id)`, `(tenant_id, karat)`, `(tenant_id, name)` GIN full-text

#### `inventory_items`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants (NOT NULL) |
| product_id | UUID | FK → products |
| branch_id | UUID | FK → branches |
| barcode | VARCHAR(50) | Unique within tenant |
| qr_code | VARCHAR(255) | Unique within tenant |
| serial_number | VARCHAR(50) | Optional serial number |
| gross_weight | DECIMAL(10,3) | Total weight in grams |
| net_gold_weight | DECIMAL(10,3) | Gold weight (gross - stones) |
| stone_weight | DECIMAL(10,3) | Stone weight in grams |
| karat | VARCHAR(10) | Actual karat (may differ from product default) |
| making_charge | DECIMAL(12,2) | Actual making charge for this item |
| stone_value | DECIMAL(12,2) | Total stone value |
| cost_price | DECIMAL(12,2) | Acquisition/manufacturing cost |
| selling_price | DECIMAL(12,2) | Calculated or manual selling price |
| status | ENUM | in_stock, reserved, in_transit, in_workshop, sold, returned, scrapped, lost |
| location | VARCHAR(100) | Physical location within branch (shelf, safe, display) |
| received_at | TIMESTAMPTZ | Date item entered inventory |
| sold_at | TIMESTAMPTZ | Date item was sold |
| notes | TEXT | |
| version | INTEGER | Optimistic locking |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, barcode)` unique, `(tenant_id, branch_id, status)`, `(tenant_id, product_id)`, `(tenant_id, qr_code)` unique, `(tenant_id, status)`

#### `gold_rates`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants (NOT NULL) |
| karat | VARCHAR(10) | Karat code |
| buy_rate | DECIMAL(12,4) | Buy rate per gram |
| sell_rate | DECIMAL(12,4) | Sell rate per gram |
| effective_from | TIMESTAMPTZ | Rate effective date/time |
| source | ENUM | manual, api |
| set_by | UUID | FK → users |
| created_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, karat, effective_from DESC)`

#### `gold_rate_history`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| karat | VARCHAR(10) | |
| buy_rate | DECIMAL(12,4) | |
| sell_rate | DECIMAL(12,4) | |
| effective_from | TIMESTAMPTZ | |
| effective_to | TIMESTAMPTZ | |
| source | ENUM | |
| set_by | UUID | |
| created_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, karat, effective_from)`

---

### POS Tables

#### `invoices`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants (NOT NULL) |
| branch_id | UUID | FK → branches |
| invoice_number | VARCHAR(50) | Sequential, unique per tenant/branch |
| type | ENUM | sale, return, layaway |
| status | ENUM | draft, completed, voided, refunded |
| customer_id | UUID | FK → customers (nullable for walk-in) |
| cashier_id | UUID | FK → users |
| shift_id | UUID | FK → shifts |
| subtotal | DECIMAL(14,2) | Before tax and discount |
| discount_amount | DECIMAL(12,2) | Total discount |
| discount_reason | VARCHAR(255) | |
| discount_approved_by | UUID | FK → users |
| tax_amount | DECIMAL(12,2) | |
| total | DECIMAL(14,2) | Final total |
| paid_amount | DECIMAL(14,2) | Amount paid |
| balance | DECIMAL(14,2) | Remaining balance |
| notes | TEXT | |
| voided_at | TIMESTAMPTZ | |
| voided_by | UUID | |
| void_reason | VARCHAR(255) | |
| completed_at | TIMESTAMPTZ | |
| version | INTEGER | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, branch_id, invoice_number)` unique, `(tenant_id, branch_id, completed_at)`, `(tenant_id, customer_id)`, `(tenant_id, status)`, `(tenant_id, cashier_id, completed_at)`

#### `invoice_line_items`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| invoice_id | UUID | FK → invoices |
| inventory_item_id | UUID | FK → inventory_items (nullable for bulk) |
| product_id | UUID | FK → products |
| description | VARCHAR(255) | |
| karat | VARCHAR(10) | |
| gross_weight | DECIMAL(10,3) | |
| net_gold_weight | DECIMAL(10,3) | |
| rate_per_gram | DECIMAL(12,4) | Gold rate at time of sale |
| gold_value | DECIMAL(12,2) | |
| making_charge | DECIMAL(12,2) | |
| stone_value | DECIMAL(12,2) | |
| discount_amount | DECIMAL(12,2) | |
| tax_amount | DECIMAL(12,2) | |
| line_total | DECIMAL(14,2) | |
| sort_order | INTEGER | |
| created_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, invoice_id)`, `(tenant_id, inventory_item_id)`

#### `payments`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| invoice_id | UUID | FK → invoices |
| payment_method | ENUM | cash, card, bank_transfer, credit, gold_exchange, other |
| amount | DECIMAL(14,2) | |
| reference | VARCHAR(255) | Card auth code, transfer ref, etc. |
| gold_exchange_weight | DECIMAL(10,3) | For gold exchange payments |
| gold_exchange_karat | VARCHAR(10) | |
| gold_exchange_value | DECIMAL(12,2) | |
| processed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, invoice_id)`, `(tenant_id, payment_method, processed_at)`

---

### CRM Tables

#### `customers`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants (NOT NULL) |
| code | VARCHAR(20) | Customer code |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| phone | VARCHAR(20) | |
| email | VARCHAR(255) | |
| id_type | ENUM | national_id, passport, other |
| id_number_encrypted | BYTEA | Encrypted ID number |
| tier | ENUM | regular, vip, wholesale |
| credit_limit | DECIMAL(14,2) | |
| credit_balance | DECIMAL(14,2) | Current outstanding |
| loyalty_points | INTEGER | |
| total_spend | DECIMAL(14,2) | Lifetime spend |
| last_purchase_at | TIMESTAMPTZ | |
| notes | TEXT | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, phone)`, `(tenant_id, email)`, `(tenant_id, code)` unique, `(tenant_id, first_name, last_name)` GIN full-text

---

### Accounting Tables

#### `chart_of_accounts`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| code | VARCHAR(20) | Account code (e.g., "1000") |
| name | VARCHAR(255) | Account name |
| type | ENUM | asset, liability, equity, revenue, expense |
| parent_id | UUID | FK → self (hierarchy) |
| is_system | BOOLEAN | System-created, cannot delete |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, code)` unique, `(tenant_id, type)`

#### `journal_entries`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| branch_id | UUID | FK → branches |
| entry_number | VARCHAR(50) | Sequential |
| date | DATE | Accounting date |
| description | VARCHAR(500) | |
| reference_type | VARCHAR(50) | Source entity type (invoice, transfer, etc.) |
| reference_id | UUID | Source entity ID |
| is_auto | BOOLEAN | System-generated vs. manual |
| fiscal_period_id | UUID | FK → fiscal_periods |
| created_by | UUID | FK → users |
| created_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, date)`, `(tenant_id, reference_type, reference_id)`, `(tenant_id, entry_number)` unique

#### `journal_entry_lines`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| journal_entry_id | UUID | FK → journal_entries |
| account_id | UUID | FK → chart_of_accounts |
| debit | DECIMAL(14,2) | |
| credit | DECIMAL(14,2) | |
| description | VARCHAR(255) | |

**Indexes:** `(tenant_id, journal_entry_id)`, `(tenant_id, account_id)`

---

### Transfer Tables

#### `transfers`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| transfer_number | VARCHAR(50) | Sequential |
| source_branch_id | UUID | FK → branches |
| destination_branch_id | UUID | FK → branches |
| status | ENUM | draft, pending_approval, approved, in_transit, received, completed, rejected, cancelled |
| total_items | INTEGER | |
| total_weight | DECIMAL(10,3) | |
| total_value | DECIMAL(14,2) | |
| notes | TEXT | |
| created_by | UUID | FK → users |
| approved_by | UUID | FK → users |
| dispatched_at | TIMESTAMPTZ | |
| received_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, status)`, `(tenant_id, source_branch_id)`, `(tenant_id, destination_branch_id)`

---

### Workshop Tables

#### `work_orders`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| branch_id | UUID | FK → branches (workshop branch) |
| work_order_number | VARCHAR(50) | Sequential |
| type | ENUM | manufacturing, repair, custom_order, refining |
| status | ENUM | pending, in_progress, quality_check, completed, delivered, cancelled |
| customer_id | UUID | FK → customers (nullable) |
| description | TEXT | |
| assigned_to | UUID | FK → users (technician) |
| expected_completion | DATE | |
| completed_at | TIMESTAMPTZ | |
| finished_weight | DECIMAL(10,3) | |
| total_material_cost | DECIMAL(12,2) | |
| total_labor_cost | DECIMAL(12,2) | |
| total_wastage_cost | DECIMAL(12,2) | |
| total_cost | DECIMAL(14,2) | |
| output_item_id | UUID | FK → inventory_items (finished piece) |
| created_by | UUID | FK → users |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes:** `(tenant_id, branch_id, status)`, `(tenant_id, customer_id)`, `(tenant_id, assigned_to)`

---

### Audit Table

#### `audit_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants (nullable for platform actions) |
| user_id | UUID | FK → users |
| branch_id | UUID | FK → branches (nullable) |
| action | VARCHAR(50) | create, update, delete, approve, void, login, logout |
| entity_type | VARCHAR(50) | Table/entity name |
| entity_id | UUID | Affected record ID |
| old_values | JSONB | Previous state (for updates) |
| new_values | JSONB | New state |
| ip_address | INET | |
| user_agent | VARCHAR(500) | |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMPTZ | Immutable |

**Indexes:** `(tenant_id, created_at DESC)`, `(tenant_id, user_id, created_at)`, `(tenant_id, entity_type, entity_id)`, `(tenant_id, action, created_at)`

**Partitioning:** Range partitioned by `created_at` (monthly partitions)

---

## Indexing Strategy

### General Rules

1. **Every table:** `(tenant_id)` index at minimum
2. **Foreign keys:** Index on all FK columns
3. **Unique constraints:** Always include `tenant_id` for tenant-scoped uniqueness
4. **Query patterns:** Index columns used in WHERE, ORDER BY, and JOIN
5. **Composite indexes:** `tenant_id` as leading column
6. **Partial indexes:** For frequently filtered subsets (e.g., `WHERE status = 'in_stock'`)
7. **GIN indexes:** For JSONB columns and full-text search

### High-Traffic Query Indexes

| Query Pattern | Index |
|--------------|-------|
| POS product search | `(tenant_id, name)` GIN + `(tenant_id, barcode)` |
| Inventory by branch + status | `(tenant_id, branch_id, status)` |
| Invoices by date range | `(tenant_id, branch_id, completed_at)` |
| Customer lookup by phone | `(tenant_id, phone)` |
| Audit log by date | `(tenant_id, created_at DESC)` |
| Gold rate current | `(tenant_id, karat, effective_from DESC)` |

---

## Data Partitioning Strategy

### Tables Requiring Partitioning (at scale)

| Table | Strategy | Partition Key |
|-------|----------|--------------|
| `audit_logs` | Range (monthly) | `created_at` |
| `invoices` | Range (yearly) | `created_at` |
| `journal_entries` | Range (yearly) | `date` |
| `notifications` | Range (monthly) | `created_at` |
| `inventory_items` | None initially; hash by tenant_id if > 50M rows | `tenant_id` |

### Archival Strategy

- Audit logs older than 2 years: moved to cold storage, still queryable
- Completed invoices older than 5 years: archived to read-only partition
- Active data always in primary partitions

---

## Migration Strategy

### Principles

1. **Versioned migrations** — Sequential, numbered migration files
2. **Backward compatible** — Additive changes preferred; destructive changes require multi-step migration
3. **Zero-downtime** — Migrations must not lock tables during deployment
4. **Rollback support** — Every migration has a corresponding down migration
5. **Tested** — Migrations run against copy of production data before deployment

### Migration Workflow

```
Developer writes migration → CI runs against test DB → Code review
  → Deploy to staging → Verify → Deploy to production (during maintenance window if needed)
  → Monitor → Rollback if issues
```

---

## Backup & Recovery

| Type | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| Full backup | pg_dump / WAL archiving | Daily | 30 days |
| Incremental | WAL continuous archiving | Continuous | 7 days |
| Point-in-time recovery | WAL replay | Any point in retention | 7 days |
| Cross-region replica | Streaming replication | Continuous | Real-time |
| Backup verification | Automated restore test | Weekly | — |

---

## Document References

| Document | Purpose |
|----------|---------|
| [08-multi-tenant.md](./08-multi-tenant.md) | Tenant isolation in database |
| [07-security.md](./07-security.md) | Data encryption and RLS policies |
| [10-api-architecture.md](./10-api-architecture.md) | API data access patterns |
| [04-system-modules.md](./04-system-modules.md) | Module-to-entity mapping |

---

*This document is maintained by the Architecture and Database teams. Schema changes require architecture review and are documented in Architecture Decision Records (ADRs).*
