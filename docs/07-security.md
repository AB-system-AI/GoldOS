# GoldOS — Security Architecture

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Security (Confidential)

---

## Purpose

This document defines the comprehensive security architecture for GoldOS. As a platform handling high-value transactions, sensitive customer data, and financial records for hundreds of jewelry businesses, security is a foundational requirement — not an afterthought. This document covers authentication, authorization, data protection, network security, compliance, and incident response.

---

## Security Principles

1. **Defense in Depth** — Multiple layers of security controls; no single point of failure
2. **Least Privilege** — Users and services have minimum permissions required
3. **Zero Trust** — Verify every request regardless of source; never trust, always verify
4. **Secure by Default** — Secure configuration out of the box; insecure options require explicit opt-in
5. **Fail Secure** — System fails to a secure state; errors do not expose data or bypass controls
6. **Audit Everything** — All security-relevant actions are logged immutably
7. **Privacy by Design** — Data protection built into architecture, not bolted on

---

## Threat Model

### Assets to Protect

| Asset | Sensitivity | Impact if Compromised |
|-------|------------|----------------------|
| Customer PII (names, IDs, contacts) | High | Regulatory fines, reputational damage |
| Financial transaction data | Critical | Financial loss, legal liability |
| Gold inventory records | High | Inventory theft, financial misstatement |
| Authentication credentials | Critical | Full account takeover |
| API keys and integration secrets | Critical | Unauthorized data access |
| Audit logs | High | Compliance failure, undetected breaches |
| Payment card data | Critical | PCI DSS violation, financial fraud |
| Business intelligence/reports | Medium | Competitive disadvantage |

### Threat Actors

| Actor | Motivation | Capability | Likelihood |
|-------|-----------|------------|------------|
| External attacker | Financial gain, data theft | Medium–High | High |
| Malicious insider (employee) | Theft, fraud, sabotage | Medium (authorized access) | Medium |
| Compromised tenant user | Data theft, fraud | Low–Medium | Medium |
| Competitor | Industrial espionage | Low–Medium | Low |
| Nation-state | Surveillance (low probability) | High | Very Low |
| Script kiddie | Vandalism, defacement | Low | Medium |

### Attack Vectors

| Vector | Mitigation |
|--------|-----------|
| SQL Injection | Parameterized queries, ORM, input validation |
| XSS (Cross-Site Scripting) | Content Security Policy, output encoding, framework protections |
| CSRF (Cross-Site Request Forgery) | CSRF tokens, SameSite cookies |
| Broken Authentication | MFA, rate limiting, session management |
| Broken Access Control | RBAC middleware, tenant isolation, permission checks |
| Sensitive Data Exposure | Encryption at rest and in transit, field-level encryption |
| API Abuse | Rate limiting, authentication, input validation |
| Tenant Data Leakage | Row-level security, tenant context middleware |
| Man-in-the-Middle | TLS 1.2+, HSTS, certificate pinning (mobile) |
| DDoS | CDN, WAF, rate limiting, auto-scaling |
| Supply Chain Attack | Dependency scanning, lock files, verified sources |
| Social Engineering | Security awareness, 2FA, approval workflows |

---

## Authentication Architecture

### Authentication Flow

```
Client → API Gateway → Auth Service
                          ├── Validate credentials
                          ├── Check account status (active, locked)
                          ├── Verify 2FA (if enabled)
                          ├── Generate session token
                          ├── Set secure cookie / return JWT
                          └── Audit log: login event
```

### Password Policy

| Rule | Requirement |
|------|-------------|
| Minimum length | 8 characters |
| Complexity | Uppercase + lowercase + number + special character |
| History | Cannot reuse last 5 passwords |
| Maximum age | 90 days (configurable per tenant, 0 = no expiry) |
| Hashing algorithm | Argon2id (preferred) or bcrypt (cost factor ≥ 12) |
| Salt | Unique per-user, cryptographically random |

### Session Management

| Property | Value |
|----------|-------|
| Token type | Secure, HTTP-only, SameSite=Strict cookie (web) or Bearer token (API/mobile) |
| Token entropy | 256 bits, cryptographically random |
| Idle timeout | 30 minutes (configurable 15–120) |
| Absolute timeout | 12 hours |
| Concurrent sessions | 3 per user (configurable) |
| Rotation | Token rotated on privilege escalation |
| Invalidation | On logout, password change, role change, admin force-logout |
| Storage | Server-side session store (Redis) with token reference |

### Multi-Factor Authentication

| Method | Implementation | Use Case |
|--------|---------------|----------|
| TOTP | RFC 6238, 6-digit, 30-second window | Default 2FA method |
| SMS OTP | 6-digit, 5-minute expiry, rate limited | Fallback 2FA |
| Hardware Key | FIDO2/WebAuthn | Platform admins, enterprise tenants |
| Backup Codes | 10 single-use, 8-character alphanumeric | Recovery |

### Account Security

- **Lockout:** 10 failed attempts → 30-minute lockout
- **Rate limiting:** 5 login attempts per 15 minutes per IP
- **CAPTCHA:** After 3 failed attempts
- **New device alert:** Email notification on login from unrecognized device
- **Suspicious activity:** Alert on login from new country/IP range
- **Password reset:** Time-limited token (1 hour), single use, invalidates sessions

---

## Authorization Architecture

### RBAC Enforcement Points

```
Request → API Gateway
            → Authentication Middleware (who are you?)
            → Tenant Context Middleware (which tenant?)
            → Branch Context Middleware (which branch?)
            → Permission Middleware (are you allowed?)
            → Business Logic
            → Audit Middleware (log the action)
```

### Permission Check Implementation

Every API endpoint declares required permissions:

```
Endpoint: POST /api/v1/inventory/items
Required Permission: inventory.item.create
Branch Scope: Required (user must have access to target branch)
Tenant Scope: Enforced (item created within user's tenant only)
```

### Tenant Isolation Enforcement

| Layer | Mechanism |
|-------|-----------|
| API Gateway | Extract tenant ID from JWT/session; reject if missing |
| Application Middleware | Inject tenant ID into request context; all queries scoped |
| Database | Row-level security (RLS) policies on all tenant tables |
| File Storage | Tenant-prefixed paths; access validated on every request |
| Cache | Tenant-prefixed keys; no shared cache entries |
| Search Index | Tenant-filtered queries; separate indices per tenant (large tenants) |
| Background Jobs | Tenant context propagated to all async workers |

---

## Data Protection

### Encryption Standards

| Data State | Algorithm | Key Management |
|------------|-----------|---------------|
| In transit | TLS 1.2+ (prefer 1.3) | Managed certificates (auto-renewal) |
| At rest — database | AES-256 (transparent data encryption) | Cloud KMS |
| At rest — files | AES-256 (server-side encryption) | Cloud KMS |
| At rest — backups | AES-256 | Separate KMS key from production |
| Application-level — PII | AES-256-GCM | Per-tenant data encryption key (DEK) |
| Application-level — secrets | AES-256-GCM | Platform master key in HSM/KMS |

### Sensitive Field Encryption

The following fields are encrypted at the application level (in addition to database encryption):

- Customer ID document numbers
- Employee salary information
- API keys and integration secrets
- Payment card tokens (if stored)
- 2FA secrets (TOTP seeds)

### Data Classification

| Classification | Examples | Handling |
|---------------|----------|----------|
| **Public** | Marketing content, public API docs | No restrictions |
| **Internal** | Architecture docs, internal tools | Employee access only |
| **Confidential** | Business data, inventory, sales | Tenant-scoped access, encrypted |
| **Restricted** | PII, financial data, credentials | Encrypted, access logged, MFA required |

### Data Masking

- Credit card numbers: show last 4 digits only
- Customer ID numbers: masked in UI (show last 4)
- Passwords: never displayed, never logged
- API keys: show prefix only after creation
- Audit logs: PII fields masked in export

---

## Network Security

### Architecture

```
Internet → CDN/WAF → Load Balancer → API Gateway → Application
                                                         ↓
                                                    Database (private subnet)
                                                    Redis (private subnet)
                                                    Object Storage (private)
```

### Network Controls

| Control | Implementation |
|---------|---------------|
| WAF | Web Application Firewall at CDN edge; OWASP Top 10 rules |
| DDoS Protection | CDN-level DDoS mitigation + rate limiting |
| VPC | Application and data tiers in private subnets |
| Security Groups | Least-privilege network access between tiers |
| No direct DB access | Database accessible only from application tier |
| Egress filtering | Outbound connections whitelist only |
| HSTS | Strict-Transport-Security header, max-age 1 year |
| CSP | Content-Security-Policy restricting script sources |

### API Security

| Control | Implementation |
|---------|---------------|
| Authentication | Required on all endpoints except health check and login |
| Rate limiting | Per-user, per-tenant, per-IP limits |
| Input validation | Schema validation on all request bodies |
| Output encoding | Prevent XSS in API responses |
| CORS | Restricted to known origins |
| API versioning | Version in URL path; deprecated versions sunset with notice |
| Request signing | HMAC signature for webhook deliveries |

---

## Application Security

### Secure Development Lifecycle

| Phase | Security Activity |
|-------|------------------|
| Design | Threat modeling for new features |
| Development | Secure coding guidelines, peer review |
| Build | SAST (static analysis), dependency scanning |
| Test | DAST (dynamic analysis), penetration testing |
| Deploy | Security configuration validation |
| Operate | Vulnerability monitoring, incident response |

### Input Validation

- All user input validated against strict schemas
- Whitelist approach (allow known good, reject everything else)
- Maximum length limits on all text fields
- Type checking and sanitization
- File upload: type validation, size limits, virus scanning

### Output Encoding

- HTML entity encoding for all user-generated content displayed in UI
- JSON serialization with proper escaping
- PDF generation with sanitized inputs
- SQL parameterization (no string concatenation)

### Dependency Management

- Lock files for all dependency managers
- Automated vulnerability scanning (Snyk, Dependabot)
- Critical CVEs: patch within 24 hours
- High CVEs: patch within 7 days
- No dependencies with known critical vulnerabilities in production
- Regular dependency updates (monthly cadence)

### Secrets Management

| Secret Type | Storage |
|-------------|---------|
| Database credentials | Cloud secrets manager, rotated quarterly |
| API keys (platform) | Cloud secrets manager |
| API keys (tenant) | Encrypted in database, hashed for lookup |
| JWT signing keys | Cloud KMS, rotated annually |
| Encryption keys | Cloud KMS with automatic rotation |
| Third-party credentials | Cloud secrets manager |

**Rules:**
- No secrets in source code or configuration files
- No secrets in environment variables (use secrets manager references)
- Secrets accessed at runtime, not build time
- All secret access audit-logged

---

## Compliance & Regulatory

### GDPR Compliance

| Requirement | Implementation |
|-------------|---------------|
| Lawful basis | Consent management for marketing; contract for service data |
| Right to access | Data export functionality |
| Right to erasure | Account deletion with data purge (after retention period) |
| Right to portability | Standard format export (JSON, CSV) |
| Data minimization | Collect only necessary data; configurable fields |
| Privacy by design | Encryption, access controls, audit logging built in |
| Data Processing Agreement | DPA provided to all tenants |
| Breach notification | 72-hour notification process |

### PCI DSS (Payment Card Industry)

- **Strategy:** Never store, process, or transmit raw card data on GoldOS servers
- Card data tokenized at point of capture via payment gateway SDK
- Only payment tokens stored in GoldOS database
- PCI DSS compliance delegated to payment gateway (Level 1 certified)
- Annual SAQ-A questionnaire completion

### Regional Compliance

| Region | Requirements |
|--------|-------------|
| UAE | VAT invoicing, AML reporting for high-value transactions |
| Saudi Arabia | ZATCA e-invoicing compliance |
| Egypt | ETA tax integration (future) |
| EU | GDPR, PSD2 for payments |

---

## Audit & Logging

### Security Event Logging

| Event | Logged Fields |
|-------|--------------|
| Login (success/failure) | User, IP, device, timestamp, 2FA status |
| Logout | User, session ID, timestamp |
| Password change | User, timestamp, initiated by (self/admin) |
| 2FA enable/disable | User, method, timestamp |
| Permission change | Admin, target user, old/new permissions |
| Role assignment | Admin, target user, role, timestamp |
| API key creation/revocation | User, key prefix, permissions, timestamp |
| Data export | User, scope, format, timestamp |
| Admin impersonation | Admin, target user, duration, actions taken |
| Failed authorization | User, resource, permission required, timestamp |
| Account lockout | User, reason, timestamp |
| Suspicious activity | User, activity type, details, timestamp |

### Log Security

- Logs are append-only (no modification or deletion)
- Logs stored separately from application data
- Log integrity verified via checksums
- Log access restricted to security and platform admin roles
- Log retention: 7 years minimum
- Real-time alerting on security events (failed logins spike, privilege escalation)

---

## Incident Response

### Incident Classification

| Severity | Definition | Example |
|----------|-----------|---------|
| SEV-1 | Active breach, data exfiltration | Database compromised |
| SEV-2 | Vulnerability actively exploited | Authentication bypass found in production |
| SEV-3 | Vulnerability discovered, not exploited | SQL injection in staging |
| SEV-4 | Security misconfiguration | Overly permissive S3 bucket |

### Response Procedure

```
Detect → Triage (15 min) → Contain → Investigate → Eradicate → Recover → Post-Mortem
```

| Phase | Actions |
|-------|---------|
| **Detect** | Automated alerts, user reports, security scanning |
| **Triage** | Classify severity, assign incident commander, notify stakeholders |
| **Contain** | Isolate affected systems, revoke compromised credentials, block IPs |
| **Investigate** | Determine scope, timeline, root cause, affected tenants |
| **Eradicate** | Patch vulnerability, remove attacker access, clean compromised data |
| **Recover** | Restore services, verify integrity, monitor for recurrence |
| **Post-Mortem** | Document findings, update controls, notify affected parties |

### Breach Notification

| Audience | Timeline | Method |
|----------|----------|--------|
| Internal team | Immediate | Slack/PagerDuty |
| Affected tenants | Within 24 hours | Email + in-app notification |
| Regulatory bodies | Within 72 hours (GDPR) | Formal notification |
| All tenants (if platform-wide) | Within 48 hours | Status page + email |

---

## Security Testing

### Testing Program

| Type | Frequency | Scope |
|------|-----------|-------|
| SAST (Static Analysis) | Every commit (CI) | All code |
| DAST (Dynamic Analysis) | Weekly (staging) | All endpoints |
| Dependency scanning | Daily (CI) | All dependencies |
| Penetration testing | Annual | Full platform |
| Tenant isolation testing | Quarterly | Cross-tenant access attempts |
| Security code review | Every PR (critical paths) | Auth, RBAC, payments, data access |

### Security Champions

- One security champion per engineering team
- Review security implications of all features in design phase
- Coordinate with security team on incidents and audits

---

## Document References

| Document | Purpose |
|----------|---------|
| [03-user-roles.md](./03-user-roles.md) | RBAC model and permissions |
| [06-non-functional-requirements.md](./06-non-functional-requirements.md) | Security NFRs |
| [08-multi-tenant.md](./08-multi-tenant.md) | Tenant isolation architecture |
| [13-deployment.md](./13-deployment.md) | Infrastructure security controls |

---

*This document is classified as Confidential. Access is restricted to engineering, security, and leadership teams. Reviewed quarterly and updated after any security incident.*
