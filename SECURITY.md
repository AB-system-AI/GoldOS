# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in GoldOS, please report it responsibly:

1. Email: **security@goldos.com**
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Any suggested remediation

We will acknowledge receipt within **24 hours** and provide a detailed response within **72 hours**.

## Security Practices

GoldOS is built with security as a foundational requirement:

- **Tenant isolation** enforced at API, application, database (RLS), and infrastructure layers
- **Encryption** in transit (TLS 1.2+) and at rest (AES-256)
- **Authentication** with MFA support (TOTP, hardware keys)
- **RBAC** with least-privilege access control
- **Audit logging** for all security-relevant actions
- **Input validation** with Zod on all API boundaries
- **Dependency scanning** in CI/CD pipeline
- **Secrets management** via environment variables (never in source code)

## Scope

The following are in scope for security reports:

- Cross-tenant data access
- Authentication bypass
- Authorization escalation
- SQL injection
- XSS / CSRF
- Sensitive data exposure
- API abuse vectors

The following are out of scope:

- Social engineering attacks
- Physical security
- Denial of service (report separately for tracking)
- Issues in third-party dependencies without a GoldOS-specific exploit path

## Disclosure Policy

- We follow coordinated disclosure
- We will notify affected tenants for confirmed critical vulnerabilities
- Credit will be given to reporters who follow responsible disclosure (unless anonymity is requested)

## Security Updates

Security patches for critical vulnerabilities are released within **24 hours** of confirmation. High-severity patches within **7 days**.
