# GoldOS — Testing Strategy

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Engineering & QA

---

## Purpose

This document defines the comprehensive testing strategy for GoldOS — the testing pyramid, methodologies, tools, coverage requirements, and quality gates that ensure the platform meets enterprise-grade reliability standards. In a system handling high-value gold transactions and financial data, testing is not optional — it is a core engineering discipline.

---

## Testing Philosophy

1. **Shift Left** — Test early, test often; catch defects before they reach production
2. **Automate Everything Repeatable** — Manual testing for exploration; automation for regression
3. **Test at the Right Level** — Unit tests for logic, integration for interactions, E2E for workflows
4. **Tenant Isolation is Tested** — Cross-tenant data leakage tests on every deployment
5. **Financial Accuracy is Sacred** — Pricing, accounting, and weight calculations have exhaustive test coverage
6. **Performance is a Feature** — Load and stress testing are part of the release process
7. **Security is Tested** — Automated security scanning and periodic penetration testing

---

## Testing Pyramid

```
                    ┌───────────┐
                    │    E2E    │  ← Few, slow, high confidence
                    │   Tests   │     (Critical user journeys)
                   ┌┴───────────┴┐
                   │ Integration │  ← Moderate count, API + DB
                   │    Tests    │     (Module interactions)
                  ┌┴─────────────┴┐
                  │    Unit       │  ← Many, fast, isolated
                  │    Tests      │     (Business logic, utilities)
                  └───────────────┘
```

### Distribution Target

| Level | % of Tests | Count (est. Phase 1) | Execution Time |
|-------|-----------|---------------------|----------------|
| **Unit** | 70% | 2,000+ | < 2 minutes |
| **Integration** | 20% | 500+ | < 5 minutes |
| **E2E** | 10% | 100+ | < 15 minutes |
| **Total** | 100% | 2,600+ | < 22 minutes |

---

## Unit Testing

### Scope

- Business logic and domain rules
- Pricing engine calculations
- Permission checking logic
- Data validation and transformation
- Utility functions
- State machines (invoice status, transfer status, work order status)

### Critical Unit Test Areas

#### Gold Pricing Engine

```
Test cases:
├── Calculate selling price: (net_weight × rate) + making + stones
├── Calculate with percentage making charges
├── Calculate with per-gram making charges
├── Handle zero stone weight
├── Handle custom karat purity
├── Recalculate on rate change
├── Rounding to 2 decimal places (currency)
├── Rounding to 3 decimal places (weight)
├── Edge case: zero weight
├── Edge case: maximum values
└── Multiple karats in single invoice
```

#### Weight Calculations

```
Test cases:
├── Net gold weight = gross - stone weight
├── Wastage calculation (percentage)
├── Transfer weight reconciliation
├── Bulk inventory add/remove
├── Weight precision (3 decimal places)
└── Unit conversion (if applicable)
```

#### Permission System

```
Test cases:
├── Role has correct permissions
├── Custom role permission subset
├── Branch-scoped access enforcement
├── Permission union across multiple roles
├── Restricted permissions (billing → owner only)
└── Platform vs. tenant role separation
```

#### Invoice Number Generation

```
Test cases:
├── Sequential numbering
├── Per-branch vs. per-tenant numbering
├── No gaps in sequence
├── Voided invoice retains number
├── Concurrent invoice creation (no duplicates)
└── Prefix formatting
```

### Unit Test Standards

| Standard | Requirement |
|----------|-------------|
| **Framework** | Jest or Vitest |
| **Naming** | `describe('Module') → describe('function') → it('should ...')` |
| **Structure** | Arrange → Act → Assert |
| **Mocking** | Mock external dependencies; never mock the unit under test |
| **Coverage** | 80% minimum for business logic modules |
| **Speed** | Each test < 100ms |
| **Isolation** | No database, no network, no filesystem |

---

## Integration Testing

### Scope

- API endpoint behavior (request → response)
- Database operations (CRUD, constraints, RLS)
- Module interactions (POS → Inventory → Accounting)
- Authentication and authorization flows
- Tenant isolation enforcement
- Background job processing

### API Integration Tests

```
Test pattern:
1. Set up test tenant with seed data
2. Authenticate as test user with specific role
3. Make API request
4. Assert response status, body, and headers
5. Verify database state
6. Verify audit log entry
7. Clean up test data
```

### Critical Integration Test Scenarios

#### POS Sale Flow

```
Scenario: Complete gold ring sale
├── Create tenant, branch, cashier user
├── Seed product and inventory item (21K ring, 5.250g)
├── Set gold rate (21K sell: 3,200/g)
├── POST /pos/invoices (create sale)
├── Verify invoice created with correct pricing
├── Verify inventory item status → sold
├── Verify payment recorded
├── Verify audit log entries
└── Verify response matches expected schema
```

#### Tenant Isolation

```
Scenario: Cross-tenant data access prevention
├── Create Tenant A with product P1
├── Create Tenant B with product P2
├── Authenticate as Tenant A user
├── GET /inventory/products → returns only P1
├── GET /inventory/products/{P2.id} → returns 404
├── Attempt direct DB query without tenant_id → RLS blocks
└── Verify audit log records unauthorized attempt
```

#### Transfer Workflow

```
Scenario: Inter-branch transfer with approval
├── Create tenant with Branch A and Branch B
├── Seed inventory item at Branch A
├── Create transfer (Branch A → Branch B)
├── Verify item status → in_transit
├── Approve transfer (as manager)
├── Dispatch transfer
├── Receive at Branch B with weight verification
├── Complete transfer
├── Verify item at Branch B, status → in_stock
├── Verify item removed from Branch A
└── Verify accounting journal entry generated
```

#### Permission Enforcement

```
Scenario: Cashier cannot void invoice
├── Authenticate as cashier
├── POST /pos/invoices → 201 (allowed)
├── POST /pos/invoices/{id}/void → 403 (denied)
├── Authenticate as branch manager
├── POST /pos/invoices/{id}/void → 200 (allowed)
└── Verify audit log records both attempts
```

### Integration Test Standards

| Standard | Requirement |
|----------|-------------|
| **Database** | Dedicated test database; reset between test suites |
| **Isolation** | Each test creates own tenant/data; no shared state |
| **Authentication** | Test helper to create authenticated sessions per role |
| **Speed** | Each test < 5 seconds |
| **CI** | Run on every PR; must pass before merge |
| **Parallelization** | Tests parallelizable (isolated tenants) |

---

## End-to-End (E2E) Testing

### Scope

- Critical user journeys through the UI
- Cross-module workflows
- POS transaction flow (touch/click simulation)
- Onboarding wizard completion
- Multi-role workflows (cashier sells → manager approves)

### E2E Test Scenarios

#### Journey 1: New Tenant Onboarding

```
Steps:
1. Navigate to registration page
2. Fill registration form → submit
3. Verify email (test email service)
4. Complete onboarding wizard (company → branch → rates → product)
5. Invite team member
6. Verify dashboard loads with initial data
7. Verify onboarding marked complete
```

#### Journey 2: Complete POS Sale

```
Steps:
1. Login as cashier
2. Open shift
3. Search for product by name
4. Add to cart → verify price calculation
5. Attach customer
6. Apply discount (within limit)
7. Process cash payment
8. Verify receipt generated
9. Verify invoice in sales history
10. Close shift → verify reconciliation
```

#### Journey 3: Inventory Management

```
Steps:
1. Login as inventory manager
2. Create new product (gold bracelet, 21K)
3. Create inventory item with weight
4. Generate and print barcode label
5. Verify item appears in stock list
6. Search by barcode → verify correct item
7. Adjust stock (with reason)
8. Verify adjustment in movement history
```

#### Journey 4: Return Processing

```
Steps:
1. Login as branch manager
2. Find completed sale from yesterday
3. Initiate return (partial — one item)
4. Select refund method (cash)
5. Verify return invoice created
6. Verify item returned to stock
7. Verify original invoice marked with return
8. Verify accounting reversal
```

### E2E Test Standards

| Standard | Requirement |
|----------|-------------|
| **Framework** | Playwright |
| **Browsers** | Chromium (primary), Firefox (weekly) |
| **Environment** | Staging (dedicated test tenant) |
| **Data** | Seed script creates fresh test data before suite |
| **Screenshots** | Capture on failure |
| **Video** | Record on failure |
| **Speed** | Full suite < 15 minutes |
| **CI** | Run on staging deploy; nightly on production |

---

## Specialized Testing

### Performance / Load Testing

| Test | Tool | Scenario | Target |
|------|------|----------|--------|
| **API Load** | k6 / Artillery | 1000 concurrent users, mixed API calls | p95 < 500ms, 0% errors |
| **POS Stress** | k6 | 100 concurrent POS sales | p95 < 1s, 0% errors |
| **Search Load** | k6 | 500 concurrent product searches | p95 < 200ms |
| **Report Generation** | k6 | 50 concurrent report requests | p95 < 15s |
| **Database** | pgbench + custom | 10K concurrent queries | p95 < 100ms |
| **WebSocket** | k6 | 1000 concurrent connections | Stable, no drops |

**Load Test Schedule:**
- Every major release (pre-production)
- Monthly baseline comparison
- After infrastructure changes

### Security Testing

| Test | Tool | Frequency |
|------|------|-----------|
| **SAST** | CodeQL / SonarQube | Every commit (CI) |
| **DAST** | OWASP ZAP | Weekly (staging) |
| **Dependency Scan** | Snyk / Dependabot | Daily |
| **Container Scan** | Trivy | Every build |
| **Tenant Isolation** | Custom test suite | Every deployment |
| **Penetration Test** | Third-party firm | Annual |
| **SQL Injection** | Custom + OWASP ZAP | Weekly |
| **Authentication** | Custom test suite | Every release |

### Tenant Isolation Test Suite

Dedicated test suite that runs on every deployment:

```
Tests:
├── User of Tenant A cannot read Tenant B data (API)
├── User of Tenant A cannot modify Tenant B data (API)
├── User of Tenant A cannot read Tenant B data (direct DB with RLS)
├── API key of Tenant A cannot access Tenant B endpoints
├── Search results never include other tenant data
├── File URLs are tenant-scoped (no cross-tenant access)
├── Audit logs are tenant-scoped
├── Cache keys are tenant-prefixed (no cross-tenant cache hits)
├── Background jobs process only their tenant's data
└── Webhook payloads contain only tenant's data
```

### Financial Accuracy Testing

```
Test suite: Financial Integrity
├── Sale → journal entry balances (debits = credits)
├── Return → reversal entry balances
├── Transfer → inter-branch entries balance
├── Purchase → inventory and payable entries correct
├── Payment → cash and receivable entries correct
├── Wastage → expense and inventory entries correct
├── Gold rate change → revaluation entries correct
├── Multi-payment sale → all payments sum to invoice total
├── Discount → correctly reduces revenue
├── Tax → correctly calculated and recorded
└── Currency rounding → consistent across all calculations
```

### Accessibility Testing

| Test | Tool | Frequency |
|------|------|-----------|
| **Automated a11y scan** | axe-core (in Playwright) | Every E2E run |
| **Keyboard navigation** | Manual + Playwright | Every release |
| **Screen reader** | NVDA / VoiceOver | Monthly |
| **Color contrast** | axe-core | Every E2E run |
| **RTL layout** | Manual + visual regression | Every release |

### Visual Regression Testing

| Tool | Scope | Frequency |
|------|-------|-----------|
| **Percy / Chromatic** | Key pages and components | Every PR (UI changes) |
| **Manual review** | POS interface, dashboards | Every release |

---

## Test Data Management

### Test Data Strategy

| Environment | Data Source | Refresh |
|-------------|-----------|---------|
| **Unit tests** | Inline fixtures / factories | Per test |
| **Integration tests** | Factory functions + seed scripts | Per test suite |
| **E2E tests** | Dedicated seed script | Before each run |
| **Load tests** | Generated data (synthetic) | Per test run |
| **Staging** | Anonymized production copy | Weekly |

### Data Factories

Factory functions for creating test entities:

```
Factories:
├── createTenant(overrides?)
├── createBranch(tenant, overrides?)
├── createUser(tenant, role, overrides?)
├── createProduct(tenant, overrides?)
├── createInventoryItem(tenant, branch, product, overrides?)
├── createCustomer(tenant, overrides?)
├── createInvoice(tenant, branch, items, overrides?)
├── createGoldRate(tenant, karat, overrides?)
└── createTransfer(tenant, source, dest, items, overrides?)
```

### Seed Data (Staging/Demo)

Pre-built demo tenant with realistic data:
- 1 company ("Gold Palace Jewelry")
- 3 branches (Main Store, Warehouse, Workshop)
- 10 employees (various roles)
- 500 products across categories
- 2,000 inventory items
- 100 customers
- 1,000 historical invoices
- Current gold rates
- Sample transfers, work orders

---

## CI/CD Quality Gates

### Pull Request Gates

| Gate | Requirement | Blocking |
|------|-------------|----------|
| **Lint** | Zero errors | Yes |
| **Type check** | Zero errors | Yes |
| **Unit tests** | 100% pass | Yes |
| **Unit coverage** | ≥ 80% business logic | Yes |
| **Integration tests** | 100% pass | Yes |
| **Security scan** | Zero critical/high | Yes |
| **Code review** | 1 approval | Yes |
| **Bundle size** | No increase > 5% | Warning |

### Staging Deployment Gates

| Gate | Requirement | Blocking |
|------|-------------|----------|
| **All PR gates** | Pass | Yes |
| **E2E tests** | 100% pass | Yes |
| **Accessibility scan** | Zero critical violations | Yes |
| **Performance baseline** | No regression > 10% | Warning |
| **Migration test** | Forward + rollback pass | Yes |

### Production Deployment Gates

| Gate | Requirement | Blocking |
|------|-------------|----------|
| **All staging gates** | Pass | Yes |
| **Manual approval** | Engineering lead | Yes |
| **Smoke tests** | Critical paths pass | Yes |
| **Tenant isolation tests** | 100% pass | Yes |
| **Financial integrity tests** | 100% pass | Yes |
| **Monitoring** | Alerts configured | Yes |

---

## Bug Management

### Severity Classification

| Severity | Definition | Response | Resolution |
|----------|-----------|----------|------------|
| **S1 — Critical** | Platform down, data loss, security breach, financial calculation error | Immediate | < 4 hours |
| **S2 — Major** | Core feature broken, no workaround | < 4 hours | < 24 hours |
| **S3 — Minor** | Feature degraded, workaround exists | < 24 hours | < 1 week |
| **S4 — Trivial** | Cosmetic, minor inconvenience | Next sprint | Next sprint |

### Bug Lifecycle

```
Reported → Triaged → Assigned → In Progress → Fixed → Verified → Closed
                                    ↓
                               Won't Fix / Duplicate
```

### Regression Policy

- Every S1/S2 bug gets a regression test before closure
- Regression test added to appropriate test level (unit/integration/E2E)
- Bug fix verified by QA, not just developer

---

## Test Reporting

### Metrics Tracked

| Metric | Target | Review |
|--------|--------|--------|
| **Test pass rate** | 100% (before deploy) | Every deploy |
| **Code coverage (unit)** | ≥ 80% business logic | Every PR |
| **Code coverage (overall)** | ≥ 60% | Weekly |
| **E2E pass rate** | ≥ 98% | Every run |
| **Flaky test rate** | < 2% | Weekly |
| **Mean time to detect** | < 1 hour | Monthly |
| **Defect escape rate** | < 5% (bugs found in production) | Monthly |
| **Test execution time** | < 22 minutes (CI) | Weekly |

### Test Reports

| Report | Audience | Frequency |
|--------|----------|-----------|
| CI test results | Engineering | Every PR |
| Coverage report | Engineering | Every PR |
| E2E results | Engineering + QA | Every staging deploy |
| Performance baseline | Engineering + DevOps | Monthly |
| Security scan results | Security + Engineering | Weekly |
| Quality dashboard | Leadership | Monthly |

---

## Document References

| Document | Purpose |
|----------|---------|
| [05-functional-requirements.md](./05-functional-requirements.md) | Requirements for test case derivation |
| [06-non-functional-requirements.md](./06-non-functional-requirements.md) | Performance and security test targets |
| [07-security.md](./07-security.md) | Security testing requirements |
| [08-multi-tenant.md](./08-multi-tenant.md) | Tenant isolation test requirements |
| [13-deployment.md](./13-deployment.md) | CI/CD pipeline and quality gates |

---

*This document is maintained by the QA and Engineering teams. Testing strategy is reviewed quarterly and updated based on defect trends and coverage analysis.*
