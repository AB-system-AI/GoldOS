# GoldOS — Non-Functional Requirements

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Architecture & Engineering

---

## Purpose

This document defines the non-functional requirements (NFRs) for GoldOS — the quality attributes, performance benchmarks, scalability targets, reliability standards, and operational constraints that the platform must meet. These requirements are as critical as functional features for an enterprise SaaS product.

---

## Performance Requirements

### NFR-PERF-001: API Response Time

| Endpoint Category | Target (p50) | Target (p95) | Target (p99) |
|-------------------|-------------|-------------|-------------|
| Authentication | < 100ms | < 200ms | < 500ms |
| POS — Product Search | < 50ms | < 100ms | < 200ms |
| POS — Complete Sale | < 200ms | < 500ms | < 1s |
| Inventory — Stock Lookup | < 50ms | < 100ms | < 200ms |
| Reports — Standard | < 1s | < 3s | < 5s |
| Reports — Complex/Export | < 5s | < 15s | < 30s |
| Dashboard — Load | < 500ms | < 1s | < 2s |
| File Upload (5MB) | < 2s | < 5s | < 10s |

### NFR-PERF-002: Page Load Time

| Page | Target (First Contentful Paint) | Target (Time to Interactive) |
|------|--------------------------------|------------------------------|
| Login | < 1s | < 2s |
| POS Sales Screen | < 1.5s | < 3s |
| Dashboard | < 2s | < 4s |
| Inventory List (1000 items) | < 2s | < 4s |
| Report Generation | < 3s | < 5s |

### NFR-PERF-003: POS Transaction Time

- Complete sale (scan → pay → receipt): **< 30 seconds** for standard transaction
- Barcode scan to cart: **< 1 second**
- Payment processing: **< 5 seconds** (excluding external payment gateway)

### NFR-PERF-004: Search Performance

- Full-text search across products, customers, invoices: **< 200ms** for up to 1M records per tenant
- Barcode lookup: **< 50ms** (indexed, cacheable)
- Autocomplete suggestions: **< 100ms**

### NFR-PERF-005: Concurrent Users

| Tenant Size | Concurrent Users per Tenant | Concurrent Users Platform-Wide |
|-------------|----------------------------|-------------------------------|
| Small (1 branch) | 10 | — |
| Medium (5 branches) | 50 | — |
| Large (20+ branches) | 200 | — |
| Platform Total | — | 10,000+ |

### NFR-PERF-006: Database Query Performance

- No unindexed query in production code paths
- Query execution time: **< 100ms** for transactional queries (p95)
- Analytical queries: **< 5s** (p95) with read replica support
- Connection pool: sized for peak concurrent load with 20% headroom

---

## Scalability Requirements

### NFR-SCALE-001: Tenant Scalability

| Resource | Starter | Professional | Enterprise | Platform Max |
|----------|---------|-------------|------------|-------------|
| Branches per tenant | 1 | 5 | Unlimited | Unlimited |
| Employees per tenant | 5 | 25 | Unlimited | Unlimited |
| Products per tenant | 10,000 | 100,000 | Unlimited | 10M+ |
| Inventory items per tenant | 50,000 | 500,000 | Unlimited | 50M+ |
| Transactions per day per tenant | 1,000 | 10,000 | 100,000+ | — |
| Total tenants | — | — | — | 100,000+ |

### NFR-SCALE-002: Data Volume

| Data Type | Per Tenant (Large) | Platform Total |
|-----------|-------------------|----------------|
| Invoices | 10M+ records | 1B+ records |
| Inventory items | 5M+ records | 500M+ records |
| Audit log entries | 100M+ records | 10B+ records |
| File storage | 100 GB | 100 TB+ |

### NFR-SCALE-003: Horizontal Scaling

- Application tier: stateless, horizontally scalable behind load balancer
- Database: read replicas for reporting; connection pooling (PgBouncer)
- Cache: Redis cluster for session, rate limiting, and hot data
- File storage: object storage (S3-compatible) with CDN
- Message queue: async processing for notifications, reports, exports

### NFR-SCALE-004: Auto-Scaling

- Application containers auto-scale based on CPU (70%) and request rate
- Scale-up response time: < 2 minutes
- Scale-down: graceful with connection draining
- Database: manual scaling with planned maintenance windows; auto-scaling for read replicas

### NFR-SCALE-005: Growth Projections

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Active Tenants | 500 | 5,000 | 20,000 |
| Daily Transactions | 50,000 | 500,000 | 2M+ |
| API Requests/day | 5M | 50M | 200M+ |
| Storage | 5 TB | 50 TB | 200 TB+ |

---

## Availability & Reliability

### NFR-AVAIL-001: Uptime SLA

| Tier | Uptime Target | Max Downtime/Month | Max Downtime/Year |
|------|--------------|-------------------|-------------------|
| Standard (Starter, Professional) | 99.9% | 43.8 minutes | 8.77 hours |
| Enterprise | 99.95% | 21.9 minutes | 4.38 hours |
| Enterprise Premium | 99.99% | 4.38 minutes | 52.6 minutes |

### NFR-AVAIL-002: Recovery Objectives

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | < 1 hour |
| Recovery Point Objective (RPO) | < 15 minutes |
| Mean Time to Detect (MTTD) | < 5 minutes |
| Mean Time to Resolve (MTTR) | < 30 minutes (P1 incidents) |

### NFR-AVAIL-003: Disaster Recovery

- Multi-region database replication (primary + standby in different AZ)
- Automated failover for database (< 30 seconds)
- Application deployed across multiple availability zones
- Full disaster recovery drill conducted quarterly
- DR site capable of handling 100% traffic within 1 hour

### NFR-AVAIL-004: Planned Maintenance

- Scheduled maintenance windows: maximum 4 hours/month
- Maintenance announced 72 hours in advance
- Zero-downtime deployments for application updates
- Database migrations during low-traffic windows with rollback plan

### NFR-AVAIL-005: Fault Tolerance

- No single point of failure in application tier
- Database failover automatic with connection retry
- External service failures (payment gateway, SMS) degrade gracefully
- Circuit breaker pattern for external integrations
- Retry with exponential backoff for transient failures

---

## Security Requirements

### NFR-SEC-001: Data Encryption

| Layer | Standard |
|-------|----------|
| In transit | TLS 1.2+ (prefer 1.3) for all connections |
| At rest (database) | AES-256 encryption |
| At rest (files) | AES-256 server-side encryption |
| At rest (backups) | AES-256 encrypted backups |
| Application-level | Sensitive fields (PII, payment) encrypted at application level |

### NFR-SEC-002: Authentication Security

- Password hashing: bcrypt or Argon2 with per-user salt
- Session tokens: cryptographically random, 256-bit
- JWT (if used): RS256 signing, short-lived (15 min) with refresh tokens
- Brute force protection: rate limiting, account lockout, CAPTCHA
- 2FA: TOTP (RFC 6238), hardware keys (FIDO2/WebAuthn)

### NFR-SEC-003: Tenant Isolation

- Complete data isolation between tenants at database level
- No cross-tenant data access possible via API or UI
- Tenant context enforced at middleware level on every request
- Platform admin access to tenant data requires explicit audit trail

### NFR-SEC-004: Vulnerability Management

- Dependency vulnerability scanning in CI/CD pipeline
- Critical vulnerabilities patched within 24 hours
- High vulnerabilities patched within 7 days
- Annual penetration testing by third party
- Bug bounty program (Year 2+)

### NFR-SEC-005: Compliance

| Standard | Target |
|----------|--------|
| GDPR | Compliant (data portability, right to deletion, consent) |
| PCI DSS | Level 4 (if processing cards directly); Level 1 via payment gateway tokenization |
| SOC 2 Type II | Year 2 certification target |
| ISO 27001 | Year 3 certification target |
| Local tax regulations | Per-market compliance |

*See [07-security.md](./07-security.md) for comprehensive security architecture.*

---

## Maintainability Requirements

### NFR-MAINT-001: Code Quality

- Test coverage: minimum 80% for business logic, 60% overall
- Static analysis: zero critical/high issues in production code
- Code review: mandatory for all changes (minimum 1 reviewer)
- Linting and formatting: enforced via pre-commit hooks and CI

### NFR-MAINT-002: Documentation

- API documentation: auto-generated from code (OpenAPI/Swagger)
- Architecture Decision Records (ADRs) for significant decisions
- Runbooks for operational procedures
- Onboarding documentation for new engineers (< 1 week to first contribution)

### NFR-MAINT-003: Deployment

- Zero-downtime deployments via rolling updates
- Blue-green or canary deployment for major releases
- Automated rollback on health check failure
- Deployment frequency: multiple times per week (CI/CD)
- Deployment time: < 15 minutes from merge to production

### NFR-MAINT-004: Monitoring & Observability

| Capability | Tool Category |
|------------|--------------|
| Application metrics | Prometheus / CloudWatch |
| Log aggregation | ELK Stack / CloudWatch Logs |
| Distributed tracing | OpenTelemetry / Jaeger |
| Error tracking | Sentry |
| Uptime monitoring | External synthetic monitoring |
| Alerting | PagerDuty / OpsGenie for P1/P2 |

### NFR-MAINT-005: Technical Debt

- Maximum 20% of sprint capacity allocated to tech debt reduction
- Quarterly tech debt review and prioritization
- No deprecated dependencies in production
- Database migration versioning with rollback support

---

## Usability Requirements

### NFR-USE-001: Learnability

- New cashier productive within **30 minutes** of training
- New admin completes onboarding wizard within **1 hour**
- Contextual help available on every major screen
- Tooltips and guided tours for first-time users

### NFR-USE-002: Efficiency

- POS: complete standard sale in **≤ 5 taps** after item scan
- Common admin tasks (add product, add employee) in **≤ 3 minutes**
- Keyboard shortcuts for power users on POS and admin screens

### NFR-USE-003: Error Prevention

- Confirmation dialogs for destructive actions (delete, void, deactivate)
- Inline validation with clear error messages
- Undo capability for recent actions where feasible
- Auto-save for forms in progress

### NFR-USE-004: Accessibility

- WCAG 2.1 Level AA compliance target
- Screen reader compatible
- Keyboard navigation for all functions
- Color contrast ratios meet AA standards
- RTL (Right-to-Left) layout support for Arabic

### NFR-USE-005: Internationalization

| Requirement | Detail |
|-------------|--------|
| Languages (Phase 1) | English, Arabic |
| Languages (Phase 2) | French, Urdu, Hindi |
| Date formats | Configurable per tenant locale |
| Number formats | Locale-aware decimal and thousand separators |
| Currency display | Symbol, position, and decimal places per currency |
| RTL support | Full RTL layout for Arabic |

### NFR-USE-006: Responsive Design

- POS optimized for: 10" tablets (primary), 15" touch screens, desktop
- Admin panel: desktop (1280px+), tablet (768px+)
- Mobile apps: iOS 15+, Android 10+
- Print layouts: thermal (80mm), A4

---

## Compatibility Requirements

### NFR-COMPAT-001: Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |
| Mobile Safari (iOS) | iOS 15+ |
| Chrome Mobile (Android) | Android 10+ |

### NFR-COMPAT-002: Hardware Compatibility

| Device | Support |
|--------|---------|
| Barcode scanners | USB HID (keyboard emulation), Bluetooth |
| Receipt printers | ESC/POS thermal printers (80mm, 58mm) |
| Cash drawers | Via receipt printer kick port |
| Label printers | Zebra, Brother (ZPL, EPL) |
| Card readers | Via payment gateway SDK |
| Gold scales | RS-232/USB serial (future) |

### NFR-COMPAT-003: Integration Standards

- REST API: JSON over HTTPS
- Webhooks: JSON payloads with HMAC signature verification
- Payment: PCI-compliant tokenization via gateway SDK
- Email: SMTP / API (SendGrid, AWS SES)
- SMS: API (Twilio, regional providers)
- File storage: S3-compatible API

---

## Data Management Requirements

### NFR-DATA-001: Backup

| Type | Frequency | Retention | Recovery |
|------|-----------|-----------|----------|
| Database — full | Daily | 30 days | < 1 hour |
| Database — incremental | Every 15 minutes | 7 days | < 15 minutes |
| File storage | Continuous (versioning) | 90 days | < 1 hour |
| Configuration | On every change | 90 days | < 30 minutes |
| Audit logs | Continuous | 7 years | < 4 hours |

### NFR-DATA-002: Data Portability

- Full tenant data export within 24 hours of request
- Standard formats: JSON, CSV, PDF
- API access for programmatic export (Enterprise)
- Data export available during active subscription and 90 days after cancellation

### NFR-DATA-003: Data Retention

| Data Type | Active Tenant | Post-Cancellation |
|-----------|--------------|-------------------|
| Business data | Indefinite | 90 days, then deleted |
| Audit logs | 7 years | 7 years |
| Backups | Per schedule above | 90 days |
| Session data | 30 days | Immediate deletion |
| Analytics/telemetry | 2 years | Anonymized, retained |

### NFR-DATA-004: Data Integrity

- Database constraints enforce referential integrity
- Financial transactions use database transactions (ACID)
- Optimistic locking for concurrent edits (version column)
- Checksums for file uploads
- Reconciliation jobs detect and alert on data inconsistencies

---

## Operational Requirements

### NFR-OPS-001: Deployment Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| Development | Local development | Synthetic/seed data |
| Staging | Pre-production testing | Anonymized production copy |
| Production | Live tenant data | Real data |

### NFR-OPS-002: CI/CD Pipeline

- Automated build, test, and deploy on every merge to main
- Staging deployment on merge; production on tagged release
- Automated test suite must pass before deployment
- Security scan must pass before deployment
- Deployment notifications to team channel

### NFR-OPS-003: Incident Management

| Severity | Response Time | Resolution Target | Communication |
|----------|--------------|-------------------|---------------|
| P1 — Critical (platform down) | 15 minutes | 1 hour | Status page + email |
| P2 — Major (feature broken) | 30 minutes | 4 hours | Status page |
| P3 — Minor (degraded) | 4 hours | 24 hours | Internal |
| P4 — Low (cosmetic) | 24 hours | Next sprint | Internal |

### NFR-OPS-004: Capacity Planning

- Monthly capacity review based on growth metrics
- Auto-scaling thresholds reviewed quarterly
- Database growth projected 6 months ahead
- Storage growth monitored with alerts at 70% capacity

### NFR-OPS-005: Rate Limiting

| Scope | Limit |
|-------|-------|
| API — per key | 1,000 requests/minute |
| API — per tenant | 5,000 requests/minute |
| Login attempts — per IP | 10/minute |
| Login attempts — per account | 5/15 minutes |
| File upload — per tenant | 100 files/hour |
| Report generation — per tenant | 10 concurrent |
| Email — per tenant | 1,000/day |

---

## Document References

| Document | Purpose |
|----------|---------|
| [07-security.md](./07-security.md) | Detailed security architecture |
| [08-multi-tenant.md](./08-multi-tenant.md) | Tenant isolation implementation |
| [13-deployment.md](./13-deployment.md) | Infrastructure and deployment |
| [14-testing.md](./14-testing.md) | Testing strategy for NFR validation |

---

*This document is maintained by the Architecture and Engineering teams. NFR targets are reviewed quarterly against actual production metrics and adjusted as needed.*
