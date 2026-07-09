# GoldOS — Multi-Tenant Architecture

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Architecture

---

## Purpose

This document defines the multi-tenant architecture of GoldOS — how hundreds and thousands of jewelry businesses share a single platform instance while maintaining complete data isolation, independent configuration, fair resource allocation, and scalable operations. Multi-tenancy is the foundational architectural decision that enables GoldOS to operate as a true SaaS platform.

---

## Multi-Tenancy Model

### Selected Approach: Shared Database, Shared Schema with Tenant Discriminator

GoldOS uses a **shared database, shared schema** model with a `tenant_id` column on every tenant-scoped table. This approach provides the best balance of:

- **Cost efficiency** — Single database infrastructure serves all tenants
- **Operational simplicity** — One schema to manage, migrate, and backup
- **Strong isolation** — Enforced at application and database levels
- **Scalability** — Proven at scale by leading SaaS platforms

```
┌─────────────────────────────────────────────────────────┐
│                    GoldOS Platform                       │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Tenant A │  │ Tenant B │  │ Tenant C │  │ Tenant N │  │
│  │ (Gold    │  │ (Diamond │  │ (Chain   │  │  ...     │  │
│  │  Palace) │  │  House)  │  │  Store)  │  │          │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │       │
│  ┌────┴──────────────┴──────────────┴──────────────┴────┐  │
│  │              Shared Application Layer                 │  │
│  │         (Tenant Context Middleware)                   │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                  │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │              Shared Database (PostgreSQL)              │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  All tables include tenant_id column             │  │  │
│  │  │  Row-Level Security (RLS) policies enforced      │  │  │
│  │  │  Indexes include tenant_id for query performance │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Why Not Other Models?

| Model | Pros | Cons | Decision |
|-------|------|------|----------|
| **Database per tenant** | Strongest isolation | Expensive, complex migrations, connection overhead | Rejected — cost prohibitive at scale |
| **Schema per tenant** | Good isolation, shared infrastructure | Migration complexity grows linearly | Rejected — operational overhead |
| **Shared schema + tenant_id** | Cost efficient, simple operations | Requires rigorous isolation enforcement | **Selected** |
| **Hybrid (large tenants isolated)** | Best of both worlds | Complexity in routing and management | Future consideration for enterprise mega-tenants |

---

## Tenant Hierarchy

### Organizational Structure

```
Platform
└── Tenant (Company)
    ├── Subscription & Plan
    ├── Global Configuration
    │   ├── Currency & Locale
    │   ├── Tax Rules
    │   ├── Gold Rate Policies
    │   ├── Invoice Templates
    │   └── Feature Flags
    ├── Branches (1..∞)
    │   ├── Branch Configuration
    │   ├── Employees (scoped)
    │   ├── POS Terminals
    │   ├── Inventory Location
    │   └── Workshop (optional)
    ├── Users (cross-branch)
    ├── Roles & Permissions
    ├── Customers (shared across branches)
    ├── Suppliers (shared across branches)
    └── Products (catalog shared, stock per branch)
```

### Tenant Identification

Every tenant is identified by:

| Identifier | Type | Usage |
|------------|------|-------|
| `tenant_id` | UUID (internal) | Database queries, internal references |
| `tenant_slug` | String (unique) | URL subdomain: `{slug}.goldos.com` |
| `tenant_code` | String (unique, human-readable) | Support references, API headers |

### Tenant Lifecycle

```
Register → Verify Email → Onboarding → Active → [Suspended] → Cancelled → Deleted
                                              ↓
                                         Reactivated
```

| State | Description | Data Access | Billing |
|-------|-------------|-------------|---------|
| `pending` | Registered, email not verified | None | None |
| `onboarding` | Email verified, setup in progress | Full (setup only) | Trial |
| `active` | Fully operational | Full per plan | Active billing |
| `suspended` | Payment failure or ToS violation | Read-only | Overdue |
| `cancelled` | Tenant initiated cancellation | Read-only (90 days) | Stopped |
| `deleted` | Data purged after retention period | None | None |

---

## Data Isolation

### Isolation Layers

GoldOS enforces tenant isolation at **four layers** — any single layer failure is caught by the next:

#### Layer 1: API Gateway / Request Middleware

```
Every incoming request:
1. Extract tenant_id from JWT claims or session
2. Validate tenant exists and is active
3. Inject tenant_id into request context
4. Reject requests without valid tenant context (except platform-level endpoints)
```

#### Layer 2: Application Logic

```
Every data access operation:
1. Read tenant_id from request context (never from request body/params)
2. Include tenant_id in all database queries
3. Validate that referenced entities belong to the same tenant
4. Reject cross-tenant references
```

#### Layer 3: Database Row-Level Security (RLS)

```sql
-- Example RLS policy (conceptual)
CREATE POLICY tenant_isolation ON inventory_items
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Set tenant context at connection level
SET app.current_tenant_id = '{tenant_id}';
```

- RLS policies on **every** tenant-scoped table
- `tenant_id` set at connection/transaction level
- Even if application code has a bug, database prevents cross-tenant access
- Platform admin queries use a bypass role with full audit logging

#### Layer 4: Infrastructure

| Resource | Isolation Mechanism |
|----------|-------------------|
| File storage | Path prefix: `/tenants/{tenant_id}/...` |
| Cache (Redis) | Key prefix: `t:{tenant_id}:...` |
| Search index | Tenant filter on every query |
| Background jobs | Tenant context in job payload |
| Webhooks | Tenant-scoped endpoint configurations |
| API rate limits | Per-tenant counters |

### Tenant-Scoped vs. Platform-Scoped Tables

| Scope | Tables | tenant_id Column |
|-------|--------|-----------------|
| **Platform** | `tenants`, `subscription_plans`, `platform_users`, `platform_audit_logs` | No |
| **Tenant** | All business tables (products, invoices, customers, etc.) | Yes (NOT NULL, indexed) |
| **Shared Reference** | `countries`, `currencies`, `karat_definitions` | No (read-only reference data) |

### Cross-Tenant Query Prevention

**Strict rules:**
1. No query without `tenant_id` filter on tenant-scoped tables
2. No JOIN across tenants
3. No aggregate queries spanning tenants (except platform analytics)
4. Foreign keys include `tenant_id` to prevent cross-tenant references
5. Automated tests verify isolation on every deployment

---

## Tenant Configuration

### Configuration Levels

| Level | Scope | Examples | Managed By |
|-------|-------|----------|------------|
| **Platform** | All tenants | Available modules, rate limits, supported countries | Platform admin |
| **Plan** | Per subscription plan | Branch limit, employee limit, feature flags | Platform admin |
| **Tenant** | Per company | Currency, tax rules, gold rates, invoice template | Tenant owner/admin |
| **Branch** | Per location | Operating hours, POS terminals, local tax | Branch manager |
| **User** | Per employee | Notification preferences, language, active branch | User self-service |

### Feature Flags

Feature availability controlled per plan and optionally per tenant:

| Feature | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| POS | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ |
| Basic Reports | ✅ | ✅ | ✅ |
| Accounting | ❌ | ✅ | ✅ |
| CRM | ❌ | ✅ | ✅ |
| Transfers | ❌ | ✅ | ✅ |
| Workshop | ❌ | ✅ | ✅ |
| HR | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |
| AI Assistant | ❌ | ❌ | ✅ |
| Custom Roles | ❌ | ✅ | ✅ |
| Webhooks | ❌ | ❌ | ✅ |
| Custom Integrations | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |
| SLA Guarantee | ❌ | ❌ | ✅ |

Feature flags checked at:
- API middleware (block unauthorized endpoints)
- UI rendering (hide unavailable features)
- Background jobs (skip disabled features)

### Tenant Settings Schema

```
TenantSettings:
  - currency: ISO 4217 code (e.g., "EGP", "AED")
  - timezone: IANA timezone (e.g., "Africa/Cairo")
  - locale: BCP 47 (e.g., "ar-EG", "en-AE")
  - fiscal_year_start: month (1-12)
  - tax_enabled: boolean
  - tax_rate: decimal
  - tax_inclusive: boolean
  - invoice_prefix: string
  - invoice_next_number: integer
  - gold_rate_auto_update: boolean
  - gold_rate_source: enum (manual, api)
  - default_karats: array of karat codes
  - weight_precision: integer (2 or 3)
  - date_format: string
  - logo_url: string
  - invoice_footer_text: string
  - require_customer_on_sale: boolean
  - max_discount_without_approval: decimal
  - return_window_days: integer
  - low_stock_threshold: integer
  - 2fa_policy: enum (optional, required_admins, required_all)
```

---

## Subscription & Billing

### Plan Enforcement

| Resource | Enforcement Point | Behavior When Exceeded |
|----------|-------------------|----------------------|
| Branches | Branch creation | Block creation; prompt upgrade |
| Employees | User invitation | Block invitation; prompt upgrade |
| Products | Product creation | Warning at 90%; block at 100% |
| API calls | API middleware | Rate limit response (429) |
| Storage | File upload | Block upload; prompt upgrade |
| Transactions/day | POS sale | Warning; no block (revenue positive) |

### Usage Metering

Tracked per tenant per billing period:
- Active branches count
- Active employees count
- Total products
- Transactions processed
- API calls made
- Storage used (GB)
- Report generations

### Billing Integration

- Subscription management via Stripe (or regional equivalent)
- Plan changes: immediate upgrade, end-of-period downgrade
- Overage billing for usage-based metrics (Enterprise)
- Invoice generation and payment collection automated
- Dunning process for failed payments: retry → suspend → cancel

---

## Tenant Onboarding

### Onboarding Flow

```
Step 1: Registration
  → Company name, owner email, password, country
  → Email verification

Step 2: Company Profile
  → Legal name, tax ID, address, phone
  → Logo upload

Step 3: First Branch
  → Branch name, address, type
  → Operating hours

Step 4: Gold Rates
  → Set initial rates per karat
  → Or connect to rate feed

Step 5: First Product
  → Create a sample product
  → Understand inventory model

Step 6: Invite Team
  → Invite first employee
  → Assign role

Step 7: Ready!
  → Dashboard tour
  → Quick-start guide
  → Support contact
```

### Provisioning

On tenant creation, the system automatically:
1. Creates tenant record with UUID
2. Creates default branch ("Main Branch")
3. Creates owner user account with Tenant Owner role
4. Seeds default chart of accounts (based on country)
5. Seeds default karat definitions
6. Seeds default product categories
7. Applies plan feature flags
8. Creates default invoice template
9. Initializes audit log
10. Sends welcome email

**Target provisioning time:** < 5 seconds

---

## Tenant Data Management

### Data Export

Tenants can export all their data at any time:

| Format | Content | Use Case |
|--------|---------|----------|
| JSON | Complete data structure | Migration, backup |
| CSV | Tabular data per entity | Spreadsheet analysis |
| PDF | Invoices, reports | Records, compliance |

Export process:
1. Tenant owner requests export
2. Background job generates export files
3. Files stored in tenant's file storage
4. Download link emailed (expires in 7 days)
5. Export request audit-logged

### Data Deletion

On tenant cancellation:
1. **Day 0:** Account marked `cancelled`; read-only access
2. **Day 30:** Reminder email to export data
3. **Day 60:** Final warning email
4. **Day 90:** All business data permanently deleted
5. **Day 90+:** Audit logs retained per regulation (7 years)
6. Deletion is irreversible; confirmed by owner action

### Data Residency (Future)

- Phase 1: Single region deployment
- Phase 2: Regional data residency options (EU, MENA, APAC)
- Tenant data stored in selected region
- Cross-region replication for disaster recovery only

---

## Scalability Considerations

### Noisy Neighbor Prevention

| Mechanism | Implementation |
|-----------|---------------|
| Rate limiting | Per-tenant API rate limits |
| Query timeouts | Maximum query execution time (30s) |
| Connection limits | Per-tenant connection pool allocation |
| Background job quotas | Per-tenant job concurrency limits |
| Storage quotas | Per-plan storage limits |
| Report throttling | Max concurrent report generations per tenant |

### Large Tenant Handling

For enterprise tenants with exceptional data volumes:

| Strategy | Threshold | Action |
|----------|-----------|--------|
| Dedicated read replica | > 1M transactions/month | Route reports to replica |
| Search index partitioning | > 500K products | Dedicated search index |
| Cache warming | > 100 concurrent users | Pre-warm frequently accessed data |
| Database partitioning | > 10M rows per table | Partition by date range |
| Dedicated resources | Custom enterprise agreement | Isolated compute resources |

### Multi-Tenant Database Optimization

- All indexes include `tenant_id` as leading column
- Query planner statistics per tenant (for large tenants)
- Regular vacuum and analyze per table
- Connection pooling (PgBouncer) with tenant-aware routing
- Read replicas for reporting queries

---

## Platform Administration

### Platform Admin Capabilities

| Action | Access Level | Audit |
|--------|-------------|-------|
| View tenant list | Platform admin | Logged |
| View tenant details | Platform admin | Logged |
| Impersonate tenant user | Platform support | Full audit trail, time-limited |
| Suspend/activate tenant | Platform admin | Logged with reason |
| Modify tenant plan | Platform billing | Logged |
| View platform analytics | Platform admin | Aggregated only |
| Access tenant business data | Never (except impersonation) | Full audit trail |

### Impersonation Protocol

1. Support agent creates support ticket referencing tenant issue
2. Agent requests impersonation with justification
3. Impersonation session created (max 1 hour)
4. All actions during impersonation audit-logged with agent identity
5. Tenant notified of impersonation (configurable)
6. Session auto-terminates after time limit

---

## Migration & Tenant Portability

### Import from Legacy Systems

- CSV/Excel import templates for: products, customers, inventory, suppliers
- Import validation with detailed error reporting
- Dry-run mode (validate without importing)
- Import audit trail

### Export for Migration

- Full data export in standard formats
- Export includes all relationships and history
- Export API for programmatic access (Enterprise)

### Tenant Merge (Future)

- Merge two tenants (e.g., acquisition)
- Conflict resolution for duplicate records
- Full audit trail of merge operation

---

## Document References

| Document | Purpose |
|----------|---------|
| [07-security.md](./07-security.md) | Security controls for tenant isolation |
| [09-database-overview.md](./09-database-overview.md) | Database schema with tenant_id design |
| [02-business-requirements.md](./02-business-requirements.md) | Subscription plan business rules |
| [13-deployment.md](./13-deployment.md) | Infrastructure for multi-tenant deployment |

---

*This document is maintained by the Architecture team. Multi-tenant isolation is verified by automated tests on every deployment and manual penetration testing quarterly.*
