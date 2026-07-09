# GoldOS — Deployment & Infrastructure

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — DevOps & Architecture

---

## Purpose

This document defines the deployment architecture, infrastructure design, environment strategy, CI/CD pipeline, monitoring, and operational procedures for GoldOS. The infrastructure must support multi-tenant SaaS operations with enterprise-grade reliability, security, and scalability from day one.

---

## Infrastructure Overview

### High-Level Architecture

```
                        ┌─────────────┐
                        │   Route 53   │
                        │    (DNS)     │
                        └──────┬──────┘
                               │
                        ┌──────┴──────┐
                        │  CloudFront  │
                        │   (CDN/WAF)  │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────┴──────┐  ┌─────┴─────┐  ┌──────┴──────┐
       │   Web App   │  │    API    │  │   Static    │
       │  (Next.js)  │  │  (Backend)│  │   Assets    │
       └─────────────┘  └─────┬─────┘  └─────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
             ┌──────┴──┐ ┌───┴───┐ ┌──┴──────┐
             │PostgreSQL│ │ Redis │ │   S3    │
             │ (Primary)│ │Cluster│ │ Storage │
             └────┬─────┘ └───────┘ └─────────┘
                  │
             ┌────┴─────┐
             │PostgreSQL│
             │(Replica) │
             └──────────┘
```

### Cloud Provider Strategy

| Phase | Provider | Regions | Rationale |
|-------|----------|---------|-----------|
| Phase 1 | AWS (primary) | `me-south-1` (Bahrain) | MENA proximity, full service catalog |
| Phase 2 | AWS | + `eu-west-1` (Ireland) | EU data residency |
| Phase 3 | AWS | + `ap-south-1` (Mumbai) | South Asia market |

**Alternative:** Cloudflare Workers + D1/R2 for edge-first architecture (evaluate in ADR).

---

## Environment Strategy

### Environments

| Environment | Purpose | URL | Data |
|-------------|---------|-----|------|
| **Development** | Local developer machines | `localhost` | Synthetic seed data |
| **CI** | Automated testing | Ephemeral containers | Test fixtures |
| **Staging** | Pre-production validation | `staging.goldos.com` | Anonymized production copy |
| **Production** | Live tenant data | `app.goldos.com` / `{slug}.goldos.com` | Real data |

### Environment Configuration

| Setting | Development | Staging | Production |
|---------|------------|---------|------------|
| Database | Local PostgreSQL | RDS (small) | RDS (Multi-AZ) |
| Redis | Local Redis | ElastiCache (small) | ElastiCache (cluster) |
| File Storage | Local / MinIO | S3 (staging bucket) | S3 (production bucket) |
| Email | Mailhog (local) | SES (sandbox) | SES (production) |
| SMS | Console log | Twilio (test) | Twilio (production) |
| Payment | Mock gateway | Sandbox gateway | Live gateway |
| SSL | Self-signed | ACM certificate | ACM certificate |
| Logging | Console | CloudWatch | CloudWatch + retention |
| Monitoring | None | Basic | Full (Datadog/similar) |

### Environment Isolation

- Separate AWS accounts for staging and production (AWS Organizations)
- No production data in non-production environments
- Separate secrets per environment (AWS Secrets Manager)
- Network isolation via VPC per environment
- IAM roles scoped per environment

---

## Compute Architecture

### Application Tier

| Component | Technology | Scaling | Instances (Prod) |
|-----------|-----------|---------|-----------------|
| **API Server** | Container (Docker) on ECS Fargate | Auto-scale on CPU/requests | 2–10 tasks |
| **Web App** | Next.js on ECS Fargate or Vercel | Auto-scale on requests | 2–5 tasks |
| **Background Workers** | Container on ECS Fargate | Auto-scale on queue depth | 1–5 tasks |
| **WebSocket Server** | Container on ECS Fargate | Auto-scale on connections | 1–3 tasks |

### Container Configuration

```yaml
# API Server Task Definition (conceptual)
service: goldos-api
cpu: 1024        # 1 vCPU
memory: 2048     # 2 GB
port: 3000
health_check:
  path: /health
  interval: 30s
  timeout: 5s
  healthy_threshold: 2
  unhealthy_threshold: 3
auto_scaling:
  min: 2
  max: 10
  target_cpu: 70%
  target_requests: 1000/min
```

### Background Workers

| Worker | Purpose | Trigger |
|--------|---------|---------|
| **Notification Worker** | Send emails, SMS, push notifications | Queue message |
| **Report Worker** | Generate complex reports and exports | Queue message |
| **Import Worker** | Process CSV/Excel data imports | Queue message |
| **Audit Archiver** | Archive old audit logs to cold storage | Scheduled (daily) |
| **Backup Verifier** | Verify backup integrity | Scheduled (weekly) |
| **Gold Rate Fetcher** | Fetch external gold rate feeds | Scheduled (configurable) |
| **Subscription Checker** | Check expired subscriptions, send reminders | Scheduled (daily) |

---

## Database Infrastructure

### PostgreSQL (Amazon RDS)

| Setting | Staging | Production |
|---------|---------|------------|
| **Engine** | PostgreSQL 16 | PostgreSQL 16 |
| **Instance** | db.r6g.large | db.r6g.xlarge |
| **Storage** | 100 GB gp3 | 500 GB gp3 (auto-scaling to 2 TB) |
| **Multi-AZ** | No | Yes |
| **Read Replicas** | 0 | 1 (reports) |
| **Backup** | Daily, 7-day retention | Daily, 30-day retention |
| **Encryption** | AES-256 | AES-256 |
| **Parameter Group** | Custom (optimized) | Custom (optimized) |
| **Monitoring** | Enhanced monitoring | Enhanced monitoring + Performance Insights |

### Connection Management

```
Application → PgBouncer (connection pooler) → PostgreSQL
```

| Setting | Value |
|---------|-------|
| Pool mode | Transaction pooling |
| Max connections (PgBouncer) | 200 |
| Default pool size | 20 per user/database |
| Connection timeout | 10 seconds |
| Idle timeout | 300 seconds |

### Redis (Amazon ElastiCache)

| Setting | Staging | Production |
|---------|---------|------------|
| **Engine** | Redis 7 | Redis 7 |
| **Node Type** | cache.r6g.large | cache.r6g.xlarge |
| **Cluster Mode** | Disabled | Enabled (3 shards) |
| **Replicas** | 0 | 1 per shard |
| **Encryption** | In-transit + at-rest | In-transit + at-rest |

**Usage:**
- Session storage
- Rate limiting counters
- Cache (product catalog, gold rates, permissions)
- Pub/Sub (real-time notifications, WebSocket events)
- Job queue (Phase 1)

---

## Storage

### Object Storage (Amazon S3)

| Bucket | Purpose | Access |
|--------|---------|--------|
| `goldos-prod-files` | Tenant file uploads | Private, CDN for images |
| `goldos-prod-exports` | Data exports, reports | Private, pre-signed URLs |
| `goldos-prod-backups` | Database backups | Private, encrypted |
| `goldos-prod-static` | Static assets, JS/CSS | Public via CDN |
| `goldos-prod-logs` | Application logs archive | Private |

### File Storage Policies

| Policy | Value |
|--------|-------|
| Max upload size | 10 MB (images), 50 MB (documents) |
| Allowed image types | JPEG, PNG, WebP |
| Allowed document types | PDF, CSV, XLSX |
| Virus scanning | ClamAV on upload (Phase 2) |
| CDN cache (images) | 24 hours |
| Lifecycle (exports) | Delete after 7 days |
| Lifecycle (backups) | Move to Glacier after 30 days |

---

## Networking

### VPC Design

```
VPC: 10.0.0.0/16
├── Public Subnet A (10.0.1.0/24)  — ALB, NAT Gateway
├── Public Subnet B (10.0.2.0/24)  — ALB, NAT Gateway
├── Private Subnet A (10.0.10.0/24) — Application containers
├── Private Subnet B (10.0.11.0/24) — Application containers
├── Data Subnet A (10.0.20.0/24)   — RDS, ElastiCache
└── Data Subnet B (10.0.21.0/24)   — RDS, ElastiCache
```

### Security Groups

| Group | Inbound | Outbound |
|-------|---------|----------|
| **ALB** | 443 from 0.0.0.0/0 | App port from app SG |
| **Application** | App port from ALB SG | 5432 to DB SG, 6379 to Redis SG, 443 to 0.0.0.0/0 |
| **Database** | 5432 from App SG | None |
| **Redis** | 6379 from App SG | None |

### DNS & SSL

| Domain | Purpose | Certificate |
|--------|---------|-------------|
| `goldos.com` | Marketing website | ACM |
| `app.goldos.com` | Web application | ACM |
| `api.goldos.com` | API endpoint | ACM |
| `*.goldos.com` | Tenant subdomains | ACM (wildcard) |
| `staging.goldos.com` | Staging environment | ACM |

---

## CI/CD Pipeline

### Pipeline Overview

```
Code Push → Lint & Format → Unit Tests → Build → Integration Tests
  → Security Scan → Deploy Staging → E2E Tests → Deploy Production
```

### GitHub Actions Workflow

```yaml
# Conceptual pipeline stages
stages:
  - name: Quality
    steps:
      - lint (ESLint, Prettier)
      - type-check (TypeScript)
      - unit-tests (Jest/Vitest)
      - coverage-check (min 80% business logic)

  - name: Build
    steps:
      - build-api (Docker image)
      - build-web (Next.js)
      - push-to-ecr (container registry)

  - name: Security
    steps:
      - dependency-scan (Snyk/Dependabot)
      - container-scan (Trivy)
      - sast (CodeQL)

  - name: Deploy Staging
    steps:
      - deploy-api-staging
      - deploy-web-staging
      - run-migrations-staging
      - integration-tests
      - e2e-tests

  - name: Deploy Production
    trigger: manual approval (or tag)
    steps:
      - deploy-api-production (rolling update)
      - deploy-web-production
      - run-migrations-production
      - smoke-tests
      - notify-team
```

### Deployment Strategy

| Environment | Strategy | Rollback |
|-------------|----------|----------|
| **Staging** | Rolling update | Redeploy previous image |
| **Production** | Rolling update (Phase 1) → Blue-green (Phase 2) | Automatic on health check failure; manual for logic issues |

### Database Migrations

- Migrations run as pre-deployment step
- Backward-compatible migrations only (no destructive changes in single deploy)
- Migration rollback script tested in staging
- Migration execution time monitored; timeout at 5 minutes
- Lock timeout configured to prevent long-running locks

---

## Monitoring & Observability

### Monitoring Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Metrics** | CloudWatch / Datadog | Application and infrastructure metrics |
| **Logs** | CloudWatch Logs / Datadog | Centralized log aggregation |
| **Traces** | X-Ray / Datadog APM | Distributed request tracing |
| **Errors** | Sentry | Real-time error tracking and alerting |
| **Uptime** | Pingdom / Datadog Synthetics | External availability monitoring |
| **Alerting** | PagerDuty / OpsGenie | Incident notification and escalation |

### Key Metrics & Alerts

| Metric | Warning Threshold | Critical Threshold | Alert Channel |
|--------|------------------|-------------------|---------------|
| API response time (p95) | > 500ms | > 2s | Slack + PagerDuty |
| Error rate (5xx) | > 1% | > 5% | PagerDuty |
| CPU utilization | > 70% | > 90% | Slack |
| Memory utilization | > 80% | > 95% | Slack |
| Database connections | > 80% pool | > 95% pool | PagerDuty |
| Database replication lag | > 5s | > 30s | PagerDuty |
| Disk usage | > 70% | > 85% | Slack |
| Queue depth | > 1000 | > 5000 | Slack |
| Failed login rate | > 100/min | > 500/min | Security team |
| SSL certificate expiry | < 30 days | < 7 days | Slack |

### Dashboards

| Dashboard | Audience | Key Panels |
|-----------|----------|------------|
| **Platform Health** | Engineering | Uptime, error rate, latency, throughput |
| **Infrastructure** | DevOps | CPU, memory, disk, network, DB metrics |
| **Business** | Leadership | Active tenants, transactions/day, revenue |
| **Security** | Security team | Failed logins, blocked requests, audit events |
| **Tenant Health** | Customer Success | Per-tenant usage, errors, performance |

### Logging Standards

```json
{
  "timestamp": "2026-07-10T12:00:00.000Z",
  "level": "info",
  "service": "goldos-api",
  "request_id": "req-uuid",
  "tenant_id": "tenant-uuid",
  "user_id": "user-uuid",
  "method": "POST",
  "path": "/v1/pos/invoices",
  "status": 201,
  "duration_ms": 145,
  "message": "Invoice created"
}
```

**Log Levels:**
- `error` — Failures requiring investigation
- `warn` — Degraded behavior, retries
- `info` — Business events, request logging
- `debug` — Detailed debugging (staging only)

**Rules:**
- Never log passwords, tokens, or PII in plain text
- Always include `request_id`, `tenant_id` for traceability
- Structured JSON format (not plain text)
- Log retention: 90 days (hot), 1 year (archive)

---

## Backup & Disaster Recovery

### Backup Schedule

| Component | Method | Frequency | Retention | Recovery Time |
|-----------|--------|-----------|-----------|---------------|
| PostgreSQL | Automated RDS snapshots | Daily | 30 days | < 1 hour |
| PostgreSQL | WAL continuous archiving | Continuous | 7 days | < 15 minutes (PITR) |
| Redis | RDB snapshots | Every 6 hours | 7 days | < 30 minutes |
| S3 Files | Cross-region replication | Continuous | Indefinite | < 1 hour |
| Configuration | Git + Secrets Manager | On change | 90 days | < 30 minutes |
| Audit Logs | Archive to S3 Glacier | Monthly | 7 years | < 4 hours |

### Disaster Recovery Plan

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| **Single instance failure** | < 5 min | 0 | Auto-restart / auto-scaling |
| **AZ failure** | < 15 min | 0 | Multi-AZ failover (automatic) |
| **Region failure** | < 1 hour | < 15 min | Failover to DR region |
| **Data corruption** | < 2 hours | < 15 min | Point-in-time recovery |
| **Ransomware / breach** | < 4 hours | < 24 hours | Restore from clean backup |

### DR Drill Schedule

| Drill | Frequency | Scope |
|-------|-----------|-------|
| Backup restore test | Weekly (automated) | Latest backup → verify |
| Failover test | Quarterly | Simulate AZ failure |
| Full DR drill | Annually | Region failover, full recovery |

---

## Security Infrastructure

### WAF Rules

| Rule | Action |
|------|--------|
| OWASP Top 10 managed rules | Block |
| Rate limiting (IP) | Block after 2000 req/5min |
| Geo-blocking (configurable) | Block restricted countries |
| SQL injection patterns | Block |
| XSS patterns | Block |
| Known bad IPs (threat intel) | Block |

### Secrets Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| Database credentials | AWS Secrets Manager | Quarterly (automatic) |
| API keys (platform) | AWS Secrets Manager | Annually |
| JWT signing keys | AWS KMS | Annually |
| Encryption keys | AWS KMS | Automatic (annual) |
| Third-party API keys | AWS Secrets Manager | On compromise |
| SSL certificates | AWS ACM | Automatic renewal |

### Infrastructure Security

- All resources in private subnets (except ALB)
- No SSH access to containers (use ECS Exec for debugging)
- IAM roles with least privilege
- VPC Flow Logs enabled
- AWS Config for compliance monitoring
- GuardDuty for threat detection
- CloudTrail for API audit logging

---

## Scaling Plan

### Phase 1 (0–500 tenants)

| Component | Configuration |
|-----------|--------------|
| API | 2 ECS tasks (1 vCPU, 2 GB) |
| Web | 2 ECS tasks |
| Database | db.r6g.xlarge, single AZ |
| Redis | cache.r6g.large, single node |
| Workers | 1 task |

**Estimated Cost:** $1,500–2,500/month

### Phase 2 (500–5,000 tenants)

| Component | Configuration |
|-----------|--------------|
| API | 2–10 ECS tasks (auto-scale) |
| Web | 2–5 ECS tasks |
| Database | db.r6g.2xlarge, Multi-AZ, 1 read replica |
| Redis | cache.r6g.xlarge, cluster mode (3 shards) |
| Workers | 1–5 tasks |
| Search | Elasticsearch cluster (3 nodes) |

**Estimated Cost:** $5,000–10,000/month

### Phase 3 (5,000–20,000+ tenants)

| Component | Configuration |
|-----------|--------------|
| API | 5–20 ECS tasks |
| Web | 3–10 ECS tasks |
| Database | db.r6g.4xlarge, Multi-AZ, 2 read replicas |
| Redis | cache.r6g.2xlarge, cluster mode (6 shards) |
| Workers | 3–10 tasks |
| Search | Elasticsearch (5 nodes) |
| Multi-region | 2+ regions active |

**Estimated Cost:** $15,000–30,000/month

---

## Operational Runbooks

### Standard Procedures

| Runbook | Trigger | Owner |
|---------|---------|-------|
| **Deployment** | Code merge to main | DevOps |
| **Rollback** | Failed health check / critical bug | DevOps |
| **Database Migration** | Schema change deployment | Backend Lead |
| **Scale Up** | High load alert | DevOps (auto) |
| **Incident Response** | P1/P2 alert | On-call engineer |
| **Certificate Renewal** | Expiry warning | DevOps (auto via ACM) |
| **Backup Verification** | Weekly schedule | DevOps (auto) |
| **Tenant Data Export** | Customer request | Support + DevOps |
| **Tenant Deprovisioning** | Account cancellation | DevOps |

### On-Call Rotation

| Phase | Coverage | Rotation |
|-------|----------|----------|
| Phase 1 | Business hours (9–18 UTC+3) | Weekly rotation |
| Phase 2 | Extended (8–22 UTC+3) | Weekly rotation |
| Phase 3 | 24/7 | Weekly rotation, 2 engineers |

---

## Document References

| Document | Purpose |
|----------|---------|
| [06-non-functional-requirements.md](./06-non-functional-requirements.md) | Performance and availability targets |
| [07-security.md](./07-security.md) | Security controls and compliance |
| [08-multi-tenant.md](./08-multi-tenant.md) | Multi-tenant infrastructure considerations |
| [12-development-roadmap.md](./12-development-roadmap.md) | Infrastructure scaling timeline |
| [14-testing.md](./14-testing.md) | CI/CD testing integration |

---

*This document is maintained by the DevOps and Architecture teams. Infrastructure changes require review and are documented in runbooks.*
